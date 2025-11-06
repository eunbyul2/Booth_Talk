import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Search } from "lucide-react";
import "./VisitorHome.css";
import { loadGoogleMaps } from "../../utils/loadGoogleMaps";
import { getVisitorEvents } from "../../apiClient";

const FALLBACK_IMAGE = "https://placehold.co/400x200?text=Exhibition";

export default function VisitorHome() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [hoveredExhibitionId, setHoveredExhibitionId] = useState(null);
  const exhibitionMarkersRef = useRef([]);

  const [exhibitions, setExhibitions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [infoWindow, setInfoWindow] = useState(null);
  const [sortOrder, setSortOrder] = useState("date_asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationNotice, setLocationNotice] = useState(null);
  const [heroGlow, setHeroGlow] = useState({
    x: 50,
    y: 50,
    tiltX: "0deg",
    tiltY: "0deg",
  });

  const transformEventsToExhibitions = (fetchedEvents) => {
    return fetchedEvents.map((event) => {
      const startDate = event.start_date;
      const endDate = event.end_date;
      const lat = event.latitude ? Number(event.latitude) : null;
      const lng = event.longitude ? Number(event.longitude) : null;

      return {
        id: event.id,
        name: event.event_name,
        code: event.booth_number || event.event_type || "이벤트",
        startDate,
        endDate,
        hallInfo: event.location || "장소 정보 없음",
        venueName: event.venue_name || "전시장 미정",
        location: event.venue_location || event.location || "",
        description: event.description || "등록된 설명이 없습니다.",
        organizer: event.company_name,
        eventCount: 1,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        image: event.image_url || FALLBACK_IMAGE,
      };
    });
  };

  // Fetch exhibitions from API
  useEffect(() => {
    let mounted = true;

    async function fetchEvents() {
      try {
        setLoading(true);
        setError(null);

        const data = await getVisitorEvents({
          only_available: false,
          limit: 100,
        });
        const fetchedEvents = Array.isArray(data?.events) ? data.events : [];

        if (!mounted) return;

        setEvents(fetchedEvents);
        setExhibitions(transformEventsToExhibitions(fetchedEvents));
      } catch (err) {
        if (!mounted) return;
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "이벤트 정보를 불러오지 못했습니다."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchEvents();

    return () => {
      mounted = false;
    };
  }, []);

  // Initialize map
  useEffect(() => {
    async function init() {
      try {
        const google = await loadGoogleMaps();
        const defaultCenter = { lat: 37.5665, lng: 126.978 };
        let pos = defaultCenter;

        const hasGeolocation =
          typeof navigator !== "undefined" && !!navigator.geolocation;
        const isSecure =
          typeof window !== "undefined"
            ? window.isSecureContext ||
              window.location.protocol === "https:"
            : true;

        if (!hasGeolocation) {
          setLocationNotice(
            "이 브라우저는 위치 서비스를 지원하지 않아 기본 서울 좌표를 사용합니다."
          );
        } else if (!isSecure) {
          setLocationNotice(
            "보안 연결이 아니어서 위치 권한을 요청할 수 없습니다. 기본 좌표로 지도를 표시합니다."
          );
        }

        if (hasGeolocation && isSecure) {
          try {
            const permission = navigator.permissions
              ? await navigator.permissions.query({
                  name: "geolocation",
                })
              : null;

            if (permission?.state === "denied") {
              setLocationNotice(
                "위치 권한이 거부되어 기본 좌표로 지도를 표시합니다."
              );
            } else {
              pos = await new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                  (p) =>
                    resolve({
                      lat: p.coords.latitude,
                      lng: p.coords.longitude,
                    }),
                  () => resolve(defaultCenter),
                  { enableHighAccuracy: true, timeout: 5000 }
                );
              });
            }
          } catch {
            setLocationNotice(
              "위치 정보를 가져오지 못해 기본 좌표를 사용합니다."
            );
            pos = defaultCenter;
          }
        }

        const map = new google.maps.Map(mapRef.current, {
          center: pos,
          zoom: 11,
          mapId: "DEMO_MAP",
          fullscreenControl: false,
        });
        setMapInstance(map);

        const info = new google.maps.InfoWindow();
        setInfoWindow(info);

        new google.maps.Marker({
          position: pos,
          map: map,
          title: "내 위치",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#2563eb",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff",
          },
        });
      } catch (e) {
        console.error(e);
        setLocationNotice(
          "지도 서비스를 불러오지 못했습니다. 전시 정보는 정상적으로 확인할 수 있습니다."
        );
      }
    }
    init();
  }, []);

  // Create exhibition markers
  useEffect(() => {
    if (!mapInstance || !infoWindow || exhibitions.length === 0) return;

    const maps = window.google?.maps;
    if (!maps) return;

    exhibitionMarkersRef.current.forEach(({ marker }) => marker.setMap(null));
    exhibitionMarkersRef.current = [];

    const markers = exhibitions.map((ex) => {
      if (typeof ex.lat !== "number" || typeof ex.lng !== "number") {
        return null;
      }

      const size = 12;

      const marker = new maps.Marker({
        position: { lat: ex.lat, lng: ex.lng },
        map: mapInstance,
        title: ex.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="${size * 2}" height="${
            size * 2
          }" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <clipPath id="circle-${ex.id}">
                  <circle cx="${size}" cy="${size}" r="${size}"/>
                </clipPath>
              </defs>
              <circle cx="${size}" cy="${size}" r="${size}" fill="white"/>
              <image href="${ex.image}" width="${size * 2}" height="${
            size * 2
          }" clip-path="url(#circle-${ex.id})"/>
              <circle cx="${size}" cy="${size}" r="${size}" fill="none" stroke="#FF6B6B" stroke-width="3"/>
            </svg>
          `)}`,
          scaledSize: new maps.Size(size * 2, size * 2),
          anchor: new maps.Point(size, size),
        },
        zIndex: 100,
      });

      marker.addListener("click", () => {
        const formatDate = (dateStr) => {
          const date = new Date(dateStr);
          return `${date.getMonth() + 1}.${date.getDate()}`;
        };

        infoWindow.setContent(`
          <div style="min-width: 280px; padding: 12px;">
            <img src="${ex.image}" alt="${
          ex.name
        }" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 11px; padding: 3px 8px; background: rgba(255, 107, 107, 0.2); color: #FF6B6B; border-radius: 4px; font-weight: 700;">${
                ex.code
              }</span>
              <strong style="font-size: 16px;">${ex.name}</strong>
            </div>
            <p style="color: #666; font-size: 14px; margin: 4px 0 8px 0; line-height: 1.4;">${
              ex.description
            }</p>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span>📍</span>
                <span style="font-size: 13px; color: #666;">${ex.venueName} ${
          ex.hallInfo
        }</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span>📅</span>
                <span style="font-size: 13px; color: #666;">${formatDate(
                  ex.startDate
                )} ~ ${formatDate(ex.endDate)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span>🏢</span>
                <span style="font-size: 13px; color: #666;">참여 업체 ${
                  ex.eventCount
                }개</span>
              </div>
            </div>
            <button onclick="window.location.href='/visitor/events?exhibition_id=${
              ex.id
            }'" style="
              margin-top: 12px;
              width: 100%;
              padding: 8px;
              background: #FF6B6B;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
            ">참여 업체 보기 →</button>
          </div>
        `);
        infoWindow.open({ anchor: marker, map: mapInstance });
      });

      return { marker, exhibitionId: ex.id };
    });

    exhibitionMarkersRef.current = markers.filter(Boolean);
  }, [mapInstance, infoWindow, exhibitions]);

  // Handle hover effect
  useEffect(() => {
    if (exhibitionMarkersRef.current.length === 0) return;

    const maps = window.google?.maps;
    if (!maps) return;

    exhibitionMarkersRef.current.forEach(({ marker, exhibitionId }) => {
      const exhibition = exhibitions.find((e) => e.id === exhibitionId);
      if (!exhibition) return;

      const normalSize = 12;
      const hoverSize = 16;
      const size =
        hoveredExhibitionId === exhibitionId ? hoverSize : normalSize;

      if (!marker) return;

      marker.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="${size * 2}" height="${
          size * 2
        }" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <clipPath id="circle-${exhibitionId}">
                <circle cx="${size}" cy="${size}" r="${size}"/>
              </clipPath>
            </defs>
            <circle cx="${size}" cy="${size}" r="${size}" fill="white"/>
            <image href="${exhibition.image}" width="${size * 2}" height="${
          size * 2
        }" clip-path="url(#circle-${exhibitionId})"/>
            <circle cx="${size}" cy="${size}" r="${size}" fill="none" stroke="#FF6B6B" stroke-width="${
          hoveredExhibitionId === exhibitionId ? "4" : "3"
        }"/>
          </svg>
        `)}`,
        scaledSize: new maps.Size(size * 2, size * 2),
        anchor: new maps.Point(size, size),
      });
      marker.setZIndex(hoveredExhibitionId === exhibitionId ? 1000 : 100);
    });
  }, [hoveredExhibitionId, exhibitions]);

  // Sort exhibitions
  const sortedExhibitions = [...exhibitions].sort((a, b) => {
    if (sortOrder === "date_asc") {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateA - dateB;
    } else if (sortOrder === "date_desc") {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateB - dateA;
    } else if (sortOrder === "location") {
      // 장소별 정렬 (가나다순)
      return a.venueName.localeCompare(b.venueName, "ko");
    }
    return 0;
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[date.getDay()];
    return `${month}.${day}(${dayName})`;
  };

  const totalExhibitions = exhibitions.length;
  const uniqueCompanyCount =
    events.length > 0
      ? new Set(events.map((event) => event.company_id)).size
      : 0;
  const totalViewCount = events.reduce(
    (sum, event) => sum + (event.view_count || 0),
    0
  );

  const formatStatValue = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="visitor-home">
      {/* Hero Section */}
      <div
        className="hero-section"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          const tiltX = ((y - 50) / 60).toFixed(3);
          const tiltY = ((x - 50) / -60).toFixed(3);
          setHeroGlow({ x, y, tiltX: `${tiltX}deg`, tiltY: `${tiltY}deg` });
        }}
        onMouseLeave={() =>
          setHeroGlow({ x: 50, y: 50, tiltX: "0deg", tiltY: "0deg" })
        }
        style={{
          "--pointer-x": `${heroGlow.x}%`,
          "--pointer-y": `${heroGlow.y}%`,
          "--tilt-x": heroGlow.tiltX || "0deg",
          "--tilt-y": heroGlow.tiltY || "0deg",
        }}
      >
        <div className="hero-content">
          <h1 className="hero-title">전시회 이벤트를 한눈에 확인하세요</h1>
          <p className="hero-subtitle">
            코엑스, 킨텍스, 벡스코의 모든 전시회 정보와 이벤트를 실시간으로
            제공합니다
          </p>

          <div className="hero-search">
            <Search size={20} />
            <input
              type="text"
              placeholder="전시회 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // Enter를 누르면 검색어로 이동하거나, 검색어가 없으면 전체 리스트로 이동
                  const searchUrl = searchQuery
                    ? `/visitor/events?search=${encodeURIComponent(
                        searchQuery
                      )}`
                    : "/visitor/events";
                  navigate(searchUrl);
                }
              }}
            />
          </div>

          <div className="hero-stats">
            <div className="hero-stats-list">
              <div className="hero-stats-item">
                <span className="hero-stats-label">진행 중인 전시회</span>
                <span className="hero-stats-value">
                  {loading ? "-" : totalExhibitions}
                </span>
              </div>
              <div className="hero-stats-item">
                <span className="hero-stats-label">참가 기업</span>
                <span className="hero-stats-value">
                  {loading ? "-" : uniqueCompanyCount}
                </span>
              </div>
              <div className="hero-stats-item">
                <span className="hero-stats-label">방문자</span>
                <span className="hero-stats-value">
                  {loading ? "-" : formatStatValue(totalViewCount)}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <p style={{ marginTop: "1rem", color: "#ef4444", fontWeight: 500 }}>
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Map + Upcoming Section */}
      <div className="venues-section">
        <div className="container">
          <div className="map-list-layout">
            <div className="map-card">
              <h2 className="section-title section-title--tight">
                내 주변 전시장 지도
              </h2>
              <p className="section-subtitle section-subtitle--muted">
                브라우저 위치 권한을 허용하면 내 위치를 기준으로 표시됩니다
              </p>
              <div className="map-frame">
                <div ref={mapRef} className="map-frame-inner" />
              </div>
              {locationNotice && (
                <p className="map-notice">{locationNotice}</p>
              )}
            </div>

            <div className="list-card">
              <div className="list-header">
                <div>
                  <h2 className="section-title section-title--tight">
                    진행 예정 전시회
                  </h2>
                  <p className="section-subtitle section-subtitle--muted">
                    지도의 마커를 클릭하거나 전시회를 선택하여 참여 업체를
                    확인하세요
                  </p>
                </div>
                <div className="list-filter">
                  <label htmlFor="home-sort">정렬:</label>
                  <select
                    id="home-sort"
                    className="list-select"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  >
                    <option value="date_asc">시간 빠른 순</option>
                    <option value="date_desc">시간 느린 순</option>
                    <option value="location">장소별</option>
                  </select>
                </div>
              </div>

              <div className="home-exhibition-list">
                {loading && (
                  <div className="home-message home-message--loading">
                    이벤트 정보를 불러오는 중입니다...
                  </div>
                )}

                {!loading && sortedExhibitions.length === 0 && (
                  <div className="home-message">
                    표시할 전시회가 없습니다. 다른 시간이나 필터로 다시 시도해
                    주세요.
                  </div>
                )}

                {!loading &&
                  sortedExhibitions.map((exhibition) => (
                    <div
                      key={exhibition.id}
                      className={`home-exhibition-card${
                        hoveredExhibitionId === exhibition.id ? " is-hovered" : ""
                      }`}
                      onClick={() =>
                        navigate(`/visitor/events?exhibition_id=${exhibition.id}`)
                      }
                      onMouseEnter={() => setHoveredExhibitionId(exhibition.id)}
                      onMouseLeave={() => setHoveredExhibitionId(null)}
                    >
                      <div className="home-exhibition-thumb">
                        <img src={exhibition.image} alt={exhibition.name} />
                      </div>
                      <div className="home-exhibition-body">
                        <div>
                          <div className="home-exhibition-title">
                            <span className="home-exhibition-badge">
                              {exhibition.code}
                            </span>
                            <h3>{exhibition.name}</h3>
                          </div>
                          <p className="home-exhibition-desc">
                            {exhibition.description || "등록된 설명이 없습니다."}
                          </p>
                        </div>
                        <div className="home-exhibition-meta">
                          <div className="home-exhibition-metaItem home-exhibition-metaItem--location">
                            <MapPin size={16} />
                            <span>
                              {exhibition.venueName} {exhibition.hallInfo}
                            </span>
                          </div>
                          <div className="home-exhibition-metaItem home-exhibition-metaItem--date">
                            <Calendar size={16} />
                            <span>
                              {formatDate(exhibition.startDate)} ~{" "}
                              {formatDate(exhibition.endDate)}
                            </span>
                          </div>
                          <div className="home-exhibition-metaItem">
                            <span role="img" aria-label="building">
                              🏢
                            </span>
                            <span>참여 업체 {exhibition.eventCount}개</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
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
              <a href="/admin/login">관리자</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
