"""
Company model - 기업 계정 (매직 링크 지원)
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Company(Base):
    __tablename__ = "companies"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # 기본 정보
    company_name = Column(String(200), nullable=False)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # 매직 링크 ⭐
    magic_token = Column(String(255), unique=True, index=True)
    token_expires_at = Column(DateTime(timezone=True), index=True)
    
    # 기업 정보
    business_number = Column(String(20))
    email = Column(String(100))
    phone = Column(String(20))
    address = Column(String)
    website_url = Column(String(255))
    
    # 상태 및 접속 정보
    is_active = Column(Boolean, default=True, index=True)
    last_login_at = Column(DateTime(timezone=True))
    login_count = Column(Integer, default=0)
    
    # 메타 정보
    created_by = Column(Integer, ForeignKey("admins.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "(magic_token IS NULL AND token_expires_at IS NULL) OR "
            "(magic_token IS NOT NULL AND token_expires_at IS NOT NULL)",
            name="chk_token_expiry"
        ),
    )
    
    # Relationships
    creator = relationship("Admin", back_populates="created_companies", foreign_keys=[created_by])
    events = relationship("Event", back_populates="company", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Company(id={self.id}, name='{self.company_name}', username='{self.username}')>"
