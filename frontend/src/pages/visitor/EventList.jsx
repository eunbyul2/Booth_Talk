import { useState } from 'react'
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
    venue: '코엑스 그랜드볼룸',
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
    venue: '킨텍스 1홀',
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
    venue: '코엑스 B홀',
    benefits: '무료 샘플 증정',
    status: 'upcoming'
  }
]

export default function EventList() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [favorites, setFavorites] = useState([])
  
  const toggleFavorite = (eventId) => {
    if (favorites.includes(eventId)) {
      setFavorites(favorites.filter(id => id !== eventId))
    } else {
      setFavorites([...favorites, eventId])
    }
  }
  
  const filteredEvents = MOCK_EVENTS.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.company.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDate = !filterDate || event.date === filterDate
    return matchesSearch && matchesDate
  })
  
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
        
        <div className="events-grid">
          {filteredEvents.map(event => (
            <div 
              key={event.id} 
              className="event-card"
              onClick={() => navigate(`/visitor/event/${event.id}`)}
            >
              <button 
                className={`btn-favorite ${favorites.includes(event.id) ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(event.id)
                }}
              >
                <Heart size={20} fill={favorites.includes(event.id) ? 'currentColor' : 'none'} />
              </button>
              
              <div className="event-image">
                <div className="event-badge">진행예정</div>
              </div>
              
              <div className="event-content">
                <h3 className="event-name">{event.name}</h3>
                <p className="event-company">{event.company}</p>
                
                <div className="event-details">
                  <div className="detail-item">
                    <MapPin size={16} />
                    <span>{event.venue}</span>
                  </div>
                  <div className="detail-item">
                    <Calendar size={16} />
                    <span>{event.date} {event.time}</span>
                  </div>
                </div>
                
                <div className="event-booth">
                  부스 {event.booth}
                </div>
                
                <div className="event-benefits">
                  🎁 {event.benefits}
                </div>
                
                <button className="btn-detail">
                  상세보기 →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
