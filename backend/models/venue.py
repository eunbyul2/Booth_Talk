"""
Venue model - 전시장
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Venue(Base):
    __tablename__ = "venues"

    id = Column(Integer, primary_key=True, index=True)
    venue_name = Column(String(100), nullable=False)
    location = Column(String(50), nullable=False)
    address = Column(String, nullable=False)
    description = Column(String)
    website_url = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    events = relationship("Event", back_populates="venue")

    def __repr__(self):
        return f"<Venue(id={self.id}, name='{self.venue_name}', location='{self.location}')>"
