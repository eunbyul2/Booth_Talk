"""
Survey models - 설문조사 및 응답
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB, INET
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Survey(Base):
    __tablename__ = "surveys"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Key
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 설문 정보
    title = Column(String(300), nullable=False)
    description = Column(String)
    
    # 질문 (JSONB)
    questions = Column(JSONB, nullable=False)
    # 예시: [
    #   {
    #     "id": 1,
    #     "type": "text",
    #     "question": "방문 목적은?",
    #     "required": true
    #   },
    #   {
    #     "id": 2,
    #     "type": "choice",
    #     "question": "만족도는?",
    #     "options": ["매우 만족", "만족", "보통", "불만족"],
    #     "required": true
    #   }
    # ]
    
    # 설정
    is_active = Column(Boolean, default=True, index=True)
    require_email = Column(Boolean, default=False)
    require_phone = Column(Boolean, default=False)
    max_responses = Column(Integer)
    current_responses = Column(Integer, default=0)
    
    # 기간
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "(start_date IS NULL AND end_date IS NULL) OR (end_date >= start_date)",
            name="chk_survey_dates"
        ),
    )
    
    # Relationships
    event = relationship("Event", back_populates="surveys")
    responses = relationship("SurveyResponse", back_populates="survey", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Survey(id={self.id}, title='{self.title}', event_id={self.event_id})>"


class SurveyResponse(Base):
    __tablename__ = "survey_responses"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Key
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 응답자 정보
    respondent_name = Column(String(100))
    respondent_email = Column(String(100))
    respondent_phone = Column(String(20))
    respondent_company = Column(String(200))
    booth_number = Column(String(50), index=True)
    
    # 응답 데이터 (JSONB)
    answers = Column(JSONB, nullable=False)
    # 예시: {
    #   "1": "신제품 구경",
    #   "2": "매우 만족",
    #   "3": "친절하고 좋았습니다"
    # }
    
    # 평가
    rating = Column(Integer, index=True)
    review = Column(String)
    
    # IP 및 디바이스 정보
    ip_address = Column(INET)
    user_agent = Column(String)
    
    # 타임스탬프
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "rating IS NULL OR (rating >= 1 AND rating <= 5)",
            name="chk_rating_range"
        ),
    )
    
    # Relationships
    survey = relationship("Survey", back_populates="responses")
    
    def __repr__(self):
        return f"<SurveyResponse(id={self.id}, survey_id={self.survey_id}, rating={self.rating})>"
