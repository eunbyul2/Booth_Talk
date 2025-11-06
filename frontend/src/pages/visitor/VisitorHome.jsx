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
  const [userPos, setUserPos] = useState(null);
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
        const pos = await new Promise((resolve) => {
          if (!navigator.geolocation) return resolve(defaultCenter);
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => resolve(defaultCenter),
            { enableHighAccuracy: true, timeout: 5000 }
          );
        });
        setUserPos(pos);

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
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            전시회 이벤트를
            <br />
            한눈에 확인하세요
          </h1>
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
            <div className="stat">
              <div className="stat-number">
                {loading ? "-" : totalExhibitions}
              </div>
              <div className="stat-label">진행 중인 전시회</div>
            </div>
            <div className="stat">
              <div className="stat-number">
                {loading ? "-" : uniqueCompanyCount}
              </div>
              <div className="stat-label">참가 기업</div>
            </div>
            <div className="stat">
              <div className="stat-number">
                {loading ? "-" : formatStatValue(totalViewCount)}
              </div>
              <div className="stat-label">방문자</div>
            </div>
          </div>

          {error && (
            <p style={{ marginTop: "1rem", color: "#ef4444", fontWeight: 500 }}>
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Map Section */}
      <div className="venues-section">
        <div className="container">
          <h2 className="section-title">내 주변 전시장 지도</h2>
          <p className="section-subtitle">
            브라우저 위치 권한을 허용하면 내 위치를 기준으로 표시됩니다
          </p>
          <div
            style={{
              height: 420,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "var(--shadow)",
            }}
          >
            <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
          </div>
        </div>
      </div>

      {/* Exhibition List */}
      <div className="venues-section" style={{ paddingTop: "2rem" }}>
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h2 className="section-title" style={{ marginBottom: "0.5rem" }}>
                진행 전시회
              </h2>
              <p className="section-subtitle" style={{ margin: 0 }}>
                지도의 마커를 클릭하거나 전시회를 선택하여 참여 업체를
                확인하세요
              </p>
            </div>

            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <label
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  fontWeight: "500",
                }}
              >
                정렬:
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{
                  padding: "0.5rem 2rem 0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <option value="date_asc">시간 빠른 순</option>
                <option value="date_desc">시간 느린 순</option>
                <option value="location">장소별</option>
              </select>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginTop: "1.5rem",
            }}
          >
            {loading && (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                이벤트 정보를 불러오는 중입니다...
              </div>
            )}

            {!loading && sortedExhibitions.length === 0 && (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "#6b7280",
                  border: "1px dashed #d1d5db",
                  borderRadius: "12px",
                  background: "#f9fafb",
                }}
              >
                표시할 전시회가 없습니다. 다른 시간이나 필터로 다시 시도해
                주세요.
              </div>
            )}

            {sortedExhibitions.map((exhibition) => (
              <div
                key={exhibition.id}
                style={{
                  display: "flex",
                  background: "white",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow:
                    hoveredExhibitionId === exhibition.id
                      ? "0 4px 16px rgba(255, 107, 107, 0.3)"
                      : "0 2px 8px rgba(0,0,0,0.1)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  border:
                    hoveredExhibitionId === exhibition.id
                      ? "2px solid #FF6B6B"
                      : "2px solid #e5e7eb",
                  height: "140px",
                }}
                onClick={() =>
                  navigate(`/visitor/events?exhibition_id=${exhibition.id}`)
                }
                onMouseEnter={() => setHoveredExhibitionId(exhibition.id)}
                onMouseLeave={() => setHoveredExhibitionId(null)}
              >
                <div
                  style={{
                    width: "180px",
                    minWidth: "180px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={exhibition.image}
                    alt={exhibition.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.25rem 0.5rem",
                          background: "rgba(255, 107, 107, 0.2)",
                          color: "#FF6B6B",
                          borderRadius: "4px",
                          fontWeight: "700",
                        }}
                      >
                        {exhibition.code}
                      </span>
                      <h3
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "700",
                          margin: 0,
                          color: "#1f2937",
                        }}
                      >
                        {exhibition.name}
                      </h3>
                    </div>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        marginBottom: "0.75rem",
                        lineHeight: "1.4",
                      }}
                    >
                      {exhibition.description}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "1.5rem",
                      fontSize: "0.875rem",
                      color: "#4b5563",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <MapPin
                        size={16}
                        style={{ color: "#FF6B6B", flexShrink: 0 }}
                      />
                      <span>
                        {exhibition.venueName} {exhibition.hallInfo}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <Calendar
                        size={16}
                        style={{ color: "#f59e0b", flexShrink: 0 }}
                      />
                      <span>
                        {formatDate(exhibition.startDate)} ~{" "}
                        {formatDate(exhibition.endDate)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <span style={{ fontSize: "16px" }}>🏢</span>
                      <span>참여 업체 {exhibition.eventCount}개</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
