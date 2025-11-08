"""
관람객용 이벤트 검색 API
- 현재 시간 기준 입장 가능한 이벤트만 표시
- 방문 시간 변경 필터링 기능
"""
from datetime import date, datetime, time as dt_time
from typing import List, Optional

import os
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from database import get_db
from models import Company, Event, Exhibition, Survey, SurveyResponse as SurveyResponseModel, Venue
from services.unsplash_service import get_unsplash_service

router = APIRouter()


# Helper Functions
async def get_valid_image_url(event, db: Session) -> Optional[str]:
    """
    이미지 URL을 반환하되, placeholder.com이나 via.placeholder.com 같은
    외부 의존성 URL은 None으로 반환하여 프론트에서 fallback 사용

    우선순위:
    1) has_custom_image=True인 커스텀 이미지 (단, placeholder 제외)
    2) Unsplash 자동 생성 이미지
    3) 이미지 없으면 즉시 Unsplash에서 생성하여 저장
    """
    # 1) 커스텀 이미지 우선 (placeholder 제외)
    if event.has_custom_image and event.image_url:
        # 단, placeholder URL은 무시
        if not ("placeholder.com" in event.image_url or "placehold.co" in event.image_url):
            return event.image_url

    # 2) Unsplash 자동 생성 이미지
    if event.unsplash_image_url:
        return event.unsplash_image_url

    # 3) 기본 image_url이 있고 placeholder가 아닌 경우
    if event.image_url and not ("placeholder.com" in event.image_url or "placehold.co" in event.image_url):
        return event.image_url

    # 4) 이미지가 없으면 즉시 Unsplash에서 생성
    try:
        unsplash_service = get_unsplash_service()
        image_data = await unsplash_service.get_event_image(
            event_name=event.event_name,
            description=event.description or "",
            tags=event.categories if event.categories else [],
            orientation="landscape"
        )

        if image_data and image_data.get("url_regular"):
            # DB에 저장
            event.unsplash_image_url = image_data["url_regular"]
            db.commit()
            return image_data["url_regular"]
    except Exception as e:
        print(f"Unsplash 이미지 생성 실패 (Event ID: {event.id}): {str(e)}")

    # 5) 모든 시도 실패 시 None 반환
    return None


# Response Models
class SurveySummary(BaseModel):
    id: int
    title: str
    is_active: bool
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class EventResponse(BaseModel):
    id: int
    company_id: int
    company_name: str
    event_name: str
    event_type: Optional[str] = None
    start_date: date
    end_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    booth_number: Optional[str] = None
    image_url: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    exhibition_id: int
    exhibition_title: str
    exhibition_subtitle: Optional[str] = None
    exhibition_start_date: date
    exhibition_end_date: date
    exhibition_hall: Optional[str] = None
    exhibition_category: Optional[str] = None
    exhibition_classification: Optional[str] = None
    exhibition_sector: Optional[str] = None
    venue_id: Optional[int] = None
    venue_name: Optional[str] = None
    venue_location: Optional[str] = None
    venue_address: Optional[str] = None
    is_available_now: bool = Field(description="현재 입장 가능 여부")
    available_hours: str = Field(description="입장 가능 시간")
    days_until_start: int
    active_survey_id: Optional[int] = None
    surveys: List[SurveySummary] = Field(default_factory=list)


class EventSearchResponse(BaseModel):
    total: int
    available_count: int
    upcoming_count: int
    events: List[EventResponse]
    filter_info: dict


class SurveyDetailResponse(BaseModel):
    id: int
    event_id: int
    title: str
    description: Optional[str] = None
    questions: List[dict]
    is_active: bool
    require_email: bool
    require_phone: bool
    current_responses: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    event_name: str
    company_name: str


class SurveyResponseCreateRequest(BaseModel):
    answers: dict
    respondent_name: Optional[str] = None
    respondent_email: Optional[str] = None
    respondent_company: Optional[str] = None
    respondent_phone: Optional[str] = None
    booth_number: Optional[str] = None
    rating: Optional[int] = None
    review: Optional[str] = None


def _parse_time(value: Optional[str]) -> Optional[dt_time]:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%H:%M").time()
    except ValueError:
        return None


def is_event_available(event: Event, target_datetime: datetime) -> bool:
    """
    특정 시간에 이벤트 입장이 가능한지 확인
    
    Args:
        event: 이벤트 객체
        target_datetime: 확인할 날짜/시간
    
    if not event.start_date or not (event.start_date <= target_datetime.date() <= (event.end_date or event.start_date)):
        입장 가능 여부
    """
    # 날짜 범위 확인
    event_end = event.end_date or event.start_date
    if not (event.start_date <= target_datetime.date() <= event_end):
        return False
    
    # 시간 확인
    event_start = _parse_time(event.start_time)
    event_finish = _parse_time(event.end_time)
    if not event_start or not event_finish:
        return True

    target_time = target_datetime.time()
    if event_start <= event_finish:
        return event_start <= target_time <= event_finish
    # Overnight events (rare)
    return target_time >= event_start or target_time <= event_finish


def calculate_event_info(event: Event, current_time: datetime) -> dict:
    """이벤트 부가 정보 계산"""
    is_available = is_event_available(event, current_time)
    
    # 시작까지 남은 일수
    days_until = (event.start_date - current_time.date()).days
    
    # 입장 가능 시간 포맷팅
    if event.start_time or event.end_time:
        available_hours = f"{event.start_time or '--:--'} - {event.end_time or '--:--'}"
    else:
        available_hours = "시간 정보 없음"
    
    return {
        "is_available_now": is_available,
        "available_hours": available_hours,
        "days_until_start": days_until
    }


async def build_event_response(
    event: Event,
    company: Company,
    exhibition: Exhibition,
    current_time: datetime,
    venue: Optional[Venue],
    db: Session
) -> EventResponse:
    event_info = calculate_event_info(event, current_time)
    active_survey = next((survey for survey in event.surveys if survey.is_active), None)
    surveys = [
        SurveySummary(
            id=survey.id,
            title=survey.title,
            is_active=survey.is_active,
            start_date=survey.start_date,
            end_date=survey.end_date,
        )
        for survey in event.surveys
    ]

    return EventResponse(
        id=event.id,
        company_id=event.company_id,
        company_name=company.company_name,
        event_name=event.event_name,
        event_type=event.event_type,
        start_date=event.start_date,
        end_date=event.end_date or event.start_date,
        start_time=event.start_time,
        end_time=event.end_time,
        location=event.location,
        description=event.description,
        booth_number=event.booth_number,
        # 이미지 우선순위: 1) 주최측 커스텀 이미지, 2) Unsplash 자동 생성 이미지, 3) None
        image_url=await get_valid_image_url(event, db),
        latitude=event.latitude,
        longitude=event.longitude,
        exhibition_id=exhibition.id,
        exhibition_title=exhibition.title,
        exhibition_subtitle=exhibition.subtitle,
        exhibition_start_date=exhibition.start_date,
        exhibition_end_date=exhibition.end_date,
        exhibition_hall=exhibition.hall_location,
        exhibition_category=exhibition.category,
        exhibition_classification=exhibition.classification,
        exhibition_sector=exhibition.sector,
        venue_id=venue.id if venue else None,
        venue_name=venue.venue_name if venue else None,
        venue_location=venue.location if venue else None,
        venue_address=venue.address if venue else None,
        active_survey_id=active_survey.id if active_survey else None,
        surveys=surveys,
        **event_info,
    )


@router.get("/visitor/events", response_model=EventSearchResponse)
async def search_available_events(
    db: Session = Depends(get_db),
    visit_date: Optional[str] = Query(None, description="방문 희망 날짜 (YYYY-MM-DD)"),
    visit_time: Optional[str] = Query(None, description="방문 희망 시간 (HH:MM)"),
    event_type: Optional[str] = Query(None, description="이벤트 타입 필터"),
    location: Optional[str] = Query(None, description="장소 필터"),
    venue_name: Optional[str] = Query(None, description="전시장 이름 필터"),
    venue_id: Optional[int] = Query(None, description="전시장 ID 필터"),
    company_name: Optional[str] = Query(None, description="회사명 검색"),
    keyword: Optional[str] = Query(None, description="이벤트명/설명 검색 키워드"),
    only_available: bool = Query(True, description="현재/지정시간 입장 가능한 이벤트만"),
    sort_by: Optional[str] = Query("date_asc", description="정렬 방식: date_asc(시간 빠른 순), date_desc(시간 느린 순)"),
    limit: int = Query(50, le=100),
    offset: int = Query(0)
):
    """
    관람객용 이벤트 검색
    
    - 기본: 현재 시간 기준 입장 가능한 이벤트
    - 필터: 원하는 날짜/시간으로 변경 가능
    """
    
    # 방문 시간 설정
    if visit_date and visit_time:
        target_datetime = datetime.strptime(
            f"{visit_date} {visit_time}", 
            "%Y-%m-%d %H:%M"
        )
    elif visit_date:
        target_datetime = datetime.strptime(visit_date, "%Y-%m-%d")
        target_datetime = target_datetime.replace(hour=9, minute=0)
    else:
        target_datetime = datetime.now()
    
    # 기본 쿼리
    query = db.query(Event, Company, Exhibition, Venue).join(
        Company, Event.company_id == Company.id
    ).join(
        Exhibition, Event.exhibition_id == Exhibition.id
    ).join(
        Venue, Exhibition.venue_id == Venue.id
    )

    # 날짜 범위 필터 (종료되지 않은 이벤트만)
    query = query.filter(or_(Event.end_date.is_(None), Event.end_date >= target_datetime.date()))
    # 입장 가능한 이벤트만 필터링
    if only_available:
        # 날짜가 범위 내에 있는 이벤트만
        query = query.filter(
            and_(
                Event.start_date <= target_datetime.date(),
                Event.end_date >= target_datetime.date()
            )
        )
    
    # 이벤트 타입 필터
    if event_type:
        query = query.filter(Event.event_type == event_type)
    
    # 장소 필터
    if location:
        like_pattern = f"%{location}%"
        query = query.filter(
            or_(
                Event.location.ilike(like_pattern),
                Exhibition.hall_location.ilike(like_pattern),
                Venue.venue_name.ilike(like_pattern),
                Venue.location.ilike(like_pattern),
            )
        )

    if venue_id:
        query = query.filter(Exhibition.venue_id == venue_id)

    if venue_name:
        venue_like = f"%{venue_name}%"
        query = query.filter(
            or_(
                Venue.venue_name.ilike(venue_like),
                Event.location.ilike(venue_like),
            )
        )
    
    # 회사명 검색
    if company_name:
        query = query.filter(Company.company_name.ilike(f"%{company_name}%"))

    # 키워드 검색 (이벤트명/설명/회사명)
    if keyword:
        like_pattern = f"%{keyword}%"
        query = query.filter(
            or_(
                Event.event_name.ilike(like_pattern),
                Event.description.ilike(like_pattern),
                Company.company_name.ilike(like_pattern),
            )
        )
    
    # 정렬
    if sort_by == "date_desc":
        query = query.order_by(Event.start_date.desc(), Event.start_time.desc())
    else:  # date_asc (default)
        query = query.order_by(Event.start_date.asc(), Event.start_time.asc())
    
    # 전체 개수 계산
    total_count = query.count()
    
    # 페이지네이션
    results = query.offset(offset).limit(limit).all()
    
    # 응답 데이터 구성
    event_responses: List[EventResponse] = []
    available_count = 0
    upcoming_count = 0

    for event, company, exhibition, venue in results:
        response = await build_event_response(event, company, exhibition, target_datetime, venue, db)

        if response.is_available_now:
            available_count += 1
        if response.days_until_start > 0:
            upcoming_count += 1

        if only_available and not response.is_available_now:
            continue

        event_responses.append(response)
    
    return EventSearchResponse(
        total=len(event_responses),
        available_count=available_count,
        upcoming_count=upcoming_count,
        events=event_responses,
        filter_info={
            "target_date": target_datetime.date().isoformat(),
            "target_time": target_datetime.time().strftime("%H:%M"),
            "filters_applied": {
                "event_type": event_type,
                "location": location,
                "venue_name": venue_name,
                "venue_id": venue_id,
                "company_name": company_name,
                "keyword": keyword,
                "only_available": only_available
            }
        }
    )


@router.get("/visitor/events/{event_id}", response_model=EventResponse)
async def get_event_detail(
    event_id: int,
    db: Session = Depends(get_db),
    visit_time: Optional[str] = Query(None, description="방문 예정 시간 (YYYY-MM-DD HH:MM)")
):
    """
    이벤트 상세 정보 조회
    """
    result = db.query(Event, Company, Exhibition, Venue).join(
        Company, Event.company_id == Company.id
    ).join(
        Exhibition, Event.exhibition_id == Exhibition.id
    ).join(
        Venue, Exhibition.venue_id == Venue.id
    ).filter(Event.id == event_id).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="이벤트를 찾을 수 없습니다")
    
    event, company, exhibition, venue = result
    
    # 방문 시간 설정
    if visit_time:
        target_datetime = datetime.strptime(visit_time, "%Y-%m-%d %H:%M")
    else:
        target_datetime = datetime.now()
    
    return await build_event_response(event, company, exhibition, target_datetime, venue, db)


@router.get("/visitor/surveys/{survey_id}", response_model=SurveyDetailResponse)
async def get_survey_detail(
    survey_id: int,
    db: Session = Depends(get_db)
):
    survey_query = db.query(Survey, Event, Company).join(
        Event, Survey.event_id == Event.id
    ).join(Company, Event.company_id == Company.id)

    result = survey_query.filter(Survey.id == survey_id).first()

    if not result:
        raise HTTPException(status_code=404, detail="설문을 찾을 수 없습니다")

    survey, event, company = result

    return SurveyDetailResponse(
        id=survey.id,
        event_id=survey.event_id,
        title=survey.title,
        description=survey.description,
        questions=survey.questions or [],
        is_active=survey.is_active,
        require_email=survey.require_email,
        require_phone=survey.require_phone,
        current_responses=survey.current_responses or 0,
        start_date=survey.start_date,
        end_date=survey.end_date,
        event_name=event.event_name,
        company_name=company.company_name,
    )


@router.post("/visitor/surveys/{survey_id}/responses")
async def submit_survey_response(
    survey_id: int,
    payload: SurveyResponseCreateRequest,
    db: Session = Depends(get_db)
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()

    if not survey:
        raise HTTPException(status_code=404, detail="설문을 찾을 수 없습니다")

    if not survey.is_active:
        raise HTTPException(status_code=400, detail="현재 응답을 받을 수 없는 설문입니다")

    if payload.rating is not None and not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="평점은 1에서 5 사이여야 합니다")

    response = SurveyResponseModel(
        survey_id=survey_id,
        respondent_name=payload.respondent_name,
        respondent_email=payload.respondent_email,
        respondent_phone=payload.respondent_phone,
        respondent_company=payload.respondent_company,
        booth_number=payload.booth_number,
        answers=payload.answers,
        rating=payload.rating,
        review=payload.review,
    )

    db.add(response)
    survey.current_responses = (survey.current_responses or 0) + 1
    db.commit()
    db.refresh(response)

    return {
        "success": True,
        "survey_id": survey_id,
        "response_id": response.id,
        "submitted_at": response.submitted_at,
    }


@router.get("/visitor/maps-api-key")
@router.get("/visitor/maps_api_key")
@router.get("/maps-api-key")
async def get_google_maps_api_key():
    """프론트엔드에서 사용할 Google Maps API 키를 반환합니다.

    키는 backend/.env 파일의 GOOGLE_MAPS_API_KEY 항목에서 로드됩니다.
    보안을 위해 키 사용 도메인을 Google Cloud 콘솔에서 "HTTP referrer"로 제한하세요.
    """
    # .env 로드 (이미 로드되어 있다면 중복 호출해도 무해)
    load_dotenv()
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=404, detail="Google Maps API 키가 설정되지 않았습니다.")
    return {"key": api_key}


@router.get("/visitor/events/stats")
async def get_event_statistics(
    db: Session = Depends(get_db)
):
    """
    전체 이벤트 통계
    """
    current_time = datetime.now()
    
    # 전체 이벤트
    total_events = db.query(Event).count()
    
    # 현재 진행 중인 이벤트
    ongoing_events = db.query(Event).filter(
        and_(
            Event.start_date <= current_time.date(),
            Event.end_date >= current_time.date()
        )
    ).count()
    
    # 예정된 이벤트
    upcoming_events = db.query(Event).filter(
        Event.start_date > current_time.date()
    ).count()
    
    # 이벤트 타입별 통계
    event_types = db.query(
        Event.event_type,
        db.func.count(Event.id)
    ).group_by(Event.event_type).all()
    
    return {
        "total_events": total_events,
        "ongoing_events": ongoing_events,
        "upcoming_events": upcoming_events,
        "event_types": {
            event_type: count 
            for event_type, count in event_types
        },
        "timestamp": current_time.isoformat()
    }
