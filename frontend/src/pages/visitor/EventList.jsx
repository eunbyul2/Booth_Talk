import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Calendar, MapPin, Heart } from 'lucide-react'
import './EventList.css'

const MOCK_EVENTS = [
  {
    id: 1,
    name: 'AI Summit Seoul & EXPO',
    company: 'TechCorp',
    booth: 'B-123',
    date: '2025-11-10',
    time: '14:00',
    image: 'https://picsum.photos/seed/ai-summit/400/200',
    venue: '코엑스 그랜드볼룸',
    address: '서울 강남구 영동대로 513',
    description: 'AI 기술의 최신 트렌드를 한눈에 확인하고, 전문가들과 네트워킹하세요',
    benefits: '기념품 증정, 추첨 이벤트',
    status: 'upcoming'
  },
  {
    id: 2,
    name: '전자제품 박람회',
    company: 'ElecTech',
    booth: 'A-45',
    date: '2025-11-15',
    time: '10:00',
    image: 'https://picsum.photos/seed/electronics/400/200',
    venue: '킨텍스 1홀',
    address: '경기 고양시 일산서구 킨텍스로 217-60',
    description: '최신 전자제품과 혁신 기술을 직접 체험하고 특별 할인 혜택을 받아보세요',
    benefits: '할인 쿠폰 제공',
    status: 'upcoming'
  },
  {
    id: 3,
    name: '바이오 테크 컨퍼런스',
    company: 'BioInnovate',
    booth: 'C-78',
    date: '2025-11-12',
    time: '13:00',
    image: 'https://picsum.photos/seed/biotech/400/200',
    venue: '코엑스 B홀',
    address: '서울 강남구 영동대로 513',
    description: '바이오 기술의 미래를 논하는 국제 컨퍼런스에 참여하세요',
    benefits: '무료 샘플 증정',
    status: 'upcoming'
  },
  {
    id: 4,
    name: '스마트 모빌리티 쇼',
    company: 'MobilityTech',
    booth: 'D-12',
    date: '2025-11-18',
    time: '11:00',
    image: 'https://picsum.photos/seed/mobility/400/200',
    venue: '벡스코 제1전시장',
    address: '부산 해운대구 APEC로 55',
    description: '미래 모빌리티의 모든 것을 경험하고 시승 기회를 얻으세요',
    benefits: '시승 체험, 경품 증정',
    status: 'upcoming'
  },
  {
    id: 5,
    name: '푸드테크 페스티벌',
    company: 'FoodInnovation',
    booth: 'E-89',
    date: '2025-11-20',
    time: '09:00',
    image: 'https://picsum.photos/seed/foodtech/400/200',
    venue: '킨텍스 2홀',
    address: '경기 고양시 일산서구 킨텍스로 217-60',
    description: '식품 기술의 혁신을 경험하고 맛있는 시식을 즐기세요',
    benefits: '무료 시식, 특별 할인',
    status: 'upcoming'
  }
]

export default function EventList() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [favorites, setFavorites] = useState([])
  const [sortOrder, setSortOrder] = useState('asc') // asc: 시간 빠른 순, desc: 시간 느린 순
  
  const toggleFavorite = (eventId) => {
    if (favorites.includes(eventId)) {
      setFavorites(favorites.filter(id => id !== eventId))
    } else {
      setFavorites([...favorites, eventId])
    }
  }
  
  // 현재 시간 기준으로 지난 이벤트 자동 숨김 + 검색/날짜 필터 + 정렬
  const filteredEvents = useMemo(() => {
    const now = new Date()

    const toDateTime = (e) => {
      // Combine date and time as local time
      const iso = `${e.date}T${e.time.length === 5 ? e.time + ':00' : e.time}`
      return new Date(iso)
    }

    // 지난 이벤트 자동 필터링 (현재 시간 기준)
    const upcoming = MOCK_EVENTS
      .map(e => ({ ...e, __dt: toDateTime(e) }))
      .filter(e => e.__dt.getTime() >= now.getTime())

    // 검색어 및 날짜 필터
    const searched = upcoming.filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesDate = !filterDate || event.date === filterDate
      return matchesSearch && matchesDate
    })

    // 정렬: 시간 빠른 순(asc) 또는 느린 순(desc)
    const sorted = [...searched].sort((a, b) => {
      const diff = a.__dt.getTime() - b.__dt.getTime()
      return sortOrder === 'asc' ? diff : -diff
    })

    return sorted
  }, [searchTerm, filterDate, sortOrder])
  
  return (
    <div className="event-list-page">
      <div className="event-list-header">
        <div className="container">
          <button 
            className="btn-back"
            onClick={() => navigate('/visitor')}
          >
            ← 홈으로
          </button>
          
          <h1>전시회 이벤트</h1>
          
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
            
            <div className="filter-box">
              <Calendar size={20} />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="event-list-container container">
        <div className="results-info">
          <span>{filteredEvents.length}개의 이벤트</span>
        </div>

        {/* 정렬 선택 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <div className="filter-box" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={18} />
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="asc">시간 빠른 순</option>
              <option value="desc">시간 느린 순</option>
            </select>
          </div>
        </div>

        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {filteredEvents.map(event => (
            <div 
              key={event.id}
              style={{
                display: 'flex',
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: '2px solid #e5e7eb',
                height: '140px',
                position: 'relative'
              }}
              onClick={() => navigate(`/visitor/event/${event.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.3)'
                e.currentTarget.style.borderColor = '#2563eb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                e.currentTarget.style.borderColor = '#e5e7eb'
              }}
            >
              {/* Favorite Button */}
              <button 
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '0.75rem',
                  background: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 10,
                  color: favorites.includes(event.id) ? '#ef4444' : '#9ca3af'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(event.id)
                }}
              >
                <Heart size={20} fill={favorites.includes(event.id) ? 'currentColor' : 'none'} />
              </button>

              {/* Event Image */}
              <div style={{ 
                width: '180px',
                minWidth: '180px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <img 
                  src={event.image} 
                  alt={event.name}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover'
                  }}
                />
              </div>
              
              {/* Event Info */}
              <div style={{ 
                flex: 1,
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h3 style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: '700', 
                    marginBottom: '0.5rem',
                    color: '#1f2937'
                  }}>
                    {event.name}
                  </h3>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: '#6b7280',
                    marginBottom: '0.75rem',
                    lineHeight: '1.4'
                  }}>
                    {event.description}
                  </p>
                </div>
                
                <div style={{ 
                  display: 'flex',
                  gap: '1.5rem',
                  fontSize: '0.875rem',
                  color: '#4b5563'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span>{event.venue}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <span>{event.date} {event.time}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
