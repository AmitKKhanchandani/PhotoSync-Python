# app/deps.py

from fastapi import Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User
from app.security import SECRET_KEY, ALGORITHM

# 1. auto_error=False tells FastAPI not to crash immediately if the header is missing
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
        token: str = Depends(oauth2_scheme),
        query_token: str = Query(None, alias="token"),  # 2. Look for ?token= in the URL
        db: Session = Depends(get_db),
) -> User:
    # 3. Use the header token (Android) OR the URL token (Web Video)
    actual_token = token or query_token

    if not actual_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(actual_token, SECRET_KEY, algorithms=[ALGORITHM])
        # Ensure this is an access token (not a refresh token)
        if payload.get("type") != "access":
            raise JWTError()
        user_id = payload.get("sub")
        session_version = payload.get("session_version")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="User inactive or not found")

    if session_version is not None and user.session_version != session_version:
        raise HTTPException(status_code=401, detail="Session invalidated")

    return user