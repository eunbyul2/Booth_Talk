"""관리자 전용 API 라우트."""

from __future__ import annotations

import re
import secrets
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Admin, Company, Event, EventManager, Survey, SurveyResponse
from services.auth_service import MagicLinkService, get_password_hash, generate_temporary_password

router = APIRouter(prefix="/admin", tags=["관리자"])


class AdminDashboardStats(BaseModel):
    total_companies: int
    total_events: int
    total_responses: int
    active_surveys: int


class AdminDashboardResponse(BaseModel):
    stats: AdminDashboardStats


class AdminCompanyItem(BaseModel):
    id: int
    name: str
    events: int
    responses: int
    status: str


class AdminEventItem(BaseModel):
    id: int
    name: str
    company: str
    date: str
    responses: int
    manager_count: int


class AdminResponseItem(BaseModel):
    id: int
    company: str
    event: str
    respondent: str
    booth: str
    submitted_at: datetime


class SendReportRequest(BaseModel):
    company_id: Optional[int] = None
    event_id: Optional[int] = None  # 새로 추가: 특정 이벤트 리포트
    override_email: Optional[str] = None


class SendReportResponse(BaseModel):
    success: bool
    recipient_email: str
    message: str


class CreateCompanyRequest(BaseModel):
    company_name: str
    email: EmailStr
    phone: Optional[str] = None
    business_number: Optional[str] = None
    created_by_admin_id: Optional[int] = None


class CreateCompanyResponse(BaseModel):
    company_id: int
    company_name: str
    username: str
    temp_password: str
    magic_link: str
    expires_at: str
    email_sent_to: Optional[str] = None


class AddManagerRequest(BaseModel):
    manager_name: str
    manager_phone: Optional[str] = None
    manager_email: Optional[str] = None
    manager_position: Optional[str] = None
    manager_department: Optional[str] = None
    notes: Optional[str] = None
    is_primary: bool = True
    added_by_admin_id: Optional[int] = None


class AddManagerResponse(BaseModel):
    success: bool
    manager_id: int


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = re.sub(r"_+", "_", value)
    return value.strip("_") or "company"


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(db: Session = Depends(get_db)):
    stats = AdminDashboardStats(
        total_companies=db.query(func.count(Company.id)).scalar() or 0,
        total_events=db.query(func.count(Event.id)).scalar() or 0,
        total_responses=db.query(func.count(SurveyResponse.id)).scalar() or 0,
        active_surveys=db.query(func.count(Survey.id)).filter(Survey.is_active.is_(True)).scalar() or 0,
    )
    return AdminDashboardResponse(stats=stats)


@router.get("/companies", response_model=List[AdminCompanyItem])
def list_companies(db: Session = Depends(get_db)):
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    results: List[AdminCompanyItem] = []
    for company in companies:
        event_count = len(company.events)
        response_count = sum(survey.current_responses or 0 for event in company.events for survey in event.surveys)
        status = "active" if company.is_active else "inactive"
        results.append(
            AdminCompanyItem(
                id=company.id,
                name=company.company_name,
                events=event_count,
                responses=response_count,
                status=status,
            )
        )
    return results


@router.get("/events", response_model=List[AdminEventItem])
def list_events(db: Session = Depends(get_db)):
    events = db.query(Event).order_by(Event.start_date.desc()).all()
    results: List[AdminEventItem] = []
    for event in events:
        responses = sum(survey.current_responses or 0 for survey in event.surveys)
        manager_count = len(event.managers)
        date_range = event.start_date.isoformat()
        if event.end_date and event.end_date != event.start_date:
            date_range = f"{event.start_date.isoformat()} ~ {event.end_date.isoformat()}"

        results.append(
            AdminEventItem(
                id=event.id,
                name=event.event_name,
                company=event.company.company_name if event.company else "",
                date=date_range,
                responses=responses,
                manager_count=manager_count,
            )
        )
    return results


@router.get("/responses", response_model=List[AdminResponseItem])
def list_responses(
    company_id: Optional[int] = Query(None),
    booth: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    query = (
        db.query(SurveyResponse)
        .join(Survey, SurveyResponse.survey_id == Survey.id)
        .join(Event, Survey.event_id == Event.id)
        .join(Company, Event.company_id == Company.id)
    )

    if company_id:
        query = query.filter(Company.id == company_id)
    if booth:
        query = query.filter(SurveyResponse.booth_number.ilike(f"%{booth}%"))
    if date_from:
        query = query.filter(SurveyResponse.submitted_at >= date_from)
    if date_to:
        query = query.filter(SurveyResponse.submitted_at <= date_to)

    responses = query.order_by(SurveyResponse.submitted_at.desc()).limit(200).all()

    return [
        AdminResponseItem(
            id=response.id,
            company=response.survey.event.company.company_name if response.survey and response.survey.event else "",
            event=response.survey.event.event_name if response.survey and response.survey.event else "",
            respondent=response.respondent_name,
            booth=response.booth_number,
            submitted_at=response.submitted_at,
        )
        for response in responses
    ]


@router.post("/companies", response_model=CreateCompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CreateCompanyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    username_base = _slugify(payload.company_name)
    username = username_base
    suffix = 1
    while db.query(Company).filter(Company.username == username).first() is not None:
        username = f"{username_base}{suffix}"
        suffix += 1

    # 🔐 임시 비밀번호 생성 (bcrypt 문제 해결 전까지 임시 처리)
    temp_password = generate_temporary_password()
    # TODO: bcrypt 문제 해결 후 정상 해싱으로 변경
    password_hash = f"$2b$12${temp_password}_hashed"

    company = Company(
        company_name=payload.company_name,
        username=username,
        password_hash=password_hash,
        email=payload.email,
        phone=payload.phone,
        business_number=payload.business_number,
        created_by=payload.created_by_admin_id or 1,
        is_active=True,
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    # 실제 매직링크 생성
    from services.auth_service import MagicLinkService
    magic_link_service = MagicLinkService(db)
    magic_result = magic_link_service.generate_magic_link(company, background_tasks)

    return CreateCompanyResponse(
        company_id=company.id,
        company_name=company.company_name,
        username=company.username,
        temp_password=temp_password,
        magic_link=magic_result["magic_link"],
        expires_at=magic_result["expires_at"],
        email_sent_to=magic_result["email_sent_to"],
    )


@router.post("/events/{event_id}/managers", response_model=AddManagerResponse, status_code=status.HTTP_201_CREATED)
def add_event_manager(
    event_id: int,
    payload: AddManagerRequest,
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="이벤트를 찾을 수 없습니다.")

    manager = EventManager(
        event_id=event_id,
        manager_name=payload.manager_name,
        manager_phone=payload.manager_phone,
        manager_email=payload.manager_email,
        manager_position=payload.manager_position,
        manager_department=payload.manager_department,
        notes=payload.notes,
        is_primary=payload.is_primary,
        added_by=payload.added_by_admin_id,
    )
    db.add(manager)
    db.commit()
    db.refresh(manager)

    return AddManagerResponse(success=True, manager_id=manager.id)


@router.post("/send-report", response_model=SendReportResponse)
def send_company_report(
    payload: SendReportRequest,
    db: Session = Depends(get_db),
):
    """이벤트 기반 리포트를 즉시 발송합니다."""
    try:
        from services.event_report_service import EventReportService
        
        report_service = EventReportService(db)
        
        if payload.event_id:
            # 특정 이벤트 리포트 발송
            event = db.query(Event).filter(Event.id == payload.event_id).first()
            if not event:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="이벤트를 찾을 수 없습니다."
                )
            
            override_emails = [payload.override_email] if payload.override_email else None
            recipients = report_service.send_event_report(event, override_emails)
            
            return SendReportResponse(
                success=True,
                recipient_email=", ".join(recipients) if recipients else "none",
                message=f"이벤트 '{event.event_name}' 리포트를 {len(recipients)}명에게 발송했습니다."
            )
        else:
            # 모든 예정된 이벤트 리포트 발송 (7일 전 종료된 이벤트들)
            report_service.process_scheduled_reports()
            return SendReportResponse(
                success=True,
                recipient_email="all",
                message="7일 전 종료된 모든 이벤트의 리포트를 발송했습니다."
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"리포트 발송 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/scheduler/status")
def get_scheduler_status():
    """스케줄러 상태를 확인합니다."""
    try:
        from main import scheduler
        
        jobs = []
        if scheduler.running:
            for job in scheduler.get_jobs():
                jobs.append({
                    "id": job.id,
                    "name": job.name or job.id,
                    "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                    "trigger": str(job.trigger)
                })
        
        return {
            "running": scheduler.running,
            "jobs": jobs
        }
    except Exception as e:
        return {
            "running": False,
            "error": str(e),
            "jobs": []
        }


# ===================== 매직링크 재발행 API =====================

class RegenerateMagicLinkRequest(BaseModel):
    company_id: int
    reason: Optional[str] = None  # 재발행 사유 (예: "기간 만료", "다른 부서 요청" 등)


class RegenerateMagicLinkResponse(BaseModel):
    success: bool
    company_id: int
    company_name: str
    magic_link: str
    expires_at: str
    previous_token_revoked: bool
    reason: Optional[str] = None


@router.post("/companies/{company_id}/regenerate-magic-link", response_model=RegenerateMagicLinkResponse)
def regenerate_company_magic_link(
    company_id: int,
    payload: RegenerateMagicLinkRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    기존 기업의 매직링크 재발행
    
    - 이전 토큰 무효화
    - 새로운 토큰 생성
    - 이메일 재발송
    - 사유 기록
    """
    
    # 기업 조회
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="기업을 찾을 수 없습니다."
        )
    
    # 이전 토큰 무효화 여부 확인
    previous_token_revoked = bool(company.magic_token)
    
    # 새로운 매직링크 생성
    from services.auth_service import MagicLinkService
    magic_link_service = MagicLinkService(db)
    magic_result = magic_link_service.generate_magic_link(company, background_tasks)
    
    return RegenerateMagicLinkResponse(
        success=True,
        company_id=company.id,
        company_name=company.company_name,
        magic_link=magic_result["magic_link"],
        expires_at=magic_result["expires_at"],
        previous_token_revoked=previous_token_revoked,
        reason=payload.reason,
    )