from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    email: str
    password: str
    nickname: str = ""


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    nickname: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    user: UserResponse
