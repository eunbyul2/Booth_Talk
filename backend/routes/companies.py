"""기업 전용 API 라우트."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Company, Event, EventView, EventLike, Survey, SurveyResponse

router = APIRouter(prefix="/companies", tags=["기업"])


class CompanySummary(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None


class DashboardStats(BaseModel):
    total_events: int
    active_surveys: int
    total_responses: int
    total_views: int
    total_likes: int


class EventBrief(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: Optional[date] = None
    response_count: int
    status: str


class CompanyDashboardResponse(BaseModel):
    company: CompanySummary
    stats: DashboardStats
    recent_events: List[EventBrief]


class CompanyEventItem(BaseModel):
    id: int
    event_name: str
    event_type: Optional[str]
    start_date: date
    end_date: Optional[date]
    start_time: Optional[str]
    end_time: Optional[str]
    view_count: int
    like_count: int
    survey_count: int
    current_responses: int
    is_active: bool


class CompanySurveyItem(BaseModel):
    id: int
    event_id: int
    title: str
    is_active: bool
    current_responses: int
    start_date: Optional[datetime]
    end_date: Optional[datetime]


class SurveyDistributionItem(BaseModel):
    label: str
    count: int
    percentage: float


class SurveyQuestionStats(BaseModel):
    id: int
    question_text: str
    question_type: str
    total_responses: int
    distribution: Dict[str, SurveyDistributionItem]
    statistics: Optional[Dict[str, Any]] = None
    free_form_answers: Optional[List[str]] = None


class SurveyStatisticsResponse(BaseModel):
    survey: CompanySurveyItem
    questions: List[SurveyQuestionStats]


def _get_company_or_404(db: Session, company_id: int) -> Company:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="기업 정보를 찾을 수 없습니다.")
    return company


def _event_status(event: Event) -> str:
    today = datetime.utcnow().date()
    if event.start_date and event.end_date:
        if event.start_date <= today <= event.end_date:
            return "ongoing"
        if today < event.start_date:
            return "upcoming"
        return "ended"
    if today < event.start_date:
        return "upcoming"
    if today == event.start_date:
        return "ongoing"
    return "ended"


@router.get("/{company_id}/dashboard", response_model=CompanyDashboardResponse)
def get_company_dashboard(company_id: int, db: Session = Depends(get_db)):
    company = _get_company_or_404(db, company_id)

    total_events = db.query(func.count(Event.id)).filter(Event.company_id == company_id).scalar() or 0

    active_surveys = (
        db.query(func.count(Survey.id))
        .join(Event, Survey.event_id == Event.id)
        .filter(Event.company_id == company_id, Survey.is_active.is_(True))
        .scalar()
        or 0
    )

    total_responses = (
        db.query(func.count(SurveyResponse.id))
        .join(Survey, SurveyResponse.survey_id == Survey.id)
        .join(Event, Survey.event_id == Event.id)
        .filter(Event.company_id == company_id)
        .scalar()
        or 0
    )

    total_views = db.query(func.coalesce(func.sum(Event.view_count), 0)).filter(Event.company_id == company_id).scalar() or 0
    total_likes = db.query(func.count(EventLike.id)).join(Event, EventLike.event_id == Event.id).filter(Event.company_id == company_id).scalar() or 0

    recent_events_rows = (
        db.query(Event)
        .filter(Event.company_id == company_id)
        .order_by(Event.start_date.desc(), Event.created_at.desc())
        .limit(5)
        .all()
    )

    recent_events: List[EventBrief] = []
    for event in recent_events_rows:
        response_count = (
            db.query(func.count(SurveyResponse.id))
            .join(Survey, SurveyResponse.survey_id == Survey.id)
            .filter(Survey.event_id == event.id)
            .scalar()
            or 0
        )
        recent_events.append(
            EventBrief(
                id=event.id,
                name=event.event_name,
                start_date=event.start_date,
                end_date=event.end_date,
                response_count=response_count,
                status=_event_status(event),
            )
        )

    return CompanyDashboardResponse(
        company=CompanySummary(
            id=company.id,
            name=company.company_name,
            email=company.email,
            phone=company.phone,
        ),
        stats=DashboardStats(
            total_events=total_events,
            active_surveys=active_surveys,
            total_responses=total_responses,
            total_views=total_views,
            total_likes=total_likes,
        ),
        recent_events=recent_events,
    )


@router.get("/{company_id}/events", response_model=List[CompanyEventItem])
def get_company_events(company_id: int, db: Session = Depends(get_db)):
    _get_company_or_404(db, company_id)

    events = (
        db.query(Event)
        .filter(Event.company_id == company_id)
        .order_by(Event.start_date.asc(), Event.start_time.asc())
        .all()
    )

    results: List[CompanyEventItem] = []
    for event in events:
        survey_ids = [survey.id for survey in event.surveys]
        survey_count = len(survey_ids)
        current_responses = (
            db.query(func.count(SurveyResponse.id))
            .filter(SurveyResponse.survey_id.in_(survey_ids))
            .scalar()
            if survey_ids
            else 0
        ) or 0

        results.append(
            CompanyEventItem(
                id=event.id,
                event_name=event.event_name,
                event_type=event.event_type,
                start_date=event.start_date,
                end_date=event.end_date,
                start_time=event.start_time,
                end_time=event.end_time,
                view_count=event.view_count or 0,
                like_count=event.like_count or 0,
                survey_count=survey_count,
                current_responses=current_responses,
                is_active=bool(event.is_active),
            )
        )

    return results


@router.get("/{company_id}/surveys", response_model=List[CompanySurveyItem])
def get_company_surveys(company_id: int, db: Session = Depends(get_db)):
    _get_company_or_404(db, company_id)

    surveys = (
        db.query(Survey)
        .join(Event, Survey.event_id == Event.id)
        .filter(Event.company_id == company_id)
        .order_by(Survey.created_at.desc())
        .all()
    )

    return [
        CompanySurveyItem(
            id=survey.id,
            event_id=survey.event_id,
            title=survey.title,
            is_active=bool(survey.is_active),
            current_responses=survey.current_responses or 0,
            start_date=survey.start_date,
            end_date=survey.end_date,
        )
        for survey in surveys
    ]


def _calculate_distribution(question: dict, answers: List[Any]) -> SurveyQuestionStats:
    question_id = question.get("id")
    question_text = question.get("question_text") or question.get("text") or ""
    question_type = question.get("question_type") or question.get("type") or "text"

    total_responses = len(answers)
    distribution: Dict[str, SurveyDistributionItem] = {}
    statistics: Optional[Dict[str, Any]] = None
    free_form: List[str] = []

    if question_type in {"radio", "checkbox", "select"}:
        counter = Counter()
        for answer in answers:
            if isinstance(answer, list):
                counter.update(str(item) for item in answer if item is not None)
            elif answer is not None:
                counter.update([str(answer)])

        for label, count in counter.items():
            percentage = (count / total_responses * 100) if total_responses else 0.0
            distribution[label] = SurveyDistributionItem(label=label, count=count, percentage=round(percentage, 2))

    elif question_type == "rating":
        numeric_answers = [int(answer) for answer in answers if isinstance(answer, (int, float, str)) and str(answer).isdigit()]
        counter = Counter(str(value) for value in numeric_answers)
        for label, count in counter.items():
            percentage = (count / total_responses * 100) if total_responses else 0.0
            distribution[label] = SurveyDistributionItem(label=label, count=count, percentage=round(percentage, 2))

        if numeric_answers:
            statistics = {
                "average": round(sum(numeric_answers) / len(numeric_answers), 2),
                "min": min(numeric_answers),
                "max": max(numeric_answers),
            }

    else:
        free_form = [str(answer) for answer in answers if answer]

    # ensure choices with zero count are present
    choices = question.get("choices") or []
    for choice in choices:
        label = str(choice if not isinstance(choice, dict) else choice.get("label") or choice.get("value"))
        if not label:
            continue
        if label not in distribution:
            distribution[label] = SurveyDistributionItem(label=label, count=0, percentage=0.0)

    return SurveyQuestionStats(
        id=question_id,
        question_text=question_text,
        question_type=question_type,
        total_responses=total_responses,
        distribution=distribution,
        statistics=statistics,
        free_form_answers=free_form or None,
    )


@router.get("/surveys/{survey_id}/stats", response_model=SurveyStatisticsResponse)
def get_survey_statistics(survey_id: int, db: Session = Depends(get_db)):
    survey = (
        db.query(Survey)
        .join(Event, Survey.event_id == Event.id)
        .filter(Survey.id == survey_id)
        .first()
    )

    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="설문을 찾을 수 없습니다.")

    survey_item = CompanySurveyItem(
        id=survey.id,
        event_id=survey.event_id,
        title=survey.title,
        is_active=bool(survey.is_active),
        current_responses=survey.current_responses or 0,
        start_date=survey.start_date,
        end_date=survey.end_date,
    )

    responses = survey.responses or []
    question_map: Dict[str, List[Any]] = defaultdict(list)

    for response in responses:
        answers = response.answers or {}
        for question_key, value in answers.items():
            question_map[str(question_key)].append(value)

    question_stats: List[SurveyQuestionStats] = []
    for question in survey.questions or []:
        q_id = question.get("id")
        if q_id is None:
            continue
        answers = question_map.get(str(q_id), [])
        stats = _calculate_distribution(question, answers)
        question_stats.append(stats)

    return SurveyStatisticsResponse(survey=survey_item, questions=question_stats)