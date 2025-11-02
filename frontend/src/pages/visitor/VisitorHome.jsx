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
  const [hoveredEventId, setHoveredEventId] = useState(null)
  const eventMarkersRef = useRef([])

  // Mock events for map markers and list under the map
  const events = [
    {
      id: 1,
      name: 'AI Summit Seoul & EXPO',
      venue: '코엑스 그랜드볼룸',
      address: '서울 강남구 영동대로 513',
      datetime: '2025-11-10 14:00',
      description: 'AI 기술의 최신 트렌드를 한눈에',
      lat: 37.5113,
      lng: 127.0592,
      image: 'https://picsum.photos/seed/ai-summit/400/200'
    },
    {
      id: 2,
      name: '전자제품 박람회',
      venue: '킨텍스 1홀',
      address: '경기 고양시 일산서구 킨텍스로 217-60',
      datetime: '2025-11-15 10:00',
      description: '최신 전자제품과 혁신 기술 전시',
      lat: 37.6688,
      lng: 126.7459,
      image: 'https://picsum.photos/seed/electronics/400/200'
    },
    {
      id: 3,
      name: '바이오 테크 컨퍼런스',
      venue: '코엑스 B홀',
      address: '서울 강남구 영동대로 513',
      datetime: '2025-11-12 13:00',
      description: '바이오 기술의 미래를 논하다',
      lat: 37.5115,
      lng: 127.0590,
      image: 'https://picsum.photos/seed/biotech/400/200'
    },
    {
      id: 4,
      name: '스마트 모빌리티 쇼',
      venue: '벡스코 제1전시장',
      address: '부산 해운대구 APEC로 55',
      datetime: '2025-11-18 11:00',
      description: '미래 모빌리티의 모든 것',
      lat: 35.1689,
      lng: 129.1361,
      image: 'https://picsum.photos/seed/mobility/400/200'
    },
    {
      id: 5,
      name: '푸드테크 페스티벌',
      venue: '킨텍스 2홀',
      address: '경기 고양시 일산서구 킨텍스로 217-60',
      datetime: '2025-11-20 09:00',
      description: '식품 기술의 혁신을 경험하세요',
      lat: 37.6690,
      lng: 126.7461,
      image: 'https://picsum.photos/seed/foodtech/400/200'
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

        // Venue markers (전시장) - 삭제됨

        // Event markers (이벤트) - 각 행사의 이미지를 원형 마커로 사용
        const eventMarkers = events.map((ev) => {
          // Create circular clipped image marker
          const size = 8 // 1/3로 줄임 (25 -> 8)
          
          const marker = new google.maps.Marker({
            position: { lat: ev.lat, lng: ev.lng },
            map: mapInstance,
            title: ev.name,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg width="${size*2}" height="${size*2}" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <clipPath id="circle-${ev.id}">
                      <circle cx="${size}" cy="${size}" r="${size}"/>
                    </clipPath>
                  </defs>
                  <circle cx="${size}" cy="${size}" r="${size}" fill="white"/>
                  <image href="${ev.image}" width="${size*2}" height="${size*2}" clip-path="url(#circle-${ev.id})"/>
                  <circle cx="${size}" cy="${size}" r="${size}" fill="none" stroke="white" stroke-width="2"/>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(size*2, size*2),
              anchor: new google.maps.Point(size, size)
            },
            zIndex: 100
          })

          // Add click listener to show InfoWindow and navigate
          marker.addListener('click', () => {
            infoWindow.setContent(`
              <div style="min-width: 250px; padding: 12px;">
                <img src="${ev.image}" alt="${ev.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
                <strong style="font-size: 16px; display: block; margin-bottom: 4px;">${ev.name}</strong>
                <p style="color: #666; font-size: 14px; margin: 4px 0;">${ev.description}</p>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span style="font-size: 18px;">📍</span>
                    <span style="font-size: 13px; color: #666;">${ev.venue}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 18px;">📅</span>
                    <span style="font-size: 13px; color: #666;">${ev.datetime}</span>
                  </div>
                </div>
                <button onclick="window.location.href='/visitor/event/${ev.id}'" style="
                  margin-top: 12px;
                  width: 100%;
                  padding: 8px;
                  background: #2563eb;
                  color: white;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-weight: 600;
                ">상세보기 →</button>
              </div>
            `)
            infoWindow.open({ anchor: marker, map: mapInstance })
          })

          return { marker, eventId: ev.id }
        })

        eventMarkersRef.current = eventMarkers
        markers = [...eventMarkers.map(em => em.marker)]
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

  // Handle hover effect on event markers
  useEffect(() => {
    if (eventMarkersRef.current.length === 0) return

    eventMarkersRef.current.forEach(({ marker, eventId }) => {
      const event = events.find(e => e.id === eventId)
      if (!event) return
      
      const normalSize = 8
      const hoverSize = 12 // 호버 시 약간 크게
      const size = hoveredEventId === eventId ? hoverSize : normalSize
      
      marker.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="${size*2}" height="${size*2}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <clipPath id="circle-${eventId}">
                <circle cx="${size}" cy="${size}" r="${size}"/>
              </clipPath>
            </defs>
            <circle cx="${size}" cy="${size}" r="${size}" fill="white"/>
            <image href="${event.image}" width="${size*2}" height="${size*2}" clip-path="url(#circle-${eventId})"/>
            <circle cx="${size}" cy="${size}" r="${size}" fill="none" stroke="${hoveredEventId === eventId ? '#2563eb' : 'white'}" stroke-width="${hoveredEventId === eventId ? '3' : '2'}"/>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(size*2, size*2),
        anchor: new window.google.maps.Point(size, size)
      })
      marker.setZIndex(hoveredEventId === eventId ? 1000 : 100)
    })
  }, [hoveredEventId, events])
  
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

      {/* Event List - Vertical List Format */}
      <div className="venues-section" style={{ paddingTop: '2rem' }}>
        <div className="container">
          <h2 className="section-title">진행 예정 행사</h2>
          <p className="section-subtitle">지도의 마커를 클릭하거나 행사를 선택하여 상세 정보를 확인하세요</p>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginTop: '1.5rem'
          }}>
            {events.map(event => (
              <div 
                key={event.id}
                style={{
                  display: 'flex',
                  background: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: hoveredEventId === event.id 
                    ? '0 4px 16px rgba(37, 99, 235, 0.3)' 
                    : '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: hoveredEventId === event.id ? '2px solid #2563eb' : '2px solid #e5e7eb',
                  height: '140px'
                }}
                onClick={() => navigate(`/visitor/event/${event.id}`)}
                onMouseEnter={() => setHoveredEventId(event.id)}
                onMouseLeave={() => setHoveredEventId(null)}
              >
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
                      <span>{event.datetime}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="quick-links" style={{ marginTop: '2rem' }}>
            <button 
              className="quick-link-btn"
              onClick={() => navigate('/visitor/events')}
            >
              모든 이벤트 보기
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
