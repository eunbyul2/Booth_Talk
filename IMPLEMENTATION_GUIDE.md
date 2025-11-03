# /visitor/events 화면 구현 가이드

## 📌 작업 완료 사항

### ✅ Database Schema (완료)
- `exhibitions` 테이블 추가
- `events` 테이블에 `exhibition_id`, `time_slots` 컬럼 추가
- 인덱스, 트리거, 뷰 업데이트
- 샘플 데이터 5개 생성

**위치:** `d:\Booth_Talk\database\schema.sql`

## 🎯 다음 작업: Frontend 반영

### 화면 구성

```
┌─────────────────────────────────────┐
│  📅 10.29(수) 11:00                 │  ← 현재 날짜/시간
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 🎪 2025 코엑스 푸드위크       │ │  ← 행사 정보 (상단)
│  │ 📆 2025.10.29(수) ~ 11.1(토)  │ │
│  │ 📍 제1전시관 A, B, C          │ │
│  └───────────────────────────────┘ │
│                                     │
│  참여 업체 이벤트                   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 🏢 [S0902] 농업회사법인...   │ │  ← 이벤트 리스트 (하단)
│  │ ⏰ 11:00 / 13:00 / 14:00 ... │▶│
│  │ 📝 당일 조달로 시작           │ │
│  └───────────────────────────────┘ │
│                                     │
│  (이벤트 5개 반복)                  │
└─────────────────────────────────────┘
```

## 🔧 구현 방법

### 1. Backend API 수정 (선택사항)

**파일:** `d:\Booth_Talk\backend\routes\events_visitor.py`

현재 API는 개별 이벤트만 반환합니다. 전시회 정보를 포함하도록 수정 가능:

```python
@router.get("/visitor/events/exhibition/{exhibition_id}")
async def get_exhibition_with_events(
    exhibition_id: int,
    db: Session = Depends(get_db)
):
    """특정 전시회와 해당 전시회의 모든 이벤트 조회"""
    
    # 전시회 정보
    exhibition = db.query(Exhibition).filter(
        Exhibition.id == exhibition_id
    ).first()
    
    if not exhibition:
        raise HTTPException(status_code=404, detail="전시회를 찾을 수 없습니다")
    
    # 해당 전시회의 이벤트들
    events = db.query(Event, Company).join(
        Company, Event.company_id == Company.id
    ).filter(
        Event.exhibition_id == exhibition_id
    ).order_by(Event.event_date, Event.event_time).all()
    
    return {
        "exhibition": {
            "id": exhibition.id,
            "name": exhibition.exhibition_name,
            "code": exhibition.exhibition_code,
            "start_date": exhibition.start_date,
            "end_date": exhibition.end_date,
            "hall_info": exhibition.hall_info,
            "venue_name": exhibition.venue.venue_name if exhibition.venue else None
        },
        "events": [
            {
                "id": event.id,
                "event_name": event.event_name,
                "company_name": company.company_name,
                "booth_number": event.booth_number,
                "time_slots": event.time_slots,
                "description": event.description,
                "benefits": event.benefits,
                "poster_image_url": event.poster_image_url,
                "category": event.category,
                "tags": event.tags
            }
            for event, company in events
        ]
    }
```

### 2. Frontend 수정 (필수)

**파일:** `d:\Booth_Talk\frontend\src\pages\visitor\EventList.jsx`

#### 2.1 상단: 행사 정보 카드

```jsx
// 행사 정보 표시
<div className="exhibition-header">
  <div className="current-datetime">
    10.29(수) 11:00
  </div>
  
  <div className="exhibition-card">
    <div className="exhibition-badge">
      {exhibition.code}
    </div>
    <h2 className="exhibition-title">
      {exhibition.name}
    </h2>
    <div className="exhibition-info">
      <div className="info-item">
        <Calendar size={16} />
        <span>
          {formatDate(exhibition.start_date)} ~ {formatDate(exhibition.end_date)}
        </span>
      </div>
      <div className="info-item">
        <MapPin size={16} />
        <span>{exhibition.hall_info}</span>
      </div>
    </div>
  </div>
</div>
```

#### 2.2 하단: 이벤트 리스트

```jsx
// 이벤트 리스트
<div className="events-section">
  <h3>참여 업체 이벤트</h3>
  
  {events.map(event => (
    <div 
      key={event.id}
      className="event-card"
      onClick={() => navigate(`/visitor/event/${event.id}`)}
    >
      {/* 왼쪽: 업체 로고/이미지 */}
      <div className="event-image">
        <img src={event.poster_image_url} alt={event.company_name} />
      </div>
      
      {/* 오른쪽: 이벤트 정보 */}
      <div className="event-info">
        <div className="event-header">
          <span className="booth-number">{event.booth_number}</span>
          <h4 className="event-name">{event.event_name}</h4>
        </div>
        
        {/* 시간대 표시 */}
        <div className="time-slots">
          {event.time_slots.map((time, idx) => (
            <span key={idx} className="time-slot">
              {time}
            </span>
          ))}
        </div>
        
        <p className="event-description">
          {event.description}
        </p>
        
        {event.benefits && (
          <div className="event-benefits">
            🎁 {event.benefits}
          </div>
        )}
      </div>
      
      {/* 화살표 아이콘 */}
      <div className="event-arrow">
        <ChevronRight size={20} />
      </div>
    </div>
  ))}
</div>
```

### 3. CSS 스타일 추가

**파일:** `d:\Booth_Talk\frontend\src\pages\visitor\EventList.css`

```css
/* 행사 정보 헤더 */
.exhibition-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.current-datetime {
  font-size: 0.875rem;
  opacity: 0.9;
  margin-bottom: 1rem;
}

.exhibition-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 1.5rem;
  border-radius: 8px;
}

.exhibition-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.exhibition-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.exhibition-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

/* 이벤트 섹션 */
.events-section {
  margin-top: 2rem;
}

.events-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1f2937;
}

/* 이벤트 카드 */
.event-card {
  display: flex;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid #e5e7eb;
}

.event-card:hover {
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
  border-color: #2563eb;
  transform: translateY(-2px);
}

.event-image {
  width: 120px;
  min-width: 120px;
  height: 120px;
  overflow: hidden;
}

.event-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.event-info {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.event-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.booth-number {
  background: #f3f4f6;
  color: #6b7280;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.event-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.time-slots {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.time-slot {
  background: #dbeafe;
  color: #1e40af;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.event-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

.event-benefits {
  font-size: 0.75rem;
  color: #059669;
  background: #d1fae5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
  align-self: flex-start;
}

.event-arrow {
  display: flex;
  align-items: center;
  padding: 1rem;
  color: #9ca3af;
}
```

## 📦 데이터 구조

### API 응답 예시

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
      "benefits": "무료 시식, 할인 쿠폰 제공",
      "poster_image_url": "https://...",
      "category": "식품",
      "tags": ["농산물", "시식"]
    }
  ]
}
```

## 🚀 테스트 방법

### 1. 데이터베이스 확인

```bash
# PostgreSQL 접속
psql -U postgres -d exhibition_platform

# 데이터 확인
SELECT * FROM exhibitions;
SELECT * FROM events WHERE exhibition_id = 1;
```

### 2. 샘플 데이터 조회

```sql
-- test_queries.sql 파일 참조
\i d:/Booth_Talk/database/test_queries.sql
```

### 3. Frontend 테스트

```bash
cd frontend
npm start

# 브라우저에서 확인
# http://localhost:3000/visitor/events
```

## 📝 체크리스트

### Database (완료)
- [x] exhibitions 테이블 생성
- [x] events 테이블 수정
- [x] 샘플 데이터 5개 생성
- [x] 뷰 및 인덱스 업데이트

### Backend (대기)
- [ ] Exhibition 모델 추가
- [ ] API 엔드포인트 수정
- [ ] 응답 형식 변경

### Frontend (대기)
- [ ] 행사 정보 카드 추가
- [ ] 이벤트 리스트 레이아웃 변경
- [ ] 시간대(time_slots) 표시
- [ ] CSS 스타일 적용

## 💡 참고사항

1. **데이터베이스 우선 완료**
   - schema.sql 파일이 업데이트되어 있음
   - DB 연결 시 바로 사용 가능

2. **Frontend는 아직 반영 안 됨**
   - 현재는 MOCK_EVENTS 사용 중
   - DB 연결 후 API 통합 필요

3. **샘플 데이터**
   - 5개 이벤트가 모두 같은 전시회에 속함
   - 실제 이미지는 placeholder 사용

4. **확장 가능성**
   - 여러 전시회 동시 운영 가능
   - exhibition_id로 필터링
