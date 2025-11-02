# routes/events.py
"""Event management routes with LLM helpers."""

import os
from datetime import date, datetime
from typing import List, Optional, Tuple

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from database import get_db
from models.event import Event
from models.tag import Tag, event_tags
from services.llm_service import llm_service


router = APIRouter(prefix="/events", tags=["이벤트"])


# ========================================
# Pydantic 모델 (Request/Response)
# ========================================


class EventFormData(BaseModel):
    """Form content produced by LLM."""

    eventName: str
    boothNumber: str = ""
    date: str
    time: str = ""
    description: str
    participationMethod: str = ""
    benefits: str = ""


class EventCreateRequest(BaseModel):
    """Event creation payload."""

    form_data: EventFormData
    tags: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    company_id: int


class EventResponse(BaseModel):
    """Event payload returned to callers."""

    id: int
    eventName: str
    boothNumber: str
    date: str
    time: str
    description: str
    participationMethod: str
    benefits: str
    tags: List[str]
    categories: List[str]
    company_id: int
    image_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class LLMAnalysisResponse(BaseModel):
    """Response returned by /analyze-image."""

    form_data: EventFormData
    tags: List[str]
    categories: List[str]
    target_audience: List[str] = Field(default_factory=list)
    atmosphere: List[str] = Field(default_factory=list)
    confidence: float


def _parse_date_component(value: str) -> Optional[date]:
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _parse_date_range(value: str) -> Tuple[Optional[date], Optional[date]]:
    if not value:
        return None, None
    separators = ["~", "-", "–", "~", "to"]
    for sep in separators:
        if sep in value:
            start_raw, end_raw = value.split(sep, 1)
            start = _parse_date_component(start_raw)
            end = _parse_date_component(end_raw)
            return start, end or start
    single = _parse_date_component(value)
    return single, single


def _parse_time_component(value: str) -> Optional[str]:
    if not value:
        return None
    value = value.strip()
    for fmt in ("%H:%M", "%H%M"):
        try:
            parsed = datetime.strptime(value, fmt)
            return parsed.strftime("%H:%M")
        except ValueError:
            continue
    return None


def _parse_time_range(value: str) -> Tuple[Optional[str], Optional[str]]:
    if not value:
        return None, None
    separators = ["-", "~", "~", "–", "to"]
    for sep in separators:
        if sep in value:
            start_raw, end_raw = value.split(sep, 1)
            start = _parse_time_component(start_raw)
            end = _parse_time_component(end_raw)
            return start, end or start
    single = _parse_time_component(value)
    return single, single


def _format_time_range(start: Optional[str], end: Optional[str]) -> str:
    if start and end and start != end:
        return f"{start} - {end}"
    return start or ""


def _build_event_response(event: Event) -> EventResponse:
    date_str = ""
    if event.start_date:
        date_str = event.start_date.isoformat()
        if event.end_date and event.end_date != event.start_date:
            date_str = f"{date_str} ~ {event.end_date.isoformat()}"

    time_str = _format_time_range(event.start_time, event.end_time)

    return EventResponse(
        id=event.id,
        eventName=event.event_name,
        boothNumber=event.booth_number or "",
        date=date_str,
        time=time_str,
        description=event.description or "",
        participationMethod=event.participation_method or "",
        benefits=event.benefits or "",
        tags=[tag.name for tag in event.tags],
        categories=event.categories or [],
        company_id=event.company_id,
        image_url=event.image_url,
        created_at=event.created_at,
    )


# ========================================
# 🤖 LLM 이미지 분석 (폼 자동 완성)
# ========================================


@router.post("/analyze-image", response_model=LLMAnalysisResponse)
async def analyze_event_image(
    file: UploadFile = File(...),
    provider: Optional[str] = Query(
        None, description="LLM provider (openai/anthropic)"
    ),
):
    """
    이벤트 이미지 업로드 → LLM 분석 → 폼 자동 완성

    ## 사용법
    1. 이미지 업로드 (포스터, 전단지 등)
    2. LLM이 자동으로 이미지 분석
    3. 폼 데이터 + 태그 자동 생성
    4. 프론트엔드에서 폼에 자동 입력

    ## 응답 예시
    ```json
    {
        "form_data": {
            "eventName": "2024 현대미술 전시회",
            "date": "2024-12-01",
            "time": "10:00-18:00",
            "description": "현대미술 작가 20인의 작품 전시",
            "participationMethod": "현장 등록",
            "benefits": "무료 입장"
        },
        "tags": ["무료관람", "사진촬영가능", "주차가능"],
        "categories": ["현대미술", "미술"],
        "confidence": 0.95
    }
    ```
    """

    # 1. 이미지 저장
    upload_dir = "uploads/temp"
    os.makedirs(upload_dir, exist_ok=True)

    file_path = f"{upload_dir}/{file.filename}"

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    # 2. 이미지 URL 생성 (실제로는 CDN URL)
    image_url = f"http://localhost:8000/{file_path}"

    # 3. LLM 분석
    try:
        result = await llm_service.analyze_and_fill_event_form(
            image_url=image_url,
            provider=provider,
        )
        return LLMAnalysisResponse(**result)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"이미지 분석 실패: {exc}",
        ) from exc


# ========================================
# 📝 이벤트 생성 (LLM 결과 저장)
# ========================================


@router.post("/", response_model=EventResponse)
async def create_event(request: EventCreateRequest, db: Session = Depends(get_db)):
    """LLM 분석 결과로 이벤트를 생성한다."""

    start_date, end_date = _parse_date_range(request.form_data.date)
    if not start_date:
        raise HTTPException(status_code=400, detail="유효한 날짜 형식을 입력해주세요.")

    start_time, end_time = _parse_time_range(request.form_data.time)

    event = Event(
        event_name=request.form_data.eventName,
        booth_number=request.form_data.boothNumber or None,
        description=request.form_data.description,
        participation_method=request.form_data.participationMethod or None,
        benefits=request.form_data.benefits or None,
        start_date=start_date,
        end_date=end_date or start_date,
        start_time=start_time,
        end_time=end_time,
        categories=request.categories or [],
        company_id=request.company_id,
    )

    db.add(event)
    db.flush()

    for raw_tag in request.tags:
        tag_name = (raw_tag or "").strip()
        if not tag_name:
            continue
        tag = db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            tag = Tag(name=tag_name)
            db.add(tag)
        event.tags.append(tag)

    db.commit()
    db.refresh(event)

    return _build_event_response(event)


# ========================================
# 🔍 이벤트 검색 (태그 필터링)
# ========================================


@router.get("/search", response_model=List[EventResponse])
async def search_events(
    tags: Optional[List[str]] = Query(None, description="필터링할 태그 목록"),
    categories: Optional[List[str]] = Query(None, description="필터링할 카테고리"),
    keyword: Optional[str] = Query(None, description="검색 키워드"),
    date_from: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    이벤트 검색 및 필터링

    ## 필터 옵션
    - **tags**: 태그로 필터링 (예: `?tags=무료관람&tags=주차가능`)
    - **categories**: 카테고리로 필터링
    - **keyword**: 제목이나 설명에서 검색
    - **date_from**, **date_to**: 날짜 범위

    ## 사용 예시
    ```
    # 무료관람 + 주차가능 태그
    GET /events/search?tags=무료관람&tags=주차가능

    # 현대미술 카테고리
    GET /events/search?categories=현대미술

    # 키워드 검색
    GET /events/search?keyword=전시회

    # 복합 검색
    GET /events/search?tags=무료관람&categories=현대미술&keyword=서울
    ```
    """

    query = db.query(Event)

    if tags:
        query = query.join(Event.tags).filter(Tag.name.in_(tags))

    if categories:
        category_filters = [Event.categories.contains([cat]) for cat in categories]
        query = query.filter(or_(*category_filters))

    if keyword:
        like_pattern = f"%{keyword}%"
        query = query.filter(
            or_(
                Event.event_name.ilike(like_pattern),
                Event.description.ilike(like_pattern),
            )
        )

    if date_from:
        parsed = _parse_date_component(date_from)
        if parsed:
            query = query.filter(Event.start_date >= parsed)

    if date_to:
        parsed = _parse_date_component(date_to)
        if parsed:
            query = query.filter(Event.end_date.is_(None) | (Event.end_date <= parsed))

    events = query.offset(skip).limit(limit).all()

    return [_build_event_response(event) for event in events]


# ========================================
# 🏷️ 인기 태그 조회
# ========================================


@router.get("/tags/popular")
async def get_popular_tags(
    limit: int = Query(20, ge=1, le=50), db: Session = Depends(get_db)
):
    """
    인기 태그 목록 (사용 빈도순)

    프론트엔드에서 태그 필터 UI에 표시
    """

    popular_tags = (
        db.query(Tag.name, func.count(event_tags.c.event_id).label("count"))
        .join(event_tags, Tag.id == event_tags.c.tag_id)
        .group_by(Tag.id, Tag.name)
        .order_by(func.count(event_tags.c.event_id).desc())
        .limit(limit)
        .all()
    )

    return [{"tag": tag, "count": count} for tag, count in popular_tags]


# ========================================
# 🎨 모든 카테고리 조회
# ========================================


@router.get("/categories")
async def get_all_categories(db: Session = Depends(get_db)):
    """
    모든 카테고리 목록

    프론트엔드에서 카테고리 필터 UI에 표시
    """

    rows = db.query(Event.categories).filter(Event.categories.isnot(None)).all()
    unique = []
    seen = set()
    for (category_list,) in rows:
        if not category_list:
            continue
        for category in category_list:
            if category and category not in seen:
                seen.add(category)
                unique.append(category)
    return unique


# ========================================
# ✏️ 설명 개선 (LLM)
# ========================================


@router.post("/enhance-description")
async def enhance_event_description(
    event_name: str, description: str, provider: Optional[str] = None
):
    """
    이벤트 설명 개선 (LLM 사용)

    사용자가 짧게 입력한 설명을 LLM이 더 매력적으로 개선
    """

    try:
        enhanced = await llm_service.enhance_description(
            original_description=description,
            event_name=event_name,
            provider=provider,
        )
        return {"enhanced_description": enhanced}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"설명 개선 실패: {exc}",
        ) from exc


# ========================================
# 🏷️ 추가 태그 생성 (LLM)
# ========================================


@router.post("/generate-tags")
async def generate_additional_tags(
    form_data: EventFormData,
    existing_tags: List[str] = [],
    provider: Optional[str] = None,
):
    """
    폼 데이터 기반 추가 태그 생성

    사용자가 직접 입력한 폼 데이터를 분석해서 태그 추천
    """

    try:
        new_tags = await llm_service.generate_additional_tags(
            form_data=form_data.dict(),
            existing_tags=existing_tags,
            provider=provider,
        )
        return {"suggested_tags": new_tags}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"태그 생성 실패: {exc}",
        ) from exc
