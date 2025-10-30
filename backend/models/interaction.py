"""
Event interaction models - 좋아요 및 조회 로그
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class EventLike(Base):
    __tablename__ = "event_likes"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(255), nullable=False, index=True)
    ip_address = Column(INET)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("event_id", "session_id", name="uq_event_like"),
    )

    event = relationship("Event", back_populates="likes")

    def __repr__(self):
        return f"<EventLike(id={self.id}, event_id={self.event_id}, session_id='{self.session_id[:8]}...')>"


class EventView(Base):
    __tablename__ = "event_views"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(255), index=True)
    ip_address = Column(INET)
    user_agent = Column(String)
    referer = Column(String)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    event = relationship("Event", back_populates="views")

    def __repr__(self):
        return f"<EventView(id={self.id}, event_id={self.event_id})>"
