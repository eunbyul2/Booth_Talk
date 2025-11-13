# routes/events.py
"""Event management routes with LLM helpers."""

import logging
import os
import uuid
from datetime import date, datetime
from typing import List, Optional, Tuple

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from database import get_db
from models.event import Event
from models.exhibition import Exhibition
from models.venue import Venue
from models.tag import Tag, event_tags
from services.llm_service import llm_service
from services.unsplash_service import get_unsplash_service

REGION_KEYWORDS = {
    "서울": ["서울", "coex", "코엑스", "세텍", "ddp", "송파", "강남", "잠실", "마곡"],
    "경기": ["경기", "킨텍스", "일산", "수원", "고양"],
    "부산": ["부산", "벡스코"],
    "대구": ["대구", "엑스코"],
    "광주": ["광주", "김대중"],
    "인천": ["인천", "송도", "컨벤시아"],
}


def _guess_region(name: str) -> str:
    if not name:
        return "기타"
    lowered = name.lower()
    for region, keywords in REGION_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return region
    return "기타"


def _ensure_venue(db: Session, location_name: str) -> Venue:
    name = (location_name or "").strip() or "미정 전시장"
    existing = (
        db.query(Venue)
        .filter(func.lower(Venue.venue_name) == name.lower())
        .first()
    )
    if existing:
        return existing

    venue = Venue(
        venue_name=name,
        location=_guess_region(name),
        address=f"{name} 주소 미등록",
        description=None,
        website_url=None,
        is_active=True,
    )
    db.add(venue)
    db.flush()
    return venue


def _ensure_exhibition(
    db: Session,
    request: "EventCreateRequest",
    venue: Venue,
    start_date: date,
    end_date: Optional[date],
) -> Exhibition:
    title_candidate = (request.form_data.location or "").strip() or request.form_data.eventName
    normalized_title = title_candidate.strip().lower()
    final_end_date = end_date or start_date

    existing = (
        db.query(Exhibition)
        .filter(Exhibition.venue_id == venue.id)
        .filter(func.lower(Exhibition.title) == normalized_title)
        .filter(Exhibition.start_date == start_date)
        .filter(Exhibition.end_date == final_end_date)
        .first()
    )
    if existing:
        return existing

    exhibition = Exhibition(
        venue_id=venue.id,
        title=title_candidate,
        subtitle=request.form_data.eventName if title_candidate != request.form_data.eventName else None,
        hall_location=(request.form_data.venue or "").strip() or None,
        description=request.form_data.description or None,
        start_date=start_date,
        end_date=final_end_date,
        is_active=True,
    )
    db.add(exhibition)
    db.flush()
    return exhibition


router = APIRouter(tags=["이벤트"])


# ========================================
# Pydantic 모델 (Request/Response)
# ========================================


class EventFormData(BaseModel):
    """Form content produced by LLM."""

    eventName: str
    boothNumber: str = ""
    location: str = ""  # 전시장/장소 정보
    venue: str = ""     # 상세 장소 (홀, 층수 등)
    
    # 분리된 날짜 필드 (기존 date도 호환성을 위해 유지)
    startDate: str = ""
    endDate: str = ""
    date: str = ""  # 기존 필드 (backward compatibility)
    
    # 분리된 시간 필드 (기존 time도 호환성을 위해 유지)
    startTime: str = ""
    endTime: str = ""
    time: str = ""  # 기존 필드 (backward compatibility)
    
    description: str
    participationMethod: str = ""
    benefits: str = ""


class EventCreateRequest(BaseModel):
    """Event creation payload."""

    form_data: EventFormData
    tags: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    company_id: int
    temp_image_path: Optional[str] = None  # 임시 이미지 경로 (서버 이동용)
    original_filename: Optional[str] = None  # 원본 파일명


class EventResponse(BaseModel):
    """Event payload returned to callers."""

    id: int
    eventName: str
    boothNumber: str
    location: str = ""  # 전시장/장소 정보  
    venue: str = ""     # 상세 장소
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
    temp_image_url: Optional[str] = None  # 임시 이미지 URL (프론트엔드용)
    temp_image_path: Optional[str] = None  # 임시 파일 경로 (서버 내부용)
    original_filename: Optional[str] = None  # 원본 파일명


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
    
    # 공백 제거 및 정규화
    value = value.strip()
    
    # 다양한 구분자로 날짜 범위 분리 시도
    separators = ["~", " - ", "-", "–", "~", "to", " ~ "]
    for sep in separators:
        if sep in value:
            parts = value.split(sep, 1)
            if len(parts) == 2:
                start_raw, end_raw = parts
                start = _parse_date_component(start_raw.strip())
                end = _parse_date_component(end_raw.strip())
                return start, end or start
    
    # 단일 날짜 파싱
    single = _parse_date_component(value)
    return single, single


def _parse_time_component(value: str) -> Optional[str]:
    """다양한 시간 형식을 24시간 형식으로 변환"""
    if not value:
        return None
    
    value = value.strip().lower()
    
    # AM/PM 처리를 위한 전처리
    import re
    
    # 다양한 AM/PM 형식 정규화
    value = re.sub(r'오전|morning|am\b|a\.m\.', 'am', value)
    value = re.sub(r'오후|afternoon|evening|pm\b|p\.m\.', 'pm', value)
    value = re.sub(r'시|o\'clock', '', value)
    value = re.sub(r'분|min|minutes?', '', value)
    value = re.sub(r'\s+', ' ', value).strip()
    
    # AM/PM 패턴 매칭
    am_pm_patterns = [
        r'(\d{1,2}):?(\d{0,2})\s*(am|pm)',
        r'(\d{1,2})\s*(am|pm)',
        r'(\d{1,2}):(\d{2})\s*(am|pm)',
    ]
    
    for pattern in am_pm_patterns:
        match = re.search(pattern, value)
        if match:
            hour = int(match.group(1))
            minute = int(match.group(2)) if match.group(2) else 0
            period = match.group(3)
            
            # 12시간 → 24시간 변환
            if period == 'pm' and hour != 12:
                hour += 12
            elif period == 'am' and hour == 12:
                hour = 0
                
            return f"{hour:02d}:{minute:02d}"
    
    # 한국어 시간 처리 (오전/오후)
    korean_patterns = [
        r'(\d{1,2})\s*시\s*(\d{0,2})\s*분?',
        r'(\d{1,2}):(\d{2})',
        r'(\d{1,2})\s*시',
    ]
    
    for pattern in korean_patterns:
        match = re.search(pattern, value)
        if match:
            hour = int(match.group(1))
            minute = int(match.group(2)) if len(match.groups()) > 1 and match.group(2) else 0
            
            # 오후 처리 (이미 정규화됨)
            if 'pm' in value and hour != 12:
                hour += 12
            elif 'am' in value and hour == 12:
                hour = 0
                
            return f"{hour:02d}:{minute:02d}"
    
    # 기본 24시간 형식 시도
    basic_patterns = [
        r'(\d{1,2}):(\d{2})',
        r'(\d{1,2})(\d{2})',
    ]
    
    for pattern in basic_patterns:
        match = re.search(pattern, value)
        if match:
            hour = int(match.group(1))
            minute = int(match.group(2))
            
            if 0 <= hour <= 23 and 0 <= minute <= 59:
                return f"{hour:02d}:{minute:02d}"
    
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

    venue_detail = ""
    if event.exhibition and event.exhibition.hall_location:
        venue_detail = event.exhibition.hall_location

    return EventResponse(
        id=event.id,
        eventName=event.event_name,
        boothNumber=event.booth_number or "",
        location=event.location or "",  # 전시장/장소
        venue=venue_detail,
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
# LLM 이미지 분석 (폼 자동 완성)
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

    # 1. 파일 유효성 검사
    if not file.filename or file.filename == "null":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효한 이미지 파일을 업로드해주세요."
        )
    
    # 이미지 파일 확장자 검사
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원되지 않는 파일 형식입니다. 허용된 형식: {', '.join(allowed_extensions)}"
        )

    # 2. 이미지 저장
    upload_dir = "uploads/temp"
    os.makedirs(upload_dir, exist_ok=True)

    # 안전한 파일명 생성
    import uuid
    safe_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = f"{upload_dir}/{safe_filename}"

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    # 3. 임시 저장만 (분석용)
    # 최종 이벤트 생성시에만 permanent로 이동
    
    # 4. 임시 웹 URL 생성 (프론트엔드 미리보기용)
    temp_web_url = f"/uploads/temp/{safe_filename}"
    
    # 5. LLM 분석 (로컬 파일 경로 사용)
    try:
        result = await llm_service.analyze_and_fill_event_form(
            image_url=file_path,
            provider=provider,
        )
        
        # 분석 결과에 임시 이미지 정보 추가
        result["temp_image_url"] = temp_web_url
        result["temp_image_path"] = file_path  # 서버 내부용
        result["original_filename"] = file.filename
        result["temp_image_url"] = temp_web_url
        result["temp_image_path"] = file_path  # 서버 내부용
        result["original_filename"] = file.filename
        
        return LLMAnalysisResponse(**result)
    except Exception as exc:  # noqa: BLE001
        # 오류 시 임시 파일 삭제
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"이미지 분석 실패: {exc}",
        ) from exc


# ========================================
# 이벤트 생성 (LLM 결과 저장)
# ========================================


@router.post("/", response_model=EventResponse)
async def create_event(request: EventCreateRequest, db: Session = Depends(get_db)):
    """LLM 분석 결과로 이벤트를 생성한다."""

    # 날짜 파싱: 분리된 필드 우선, 기존 필드 fallback
    start_date, end_date = None, None
    
    if request.form_data.startDate:
        # 새로운 분리된 필드 사용
        start_date = _parse_date_component(request.form_data.startDate)
        
        # 종료 날짜 처리: 있으면 파싱, 없으면 시작 날짜와 동일
        if request.form_data.endDate:
            end_date = _parse_date_component(request.form_data.endDate)
        else:
            end_date = start_date  # 단일 날짜인 경우 시작=종료
            
    elif request.form_data.date:
        # 기존 date 필드 사용 (backward compatibility)
        start_date, end_date = _parse_date_range(request.form_data.date)
    
    if not start_date:
        raise HTTPException(status_code=400, detail="유효한 날짜 형식을 입력해주세요.")

    # 시간 파싱: 분리된 필드 우선, 기존 필드 fallback
    start_time, end_time = None, None
    
    if request.form_data.startTime:
        # 새로운 분리된 필드 사용
        start_time = _parse_time_component(request.form_data.startTime)
        
        # 종료 시간 처리: 있으면 파싱, 없으면 None (단일 시간)
        if request.form_data.endTime:
            end_time = _parse_time_component(request.form_data.endTime)
        # 종료 시간이 없는 경우 end_time은 None으로 유지
            
    elif request.form_data.time:
        # 기존 time 필드 사용 (backward compatibility)
        start_time, end_time = _parse_time_range(request.form_data.time)

    # 임시 이미지를 영구 저장소로 이동
    final_image_url = None
    has_custom_image = False
    unsplash_image_url = None

    if request.temp_image_path and os.path.exists(request.temp_image_path):
        import shutil

        # 영구 저장소 디렉토리 생성
        permanent_dir = "uploads/events"
        os.makedirs(permanent_dir, exist_ok=True)

        # 새로운 파일명 생성 (이벤트 ID 기반)
        file_ext = os.path.splitext(request.original_filename or "")[1] or ".jpg"
        permanent_filename = f"event_{uuid.uuid4().hex}{file_ext}"
        permanent_path = f"{permanent_dir}/{permanent_filename}"

        # 파일 이동
        shutil.move(request.temp_image_path, permanent_path)
        final_image_url = f"/uploads/events/{permanent_filename}"
        has_custom_image = True
    else:
        # 주최측이 이미지 업로드하지 않음 -> Unsplash에서 자동 생성
        import logging
        logger = logging.getLogger(__name__)

        try:
            unsplash_service = get_unsplash_service()
            image_data = await unsplash_service.get_event_image(
                event_name=request.form_data.eventName,
                description=request.form_data.description,
                tags=request.tags,
                orientation="landscape"
            )

            if image_data:
                unsplash_image_url = image_data["url_regular"]  # 1080px width
                logger.info(f"Unsplash 이미지 생성 성공: {unsplash_image_url}")
            else:
                logger.warning(f"Unsplash 이미지 생성 실패: {request.form_data.eventName}")

        except Exception as e:
            logger.error(f"Unsplash 이미지 생성 중 오류: {e}")
            # 실패 시 무시하고 계속 진행 (이미지 없이 이벤트 생성)

    venue_record = _ensure_venue(db, request.form_data.location or request.form_data.eventName)
    # 전시장 정보가 없더라도 항상 이벤트가 속할 전시/전시장을 보장한다.
    exhibition = _ensure_exhibition(db, request, venue_record, start_date, end_date)

    event = Event(
        event_name=request.form_data.eventName,
        booth_number=request.form_data.boothNumber or None,
        location=(request.form_data.location or venue_record.venue_name),  # 전시장/장소
        description=request.form_data.description,
        participation_method=request.form_data.participationMethod or None,
        benefits=request.form_data.benefits or None,
        start_date=start_date,
        end_date=end_date or start_date,
        start_time=start_time,
        end_time=end_time,
        categories=request.categories or [],
        company_id=request.company_id,
        image_url=final_image_url,  # 최종 이미지 URL 저장
        unsplash_image_url=unsplash_image_url,  # Unsplash 자동 생성 이미지
        has_custom_image=has_custom_image,  # 주최측 업로드 여부
        exhibition_id=exhibition.id,
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
# PDF 업로드
# ========================================


@router.post("/{event_id}/upload-pdf")
async def upload_event_pdf(
    event_id: int,
    pdf: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if pdf.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF 파일만 업로드할 수 있습니다.",
        )

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="이벤트를 찾을 수 없습니다.",
        )

    uploads_dir = "uploads/pdfs"
    os.makedirs(uploads_dir, exist_ok=True)

    filename = f"event_{event_id}_{uuid.uuid4().hex}.pdf"
    file_path = os.path.join(uploads_dir, filename)

    if event.pdf_url:
        old_path = event.pdf_url.lstrip("/")
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                logging.getLogger(__name__).warning("기존 PDF 삭제 실패: %s", old_path)

    async with aiofiles.open(file_path, "wb") as buffer:
        while True:
            chunk = await pdf.read(1024 * 1024)
            if not chunk:
                break
            await buffer.write(chunk)

    event.pdf_url = f"/uploads/pdfs/{filename}"
    db.commit()
    db.refresh(event)

    return {"pdf_url": event.pdf_url}


# ========================================
# 이벤트 검색 (태그 필터링)
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
# 인기 태그 조회
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
# 모든 카테고리 조회
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
# 설명 개선 (LLM)
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
# 추가 태그 생성 (LLM)
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
