import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search } from "lucide-react";
import "./VisitorHome.css";
import { loadGoogleMaps } from "../../utils/loadGoogleMaps";
import { getVisitorEvents } from "../../apiClient";

const DEFAULT_MAP_CENTER = { lat: 37.5665, lng: 126.978 };

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function transformEventsToExhibitions(eventList) {
  const groups = new Map();

  eventList.forEach((event) => {
    const baseKey =
      event.venue_id !== null && event.venue_id !== undefined
        ? `venue-${event.venue_id}`
        : event.venue_name
        ? `name-${event.venue_name}`
        : event.location
        ? `location-${event.location}`
        : `event-${event.id}`;

    const lat = toNumberOrNull(event.latitude);
    const lng = toNumberOrNull(event.longitude);

    if (!groups.has(baseKey)) {
      groups.set(baseKey, {
        id: baseKey,
        venueId:
          event.venue_id !== null && event.venue_id !== undefined
            ? event.venue_id
            : null,
        name:
          event.venue_name || event.location || event.event_name || "전시장",
        code: event.venue_name ? "전시장" : event.event_type || "이벤트",
        description: event.description || "",
        location: event.location || event.venue_location || "",
        hallInfo:
          event.venue_address || event.location || event.venue_location || "",
        venueName: event.venue_name || event.location || "전시장",
        lat,
        lng,
        startDate: event.start_date || null,
        endDate: event.end_date || event.start_date || null,
        eventCount: 0,
        companyIds: new Set(),
        eventNames: new Set(),
      });
    }

    const group = groups.get(baseKey);

    if (lat !== null && group.lat === null) {
      group.lat = lat;
    }
    if (lng !== null && group.lng === null) {
      group.lng = lng;
    }

    if (event.start_date) {
      if (
        !group.startDate ||
        new Date(event.start_date) < new Date(group.startDate)
      ) {
        group.startDate = event.start_date;
      }
    }

    const eventEnd = event.end_date || event.start_date;
    if (eventEnd) {
      if (!group.endDate || new Date(eventEnd) > new Date(group.endDate)) {
        group.endDate = eventEnd;
      }
    }

    if (!group.description && event.description) {
      group.description = event.description;
    }

    if (!group.location && (event.location || event.venue_location)) {
      group.location = event.location || event.venue_location || "";
    }

    if (!group.hallInfo && (event.venue_address || event.location)) {
      group.hallInfo =
        event.venue_address || event.location || event.venue_location || "";
    }

    if (!group.venueName && event.venue_name) {
      group.venueName = event.venue_name;
    }

    if (event.event_name) {
      group.eventNames.add(event.event_name);
    }

    if (event.company_id !== null && event.company_id !== undefined) {
      group.companyIds.add(event.company_id);
    }

    group.eventCount += 1;
  });

  return Array.from(groups.values())
    .map((group) => {
      const uniqueCompanyCount = group.companyIds.size;
      const baseDescription = group.description?.trim();
      let finalDescription = baseDescription || "";

      if (!finalDescription && group.eventNames.size > 0) {
        const highlights = Array.from(group.eventNames)
          .filter(Boolean)
          .slice(0, 2)
          .join(", ");
        if (highlights) {
          finalDescription = `${highlights} 등 다양한 전시 이벤트가 진행 중입니다.`;
        }
      }

      const trimmedName = group.name?.trim();
      const displayName =
        trimmedName ||
        group.venueName?.trim() ||
        group.location?.trim() ||
        "전시장";

      return {
        id: group.id,
        venueId: group.venueId,
        name: displayName,
        code: group.code || "전시장",
        description: finalDescription,
        location: group.location,
        hallInfo: group.hallInfo,
        venueName: group.venueName || displayName,
        lat: group.lat,
        lng: group.lng,
        startDate: group.startDate,
        endDate: group.endDate,
        eventCount:
          uniqueCompanyCount > 0 ? uniqueCompanyCount : group.eventCount,
      };
    })
    .sort((a, b) => {
      const dateA = a.startDate
        ? new Date(a.startDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const dateB = b.startDate
        ? new Date(b.startDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      return dateA - dateB;
    });
}

function calculateDistanceKm(from, to) {
  if (!from || !to) {
    return null;
  }

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function formatDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) {
    return null;
  }
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

function formatStatValue(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

export default function VisitorHome() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const exhibitionMarkersRef = useRef([]);
  const [events, setEvents] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [infoWindow, setInfoWindow] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [locationNotice, setLocationNotice] = useState("");
  const [hoveredExhibitionId, setHoveredExhibitionId] = useState(null);
  const [sortOrder, setSortOrder] = useState("distance");
  const [searchQuery, setSearchQuery] = useState("");
  const [heroGlow, setHeroGlow] = useState({
    x: 50,
    y: 50,
    tiltX: "0deg",
    tiltY: "0deg",
  });

  useEffect(() => {
    let mounted = true;

    async function fetchEvents() {
      setLoading(true);
      setError(null);

      try {
        const data = await getVisitorEvents({
          only_available: false,
          limit: 100,
          sort_by: "date_asc",
        });

        if (!mounted) return;

        const fetchedEvents = Array.isArray(data?.events) ? data.events : [];
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

  useEffect(() => {
    let isActive = true;

    async function init() {
      try {
        const google = await loadGoogleMaps();
        if (!isActive) {
          return;
        }

        let pos = DEFAULT_MAP_CENTER;
        let resolvedUserPosition = null;

        const hasGeolocation =
          typeof navigator !== "undefined" && !!navigator.geolocation;
        const isSecure =
          typeof window !== "undefined"
            ? window.isSecureContext || window.location.protocol === "https:"
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
              ? await navigator.permissions.query({ name: "geolocation" })
              : null;

            if (permission?.state === "denied") {
              setLocationNotice(
                "위치 권한이 거부되어 기본 좌표로 지도를 표시합니다."
              );
            } else {
              let usedUserLocation = false;
              const result = await new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                  (p) => {
                    usedUserLocation = true;
                    resolve({
                      lat: p.coords.latitude,
                      lng: p.coords.longitude,
                    });
                  },
                  () => resolve(DEFAULT_MAP_CENTER),
                  { enableHighAccuracy: true, timeout: 5000 }
                );
              });
              pos = result;
              if (usedUserLocation) {
                resolvedUserPosition = result;
              }
            }
          } catch {
            setLocationNotice(
              "위치 정보를 가져오지 못해 기본 좌표를 사용합니다."
            );
            pos = DEFAULT_MAP_CENTER;
          }
        }

        if (!isActive) {
          return;
        }

        setUserPosition(resolvedUserPosition);

        const map = new google.maps.Map(mapRef.current, {
          center: pos,
          zoom: 11,
          mapId: "DEMO_MAP",
          fullscreenControl: false,
        });

        if (!isActive) {
          return;
        }

        setMapInstance(map);

        const info = new google.maps.InfoWindow();
        setInfoWindow(info);

        if (resolvedUserPosition) {
          new google.maps.Marker({
            position: resolvedUserPosition,
            map,
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
        }
      } catch (e) {
        if (!isActive) return;
        console.error(e);
        setLocationNotice(
          "지도 서비스를 불러오지 못했습니다. 전시 정보는 정상적으로 확인할 수 있습니다."
        );
      }
    }

    init();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance || !infoWindow || exhibitions.length === 0) {
      return;
    }

    const maps = window.google?.maps;
    if (!maps) {
      return;
    }

    exhibitionMarkersRef.current.forEach(({ marker }) => marker?.setMap(null));
    exhibitionMarkersRef.current = [];

    const markers = exhibitions.map((ex) => {
      if (typeof ex.lat !== "number" || typeof ex.lng !== "number") {
        return null;
      }

      const marker = new maps.Marker({
        position: { lat: ex.lat, lng: ex.lng },
        map: mapInstance,
        title: ex.name,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#FF6B6B",
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex: 100,
      });

      marker.addListener("click", () => {
        const distanceKm =
          userPosition && Number.isFinite(ex.lat) && Number.isFinite(ex.lng)
            ? calculateDistanceKm(userPosition, { lat: ex.lat, lng: ex.lng })
            : null;
        const distanceText = formatDistance(distanceKm);
        const locationLine = [ex.venueName, ex.hallInfo]
          .filter(Boolean)
          .join(" · ");

        const params = new URLSearchParams();
        if (ex.location) {
          params.set("location", ex.location);
        }
        if (ex.venueName) {
          params.set("venue_name", ex.venueName);
        }
        if (ex.venueId) {
          params.set("venue_id", ex.venueId);
        }
        const detailUrl = params.toString()
          ? `/visitor/events?${params.toString()}`
          : "/visitor/events";

        infoWindow.setContent(`
          <div style="min-width: 280px; padding: 12px;">
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
                <span style="font-size: 13px; color: #666;">${locationLine}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span>🏢</span>
                <span style="font-size: 13px; color: #666;">참여 업체 ${
                  ex.eventCount
                }개</span>
              </div>
              ${
                distanceText
                  ? `<div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;"><span>🚶</span><span style="font-size: 13px; color: #666;">내 위치로부터 ${distanceText}</span></div>`
                  : ""
              }
            </div>
            <button onclick="window.location.href='${detailUrl}'" style="
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

    return () => {
      markers.forEach((entry) => {
        if (entry?.marker) {
          entry.marker.setMap(null);
        }
      });
    };
  }, [mapInstance, infoWindow, exhibitions, userPosition]);

  useEffect(() => {
    if (exhibitionMarkersRef.current.length === 0) return;

    const maps = window.google?.maps;
    if (!maps) return;

    exhibitionMarkersRef.current.forEach(({ marker, exhibitionId }) => {
      const exhibition = exhibitions.find((e) => e.id === exhibitionId);
      if (!exhibition || !marker) return;

      const isHovered = hoveredExhibitionId === exhibitionId;

      marker.setIcon({
        path: maps.SymbolPath.CIRCLE,
        scale: isHovered ? 11 : 9,
        fillColor: isHovered ? "#FF8A80" : "#FF6B6B",
        fillOpacity: 0.95,
        strokeColor: "#ffffff",
        strokeWeight: isHovered ? 3 : 2,
      });
      marker.setZIndex(isHovered ? 1000 : 100);
    });
  }, [hoveredExhibitionId, exhibitions]);

  const exhibitionsWithDistance = useMemo(() => {
    return exhibitions.map((ex) => {
      if (userPosition && Number.isFinite(ex.lat) && Number.isFinite(ex.lng)) {
        const distanceKm = calculateDistanceKm(userPosition, {
          lat: ex.lat,
          lng: ex.lng,
        });
        return { ...ex, distanceKm };
      }
      return { ...ex, distanceKm: null };
    });
  }, [exhibitions, userPosition]);

  const sortedExhibitions = useMemo(() => {
    const list = [...exhibitionsWithDistance];

    if (sortOrder === "distance" && userPosition) {
      list.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    } else if (sortOrder === "date_asc") {
      list.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate) : new Date();
        const dateB = b.startDate ? new Date(b.startDate) : new Date();
        return dateA - dateB;
      });
    } else if (sortOrder === "date_desc") {
      list.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate) : new Date();
        const dateB = b.startDate ? new Date(b.startDate) : new Date();
        return dateB - dateA;
      });
    } else if (sortOrder === "location") {
      list.sort((a, b) =>
        (a.venueName || "").localeCompare(b.venueName || "", "ko")
      );
    }

    return list;
  }, [exhibitionsWithDistance, sortOrder, userPosition]);

  const totalExhibitions = exhibitions.length;
  const uniqueCompanyCount =
    events.length > 0
      ? new Set(events.map((event) => event.company_id)).size
      : 0;
  const totalViewCount = events.reduce(
    (sum, event) => sum + (event.view_count || 0),
    0
  );

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
              {locationNotice && <p className="map-notice">{locationNotice}</p>}
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
                    <option value="distance">거리 가까운 순</option>
                    <option value="date_asc">일정 빠른 순</option>
                    <option value="date_desc">일정 느린 순</option>
                    <option value="location">장소별</option>
                  </select>
                </div>
              </div>

              <div className="home-exhibition-list">
                {loading && (
                  <div className="home-list-loading" role="status">
                    <div className="home-list-spinner" aria-hidden="true" />
                    <p className="home-list-loadingText">
                      전시장 정보를 불러오는 중입니다…
                    </p>
                  </div>
                )}

                {!loading && sortedExhibitions.length === 0 && (
                  <div className="home-message">
                    표시할 전시회가 없습니다. 다른 시간이나 필터로 다시 시도해
                    주세요.
                  </div>
                )}

                {!loading &&
                  sortedExhibitions.slice(0, 6).map((exhibition) => (
                    <div
                      key={exhibition.id}
                      className={`home-exhibition-card${
                        hoveredExhibitionId === exhibition.id
                          ? " is-hovered"
                          : ""
                      }`}
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (exhibition.location) {
                          params.set("location", exhibition.location);
                        }
                        if (exhibition.venueName) {
                          params.set("venue_name", exhibition.venueName);
                        }
                        if (exhibition.venueId) {
                          params.set("venue_id", exhibition.venueId);
                        }
                        const target = params.toString()
                          ? `/visitor/events?${params.toString()}`
                          : "/visitor/events";
                        navigate(target);
                      }}
                      onMouseEnter={() => setHoveredExhibitionId(exhibition.id)}
                      onMouseLeave={() => setHoveredExhibitionId(null)}
                    >
                      <div className="home-exhibition-body">
                        <div className="home-exhibition-header">
                          <div className="home-exhibition-title">
                            <span className="home-exhibition-badge">
                              {exhibition.code}
                            </span>
                            <h3>{exhibition.name}</h3>
                          </div>
                          {exhibition.distanceKm !== null && (
                            <div className="home-exhibition-distance">
                              🚶 {formatDistance(exhibition.distanceKm)} 거리
                            </div>
                          )}
                        </div>
                        <p className="home-exhibition-desc">
                          {exhibition.description || "등록된 설명이 없습니다."}
                        </p>
                        <div className="home-exhibition-meta">
                          <div className="home-exhibition-metaItem home-exhibition-metaItem--location">
                            <MapPin size={16} />
                            <span>
                              {exhibition.hallInfo || "주소 정보 없음"}
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
