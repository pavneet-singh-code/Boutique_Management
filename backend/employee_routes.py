"""Team management (owner only) and the activity log."""

import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

import activity
import models
import schemas
from auth import ANYONE, OWNER, hash_secret
from auth_routes import find_by_phone, phone_key, valid_pin
from database import get_db

router = APIRouter(prefix="/api/v1")

EDITABLE = ("name", "phone", "role", "color", "active")


def get_employee_or_404(db: Session, employee_id: int) -> models.Employee:
    employee = db.get(models.Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


def problem(status, code, message):
    raise HTTPException(status_code=status, detail={"code": code, "message": message, "numbers": []})


def check_phone(db, phone, exclude_id=None):
    if phone and not phone_key(phone):
        problem(422, "bad_phone", "Enter a full phone number.")
    if phone and find_by_phone(db, phone, exclude_id=exclude_id):
        problem(409, "phone_in_use", "This phone number is used by another employee.")


def active_owner_count(db, exclude_id=None):
    query = db.query(models.Employee).filter(models.Employee.role == "owner", models.Employee.active.is_(True))
    if exclude_id:
        query = query.filter(models.Employee.id != exclude_id)
    return query.count()


# ---------------------------------------------------------------- Team

@router.get("/employees", response_model=List[schemas.EmployeeOut])
def list_employees(db: Session = Depends(get_db), user=Depends(OWNER)):
    return db.query(models.Employee).order_by(models.Employee.active.desc(), models.Employee.id).all()


@router.get("/employees/directory", response_model=List[schemas.EmployeeBrief])
def employee_directory(db: Session = Depends(get_db), user=Depends(ANYONE)):
    """Names and colours of everyone (for avatars in the activity list)."""
    return db.query(models.Employee).order_by(models.Employee.id).all()


@router.post("/employees", response_model=schemas.EmployeeOut)
def add_employee(data: schemas.EmployeeCreate, db: Session = Depends(get_db), user=Depends(OWNER)):
    check_phone(db, data.phone)
    if not valid_pin(data.pin):
        problem(422, "bad_pin", "The PIN must be 4 to 6 digits.")
    employee = models.Employee(
        name=data.name.strip(),
        phone=data.phone.strip(),
        role=data.role,
        pin_hash=hash_secret(data.pin),
        active=True,
    )
    db.add(employee)
    db.flush()
    employee.employee_code = f"FA-{employee.id:03d}"
    employee.color = data.color or models.default_color(employee.id)
    activity.log(db, user, "employee", employee.id, "created", label=employee.name,
                 role=employee.role, code=employee.employee_code)
    db.commit()
    db.refresh(employee)
    return employee


@router.patch("/employees/{employee_id}", response_model=schemas.EmployeeOut)
def update_employee(
    employee_id: int,
    data: schemas.EmployeeUpdate,
    db: Session = Depends(get_db),
    user=Depends(OWNER),
):
    employee = get_employee_or_404(db, employee_id)
    updates = data.model_dump(exclude_unset=True)
    before = activity.snapshot(employee, EDITABLE)

    if "name" in updates and not (updates["name"] or "").strip():
        problem(422, "bad_name", "Name cannot be empty.")
    if "phone" in updates:
        updates["phone"] = (updates["phone"] or "").strip() or None
        check_phone(db, updates["phone"], exclude_id=employee.id)
        if not updates["phone"] and employee.pin_hash:
            problem(422, "phone_needed", "Employees log in with their phone number - it can't be empty.")
    losing_owner = employee.role == "owner" and (
        updates.get("role", "owner") != "owner" or updates.get("active") is False
    )
    if losing_owner and active_owner_count(db, exclude_id=employee.id) == 0:
        problem(409, "last_owner", "There must always be at least one active owner.")

    for key, value in updates.items():
        setattr(employee, key, value.strip() if isinstance(value, str) else value)

    # Role change or deactivation: log them out on every device.
    if "role" in updates and updates["role"] != before["role"] or updates.get("active") is False:
        employee.token_version = (employee.token_version or 0) + 1

    after = activity.snapshot(employee, EDITABLE)
    action = "deactivated" if before["active"] and not after["active"] else "updated"
    if not before["active"] and after["active"]:
        action = "reactivated"
    activity.log(db, user, "employee", employee.id, action, label=employee.name,
                 changes=activity.changes(before, after))
    db.commit()
    db.refresh(employee)
    return employee


@router.post("/employees/{employee_id}/reset-pin", response_model=schemas.EmployeeOut)
def reset_pin(employee_id: int, data: schemas.PinReset, db: Session = Depends(get_db), user=Depends(OWNER)):
    employee = get_employee_or_404(db, employee_id)
    if not valid_pin(data.pin):
        problem(422, "bad_pin", "The PIN must be 4 to 6 digits.")
    if not employee.phone:
        problem(422, "phone_needed", "Add a phone number first - they log in with it.")
    employee.pin_hash = hash_secret(data.pin)
    employee.failed_attempts = 0
    employee.locked_until = None
    employee.token_version = (employee.token_version or 0) + 1
    activity.log(db, user, "employee", employee.id, "pin_reset", label=employee.name)
    db.commit()
    db.refresh(employee)
    return employee


# ---------------------------------------------------------------- Activity

@router.get("/activity", response_model=List[schemas.ActivityOut])
def list_activity(
    entity: Optional[str] = None,
    entity_id: Optional[int] = None,
    actor_id: Optional[int] = None,
    before_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: models.Employee = Depends(ANYONE),
):
    """Owners see everything; everyone else sees only their own actions."""
    query = db.query(models.ActivityLog).options(selectinload(models.ActivityLog.actor))
    if user.role != "owner":
        query = query.filter(models.ActivityLog.actor_id == user.id)
    elif actor_id:
        query = query.filter(models.ActivityLog.actor_id == actor_id)
    if entity:
        query = query.filter(models.ActivityLog.entity == entity)
    if entity_id is not None:
        query = query.filter(models.ActivityLog.entity_id == entity_id)
    if before_id:
        query = query.filter(models.ActivityLog.id < before_id)
    rows = query.order_by(models.ActivityLog.id.desc()).limit(limit).all()
    return [
        {
            "id": row.id,
            "actor": schemas.EmployeeBrief.model_validate(row.actor) if row.actor else None,
            "entity": row.entity,
            "entity_id": row.entity_id,
            "action": row.action,
            "label": row.label,
            "details": json.loads(row.details) if row.details else {},
            "created_at": row.created_at or datetime.now(),
        }
        for row in rows
    ]
