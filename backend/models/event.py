"""Event model."""
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base
from .tag import event_tags


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    exhibition_id = Column(Integer, ForeignKey("exhibitions.id", ondelete="CASCADE"), nullable=False, index=True)

    event_name = Column(String(300), nullable=False)
    event_type = Column(String(100), index=True)
    booth_number = Column(String(50))
    location = Column(String(255))
    latitude = Column(String(50))
    longitude = Column(String(50))

    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, index=True)
    start_time = Column(String(10))
    end_time = Column(String(10))

    description = Column(Text)
    participation_method = Column(String(255))
    benefits = Column(Text)
    capacity = Column(Integer)
    current_participants = Column(Integer, default=0)

    image_url = Column(String)
    additional_images = Column(JSON, default=list)
    pdf_url = Column(String)
    ocr_data = Column(JSON)
    categories = Column(JSON, default=list)

    # Unsplash 자동 이미지 생성 관련 필드
    unsplash_image_url = Column(String)  # Unsplash에서 자동 생성된 이미지 URL
    has_custom_image = Column(Boolean, default=False)  # 주최측이 직접 업로드한 이미지 여부

    is_active = Column(Boolean, default=True, index=True)
    is_featured = Column(Boolean, default=False, index=True)
    view_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(
            "(end_date IS NULL) OR (start_date <= end_date)",
            name="chk_event_dates",
        ),
    )

    company = relationship("Company", back_populates="events")
    exhibition = relationship("Exhibition", back_populates="events")
    managers = relationship("EventManager", back_populates="event", cascade="all, delete-orphan")
    surveys = relationship("Survey", back_populates="event", cascade="all, delete-orphan")
    likes = relationship("EventLike", back_populates="event", cascade="all, delete-orphan")
    views = relationship("EventView", back_populates="event", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=event_tags, back_populates="events")

    def __repr__(self) -> str:
        return f"<Event(id={self.id}, name='{self.event_name}', company_id={self.company_id})>"
