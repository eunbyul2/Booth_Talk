"""
관람객용 이벤트 검색 API
- 현재 시간 기준 입장 가능한 이벤트만 표시
- 방문 시간 변경 필터링 기능
"""
from datetime import datetime, timedelta, date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel, Field
from database import get_db
from models import Event, Company

router = APIRouter()


# Response Models
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
    is_available_now: bool = Field(description="현재 입장 가능 여부")
    available_hours: str = Field(description="입장 가능 시간")
    days_until_start: int


class EventSearchResponse(BaseModel):
    total: int
    available_count: int
    upcoming_count: int
    events: List[EventResponse]
    filter_info: dict


def is_event_available(
    event: Event,
    target_datetime: datetime
) -> bool:
    """
    특정 시간에 이벤트 입장이 가능한지 확인
    
    Args:
        event: 이벤트 객체
        target_datetime: 확인할 날짜/시간
    
    if not event.start_date or not (event.start_date <= target_datetime.date() <= (event.end_date or event.start_date)):
        입장 가능 여부
    """
    # 날짜 범위 확인
    if not (event.start_date <= target_datetime.date() <= event.end_date):
        return False
    
    # 시간 확인
    target_time = target_datetime.time()
    event_start = datetime.strptime(event.start_time, "%H:%M").time()
    event_end = datetime.strptime(event.end_time, "%H:%M").time()
    
    return event_start <= target_time <= event_end


def calculate_event_info(event: Event, current_time: datetime) -> dict:
    """이벤트 부가 정보 계산"""
    is_available = is_event_available(event, current_time)
    
    # 시작까지 남은 일수
    days_until = (event.start_date - current_time.date()).days
    
    # 입장 가능 시간 포맷팅
    available_hours = f"{event.start_time} - {event.end_time}"
    
    return {
        "is_available_now": is_available,
        "available_hours": available_hours,
        "days_until_start": days_until
    }


@router.get("/visitor/events", response_model=EventSearchResponse)
async def search_available_events(
    db: Session = Depends(get_db),
    visit_date: Optional[str] = Query(None, description="방문 희망 날짜 (YYYY-MM-DD)"),
    visit_time: Optional[str] = Query(None, description="방문 희망 시간 (HH:MM)"),
    event_type: Optional[str] = Query(None, description="이벤트 타입 필터"),
    location: Optional[str] = Query(None, description="장소 필터"),
    company_name: Optional[str] = Query(None, description="회사명 검색"),
    only_available: bool = Query(True, description="현재/지정시간 입장 가능한 이벤트만"),
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
    query = db.query(Event, Company).join(
        Company, Event.company_id == Company.id
    )
    
    # 날짜 범위 필터 (종료되지 않은 이벤트만)
    query = query.filter(Event.end_date >= target_datetime.date())
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
        query = query.filter(Event.location.ilike(f"%{location}%"))
    
    # 회사명 검색
    if company_name:
        query = query.filter(Company.company_name.ilike(f"%{company_name}%"))
    
    # 전체 개수 계산
    total_count = query.count()
    
    # 페이지네이션
    results = query.offset(offset).limit(limit).all()
    
    # 응답 데이터 구성
    event_responses = []
    available_count = 0
    upcoming_count = 0
    
    for event, company in results:
        # 이벤트 정보 계산
        event_info = calculate_event_info(event, target_datetime)
        
        # 시간 필터링 (only_available일 때)
        if only_available:
            if not event_info["is_available_now"]:
                continue
        
        # 카운트 업데이트
        if event_info["is_available_now"]:
            available_count += 1
        elif event_info["days_until_start"] > 0:
            upcoming_count += 1
        
        event_response = EventResponse(
            id=event.id,
            company_id=event.company_id,
            company_name=company.company_name,
            event_name=event.event_name,
            event_type=event.event_type,
            start_date=event.start_date,
            end_date=event.end_date,
            start_time=event.start_time,
            end_time=event.end_time,
            location=event.location,
            description=event.description,
            booth_number=event.booth_number,
            image_url=event.image_url,
            **event_info
        )
        event_responses.append(event_response)
    
    return EventSearchResponse(
        total=total_count,
        available_count=available_count,
        upcoming_count=upcoming_count,
        events=event_responses,
        filter_info={
            "target_date": target_datetime.date().isoformat(),
            "target_time": target_datetime.time().strftime("%H:%M"),
            "filters_applied": {
                "event_type": event_type,
                "location": location,
                "company_name": company_name,
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
    result = db.query(Event, Company).join(
        Company, Event.company_id == Company.id
    ).filter(Event.id == event_id).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="이벤트를 찾을 수 없습니다")
    
    event, company = result
    
    # 방문 시간 설정
    if visit_time:
        target_datetime = datetime.strptime(visit_time, "%Y-%m-%d %H:%M")
    else:
        target_datetime = datetime.now()
    
    # 이벤트 정보 계산
    event_info = calculate_event_info(event, target_datetime)
    
    return EventResponse(
        id=event.id,
        company_id=event.company_id,
        company_name=company.company_name,
        event_name=event.event_name,
        event_type=event.event_type,
        start_date=event.start_date,
        end_date=event.end_date,
        start_time=event.start_time,
        end_time=event.end_time,
        location=event.location,
        description=event.description,
        booth_number=event.booth_number,
        image_url=event.image_url,
        **event_info
    )


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
