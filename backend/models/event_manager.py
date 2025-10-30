"""
EventManager model - 이벤트 담당자 (관리자가 별도 관리) ⭐
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class EventManager(Base):
    __tablename__ = "event_managers"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Key
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 담당자 정보
    manager_name = Column(String(100), nullable=False)
    manager_phone = Column(String(20), index=True)
    manager_email = Column(String(100), index=True)
    manager_position = Column(String(100))
    manager_department = Column(String(100))
    
    # 추가 정보
    notes = Column(String)  # 관리자 전용 메모 (기업은 볼 수 없음)
    is_primary = Column(Boolean, default=False, index=True)  # 주 담당자 여부
    
    # 메타 정보
    added_by = Column(Integer, ForeignKey("admins.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    event = relationship("Event", back_populates="managers")
    added_by_admin = relationship("Admin", back_populates="added_managers")
    
    def __repr__(self):
        return f"<EventManager(id={self.id}, name='{self.manager_name}', event_id={self.event_id})>"
