from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import decode_access_token

security = HTTPBearer()


async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id
