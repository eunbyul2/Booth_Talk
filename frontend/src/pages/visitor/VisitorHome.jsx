import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Calendar, Search } from 'lucide-react'
import './VisitorHome.css'
import { loadGoogleMaps } from '../../utils/loadGoogleMaps'

const VENUES = [
  { 
    id: 1, 
    name: '코엑스', 
    location: '서울 강남구',
    image: '🏢',
    activeEvents: 12,
    lat: 37.5113,
    lng: 127.0592
  },
  { 
    id: 2, 
    name: '킨텍스', 
    location: '경기 고양시',
    image: '🏛️',
    activeEvents: 8,
    lat: 37.6688,
    lng: 126.7459
  },
  { 
    id: 3, 
    name: '벡스코', 
    location: '부산 해운대구',
    image: '🏗️',
    activeEvents: 5,
    lat: 35.1689,
    lng: 129.1361
  }
]

export default function VisitorHome() {
  const navigate = useNavigate()
  const mapRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const [userPos, setUserPos] = useState(null)

  // Mock events for map markers and list under the map
  const events = [
    {
      id: 1,
      name: 'AI Summit Seoul & EXPO',
      venue: '코엑스 그랜드볼룸',
      datetime: '2025-11-10 14:00',
      lat: 37.5113,
      lng: 127.0592
    },
    {
      id: 2,
      name: '전자제품 박람회',
      venue: '킨텍스 1홀',
      datetime: '2025-11-15 10:00',
      lat: 37.6688,
      lng: 126.7459
    },
    {
      id: 3,
      name: '바이오 테크 컨퍼런스',
      venue: '코엑스 B홀',
      datetime: '2025-11-12 13:00',
      lat: 37.5115,
      lng: 127.0590
    }
  ]

  useEffect(() => {
    let mapInstance
    let infoWindow
    let markers = []

    async function init() {
      try {
        // Google Maps API key must be set in .env as VITE_GOOGLE_MAPS_API_KEY
        const google = await loadGoogleMaps()

        // Geolocation: center on user if available
        const defaultCenter = { lat: 37.5665, lng: 126.9780 } // Seoul fallback
        const pos = await new Promise((resolve) => {
          if (!navigator.geolocation) return resolve(defaultCenter)
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => resolve(defaultCenter),
            { enableHighAccuracy: true, timeout: 5000 }
          )
        })
        setUserPos(pos)

        mapInstance = new google.maps.Map(mapRef.current, {
          center: pos,
          zoom: 11,
          mapId: 'DEMO_MAP',
          fullscreenControl: false,
        })
        setMapReady(true)

        infoWindow = new google.maps.InfoWindow()

        // Add a marker for user position
        new google.maps.Marker({
          position: pos,
          map: mapInstance,
          title: '내 위치',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff'
          }
        })

        // Venue markers (전시장)
        const venueMarkers = VENUES.map((venue) => {
          const marker = new google.maps.Marker({
            position: { lat: venue.lat, lng: venue.lng },
            map: mapInstance,
            title: venue.name, // 마우스 오버 시 전시장 이름만 표시
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#10b981',
              fillOpacity: 0.9,
              strokeWeight: 3,
              strokeColor: '#ffffff'
            },
            label: {
              text: venue.image,
              fontSize: '18px',
            }
          })
          marker.addListener('click', () => {
            // 내 위치와의 거리 계산
            let distanceText = ''
            if (pos && pos.lat && pos.lng) {
              const R = 6371 // 지구 반지름 (km)
              const dLat = (venue.lat - pos.lat) * Math.PI / 180
              const dLng = (venue.lng - pos.lng) * Math.PI / 180
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(pos.lat * Math.PI / 180) * Math.cos(venue.lat * Math.PI / 180) *
                        Math.sin(dLng/2) * Math.sin(dLng/2)
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
              const distance = R * c
              
              if (distance < 1) {
                distanceText = `📍 내 위치에서 ${Math.round(distance * 1000)}m`
              } else {
                distanceText = `📍 내 위치에서 ${distance.toFixed(1)}km`
              }
            }

            infoWindow.setContent(`
              <div style="min-width:220px; padding:12px">
                <div style="font-size:24px; margin-bottom:8px">${venue.image}</div>
                <strong style="font-size:16px">${venue.name}</strong><br/>
                <span style="color:#10b981; font-weight:600; margin-top:4px; display:inline-block">${venue.activeEvents}개 이벤트 진행 중</span><br/>
                ${distanceText ? `<span style="color:#666; font-size:14px; margin-top:4px; display:inline-block">${distanceText}</span>` : ''}
              </div>
            `)
            infoWindow.open({ anchor: marker, map: mapInstance })
          })
          return marker
        })

        // Event markers (이벤트) - 제거됨
        // const eventMarkers = events.map((ev) => { ... })

        markers = [...venueMarkers]
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e)
      }
    }

    init()
    return () => {
      // no cleanup needed for basic map usage
      markers = []
    }
  }, [])
  
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
      
      {/* Map Section */}
      <div className="venues-section">
        <div className="container">
          <h2 className="section-title">내 주변 전시장 지도</h2>
          <p className="section-subtitle">브라우저 위치 권한을 허용하면 내 위치를 기준으로 표시됩니다</p>
          <div style={{ height: 420, borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
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
