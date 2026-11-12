"""Login (phone + PIN, or the owner password as a fallback) and 'my profile'."""

import os
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

import activity
import models
import schemas
from auth import ANYONE, create_access_token, hash_secret, verify_password
from database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])

MAX_ATTEMPTS = 5
LOCK_MINUTES = 15


class LoginRequest(BaseModel):
    phone: Optional[str] = None
    pin: Optional[str] = None
    password: Optional[str] = None  # owner password (the old shared login)


def phone_key(phone):
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:] if len(digits) >= 8 else None


def find_by_phone(db: Session, phone, exclude_id=None):
    key = phone_key(phone)
    if not key:
        return None
    for employee in db.query(models.Employee).filter(models.Employee.phone.isnot(None)).all():
        if employee.id != exclude_id and phone_key(employee.phone) == key:
            return employee
    return None


def valid_pin(pin):
    return bool(pin) and pin.isdigit() and 4 <= len(pin) <= 6


def _utc(value):
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def login_response(db: Session, employee: models.Employee):
    employee.failed_attempts = 0
    employee.locked_until = None
    employee.last_login_at = datetime.now(timezone.utc)
    activity.log(db, employee, "login", employee.id, "logged_in", label=employee.name)
    db.commit()
    db.refresh(employee)
    return {
        "access_token": create_access_token(employee),
        "token_type": "bearer",
        "employee": schemas.EmployeeOut.model_validate(employee).model_dump(mode="json"),
    }


WRONG = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail={"code": "wrong_login", "message": "Wrong phone number or PIN.", "numbers": []},
)


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    # Fallback: the owner password logs in as the first active owner.
    if data.password is not None:
        stored_hash = os.getenv("FAB_ART_PASSWORD_HASH")
        if not stored_hash:
            raise HTTPException(status_code=500, detail="Authentication is not configured")
        if not verify_password(data.password, stored_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "wrong_password", "message": "Incorrect password", "numbers": []},
            )
        owner = (
            db.query(models.Employee)
            .filter(models.Employee.role == "owner", models.Employee.active.is_(True))
            .order_by(models.Employee.id)
            .first()
        )
        if not owner:
            raise HTTPException(status_code=500, detail="No active owner account")
        return login_response(db, owner)

    employee = find_by_phone(db, data.phone)
    if not employee or not employee.active or not employee.pin_hash:
        raise WRONG

    now = datetime.now(timezone.utc)
    locked_until = _utc(employee.locked_until)
    if locked_until and locked_until > now:
        minutes = max(1, int((locked_until - now).total_seconds() // 60) + 1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "locked",
                "message": f"Too many wrong PINs. Try again in {minutes} minutes.",
                "minutes": minutes,
                "numbers": [],
            },
        )

    if not valid_pin(data.pin) or not verify_password(data.pin, employee.pin_hash):
        employee.failed_attempts = (employee.failed_attempts or 0) + 1
        if employee.failed_attempts >= MAX_ATTEMPTS:
            employee.failed_attempts = 0
            employee.locked_until = now + timedelta(minutes=LOCK_MINUTES)
            activity.log(db, employee, "login", employee.id, "locked", label=employee.name)
        db.commit()
        raise WRONG

    return login_response(db, employee)


@router.get("/me", response_model=schemas.EmployeeOut)
def me(user: models.Employee = Depends(ANYONE)):
    return user


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


@router.patch("/me", response_model=schemas.EmployeeOut)
def update_me(data: ProfileUpdate, user: models.Employee = Depends(ANYONE), db: Session = Depends(get_db)):
    changes = data.model_dump(exclude_unset=True)
    before = activity.snapshot(user, changes.keys())
    if "name" in changes:
        if not (changes["name"] or "").strip():
            raise HTTPException(status_code=422, detail="Name cannot be empty.")
        user.name = changes["name"].strip()
    if "phone" in changes:
        phone = (changes["phone"] or "").strip() or None
        if phone and not phone_key(phone):
            raise HTTPException(status_code=422, detail="Enter a full phone number.")
        if phone and find_by_phone(db, phone, exclude_id=user.id):
            raise HTTPException(
                status_code=409,
                detail={"code": "phone_in_use", "message": "This phone number is used by another employee.", "numbers": []},
            )
        user.phone = phone
    activity.log(db, user, "employee", user.id, "updated", label=user.name,
                 changes=activity.changes(before, activity.snapshot(user, changes.keys())))
    db.commit()
    db.refresh(user)
    return user


class PinChange(BaseModel):
    new_pin: str
    current_pin: Optional[str] = None


@router.post("/me/pin")
def change_my_pin(data: PinChange, user: models.Employee = Depends(ANYONE), db: Session = Depends(get_db)):
    if user.pin_hash and not (data.current_pin and verify_password(data.current_pin, user.pin_hash)):
        raise HTTPException(
            status_code=403,
            detail={"code": "wrong_pin", "message": "Your current PIN is not correct.", "numbers": []},
        )
    if not valid_pin(data.new_pin):
        raise HTTPException(
            status_code=422,
            detail={"code": "bad_pin", "message": "The PIN must be 4 to 6 digits.", "numbers": []},
        )
    if not user.phone:
        raise HTTPException(
            status_code=422,
            detail={"code": "phone_needed", "message": "Save your phone number first - you log in with it.", "numbers": []},
        )
    user.pin_hash = hash_secret(data.new_pin)
    activity.log(db, user, "employee", user.id, "pin_changed", label=user.name)
    db.commit()
    return {"message": "PIN changed"}


@router.post("/logout-everywhere")
def logout_everywhere(user: models.Employee = Depends(ANYONE), db: Session = Depends(get_db)):
    user.token_version = (user.token_version or 0) + 1
    activity.log(db, user, "employee", user.id, "logged_out_everywhere", label=user.name)
    db.commit()
    return {"message": "Logged out on all devices"}
