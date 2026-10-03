import os

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from auth import verify_password, create_access_token


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


class LoginRequest(BaseModel):
    password: str


@router.post("/login")
async def login(data: LoginRequest):

    stored_hash = os.getenv("FAB_ART_PASSWORD_HASH")

    if not stored_hash:
        raise HTTPException(
            status_code=500,
            detail="Authentication is not configured"
        )

    if not verify_password(data.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )

    token = create_access_token()

    return {
        "access_token": token,
        "token_type": "bearer"
    }