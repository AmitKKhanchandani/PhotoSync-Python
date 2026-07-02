# app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt

from app.database import SessionLocal
from app.models import User, Device, RefreshToken
from app.security import (
    SECRET_KEY,
    ALGORITHM,
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    REFRESH_TOKEN_EXPIRE_DAYS,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class TokenLogoutRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/register")
def register(
    username: str,
    email: str,
    password: str,
    device_name: str,
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        status="PENDING",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Registration successful. Await admin approval."
    }


@router.post("/login", response_model=AuthResponse)
def login(
    username: str,
    password: str,
    device_uid: str, # Matches the Android @Query parameter
    device_name: str,
    db: Session = Depends(get_db),
):
    # 1. Verify User Credentials
    user = db.query(User).filter(User.username == username).first()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # 2. Check if User is Approved
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=403,
            detail=f"Account status: {user.status}",
        )

    # 3. Lookup Device using the correct model attribute 'device_uid'
    device = (
        db.query(Device)
        .filter(Device.device_uid == device_uid)
        .first()
    )

    # 4. Create Device entry if it doesn't exist
    if not device:
        # 2. First time this phone has EVER connected to the server
        device = Device(
            user_id=user.id,
            device_uid=device_uid,
            device_name=device_name,
            status="ACTIVE"
        )
        db.add(device)
    else:
        # 3. Phone exists! Update it to belong to the new user logging in
        device.user_id = user.id
        device.device_name = device_name

    # 5. Update Activity Timestamp
    device.last_seen_at = datetime.utcnow() # Matches models.py field name
    db.commit()

    # 6. Generate JWT Tokens
    access_token = create_access_token(
        {
            "sub": str(user.id),
            "username": user.username,
            "device_id": device_uid,
            "session_version": user.session_version,
        }
    )

    refresh_token = create_refresh_token(
        {
            "sub": str(user.id),
            "username": user.username,
            "device_id": device_uid,
            "session_version": user.session_version,
        }
    )

    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.device_uid == device_uid,
        RefreshToken.revoked == False,
    ).update({"revoked": True})

    new_refresh_record = RefreshToken(
        user_id=user.id,
        device_uid=device_uid,
        token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        revoked=False,
    )
    db.add(new_refresh_record)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=AuthResponse)
def refresh_token(request: TokenRefreshRequest, db: Session = Depends(get_db)):
    if not request.refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token required")

    try:
        payload = jwt.decode(request.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")
    device_uid = payload.get("device_id")
    session_version = payload.get("session_version")

    if not user_id or not device_uid:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    refresh_record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == int(user_id),
            RefreshToken.device_uid == device_uid,
            RefreshToken.token == request.refresh_token,
            RefreshToken.revoked == False,
        )
        .first()
    )

    if not refresh_record or refresh_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Refresh token expired or revoked")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="User inactive or not found")

    if user.session_version != session_version:
        raise HTTPException(status_code=401, detail="Session invalidated")

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "username": user.username,
            "device_id": device_uid,
            "session_version": user.session_version,
        }
    )

    new_refresh_token = create_refresh_token(
        {
            "sub": str(user.id),
            "username": user.username,
            "device_id": device_uid,
            "session_version": user.session_version,
        }
    )

    refresh_record.revoked = True
    db.add(refresh_record)

    new_refresh_record = RefreshToken(
        user_id=user.id,
        device_uid=device_uid,
        token=new_refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        revoked=False,
    )
    db.add(new_refresh_record)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.post("/logout")
def logout(request: TokenLogoutRequest, db: Session = Depends(get_db)):
    if not request.refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token required")

    db.query(RefreshToken).filter(
        RefreshToken.token == request.refresh_token,
        RefreshToken.revoked == False,
    ).update({"revoked": True})
    db.commit()

    return {"message": "Logged out"}
