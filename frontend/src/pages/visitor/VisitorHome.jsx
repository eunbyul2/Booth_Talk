import { useNavigate } from 'react-router-dom'
import { MapPin, Calendar, Search } from 'lucide-react'
import './VisitorHome.css'

const VENUES = [
  { 
    id: 1, 
    name: '코엑스', 
    location: '서울 강남구',
    image: '🏢',
    activeEvents: 12
  },
  { 
    id: 2, 
    name: '킨텍스', 
    location: '경기 고양시',
    image: '🏛️',
    activeEvents: 8
  },
  { 
    id: 3, 
    name: '벡스코', 
    location: '부산 해운대구',
    image: '🏗️',
    activeEvents: 5
  }
]

export default function VisitorHome() {
  const navigate = useNavigate()
  
  return (
    <div className="visitor-home">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            전시회 이벤트를<br />한눈에 확인하세요
          </h1>
          <p className="hero-subtitle">
            코엑스, 킨텍스, 벡스코의 모든 전시회 정보와 이벤트를 실시간으로 제공합니다
          </p>
          
          <div className="hero-search">
            <Search size={20} />
            <input 
              type="text" 
              placeholder="이벤트 검색..."
              onFocus={() => navigate('/visitor/events')}
            />
          </div>
          
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-number">25</div>
              <div className="stat-label">진행 중인 이벤트</div>
            </div>
            <div className="stat">
              <div className="stat-number">150+</div>
              <div className="stat-label">참가 기업</div>
            </div>
            <div className="stat">
              <div className="stat-number">10K+</div>
              <div className="stat-label">방문자</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Venue Selection */}
      <div className="venues-section">
        <div className="container">
          <h2 className="section-title">전시장 선택</h2>
          <p className="section-subtitle">원하는 전시장을 선택하여 이벤트를 확인하세요</p>
          
          <div className="venues-grid">
            {VENUES.map(venue => (
              <div 
                key={venue.id} 
                className="venue-card"
                onClick={() => navigate(`/visitor/events?venue=${venue.id}`)}
              >
                <div className="venue-image">{venue.image}</div>
                <h3 className="venue-name">{venue.name}</h3>
                <div className="venue-location">
                  <MapPin size={16} />
                  <span>{venue.location}</span>
                </div>
                <div className="venue-events">
                  <Calendar size={16} />
                  <span>{venue.activeEvents}개 진행 중</span>
                </div>
                <button className="btn-view">이벤트 보기</button>
              </div>
            ))}
          </div>
          
          <div className="quick-links">
            <button 
              className="quick-link-btn"
              onClick={() => navigate('/visitor/events')}
            >
              모든 이벤트 보기
            </button>
            <button 
              className="quick-link-btn"
              onClick={() => navigate('/visitor/events?nearby=true')}
            >
              <MapPin size={18} />
              내 주변 이벤트
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="visitor-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <span className="logo-icon">🎪</span>
              <span>전시회 플랫폼</span>
            </div>
            <div className="footer-links">
              <a href="/company/login">기업 로그인</a>
              <a href="/admin/login">관리자</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
