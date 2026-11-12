import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

import models
from database import get_db


SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is not configured")

ALGORITHM = "HS256"
# People stay logged in on their phone for 30 days ("Log out everywhere"
# or deactivating someone cancels their tokens straight away).
ACCESS_TOKEN_EXPIRE_DAYS = 30

password_hash = PasswordHash.recommended()

# Simple Bearer token authentication
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


def hash_secret(secret: str) -> str:
    return password_hash.hash(secret)


def create_access_token(employee: models.Employee) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(employee.id),
        "role": employee.role,
        "ver": employee.token_version,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> models.Employee:
    """The logged-in employee. Checked against the database on every request,
    so deactivated people and 'logged out everywhere' tokens stop working."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        employee_id = int(payload.get("sub"))
    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise credentials_exception

    employee = db.get(models.Employee, employee_id)
    if (
        employee is None
        or not employee.active
        or payload.get("ver") != employee.token_version
    ):
        raise credentials_exception
    return employee


def require_roles(*roles):
    """Dependency: only these roles may use the endpoint."""

    def checker(user: models.Employee = Depends(get_current_user)) -> models.Employee:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "forbidden", "message": "You don't have access to this.", "numbers": []},
            )
        return user

    return checker


# Who may do what (see ROADMAP.md, section 4)
OWNER = require_roles("owner")
STAFF = require_roles("owner", "uploader")  # orders, customers, uploads, payments
VIEWERS = require_roles("owner", "uploader", "social_media")  # can look at orders
ANYONE = get_current_user
