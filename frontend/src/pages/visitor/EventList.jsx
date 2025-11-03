import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Filter, Calendar, MapPin, Heart, Clock, ChevronRight } from 'lucide-react'
import './EventList.css'

// 샘플 전시회 정보
const MOCK_EXHIBITION = {
  id: 1,
  name: '2025 코엑스 푸드위크',
  code: 'S0902',
  startDate: '2025-10-29',
  endDate: '2025-11-01',
  hallInfo: '제1전시관 A, B, C',
  venueName: '코엑스',
  location: '서울'
}

// 샘플 이벤트 데이터 (DB schema 기반)
const MOCK_EVENTS = [
  {
    id: 1,
    eventName: '[S0902] 농업회사법인(주)해남진호드모',
    companyName: '농업회사법인',
    boothNumber: 'B5001',
    timeSlots: ['11:00', '13:00', '14:00', '15:00'],
    description: '당일 조달로 시작',
    benefits: '무료 시식, 할인 쿠폰 제공',
    posterImageUrl: 'https://via.placeholder.com/120x120/FF6B6B/FFFFFF?text=농업회사법인',
    category: '식품',
    tags: ['농산물', '시식']
  },
  {
    id: 2,
    eventName: '[B5201] (주)대일피비',
    companyName: '(주)대일피비',
    boothNumber: 'B5201',
    timeSlots: ['11:00', '13:00', '14:00', '15:00'],
    description: '세계각국의 맛을 시음',
    benefits: '무료 시식, 경품 추첨',
    posterImageUrl: 'https://via.placeholder.com/120x120/4ECDC4/FFFFFF?text=대일피비',
    category: '식품',
    tags: ['수입식품', '시식']
  },
  {
    id: 3,
    eventName: '[특별관] 헬스클럽레저 컴퍼니',
    companyName: '특별한헬스클럽',
    boothNumber: 'A-312',
    timeSlots: ['10:00', '12:00', '14:00', '16:00'],
    description: '헬시플레저 라이프 공유소',
    benefits: '건강 상담, 샘플 증정',
    posterImageUrl: 'https://via.placeholder.com/120x120/95E1D3/FFFFFF?text=헬스클럽',
    category: '건강/웰빙',
    tags: ['건강식품', '웰빙']
  },
  {
    id: 4,
    eventName: '[B5001] 협찬투어',
    companyName: '협찬투어',
    boothNumber: 'B5001',
    timeSlots: ['10:00', '12:00', '14:00', '16:00'],
    description: '스페인 타파스 문화 체험 및 올리브 탐방',
    benefits: '여행 상담, 할인 쿠폰',
    posterImageUrl: 'https://via.placeholder.com/120x120/F38181/FFFFFF?text=협찬투어',
    category: '여행/문화',
    tags: ['여행', '문화체험']
  },
  {
    id: 5,
    eventName: '[S0902] 농업회사법인(주)해남진호드모',
    companyName: '농업회사법인',
    boothNumber: 'S0902',
    timeSlots: ['11:00', '13:00', '14:00', '15:00'],
    description: '당일 조달로 시작',
    benefits: '무료 시식, 기념품 증정',
    posterImageUrl: 'https://via.placeholder.com/120x120/AA96DA/FFFFFF?text=농업회사법인',
    category: '식품',
    tags: ['농산물', '시식']
  }
]

export default function EventList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const exhibitionId = searchParams.get('exhibition_id')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [favorites, setFavorites] = useState([])
  const [exhibition, setExhibition] = useState(null)
  const [events, setEvents] = useState([])
  
  // Load exhibition and events based on exhibition_id
  useEffect(() => {
    if (exhibitionId) {
      // exhibition_id가 있으면 해당 전시회 데이터 로드
      setExhibition(MOCK_EXHIBITION)
      setEvents(MOCK_EVENTS)
    } else {
      // exhibition_id가 없으면 기본 전시회 표시
      setExhibition(MOCK_EXHIBITION)
      setEvents(MOCK_EVENTS)
    }
  }, [exhibitionId])
  
  const toggleFavorite = (eventId) => {
    if (favorites.includes(eventId)) {
      setFavorites(favorites.filter(id => id !== eventId))
    } else {
      setFavorites([...favorites, eventId])
    }
  }
  
  // 현재 날짜/시간 포맷팅
  const getCurrentDateTime = () => {
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const dayName = dayNames[now.getDay()]
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${month}.${day}(${dayName}) ${hours}:${minutes}`
  }
  
  // 날짜 포맷팅 (YYYY-MM-DD -> MM.DD(요일))
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const dayName = dayNames[date.getDay()]
    return `${month}.${day}(${dayName})`
  }
  
  // 검색 필터링
  const filteredEvents = useMemo(() => {
    if (!searchTerm) return events
    
    return events.filter(event => {
      const searchLower = searchTerm.toLowerCase()
      return event.eventName.toLowerCase().includes(searchLower) ||
             event.companyName.toLowerCase().includes(searchLower) ||
             event.description.toLowerCase().includes(searchLower) ||
             event.boothNumber.toLowerCase().includes(searchLower)
    })
  }, [searchTerm, events])
  
  return (
    <div className="event-list-page">
      {/* 헤더 */}
      <div className="event-list-header">
        <div className="container">
          <button 
            className="btn-back"
            onClick={() => navigate('/visitor')}
          >
            ← 홈으로
          </button>
          
          <div className="search-filter">
            <div className="search-box">
              <Search size={20} />
              <input
                type="text"
                placeholder="기업명 또는 이벤트명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* 메인 컨텐츠 */}
      <div className="event-list-container container">
        {/* 현재 날짜/시간 */}
        <div className="current-datetime">
          {getCurrentDateTime()}
        </div>
        
        {/* 행사 정보 카드 */}
        {exhibition && (
          <div className="exhibition-card">
            <div className="exhibition-badge">{exhibition.code}</div>
            <h2 className="exhibition-title">{exhibition.name}</h2>
            <div className="exhibition-info">
              <div className="info-item">
                <Calendar size={16} />
                <span>
                  {formatDate(exhibition.startDate)} ~ {formatDate(exhibition.endDate)}
                </span>
              </div>
              <div className="info-item">
                <MapPin size={16} />
                <span>{exhibition.hallInfo}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* 이벤트 리스트 섹션 */}
        <div className="events-section">
          <h3 className="section-title">참여 업체 이벤트</h3>
          <div className="results-info">
            <span>{filteredEvents.length}개의 이벤트</span>
          </div>
          
          <div className="events-list">
            {filteredEvents.map(event => (
              <div 
                key={event.id}
                className="event-item"
                onClick={() => navigate(`/visitor/event/${event.id}`)}
              >
                {/* 이벤트 이미지 */}
                <div className="event-item-image">
                  <img 
                    src={event.posterImageUrl} 
                    alt={event.companyName}
                  />
                </div>
                
                {/* 이벤트 정보 */}
                <div className="event-item-info">
                  <div className="event-item-header">
                    <span className="booth-badge">{event.boothNumber}</span>
                    <h4 className="event-item-name">{event.eventName}</h4>
                  </div>
                  
                  {/* 시간대 */}
                  <div className="time-slots">
                    <Clock size={14} />
                    {event.timeSlots.map((time, idx) => (
                      <span key={idx} className="time-slot">
                        {time}
                      </span>
                    ))}
                  </div>
                  
                  <p className="event-item-description">
                    {event.description}
                  </p>
                  
                  {event.benefits && (
                    <div className="event-item-benefits">
                      🎁 {event.benefits}
                    </div>
                  )}
                </div>
                
                {/* 화살표 아이콘 */}
                <div className="event-item-arrow">
                  <ChevronRight size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
