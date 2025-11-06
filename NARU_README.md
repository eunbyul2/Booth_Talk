# 🖼️ Unsplash 자동 이미지 생성 기능 - 구현 문서

> **작성일**: 2025-01-07
> **대상**: 은별님 (풀스택 개발자)
> **목적**: Git Branch Merge 시 충돌 방지 및 변경사항 파악

---

## 📋 목차

1. [개요](#개요)
2. [구현 배경 및 목적](#구현-배경-및-목적)
3. [핵심 아키텍처](#핵심-아키텍처)
4. [백엔드 변경사항](#백엔드-변경사항)
5. [프론트엔드 변경사항](#프론트엔드-변경사항)
6. [데이터베이스 마이그레이션](#데이터베이스-마이그레이션)
7. [API 변경사항](#api-변경사항)
8. [환경 설정](#환경-설정)
9. [테스트 방법](#테스트-방법)
10. [Merge 체크리스트](#merge-체크리스트)
11. [기술 상세](#기술-상세)
12. [트러블슈팅](#트러블슈팅)

---

## 개요

### 구현된 기능

Unsplash API와 ChatGPT API를 활용하여 이벤트 생성 시 자동으로 관련 이미지를 생성하는 기능입니다. 주최측이 커스텀 이미지를 업로드하기 전까지 임시 프리셋 이미지를 제공합니다.

### 주요 특징

- ✅ **자동 이미지 생성**: 이벤트 이름, 설명, 태그를 기반으로 Unsplash에서 관련 이미지 검색
- ✅ **ChatGPT 쿼리 최적화**: 한글 이벤트 정보를 영문 검색 키워드로 변환
- ✅ **이미지 우선순위 시스템**: 커스텀 이미지 > Unsplash 이미지 > 없음
- ✅ **CDN 전략**: Unsplash 이미지는 로컬 저장 없이 CDN URL 직접 사용
- ✅ **오버레이 UI**: 이미지 위에 "주최측이 이미지를 등록할 예정입니다" 텍스트 표시

### 영향 범위

- **백엔드**: 7개 파일 (2개 신규, 5개 수정)
- **프론트엔드**: 3개 파일 (모두 수정)
- **데이터베이스**: `events` 테이블에 2개 컬럼 추가

---

## 구현 배경 및 목적

### 문제 상황

기존에는 주최측이 이벤트 생성 시 이미지를 업로드하지 않으면 빈 placeholder만 표시되어 사용자 경험이 저하되었습니다.

### 해결 방안

1. **Unsplash API**: 고품질 무료 이미지 제공 플랫폼
2. **ChatGPT API**: 이벤트 정보를 분석하여 최적의 영문 검색 키워드 생성
3. **우선순위 시스템**: 주최측이 이미지를 업로드하면 자동 생성 이미지를 덮어씀

### 기대 효과

- 모든 이벤트가 시각적으로 풍부한 이미지를 가짐
- 주최측의 작업 부담 감소 (이미지 없이도 생성 가능)
- 관람객의 시각적 만족도 향상

---

## 핵심 아키텍처

### 이미지 우선순위 시스템

```
┌─────────────────────────────────────────┐
│  이벤트 생성 요청                        │
└──────────┬──────────────────────────────┘
           │
           ├─ 커스텀 이미지 있음?
           │  └─ YES → image_url에 저장
           │           has_custom_image = True
           │
           └─ NO → Unsplash 자동 생성
                   ├─ ChatGPT: 검색 쿼리 생성
                   ├─ Unsplash API: 이미지 검색
                   └─ unsplash_image_url에 저장
                      has_custom_image = False

┌─────────────────────────────────────────┐
│  관람객 API 응답                         │
└──────────┬──────────────────────────────┘
           │
           └─ has_custom_image?
              ├─ True  → image_url 반환
              └─ False → unsplash_image_url 반환
```

### 데이터 흐름

```
[이벤트 생성]
    ↓
[이미지 있음?] ── YES → [image_url 저장] ─┐
    ↓                                      │
   NO                                      │
    ↓                                      │
[ChatGPT: 쿼리 생성]                       │
    ↓                                      │
[Unsplash: 이미지 검색]                    │
    ↓                                      │
[unsplash_image_url 저장]                  │
    ↓                                      │
    └──────────────────────────────────────┘
                    ↓
         [DB에 저장 완료]
                    ↓
         [관람객 API 요청]
                    ↓
       [이미지 우선순위 적용]
                    ↓
            [응답 반환]
```

---

## 백엔드 변경사항

### 1. 새로 추가된 파일

#### 📄 `backend/services/unsplash_service.py` (신규)

**목적**: Unsplash API 통합 및 ChatGPT 기반 검색 쿼리 최적화

**핵심 클래스**: `UnsplashService`

```python
class UnsplashService:
    def __init__(self):
        self.access_key = os.getenv("UNSPLASH_ACCESS_KEY")
        self.base_url = "https://api.unsplash.com"
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def _generate_search_query(self, event_name, description, tags):
        """ChatGPT를 사용하여 최적의 영문 검색 쿼리 생성"""
        # GPT-4o-mini 사용, temperature 0.3 (정확도 중시)
        # 2-4개의 전문적인 키워드 반환

    async def get_event_image(self, event_name, description, tags, orientation="landscape"):
        """Unsplash에서 이벤트 관련 이미지 검색"""
        # 1. ChatGPT로 검색 쿼리 생성
        # 2. Unsplash API 호출 (인기순 10개)
        # 3. 첫 번째 결과 선택
        # 4. Download endpoint 트리거 (Unsplash 가이드라인)
        # 5. url_regular (1080px) 반환

    async def _trigger_download(self, download_location):
        """Unsplash API 가이드라인 준수 - 다운로드 엔드포인트 호출"""
```

**주요 메서드**:
- `_generate_search_query()`: ChatGPT를 사용한 검색어 최적화
- `get_event_image()`: Unsplash 이미지 검색 및 반환
- `_trigger_download()`: Unsplash 다운로드 트래킹

**의존성**:
- `openai` (ChatGPT API)
- `aiohttp` (비동기 HTTP 요청)
- `os` (환경 변수)

---

#### 📄 `backend/add_unsplash_fields.py` (신규)

**목적**: 수동 데이터베이스 마이그레이션 스크립트

**이유**: 이 프로젝트는 Alembic을 사용하지 않으므로 수동 마이그레이션 필요

```python
def migrate():
    """
    events 테이블에 unsplash_image_url, has_custom_image 컬럼 추가
    """
    # 1. 컬럼 존재 여부 확인 (information_schema)
    # 2. unsplash_image_url VARCHAR 추가
    # 3. has_custom_image BOOLEAN DEFAULT FALSE 추가
    # 4. 기존 데이터 백필: image_url이 있으면 has_custom_image=TRUE
```

**실행 방법**:
```bash
cd backend
source .venv/bin/activate
python add_unsplash_fields.py
```

**실행 결과**:
- 12개 기존 이벤트에 `has_custom_image=TRUE` 설정 완료

---

### 2. 수정된 파일

#### 📄 `backend/.env`

**변경 내용**: Unsplash API 키 추가

```bash
# ========================================
# Unsplash API 키 (자동 이미지 생성)
# ========================================
UNSPLASH_ACCESS_KEY=H2ALNRjqoANoQJihwnjVEIaYWzR2ITtWeGkz137-FRc
```

**주의사항**:
- 실제 프로덕션에서는 별도의 키 발급 필요
- `.env.example`에도 추가 필요

---

#### 📄 `backend/models/event.py`

**변경 위치**: Line 52-54 (기존 `categories` 아래에 추가)

```python
# Unsplash 자동 이미지 생성 관련 필드
unsplash_image_url = Column(String)  # Unsplash에서 자동 생성된 이미지 URL
has_custom_image = Column(Boolean, default=False)  # 주최측이 직접 업로드한 이미지 여부
```

**컬럼 상세**:
- `unsplash_image_url`: Unsplash CDN URL (nullable)
- `has_custom_image`: 커스텀 이미지 여부 (default: False)

**Merge 주의사항**:
- 이 위치는 기존 코드와 충돌 가능성이 낮음
- 단, `categories` 필드 이후에 추가되어야 함

---

#### 📄 `backend/routes/events.py`

**변경 위치**: `create_event` 함수 (Line 406-467)

**변경 내용**: 이벤트 생성 시 Unsplash 통합

```python
# 이미지 처리 로직
final_image_url = None
has_custom_image = False
unsplash_image_url = None

if request.temp_image_path and os.path.exists(request.temp_image_path):
    # 커스텀 이미지 업로드된 경우
    final_image_url = move_to_permanent_storage(request.temp_image_path)
    has_custom_image = True
else:
    # 커스텀 이미지 없음 → Unsplash 자동 생성
    unsplash_service = get_unsplash_service()
    image_data = await unsplash_service.get_event_image(
        event_name=request.form_data.eventName,
        description=request.form_data.description,
        tags=request.tags,
        orientation="landscape"
    )
    if image_data:
        unsplash_image_url = image_data["url_regular"]

# Event 객체 생성
event = Event(
    # ...기존 필드들...
    image_url=final_image_url,
    unsplash_image_url=unsplash_image_url,
    has_custom_image=has_custom_image,
    # ...나머지 필드들...
)
```

**주요 로직**:
1. 커스텀 이미지가 있으면 → `image_url`에 저장, `has_custom_image=True`
2. 커스텀 이미지가 없으면 → Unsplash 호출, `unsplash_image_url`에 저장
3. 두 필드 모두 DB에 저장

**Merge 주의사항**:
- `create_event` 함수 전체를 신중히 비교
- 이미지 업로드 로직이 변경되었으므로 기존 코드와 충돌 가능

---

#### 📄 `backend/routes/events_visitor.py`

**변경 위치**: `get_events_for_visitor` 함수의 응답 직렬화 부분 (Line 184)

**변경 내용**: 이미지 우선순위 로직 추가

```python
# 기존 코드
image_url=event.image_url,

# 변경 후
image_url=event.image_url if event.has_custom_image else (event.unsplash_image_url or event.image_url),
```

**로직 설명**:
- `has_custom_image=True` → 커스텀 이미지 반환 (`image_url`)
- `has_custom_image=False` → Unsplash 이미지 반환 (`unsplash_image_url`)
- 둘 다 없으면 → `None` 또는 기존 `image_url`

**Merge 주의사항**:
- 한 줄 변경이지만 응답 형식이 바뀌므로 주의
- 프론트엔드와의 호환성 유지 필요

---

## 프론트엔드 변경사항

### 1. EventDetail.jsx

**변경 위치**: 전체 파일 (Line 1-227)

**주요 변경사항**:

#### ✅ Mock 데이터 제거 → 실제 API 통합

**기존 코드**:
```javascript
const [event, setEvent] = useState({
  name: "AI 스타트업 박람회",
  company: "테크노벨",
  // ...하드코딩된 데이터
});
```

**변경 후**:
```javascript
const [event, setEvent] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchEventDetail = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getVisitorEventDetail(eventId);
      setEvent(data);
    } catch (err) {
      setError("이벤트 정보를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };
  if (eventId) {
    fetchEventDetail();
  }
}, [eventId]);
```

#### ✅ 날짜/시간 포맷팅 함수 추가

```javascript
const formatDate = (startDate, endDate) => {
  if (!startDate) return "";
  const start = new Date(startDate).toLocaleDateString("ko-KR");
  if (endDate && startDate !== endDate) {
    const end = new Date(endDate).toLocaleDateString("ko-KR");
    return `${start} ~ ${end}`;
  }
  return start;
};

const formatTime = (startTime, endTime) => {
  if (!startTime) return "시간 미정";
  if (endTime) return `${startTime} - ${endTime}`;
  return startTime;
};
```

#### ✅ 이미지 오버레이 구현

```javascript
<div className={`event-main-image ${!event.image_url ? "pending" : ""}`}>
  {event.image_url ? (
    <>
      <img
        src={event.image_url}
        alt={event.event_name}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div className="image-overlay">
        주최측이 이미지를 등록할 예정입니다
      </div>
    </>
  ) : (
    <div className="image-placeholder">
      <span>📸</span>
      <p>주최측이 이미지를 등록할 예정입니다</p>
    </div>
  )}
</div>
```

**주요 로직**:
- `image_url`이 있으면 → 이미지 표시 + 오버레이
- `image_url`이 없으면 → placeholder 표시

#### ✅ 실제 데이터 필드 매핑

```javascript
// API 응답 필드 사용
<h1 className="event-title">{event.event_name}</h1>
<p className="event-company">{event.company_name}</p>
{formatDate(event.start_date, event.end_date)}
{formatTime(event.start_time, event.end_time)}
```

**Merge 주의사항**:
- 전체 파일이 리팩토링되었으므로 기존 코드와 충돌 가능성 높음
- 기존 기능이 제대로 동작하는지 반드시 테스트 필요

---

### 2. EventDetail.css

**변경 위치**: Line 200-221 (추가)

**추가된 스타일**:

```css
/* 주최측 이미지 대기 오버레이 */
.event-main-image .image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.95);
  font-size: clamp(1rem, 2.5vw, 1.5rem);
  font-weight: 600;
  text-align: center;
  padding: 2rem;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.event-main-image.pending .image-overlay {
  opacity: 1;
}
```

**동작 방식**:
- 기본 상태: `opacity: 0` (보이지 않음)
- `.pending` 클래스 추가 시: `opacity: 1` (표시)
- 반투명 검은 배경 + 블러 효과

**Merge 주의사항**:
- 파일 끝에 추가되었으므로 충돌 가능성 낮음
- 기존 `.event-main-image` 스타일과 호환성 확인 필요

---

### 3. SurveyResponse.css

**변경 위치**: Line 156-196 (추가)

**추가된 스타일**: ChronoMorph 디자인 시스템 적용

```css
/* ChronoMorph Input Styling - 설문 응답자 정보 입력 필드 */
.user-form input,
.user-form select {
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: rgba(238, 240, 255, 0.95);
  font-size: 15px;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.user-form input::placeholder {
  color: rgba(200, 210, 255, 0.5);
}

.user-form input:hover,
.user-form select:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(125, 90, 255, 0.25);
}

.user-form input:focus,
.user-form select:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(125, 90, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(125, 90, 255, 0.2), 0 4px 16px rgba(125, 90, 255, 0.15);
}

.user-form label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: rgba(200, 210, 255, 0.85);
  margin-bottom: 8px;
}
```

**디자인 특징**:
- Glass morphism (반투명 배경 + 블러)
- 보라색 glow 효과 (focus 시)
- 부드러운 전환 효과
- ChronoMorph 디자인 시스템과 일관성 유지

**Merge 주의사항**:
- 기존 input 스타일이 있다면 우선순위 확인 필요
- `.user-form` 클래스가 다른 곳에서 사용되는지 확인

---

## 데이터베이스 마이그레이션

### 추가된 컬럼

```sql
-- events 테이블에 추가
ALTER TABLE events
ADD COLUMN unsplash_image_url VARCHAR,
ADD COLUMN has_custom_image BOOLEAN DEFAULT FALSE;

-- 기존 데이터 백필
UPDATE events
SET has_custom_image = TRUE
WHERE image_url IS NOT NULL AND image_url != '';
```

### 컬럼 정의

| 컬럼명 | 타입 | Nullable | Default | 설명 |
|--------|------|----------|---------|------|
| `unsplash_image_url` | VARCHAR | YES | NULL | Unsplash에서 자동 생성된 이미지 URL |
| `has_custom_image` | BOOLEAN | NO | FALSE | 주최측이 직접 업로드한 이미지 여부 |

### 마이그레이션 실행

#### 방법 1: Python 스크립트 사용 (권장)

```bash
cd backend
source .venv/bin/activate
python add_unsplash_fields.py
```

**출력 예시**:
```
Successfully added unsplash_image_url column
Successfully added has_custom_image column
Backfilled has_custom_image for 12 events
Migration completed successfully!
```

#### 방법 2: SQL 직접 실행

```bash
psql "postgresql://..." -c "
ALTER TABLE events
ADD COLUMN IF NOT EXISTS unsplash_image_url VARCHAR,
ADD COLUMN IF NOT EXISTS has_custom_image BOOLEAN DEFAULT FALSE;

UPDATE events
SET has_custom_image = TRUE
WHERE image_url IS NOT NULL AND image_url != '';
"
```

### 마이그레이션 검증

```sql
-- 컬럼 추가 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('unsplash_image_url', 'has_custom_image');

-- 데이터 확인
SELECT id, event_name,
       image_url IS NOT NULL as has_image,
       unsplash_image_url IS NOT NULL as has_unsplash,
       has_custom_image
FROM events
LIMIT 10;
```

### 롤백 방법

```sql
ALTER TABLE events
DROP COLUMN IF EXISTS unsplash_image_url,
DROP COLUMN IF EXISTS has_custom_image;
```

---

## API 변경사항

### 응답 필드 추가

#### GET `/api/visitor/events`

**기존 응답**:
```json
{
  "id": 1,
  "event_name": "AI 스타트업 박람회",
  "image_url": "http://example.com/image.jpg",
  ...
}
```

**변경 후 응답**:
```json
{
  "id": 1,
  "event_name": "AI 스타트업 박람회",
  "image_url": "https://images.unsplash.com/photo-xxx?w=1080",
  "has_custom_image": false,
  ...
}
```

**주의사항**:
- `image_url` 필드는 이제 우선순위 로직이 적용된 값을 반환
- 커스텀 이미지가 없으면 Unsplash URL이 `image_url`에 들어감
- 프론트엔드는 `image_url`만 사용하면 됨 (기존 로직 유지)

### 이미지 우선순위 로직

```python
# 백엔드 코드
image_url = (
    event.image_url if event.has_custom_image
    else (event.unsplash_image_url or event.image_url)
)
```

**우선순위**:
1. **커스텀 이미지** (`has_custom_image=True`) → `image_url` 반환
2. **Unsplash 이미지** (`has_custom_image=False`) → `unsplash_image_url` 반환
3. **이미지 없음** → `None` 또는 기존 `image_url`

### 호환성

✅ **기존 프론트엔드 코드와 호환**
- `image_url` 필드만 사용하면 됨
- 추가 로직 변경 불필요

✅ **이전 버전 데이터와 호환**
- 마이그레이션 시 기존 데이터는 `has_custom_image=TRUE` 설정
- 기존 이미지가 계속 표시됨

---

## 환경 설정

### 1. 환경 변수 추가

#### `backend/.env` 파일에 추가

```bash
# ========================================
# Unsplash API 키 (자동 이미지 생성)
# ========================================
UNSPLASH_ACCESS_KEY=H2ALNRjqoANoQJihwnjVEIaYWzR2ITtWeGkz137-FRc
```

#### `backend/.env.example` 파일에 추가

```bash
# Unsplash API
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
```

### 2. Unsplash API 키 발급

1. [Unsplash Developers](https://unsplash.com/developers) 접속
2. "Register as a developer" 클릭
3. 새 애플리케이션 생성
4. **Access Key** 복사 (Secret Key는 불필요)
5. `.env` 파일에 추가

### 3. 필수 환경 변수 확인

```bash
# 필수 환경 변수
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...           # ChatGPT API (이미 있음)
UNSPLASH_ACCESS_KEY=...         # 새로 추가
```

### 4. 의존성 설치

**이미 설치됨** (추가 설치 불필요):
- `openai` (ChatGPT API)
- `aiohttp` (비동기 HTTP)

---

## 테스트 방법

### 1. 백엔드 단독 테스트

#### Unsplash 서비스 테스트

```bash
cd backend
source .venv/bin/activate
python -c "
import asyncio
from services.unsplash_service import get_unsplash_service

async def test():
    service = get_unsplash_service()
    result = await service.get_event_image(
        event_name='AI 스타트업 박람회',
        description='인공지능 기술 전시',
        tags=['AI', '스타트업', '기술'],
        orientation='landscape'
    )
    print('Image URL:', result['url_regular'])
    print('Photographer:', result['photographer_name'])

asyncio.run(test())
"
```

**예상 출력**:
```
Image URL: https://images.unsplash.com/photo-xxx?w=1080&...
Photographer: John Doe
```

#### 이벤트 생성 API 테스트

```bash
# 이미지 없이 이벤트 생성 (Unsplash 자동 생성)
curl -X POST http://localhost:8000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "eventName": "블록체인 컨퍼런스",
    "description": "블록체인 기술 발표",
    "tags": ["블록체인", "암호화폐", "기술"]
  }'
```

**응답 확인**:
```json
{
  "id": 13,
  "event_name": "블록체인 컨퍼런스",
  "unsplash_image_url": "https://images.unsplash.com/photo-xxx",
  "has_custom_image": false
}
```

### 2. 프론트엔드 통합 테스트

#### EventDetail 페이지 테스트

1. 브라우저에서 `http://localhost:3002/visitor/event/6` 접속
2. **확인 사항**:
   - ✅ 이미지가 표시되는가?
   - ✅ 오버레이 텍스트가 보이는가?
   - ✅ 이벤트 정보가 올바르게 표시되는가?

#### 설문 응답 페이지 테스트

1. 브라우저에서 `http://localhost:3002/visitor/survey/6` 접속
2. **확인 사항**:
   - ✅ 입력 필드가 ChronoMorph 스타일로 표시되는가?
   - ✅ Focus 시 보라색 glow가 나타나는가?
   - ✅ Placeholder가 올바르게 표시되는가?

### 3. 이미지 우선순위 테스트

#### 시나리오 1: 커스텀 이미지 있음

```sql
-- 테스트 데이터 생성
INSERT INTO events (event_name, image_url, has_custom_image, ...)
VALUES ('테스트 이벤트', 'http://example.com/custom.jpg', TRUE, ...);
```

**API 응답 확인**:
```json
{
  "image_url": "http://example.com/custom.jpg"  // 커스텀 이미지 반환
}
```

#### 시나리오 2: Unsplash 이미지만 있음

```sql
-- 테스트 데이터 생성
INSERT INTO events (event_name, unsplash_image_url, has_custom_image, ...)
VALUES ('테스트 이벤트', 'https://images.unsplash.com/photo-xxx', FALSE, ...);
```

**API 응답 확인**:
```json
{
  "image_url": "https://images.unsplash.com/photo-xxx"  // Unsplash 이미지 반환
}
```

#### 시나리오 3: 이미지 없음

```sql
-- 테스트 데이터 생성
INSERT INTO events (event_name, has_custom_image, ...)
VALUES ('테스트 이벤트', FALSE, ...);
```

**API 응답 확인**:
```json
{
  "image_url": null  // null 반환
}
```

---

## Merge 체크리스트

### 🔴 충돌 가능성 높은 파일

#### 1. `backend/routes/events.py`
- **충돌 위치**: `create_event` 함수
- **이유**: 이미지 처리 로직 전체 변경
- **해결 방법**:
  1. 기존 코드의 이미지 업로드 로직 확인
  2. Unsplash 생성 로직을 조건문 `else` 블록에 추가
  3. 기존 로직은 `if` 블록에 유지

#### 2. `frontend/src/pages/visitor/EventDetail.jsx`
- **충돌 위치**: 전체 파일
- **이유**: Mock 데이터 제거 및 API 통합
- **해결 방법**:
  1. 기존 하드코딩된 데이터 제거
  2. `useEffect`로 API 호출 로직 추가
  3. 로딩/에러 상태 관리 추가

### 🟡 충돌 가능성 중간인 파일

#### 3. `backend/models/event.py`
- **충돌 위치**: Line 52-54
- **이유**: 새 컬럼 추가
- **해결 방법**:
  1. `categories` 필드 이후에 추가
  2. 기존 필드 순서 유지

#### 4. `backend/routes/events_visitor.py`
- **충돌 위치**: Line 184 (응답 직렬화)
- **이유**: `image_url` 값 생성 로직 변경
- **해결 방법**:
  1. 한 줄만 변경하면 됨
  2. 삼항 연산자로 우선순위 적용

### 🟢 충돌 가능성 낮은 파일

#### 5. `backend/.env`
- **충돌 위치**: 파일 끝
- **이유**: 환경 변수 추가
- **해결 방법**: 파일 끝에 추가

#### 6. `frontend/src/pages/visitor/EventDetail.css`
- **충돌 위치**: 파일 끝
- **이유**: 새 스타일 추가
- **해결 방법**: 파일 끝에 추가

#### 7. `frontend/src/pages/visitor/SurveyResponse.css`
- **충돌 위치**: 파일 끝
- **이유**: 새 스타일 추가
- **해결 방법**: 파일 끝에 추가

### 🆕 신규 파일 (충돌 없음)

- `backend/services/unsplash_service.py`
- `backend/add_unsplash_fields.py`

---

## Merge 전 필수 작업

### 1. 데이터베이스 마이그레이션

```bash
cd backend
source .venv/bin/activate
python add_unsplash_fields.py
```

### 2. 환경 변수 설정

```bash
# .env 파일에 추가
echo "UNSPLASH_ACCESS_KEY=H2ALNRjqoANoQJihwnjVEIaYWzR2ITtWeGkz137-FRc" >> .env
```

### 3. 의존성 확인

```bash
# 이미 설치되어 있는지 확인
pip list | grep openai
pip list | grep aiohttp
```

### 4. 테스트 실행

```bash
# 백엔드 시작
cd backend
uvicorn main:app --reload

# 프론트엔드 시작
cd frontend
npm run dev

# 브라우저에서 확인
open http://localhost:3002/visitor/event/6
```

---

## Merge 후 검증 체크리스트

### ✅ 백엔드 검증

- [ ] 서버가 정상적으로 시작되는가?
- [ ] `/api/visitor/events` API가 정상 응답하는가?
- [ ] Unsplash 이미지가 생성되는가?
- [ ] 커스텀 이미지가 우선 반환되는가?

### ✅ 프론트엔드 검증

- [ ] EventDetail 페이지가 정상 렌더링되는가?
- [ ] 이미지가 올바르게 표시되는가?
- [ ] 오버레이 텍스트가 보이는가?
- [ ] 설문 입력 필드 스타일이 적용되는가?

### ✅ 데이터베이스 검증

- [ ] `unsplash_image_url` 컬럼이 추가되었는가?
- [ ] `has_custom_image` 컬럼이 추가되었는가?
- [ ] 기존 데이터가 올바르게 백필되었는가?

### ✅ 통합 검증

- [ ] 이미지 없이 이벤트 생성 시 Unsplash 이미지가 자동 생성되는가?
- [ ] 이미지 업로드 시 커스텀 이미지가 우선 표시되는가?
- [ ] 기존 이벤트의 이미지가 정상 표시되는가?

---

## 기술 상세

### 1. UnsplashService 클래스 구조

```python
class UnsplashService:
    def __init__(self):
        # API 키 및 클라이언트 초기화

    def _generate_search_query(self, event_name, description, tags):
        # ChatGPT를 사용한 검색어 최적화
        # - 모델: gpt-4o-mini
        # - Temperature: 0.3 (정확도 중시)
        # - 출력: 2-4개의 영문 키워드

    async def get_event_image(self, event_name, description, tags, orientation):
        # Unsplash 이미지 검색
        # 1. _generate_search_query로 검색어 생성
        # 2. Unsplash API 호출 (인기순 정렬)
        # 3. 첫 번째 결과 선택
        # 4. Download endpoint 트리거
        # 5. url_regular (1080px) 반환

    async def _trigger_download(self, download_location):
        # Unsplash API 가이드라인 준수
        # 다운로드 엔드포인트 호출로 조회수 카운트
```

### 2. ChatGPT 쿼리 생성 알고리즘

**입력**:
- `event_name`: "AI 스타트업 박람회"
- `description`: "인공지능 기술 전시 및 네트워킹"
- `tags`: ["AI", "스타트업", "기술"]

**프롬프트**:
```
You are a professional image search assistant. Given an event's information,
generate 2-4 professional English keywords for Unsplash image search.

Event name: AI 스타트업 박람회
Description: 인공지능 기술 전시 및 네트워킹
Tags: AI, 스타트업, 기술

Return only the keywords, separated by spaces.
```

**출력**: `"artificial intelligence startup technology exhibition"`

**Unsplash 검색**: 이 키워드로 인기 이미지 검색

### 3. 에러 핸들링 전략

#### ChatGPT API 실패

```python
try:
    query = self._generate_search_query(...)
except Exception as e:
    # 기본 검색어로 폴백
    query = f"{event_name} event conference"
```

#### Unsplash API 실패

```python
try:
    image_data = await self.get_event_image(...)
except Exception as e:
    # 이미지 없이 진행
    unsplash_image_url = None
```

#### 네트워크 타임아웃

```python
async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
    # 10초 타임아웃
```

### 4. CDN 전략

**Unsplash CDN URL 직접 사용**:
- ✅ 장점: 로컬 저장 공간 불필요, 빠른 로딩
- ✅ 장점: Unsplash CDN의 이미지 최적화 활용
- ⚠️ 단점: Unsplash 서비스 장애 시 이미지 로딩 실패

**URL 형식**:
```
https://images.unsplash.com/photo-1234567890123-abc?
  w=1080              # 너비 1080px
  &q=80              # 품질 80%
  &auto=format       # 자동 포맷 (WebP 지원)
  &fit=crop          # 크롭
```

### 5. 이미지 크기 및 품질

- **가로 크기**: 1080px (EventDetail 페이지 최적 크기)
- **세로 크기**: 자동 (비율 유지)
- **품질**: 80% (용량과 품질 균형)
- **포맷**: auto (브라우저별 최적 포맷 자동 선택)

---

## 트러블슈팅

### 문제 1: Unsplash 이미지가 생성되지 않음

**증상**:
- 이벤트 생성 시 `unsplash_image_url`이 `null`

**원인**:
1. Unsplash API 키가 잘못되었거나 만료됨
2. ChatGPT API 키가 없거나 잘못됨
3. 네트워크 연결 문제

**해결 방법**:
```bash
# 1. API 키 확인
echo $UNSPLASH_ACCESS_KEY
echo $OPENAI_API_KEY

# 2. 수동 테스트
python -c "
import asyncio
from services.unsplash_service import get_unsplash_service

async def test():
    service = get_unsplash_service()
    result = await service.get_event_image('test event', 'description', [], 'landscape')
    print(result)

asyncio.run(test())
"

# 3. 로그 확인
# backend/main.py에서 로그 레벨을 DEBUG로 변경
```

### 문제 2: 이미지 오버레이가 표시되지 않음

**증상**:
- EventDetail 페이지에서 이미지는 보이지만 오버레이 텍스트가 없음

**원인**:
1. CSS 파일이 로드되지 않음
2. `.pending` 클래스가 추가되지 않음
3. `image_url`이 있어서 오버레이가 숨겨짐

**해결 방법**:
```javascript
// EventDetail.jsx 확인
console.log('Image URL:', event.image_url);
console.log('Class:', !event.image_url ? 'pending' : '');

// CSS 로드 확인
import './EventDetail.css';
```

### 문제 3: API 응답에 이미지가 없음

**증상**:
- `/api/visitor/events` 응답에서 `image_url`이 항상 `null`

**원인**:
1. 이미지 우선순위 로직이 적용되지 않음
2. `has_custom_image` 플래그가 잘못 설정됨

**해결 방법**:
```sql
-- 데이터 확인
SELECT id, event_name,
       image_url,
       unsplash_image_url,
       has_custom_image
FROM events
WHERE id = 6;

-- has_custom_image 수동 업데이트
UPDATE events
SET has_custom_image = FALSE
WHERE image_url IS NULL OR image_url = '';
```

### 문제 4: 마이그레이션 실패

**증상**:
- `python add_unsplash_fields.py` 실행 시 에러

**원인**:
1. 데이터베이스 연결 실패
2. 컬럼이 이미 존재함
3. 권한 부족

**해결 방법**:
```bash
# 1. 데이터베이스 연결 확인
psql "$DATABASE_URL" -c "SELECT 1"

# 2. 컬럼 존재 여부 확인
psql "$DATABASE_URL" -c "
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('unsplash_image_url', 'has_custom_image')
"

# 3. 수동 마이그레이션
psql "$DATABASE_URL" -c "
ALTER TABLE events
ADD COLUMN IF NOT EXISTS unsplash_image_url VARCHAR,
ADD COLUMN IF NOT EXISTS has_custom_image BOOLEAN DEFAULT FALSE;
"
```

### 문제 5: ChatGPT API 비용 문제

**증상**:
- 이벤트 생성마다 ChatGPT API 호출로 비용 발생

**해결 방법**:
```python
# UnsplashService에 캐싱 로직 추가
_query_cache = {}

def _generate_search_query(self, event_name, description, tags):
    cache_key = f"{event_name}:{','.join(tags)}"
    if cache_key in self._query_cache:
        return self._query_cache[cache_key]

    # ChatGPT 호출
    query = ...

    self._query_cache[cache_key] = query
    return query
```

---

## 참고 자료

### Unsplash API

- [공식 문서](https://unsplash.com/documentation)
- [API 가이드라인](https://unsplash.com/api-terms)
- [Rate Limits](https://unsplash.com/documentation#rate-limiting): 50 requests/hour (무료)

### OpenAI API

- [GPT-4o-mini 문서](https://platform.openai.com/docs/models/gpt-4o-mini)
- [가격](https://openai.com/pricing): $0.15/1M input tokens

### ChronoMorph 디자인 시스템

- 프로젝트 내부 파일: `frontend/src/styles/global.css`

---

## 연락처

문제가 발생하거나 추가 설명이 필요하면 연락 주세요.

**작성자**: Naru (Claude Code)
**날짜**: 2025-01-07
**Git Branch**: [branch-name]

---

## 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|----------|--------|
| 2025-01-07 | 초안 작성 | Naru |
| 2025-01-07 | Unsplash 통합 완료 | Naru |
| 2025-01-07 | 프론트엔드 스타일 개선 | Naru |
| 2025-01-07 | 문서화 완료 | Naru |

---

**🚨 중요**: 이 문서는 Git Merge 전에 반드시 검토해주세요. 충돌 가능성이 있는 파일이 많으므로 신중한 병합이 필요합니다.

## 오늘(2025-11-07) 수행한 주요 수정사항 및 백업

### 요약
- 로컬에서 진행한 개발 작업을 `naruDrive` 브랜치에 WIP 커밋으로 정리하여 원격(`origin/naruDrive`)에 푸시(백업) 완료

### 커밋 목록 (로컬 → 원격에 푸시됨)
- `backend: WIP - update event routes and models` — `backend/main.py`, `backend/models/event.py`, `backend/routes/events.py`, `backend/routes/events_visitor.py` 수정 (이미지 처리 및 모델 필드 변경 포함)
- `frontend: WIP - visitor pages logic updates` — 방문자용 페이지 로직(`EventDetail.jsx`, `EventList.jsx`, `SurveyResponse.jsx`, `VisitorHome.jsx` 등) 변경, API 통합
- `styles: update CSS for pages and global styles` — 여러 CSS 파일 및 디자인 스타일 대폭 변경
- `chore: update package-lock` — `frontend/package-lock.json` 갱신

### 주의사항/후속 작업
- 민감 정보(.env 등)는 커밋되지 않았음을 확인했음. 그래도 원격에서 동료가 pull 하기 전에 `.env` 파일이 노출되지 않았는지 재확인 권장
- 미추적(untracked) 파일 (`Mini-visWork/`, `backend/add_unsplash_fields.py` 등)은 현재 포함되지 않았음. 필요 시 별도 브랜치에 추가 권장
- 로컬에서 백업한 커밋은 임시(WIP) 커밋입니다. 리뷰/리팩토링 후 정리(스쿼시/정돈) 권장

### 원격 정보
- 푸시 대상: `origin/naruDrive`
- 최종 푸시 커밋 (예): `b3dc662` (참고용 — 실제 해시값은 리포지토리에서 확인 요망)

---

_작성자_: Naru
_일시_: 2025-11-07

