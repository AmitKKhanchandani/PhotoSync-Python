# app/models.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    status = Column(String(20), default="PENDING", nullable=False)
    is_admin = Column(Boolean, default=False)

    max_storage_gb = Column(Integer, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)

    # NEW: Used to instantly log out all devices
    session_version = Column(Integer, default=1, nullable=False)

    devices = relationship(
        "Device",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    device_uid = Column(String(100), unique=True, index=True, nullable=False)
    device_name = Column(String(100), nullable=False)

    status = Column(String(20), default="ACTIVE")

    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, nullable=True)

    user = relationship(
        "User",
        back_populates="devices",
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_uid = Column(String(100), index=True, nullable=False)
    token = Column(String(500), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(String(500), nullable=False)


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)

    sha256 = Column(String(64), nullable=False)
    file_size = Column(Integer, nullable=False)

    # "photo" or "video"
    media_type = Column(String(10), nullable=False)

    # Relative to device root (e.g. DCIM/Camera/IMG_001.jpg)
    relative_path = Column(String(500), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "sha256", name="uq_user_photo_hash"),
    )

# --- PHASE 3: ALBUMS & SHARING ---

class Album(Base):
    """Stores the Album metadata and who owns it."""
    __tablename__ = "albums"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships to easily fetch connected data
    owner = relationship("User")
    photos = relationship("AlbumPhoto", back_populates="album", cascade="all, delete-orphan")
    shared_with = relationship("SharedAccess", back_populates="album", cascade="all, delete-orphan")


class AlbumPhoto(Base):
    """A mapping table that links a Photo to an Album."""
    __tablename__ = "album_photos"

    id = Column(Integer, primary_key=True, index=True)
    album_id = Column(Integer, ForeignKey("albums.id"))
    photo_id = Column(Integer, ForeignKey("photos.id"))
    added_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    album = relationship("Album", back_populates="photos")
    photo = relationship("Photo")


class SharedAccess(Base):
    """A mapping table that grants a specific User access to an Album."""
    __tablename__ = "shared_access"

    id = Column(Integer, primary_key=True, index=True)
    album_id = Column(Integer, ForeignKey("albums.id"))
    shared_with_user_id = Column(Integer, ForeignKey("users.id"))
    granted_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    album = relationship("Album", back_populates="shared_with")
    user = relationship("User") # The family member who gets to see the album


class FollowRequest(Base):
    __tablename__ = "follow_requests"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="PENDING") # Can be PENDING, ACCEPTED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    follower = relationship("User", foreign_keys=[follower_id])
    target = relationship("User", foreign_keys=[target_id])