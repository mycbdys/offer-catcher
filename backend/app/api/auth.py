from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.db.models import User
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import require_auth
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        nickname=data.nickname or data.email.split("@")[0],
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, nickname=user.nickname),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, nickname=user.nickname),
    )


@router.get("/me", response_model=UserResponse)
async def me(user_id: str = Depends(require_auth), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(id=user.id, email=user.email, nickname=user.nickname)
