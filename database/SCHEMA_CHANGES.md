# Schema Changes for Exhibition-Based Event System

## 변경 날짜: 2025-11-03

## 주요 변경사항

### 1. 새로운 테이블 추가: `exhibitions`

전시회/박람회 행사 정보를 관리하는 테이블이 추가되었습니다.

```sql
CREATE TABLE exhibitions (
    id SERIAL PRIMARY KEY,
    venue_id INTEGER REFERENCES venues(id),
    exhibition_name VARCHAR(300) NOT NULL,
    exhibition_code VARCHAR(50) UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hall_info VARCHAR(200),
    description TEXT,
    organizer VARCHAR(200),
    website_url VARCHAR(255),
    poster_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**주요 필드:**
- `exhibition_code`: 행사 고유 코드 (예: S0902)
- `hall_info`: 홀 정보 (예: 제1전시관 A, B, C)
- `organizer`: 주최자 정보

### 2. `events` 테이블 수정

이벤트가 특정 전시회에 속하도록 구조 변경:

```sql
-- 추가된 컬럼
exhibition_id INTEGER REFERENCES exhibitions(id) ON DELETE CASCADE
time_slots TEXT[]  -- 이벤트 진행 시간대 배열
```

**변경 이유:**
- 하나의 전시회에 여러 부스/업체의 이벤트가 속함
- 각 이벤트는 여러 시간대에 진행 가능 (예: 11:00, 13:00, 14:00, 15:00)

### 3. 뷰(View) 업데이트

`v_events_with_details` 뷰에 전시회 정보 추가:

```sql
-- 추가된 필드
ex.exhibition_name
ex.exhibition_code
ex.start_date AS exhibition_start_date
ex.end_date AS exhibition_end_date
ex.hall_info AS exhibition_hall_info
```

## 샘플 데이터 구조

### 전시회 정보 (상단 표시)
```
2025 코엑스 푸드위크
기간: 2025.10.29(수) ~ 11.1(토)
장소: 제1전시관 A, B, C
```

### 이벤트 리스트 (하단 표시)
각 부스별 이벤트:
1. [S0902] 농업회사법인(주)해남진호드모
   - 시간: 11:00 / 13:00 / 14:00 / 15:00
   - 부스: B5001

2. [B5201] (주)대일피비
   - 시간: 11:00 / 13:00 / 14:00 / 15:00
   - 부스: B5201

3. [특별관] 헬스클럽레저 컴퍼니
   - 시간: 10:00 / 12:00 / 14:00 / 16:00
   - 부스: A-312

4. [B5001] 협찬투어
   - 시간: 10:00 / 12:00 / 14:00 / 16:00
   - 부스: B5001

5. [S0902] 농업회사법인(주)해남진호드모
   - 시간: 11:00 / 13:00 / 14:00 / 15:00
   - 부스: S0902

## 프론트엔드 연동 방법

### API 엔드포인트 수정 필요

기존 `/api/visitor/events` 엔드포인트는 다음 정보를 반환해야 합니다:

```json
{
  "exhibition": {
    "id": 1,
    "name": "2025 코엑스 푸드위크",
    "code": "S0902",
    "start_date": "2025-10-29",
    "end_date": "2025-11-01",
    "hall_info": "제1전시관 A, B, C",
    "venue_name": "코엑스"
  },
  "events": [
    {
      "id": 1,
      "event_name": "[S0902] 농업회사법인(주)해남진호드모",
      "company_name": "농업회사법인",
      "booth_number": "B5001",
      "time_slots": ["11:00", "13:00", "14:00", "15:00"],
      "description": "당일 조달로 시작",
      "poster_image_url": "...",
      "benefits": "무료 시식, 할인 쿠폰 제공"
    }
  ]
}
```

### 화면 구성

```
┌─────────────────────────────────────┐
│  10.29(수) 11:00                    │
│  ┌───────────────────────────────┐  │
│  │ 2025 코엑스 푸드위크          │  │
│  │ 2025.10.29(수) ~ 11.1(토)     │  │
│  │ 제1전시관 A, B, C             │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  [이벤트 리스트]                    │
│  ┌─────────────────────────────┐    │
│  │ 🏢 [S0902] 농업회사법인...  │    │
│  │ 11:00 / 13:00 / 14:00 / ... │ ▶  │
│  │ 당일 조달로 시작            │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 🏢 [B5201] (주)대일피비     │    │
│  │ 11:00 / 13:00 / 14:00 / ... │ ▶  │
│  │ 세계각국의 맛을 시음        │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## 데이터베이스 마이그레이션

기존 데이터베이스가 있는 경우:

```sql
-- 1. exhibitions 테이블 생성
-- 2. events 테이블에 exhibition_id, time_slots 컬럼 추가
ALTER TABLE events ADD COLUMN exhibition_id INTEGER REFERENCES exhibitions(id) ON DELETE CASCADE;
ALTER TABLE events ADD COLUMN time_slots TEXT[];

-- 3. 인덱스 추가
CREATE INDEX idx_events_exhibition_id ON events(exhibition_id);
CREATE INDEX idx_events_time_slots ON events USING GIN(time_slots);

-- 4. 뷰 재생성
DROP VIEW IF EXISTS v_events_with_details;
-- (새로운 뷰 생성 코드 실행)
```

## 다음 단계

1. ✅ schema.sql 업데이트 완료
2. ⏳ Backend API 수정 필요 (`events_visitor.py`)
3. ⏳ Frontend 화면 수정 필요 (`EventList.jsx`)
4. ⏳ 데이터베이스 연결 후 테스트

## 참고사항

- 샘플 데이터는 5개의 이벤트가 모두 같은 전시회(2025 코엑스 푸드위크)에 속함
- 각 이벤트는 여러 시간대에 진행 가능
- 부스 번호는 각 업체마다 다름
- 이미지는 placeholder 사용 (실제 이미지로 교체 필요)
