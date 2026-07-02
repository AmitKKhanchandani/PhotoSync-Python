# app/security.py

from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt
import uuid

# ⚠️ CHANGE THIS before production
SECRET_KEY = "CHANGE_ME_TO_A_LONG_RANDOM_STRING"
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_DAYS = 30  # Access token lifetime is now 30 days
REFRESH_TOKEN_EXPIRE_DAYS = 30

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    # Add a unique token identifier to avoid accidental duplicates
    to_encode.update({"exp": expire, "type": "refresh", "jti": uuid.uuid4().hex})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
