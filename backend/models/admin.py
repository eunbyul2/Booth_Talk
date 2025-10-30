"""
Admin model - 관리자 계정
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Admin(Base):
    __tablename__ = "admins"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # 기본 정보
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(100))
    full_name = Column(String(100))
    
    # 상태
    is_active = Column(Boolean, default=True, index=True)
    
    # 타임스탬프
    last_login_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships (관계)
    created_companies = relationship("Company", back_populates="creator", foreign_keys="Company.created_by")
    added_managers = relationship("EventManager", back_populates="added_by_admin")
    
    def __repr__(self):
        return f"<Admin(id={self.id}, username='{self.username}')>"
