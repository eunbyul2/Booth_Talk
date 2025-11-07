"""Exhibition model - 전시장 내 행사"""
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Exhibition(Base):
    __tablename__ = "exhibitions"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), index=True)

    source_event_id = Column(String(50))
    title = Column(String(300), nullable=False)
    subtitle = Column(String(300))
    category = Column(String(100))
    classification = Column(String(100))
    sector = Column(String(100))

    hall_location = Column(String(255))
    admission_fee = Column(String(255))
    organizer = Column(Text)
    host = Column(Text)
    contact_info = Column(Text)
    group_contact = Column(Text)
    ticket_contact = Column(Text)
    website_url = Column(String(1024))
    ticket_url = Column(String(1024))
    image_url = Column(String(1024))
    image_alt = Column(String(255))

    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)

    description = Column(Text)
    is_active = Column(Boolean, default=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    venue = relationship("Venue", back_populates="exhibitions")
    company = relationship("Company", back_populates="exhibitions")
    events = relationship("Event", back_populates="exhibition", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Exhibition(id={self.id}, title='{self.title}', venue_id={self.venue_id})>"