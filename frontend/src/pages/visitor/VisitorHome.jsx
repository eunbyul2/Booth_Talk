import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Search, X } from "lucide-react";
import FloatingButtons from "../../components/FloatingButtons";
import MatrixInfinity from "../../components/MatrixInfinity";
import "./VisitorHome.css";
import { loadGoogleMaps } from "../../utils/loadGoogleMaps";
import { getVisitorEvents } from "../../apiClient";

const DEFAULT_MAP_CENTER = { lat: 37.5665, lng: 126.978 };
const FALLBACK_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1400&q=80";

const VENUE_COORDINATE_PRESETS = [
  {
    keywords: ["코엑스", "coex"],
    lat: 37.512566,
    lng: 127.059032,
  },
  {
    keywords: ["킨텍스", "kintex"],
    lat: 37.668777,
    lng: 126.745642,
  },
  {
    keywords: ["벡스코", "bexco"],
    lat: 35.16836,
    lng: 129.13704,
  },
  {
    keywords: ["세텍", "setec"],
    lat: 37.567358,
    lng: 127.072551,
  },
  {
    keywords: ["송도컨벤시아", "convensia", "songdo"],
    lat: 37.386052,
    lng: 126.643101,
  },
  {
    keywords: ["at센터", "aT센터", "at center"],
    lat: 37.468577,
    lng: 127.03959,
  },
  {
    keywords: ["부산엑스포", "busan expo", "exco", "대구엑스코"],
    lat: 35.892769,
    lng: 128.612705,
  },
];

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isMeaningfulImage(url) {
  if (!url) return false;
  const lowered = url.toLowerCase();
  return !(
    lowered.includes("placeholder.com") || lowered.includes("placehold.co")
  );
}

function getPresetCoordinates(...candidates) {
  const merged = candidates
    .filter(Boolean)
    .map((item) => item.toString().toLowerCase());

  if (merged.length === 0) {
    return null;
  }

  for (const preset of VENUE_COORDINATE_PRESETS) {
    if (
      preset.keywords.some((keyword) =>
        merged.some((text) => text.includes(keyword))
      )
    ) {
      return { lat: preset.lat, lng: preset.lng };
    }
  }

  return null;
}

function estimateTravelMinutes(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) {
    return null;
  }
  const walkingSpeedKmPerHour = 4.2;
  const minutes = Math.round((distanceKm / walkingSpeedKmPerHour) * 60);
  return Math.max(minutes, 1);
}

function formatEtaMinutes(minutes) {
  if (minutes === null || minutes === undefined) {
    return null;
  }
  if (minutes < 1) {
    return "1분 미만";
  }
  if (minutes < 60) {
    return `${minutes}분`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) {
    return `${hours}시간`;
  }
  return `${hours}시간 ${rest}분`;
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
        image: isMeaningfulImage(event.image_url) ? event.image_url : null,
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

    if (!group.image && isMeaningfulImage(event.image_url)) {
      group.image = event.image_url;
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

      const presetCoords =
        group.lat !== null && group.lng !== null
          ? { lat: group.lat, lng: group.lng }
          : getPresetCoordinates(
              displayName,
              group.hallInfo,
              group.location,
              group.venueName
            );

      return {
        id: group.id,
        venueId: group.venueId,
        name: displayName,
        code: group.code || "전시장",
        description: finalDescription,
        location: group.location,
        hallInfo: group.hallInfo,
        venueName: group.venueName || displayName,
        lat: presetCoords?.lat ?? group.lat,
        lng: presetCoords?.lng ?? group.lng,
        startDate: group.startDate,
        endDate: group.endDate,
        eventCount:
          uniqueCompanyCount > 0 ? uniqueCompanyCount : group.eventCount,
        image: group.image || FALLBACK_EVENT_IMAGE,
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

function parseISODate(dateStr) {
  if (!dateStr) return null;
  const normalized = `${dateStr}T00:00:00`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateRange(startStr, endStr) {
  const start = parseISODate(startStr);
  const end = parseISODate(endStr);

  if (!start) return "일정 미정";

  const format = (date) =>
    `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}.${String(date.getDate()).padStart(2, "0")}`;

  if (!end || end.getTime() === start.getTime()) {
    return format(start);
  }

  return `${format(start)} ~ ${format(end)}`;
}

export default function VisitorHome() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapCardRef = useRef(null);
  const exhibitionMarkersRef = useRef([]);
  const [events, setEvents] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [infoWindow, setInfoWindow] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [locationNotice, setLocationNotice] = useState(null);
  const [hoveredExhibitionId, setHoveredExhibitionId] = useState(null);
  const [selectedVenueId, setSelectedVenueId] = useState("all");
  const [sortOrder, setSortOrder] = useState("distance");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMapDrawerOpen, setIsMapDrawerOpen] = useState(false);
  const [heroGlow, setHeroGlow] = useState({
    x: 50,
    y: 50,
    tiltX: "0deg",
    tiltY: "0deg",
  });

  useEffect(() => {
    document.body.classList.add("visitor-home-body");
    return () => {
      document.body.classList.remove("visitor-home-body");
    };
  }, []);

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

  const exhibitionsWithDistance = useMemo(() => {
    return exhibitions.map((exhibition) => {
      const lat = toNumberOrNull(exhibition.lat);
      const lng = toNumberOrNull(exhibition.lng);
      const distanceKm =
        userPosition && lat !== null && lng !== null
          ? calculateDistanceKm(userPosition, { lat, lng })
          : null;

      return {
        ...exhibition,
        lat,
        lng,
        distanceKm,
      };
    });
  }, [exhibitions, userPosition]);

  useEffect(() => {
    if (!mapInstance || !infoWindow || exhibitionsWithDistance.length === 0) {
      return;
    }

    const maps = window.google?.maps;
    if (!maps) {
      return;
    }

    exhibitionMarkersRef.current.forEach(({ marker }) => marker?.setMap(null));
    exhibitionMarkersRef.current = [];

    const markerSize = 18;
    const bounds = new maps.LatLngBounds();
    let hasAnyMarker = false;

    const markers = exhibitionsWithDistance.map((ex) => {
      if (typeof ex.lat !== "number" || typeof ex.lng !== "number") {
        return null;
      }

      const size = markerSize;
      const iconSvg = `
        <svg width="${size * 2}" height="${
        size * 2
      }" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="circle-${ex.id}">
              <circle cx="${size}" cy="${size}" r="${size}" />
            </clipPath>
            <radialGradient id="glow-${ex.id}" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stop-color="rgba(255,107,107,0.8)" />
              <stop offset="100%" stop-color="rgba(125,90,255,0.1)" />
            </radialGradient>
          </defs>
          <circle cx="${size}" cy="${size}" r="${size}" fill="url(#glow-${
        ex.id
      })" />
          <circle cx="${size}" cy="${size}" r="${size - 1}" fill="white" />
          <image href="${ex.image}" width="${size * 2}" height="${
        size * 2
      }" clip-path="url(#circle-${
        ex.id
      })" preserveAspectRatio="xMidYMid slice" />
          <circle cx="${size}" cy="${size}" r="${
        size - 1
      }" fill="none" stroke="#FF6B6B" stroke-width="3" />
        </svg>
      `;

      const marker = new maps.Marker({
        position: { lat: ex.lat, lng: ex.lng },
        map: mapInstance,
        title: ex.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            iconSvg
          )}`,
          scaledSize: new maps.Size(size * 2, size * 2),
          anchor: new maps.Point(size, size),
        },
        zIndex: 100,
      });

      bounds.extend({ lat: ex.lat, lng: ex.lng });
      hasAnyMarker = true;

      marker.addListener("click", () => {
        const distanceText = formatDistance(ex.distanceKm);
        const etaText = formatEtaMinutes(estimateTravelMinutes(ex.distanceKm));
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
                  ? `<div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;"><span>🚶</span><span style="font-size: 13px; color: #666;">내 위치로부터 ${distanceText}${
                      etaText ? ` · ${etaText}` : ""
                    }</span></div>`
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

    if (hasAnyMarker) {
      if (userPosition) {
        bounds.extend(userPosition);
      }
      try {
        mapInstance.fitBounds(bounds);
      } catch (err) {
        console.warn("Failed to fit bounds", err);
      }
    }

    return () => {
      markers.forEach((entry) => {
        if (entry?.marker) {
          entry.marker.setMap(null);
        }
      });
    };
  }, [mapInstance, infoWindow, exhibitionsWithDistance, userPosition]);

  useEffect(() => {
    if (exhibitionMarkersRef.current.length === 0) return;

    const maps = window.google?.maps;
    if (!maps) return;

    const size = 18;

    exhibitionMarkersRef.current.forEach(({ marker, exhibitionId }) => {
      const exhibition = exhibitionsWithDistance.find(
        (e) => e.id === exhibitionId
      );
      if (!exhibition || !marker) return;

      const isHovered = hoveredExhibitionId === exhibitionId;

      const strokeWidth = isHovered ? 4 : 3;
      const iconSvg = `
        <svg width="${size * 2}" height="${
        size * 2
      }" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="circle-${exhibitionId}">
              <circle cx="${size}" cy="${size}" r="${size}" />
            </clipPath>
            <radialGradient id="glow-${exhibitionId}" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stop-color="rgba(255,107,107,${
                isHovered ? 0.95 : 0.7
              })" />
              <stop offset="100%" stop-color="rgba(125,90,255,${
                isHovered ? 0.25 : 0.1
              })" />
            </radialGradient>
          </defs>
          <circle cx="${size}" cy="${size}" r="${size}" fill="url(#glow-${exhibitionId})" />
          <circle cx="${size}" cy="${size}" r="${size - 1}" fill="white" />
          <image href="${exhibition.image}" width="${size * 2}" height="${
        size * 2
      }" clip-path="url(#circle-${exhibitionId})" preserveAspectRatio="xMidYMid slice" />
          <circle cx="${size}" cy="${size}" r="${
        size - 1
      }" fill="none" stroke="#FF6B6B" stroke-width="${strokeWidth}" />
        </svg>
      `;

      marker.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(iconSvg)}`,
        scaledSize: new maps.Size(size * 2, size * 2),
        anchor: new maps.Point(size, size),
      });
      marker.setZIndex(isHovered ? 1000 : 100);
    });
  }, [hoveredExhibitionId, exhibitionsWithDistance]);

  const exhibitionLookup = useMemo(() => {
    const byVenueId = new Map();
    const byLocation = new Map();

    exhibitionsWithDistance.forEach((exhibition) => {
      if (exhibition.venueId !== null && exhibition.venueId !== undefined) {
        byVenueId.set(exhibition.venueId, exhibition);
      }

      const locationKey = (exhibition.hallInfo || exhibition.location || "")
        .trim()
        .toLowerCase();
      if (locationKey) {
        byLocation.set(locationKey, exhibition);
      }
    });

    return { byVenueId, byLocation };
  }, [exhibitionsWithDistance]);

  const eventsWithDistance = useMemo(() => {
    return events.map((event) => {
      const lat = toNumberOrNull(event.latitude);
      const lng = toNumberOrNull(event.longitude);
      let distanceKm = null;

      if (userPosition && lat !== null && lng !== null) {
        distanceKm = calculateDistanceKm(userPosition, { lat, lng });
      }

      return {
        ...event,
        _distanceKm: distanceKm,
        _etaMinutes: estimateTravelMinutes(distanceKm),
      };
    });
  }, [events, userPosition]);

  const activeEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return eventsWithDistance.filter((event) => {
      const start = parseISODate(event.start_date);
      const end = parseISODate(event.end_date) || start;

      if (!start) {
        return false;
      }

      if (end && end < today) {
        return false;
      }

      return true;
    });
  }, [eventsWithDistance]);

  const { venueList: venueSummaries, eventsByVenue } = useMemo(() => {
    const venueMap = new Map();
    const eventsByVenueMap = new Map();

    activeEvents.forEach((event) => {
      let exhibition = null;

      if (event.venue_id !== null && event.venue_id !== undefined) {
        exhibition = exhibitionLookup.byVenueId.get(event.venue_id) || null;
      }

      if (!exhibition) {
        const locationKey = (
          event.venue_address ||
          event.location ||
          event.venue_location ||
          ""
        )
          .trim()
          .toLowerCase();
        if (locationKey) {
          exhibition = exhibitionLookup.byLocation.get(locationKey) || null;
        }
      }

      if (!exhibition) {
        return;
      }

      const venueId = exhibition.id;

      if (!venueMap.has(venueId)) {
        const lat = toNumberOrNull(exhibition.lat);
        const lng = toNumberOrNull(exhibition.lng);
        const distanceKm =
          userPosition && lat !== null && lng !== null
            ? calculateDistanceKm(userPosition, { lat, lng })
            : null;

        venueMap.set(venueId, {
          id: venueId,
          name: exhibition.name,
          hallInfo: exhibition.hallInfo,
          venueName: exhibition.venueName,
          location: exhibition.location,
          code: exhibition.code,
          numericVenueId: exhibition.venueId,
          distanceKm,
          eventCount: 0,
        });
        eventsByVenueMap.set(venueId, new Set());
      }

      const summary = venueMap.get(venueId);
      summary.eventCount += 1;
      eventsByVenueMap.get(venueId).add(event.id);
    });

    const venueList = Array.from(venueMap.values()).sort((a, b) => {
      const aDistance = a.distanceKm;
      const bDistance = b.distanceKm;

      if (aDistance === null && bDistance === null) {
        return a.name.localeCompare(b.name, "ko");
      }
      if (aDistance === null) return 1;
      if (bDistance === null) return -1;
      if (aDistance === bDistance) {
        return a.name.localeCompare(b.name, "ko");
      }
      return aDistance - bDistance;
    });

    return { venueList, eventsByVenue: eventsByVenueMap };
  }, [activeEvents, exhibitionLookup, userPosition]);

  useEffect(() => {
    if (selectedVenueId === "all") {
      return;
    }

    const stillExists = venueSummaries.some(
      (venue) => venue.id === selectedVenueId
    );

    if (!stillExists) {
      if (venueSummaries.length > 0) {
        setSelectedVenueId(venueSummaries[0].id);
      } else {
        setSelectedVenueId("all");
      }
    }
  }, [selectedVenueId, venueSummaries]);

  useEffect(() => {
    if (selectedVenueId === "all") {
      setHoveredExhibitionId(null);
    } else {
      setHoveredExhibitionId(selectedVenueId);
    }
  }, [selectedVenueId]);

  const visibleEvents = useMemo(() => {
    if (selectedVenueId === "all") {
      return activeEvents;
    }

    const eventIdSet = eventsByVenue.get(selectedVenueId);
    if (!eventIdSet) {
      return [];
    }

    return activeEvents.filter((event) => eventIdSet.has(event.id));
  }, [activeEvents, eventsByVenue, selectedVenueId]);

  const sortedEvents = useMemo(() => {
    const list = [...visibleEvents];

    if (sortOrder === "distance" && userPosition) {
      list.sort((a, b) => {
        const aDistance = a._distanceKm;
        const bDistance = b._distanceKm;

        if (aDistance === null) return 1;
        if (bDistance === null) return -1;
        return aDistance - bDistance;
      });
    } else if (sortOrder === "date_asc") {
      list.sort((a, b) => {
        const dateA = parseISODate(a.start_date) || new Date();
        const dateB = parseISODate(b.start_date) || new Date();
        return dateA - dateB;
      });
    } else if (sortOrder === "date_desc") {
      list.sort((a, b) => {
        const dateA = parseISODate(a.start_date) || new Date();
        const dateB = parseISODate(b.start_date) || new Date();
        return dateB - dateA;
      });
    }

    return list;
  }, [visibleEvents, sortOrder, userPosition]);

  const selectedVenueSummary = useMemo(() => {
    if (selectedVenueId === "all") {
      return null;
    }
    return venueSummaries.find((venue) => venue.id === selectedVenueId) || null;
  }, [selectedVenueId, venueSummaries]);

  const handleVenueNavigate = useCallback(
    (venue) => {
      if (!venue) {
        navigate("/visitor/events");
        return;
      }

      const params = new URLSearchParams();

      if (
        venue.numericVenueId !== null &&
        venue.numericVenueId !== undefined &&
        venue.numericVenueId !== ""
      ) {
        params.set("venue_id", String(venue.numericVenueId));
      }

      if (venue.venueName) {
        params.set("venue_name", venue.venueName);
      }

      if (venue.location) {
        params.set("location", venue.location);
      }

      const queryString = params.toString();
      navigate(
        queryString ? `/visitor/events?${queryString}` : "/visitor/events"
      );
    },
    [navigate]
  );

  const totalActiveEvents = activeEvents.length;
  const totalVisibleEvents = sortedEvents.length;
  const uniqueCompanyCount =
    activeEvents.length > 0
      ? new Set(activeEvents.map((event) => event.company_id)).size
      : 0;
  const totalViewCount = activeEvents.reduce(
    (sum, event) => sum + (event.view_count || 0),
    0
  );

  const nearestVenues = useMemo(() => {
    if (venueSummaries.length === 0) {
      return [];
    }
    const withDistance = venueSummaries.filter(
      (venue) => venue.distanceKm !== null
    );
    if (withDistance.length > 0) {
      return withDistance.slice(0, 5);
    }
    return venueSummaries.slice(0, 5);
  }, [venueSummaries]);

  const handleMapFocus = useCallback(() => {
    const cardEl = mapCardRef.current;
    if (!cardEl) {
      return;
    }
    cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    cardEl.classList.add("map-card--highlight");
    setTimeout(() => {
      cardEl.classList.remove("map-card--highlight");
    }, 1400);
  }, []);

  const handleHeroStatAction = useCallback(
    (target) => {
      if (target === "active-events") {
        navigate("/visitor/events?status=active");
        return;
      }
      if (target === "companies") {
        navigate("/visitor/events?view=companies");
      }
    },
    [navigate]
  );

  return (
    <div className="visitor-home">
      {/* Matrix Infinity Background Decoration */}
      <MatrixInfinity />

      {/* Map Drawer - 좌측 사이드바 */}
      <div className={`map-drawer ${isMapDrawerOpen ? "open" : ""}`}>
        <div className="map-drawer-header">
          <h3>내 주변 전시장 지도</h3>
          <button
            onClick={() => setIsMapDrawerOpen(false)}
            className="btn-drawer-close"
          >
            <X size={24} />
          </button>
        </div>
        <div className="map-drawer-content">
          <p className="map-drawer-subtitle">
            브라우저 위치 권한을 허용하면 내 위치를 기준으로 표시됩니다
          </p>
          <button
            type="button"
            className="map-drawer-focusBtn"
            onClick={() => {
              handleMapFocus();
              setIsMapDrawerOpen(false);
            }}
          >
            메인 지도로 이동하기
          </button>
          <ul className="map-drawer-venueList">
            {nearestVenues.length === 0 && (
              <li className="map-drawer-venueItem map-drawer-venueItem--empty">
                주변 전시장 좌표를 불러오는 중이에요.
              </li>
            )}
            {nearestVenues.map((venue) => (
              <li key={venue.id} className="map-drawer-venueItem">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVenueId(venue.id);
                    handleVenueNavigate(venue);
                    handleMapFocus();
                    setIsMapDrawerOpen(false);
                  }}
                >
                  <span className="map-drawer-venueName">{venue.name}</span>
                  {venue.distanceKm !== null ? (
                    <span className="map-drawer-venueDistance">
                      {formatDistance(venue.distanceKm)}
                    </span>
                  ) : (
                    <span className="map-drawer-venueDistance map-drawer-venueDistance--muted">
                      거리 정보 없음
                    </span>
                  )}
                </button>
                {venue.hallInfo && (
                  <p className="map-drawer-venueMeta">{venue.hallInfo}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
        {locationNotice && <p className="map-notice">{locationNotice}</p>}
      </div>

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
              <div
                className="hero-stats-item hero-stats-item--link"
                role="button"
                tabIndex={0}
                onClick={() => handleHeroStatAction("active-events")}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " " ||
                    event.key === "Space" ||
                    event.key === "Spacebar"
                  ) {
                    event.preventDefault();
                    handleHeroStatAction("active-events");
                  }
                }}
              >
                <span className="hero-stats-label">진행 중인 행사</span>
                <span className="hero-stats-value">
                  {loading ? "-" : totalActiveEvents}
                </span>
              </div>
              <div
                className="hero-stats-item hero-stats-item--link"
                role="button"
                tabIndex={0}
                onClick={() => handleHeroStatAction("companies")}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " " ||
                    event.key === "Space" ||
                    event.key === "Spacebar"
                  ) {
                    event.preventDefault();
                    handleHeroStatAction("companies");
                  }
                }}
              >
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

      {/* Upcoming Events Section */}
      <div className="venues-section">
        <div className="container">
          <div className="map-list-layout">
            <div
              className={`map-card${
                isMapDrawerOpen ? " map-card--active" : ""
              }`}
              ref={mapCardRef}
            >
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
                    {selectedVenueSummary
                      ? `${selectedVenueSummary.name} 이벤트`
                      : "진행 중인 이벤트"}
                  </h2>
                  <p className="section-subtitle section-subtitle--muted">
                    {selectedVenueSummary
                      ? selectedVenueSummary.hallInfo ||
                        "전시장 상세 정보 준비 중입니다"
                      : "지도와 전시장 목록을 활용해 원하는 이벤트를 찾아보세요"}
                  </p>
                </div>
                <div className="list-controls">
                  <span className="list-count">
                    총 {loading ? "-" : `${totalVisibleEvents}개`}
                  </span>
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
                    </select>
                  </div>
                </div>
              </div>

              <div className="venue-chip-row" role="list">
                <button
                  type="button"
                  role="listitem"
                  className={`venue-chip${
                    selectedVenueId === "all" ? " selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedVenueId("all");
                    handleVenueNavigate(null);
                  }}
                  onMouseEnter={() => setSelectedVenueId("all")}
                  onFocus={() => setSelectedVenueId("all")}
                >
                  <span className="venue-chip-name">전체 보기</span>
                  <span className="venue-chip-meta">
                    {loading ? "-" : `${totalActiveEvents}개`}
                  </span>
                </button>

                {venueSummaries.map((venue) => (
                  <button
                    type="button"
                    role="listitem"
                    key={venue.id}
                    className={`venue-chip${
                      selectedVenueId === venue.id ? " selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedVenueId(venue.id);
                      handleVenueNavigate(venue);
                    }}
                    onMouseEnter={() => setSelectedVenueId(venue.id)}
                    onFocus={() => setSelectedVenueId(venue.id)}
                  >
                    <span className="venue-chip-name">{venue.name}</span>
                    <span className="venue-chip-meta">
                      {venue.eventCount}개
                    </span>
                    {venue.distanceKm !== null && (
                      <span className="venue-chip-distance">
                        {formatDistance(venue.distanceKm)}
                      </span>
                    )}
                  </button>
                ))}

                {loading && venueSummaries.length === 0 && (
                  <div className="venue-chip-empty">
                    전시장 정보를 불러오는 중입니다…
                  </div>
                )}

                {!loading && venueSummaries.length === 0 && (
                  <div className="venue-chip-empty">
                    표시할 전시장 정보가 없습니다.
                  </div>
                )}
              </div>

              <div className="home-exhibition-list">
                {loading && (
                  <div className="home-list-loading" role="status">
                    <div className="home-list-spinner" aria-hidden="true" />
                    <p className="home-list-loadingText">
                      이벤트 정보를 불러오는 중입니다…
                    </p>
                  </div>
                )}

                {!loading && sortedEvents.length === 0 && (
                  <div className="home-message">
                    {selectedVenueSummary
                      ? `${selectedVenueSummary.name}에서 진행 중인 이벤트가 없습니다.`
                      : "표시할 이벤트가 없습니다. 다른 시간이나 필터로 다시 시도해 주세요."}
                  </div>
                )}

                {!loading &&
                  sortedEvents.map((event) => {
                    const venueMatchById =
                      event.venue_id !== null && event.venue_id !== undefined
                        ? exhibitionLookup.byVenueId.get(event.venue_id)
                        : null;
                    const venueMatchByLocation = (() => {
                      const key = (event.location || event.venue_location || "")
                        .trim()
                        .toLowerCase();
                      if (!key) return null;
                      return exhibitionLookup.byLocation.get(key) || null;
                    })();

                    const relatedExhibition =
                      venueMatchById || venueMatchByLocation;
                    const exhibitionIdForHover = relatedExhibition?.id || null;
                    const isHoverActive = Boolean(
                      exhibitionIdForHover &&
                        hoveredExhibitionId === exhibitionIdForHover
                    );

                    const coverImage = isMeaningfulImage(event.image_url)
                      ? event.image_url
                      : FALLBACK_EVENT_IMAGE;
                    const distanceText =
                      event._distanceKm !== null
                        ? formatDistance(event._distanceKm)
                        : null;
                    const etaText = formatEtaMinutes(event._etaMinutes);

                    const handleCardHover = (nextId) => {
                      setHoveredExhibitionId(nextId);
                    };

                    return (
                      <div
                        key={event.id}
                        className={`home-exhibition-card${
                          isHoverActive ? " is-hovered" : ""
                        }`}
                        onClick={() => navigate(`/visitor/event/${event.id}`)}
                        onMouseEnter={() =>
                          handleCardHover(
                            exhibitionIdForHover ??
                              (selectedVenueId === "all"
                                ? null
                                : selectedVenueId)
                          )
                        }
                        onMouseLeave={() =>
                          handleCardHover(
                            selectedVenueId === "all" ? null : selectedVenueId
                          )
                        }
                      >
                        <div className="home-exhibition-thumb">
                          <img
                            src={coverImage}
                            alt={(event.event_name || "이벤트") + " 이미지"}
                            loading="lazy"
                          />
                        </div>
                        <div className="home-exhibition-body">
                          <div className="home-exhibition-header">
                            <div className="home-exhibition-title">
                              <span className="home-exhibition-badge">
                                {event.event_type || "이벤트"}
                              </span>
                              <h3>{event.event_name || "이벤트명 미정"}</h3>
                            </div>
                            {(distanceText || etaText) && (
                              <div className="home-exhibition-distance">
                                {distanceText && (
                                  <span className="distance-badge">
                                    🚶 {distanceText}
                                  </span>
                                )}
                                {etaText && (
                                  <span className="distance-eta">
                                    도보 약 {etaText}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <p className="home-exhibition-desc">
                            {event.description || "등록된 설명이 없습니다."}
                          </p>
                          <div className="home-exhibition-meta">
                            <div className="home-exhibition-metaItem home-exhibition-metaItem--location">
                              <MapPin size={16} />
                              <span>
                                {event.location ||
                                  event.venue_location ||
                                  "장소 정보 없음"}
                              </span>
                            </div>
                            <div className="home-exhibition-metaItem">
                              <span role="img" aria-label="calendar">
                                📅
                              </span>
                              <span>
                                {formatDateRange(
                                  event.start_date,
                                  event.end_date
                                )}
                              </span>
                            </div>
                            <div className="home-exhibition-metaItem">
                              <span role="img" aria-label="company">
                                🏢
                              </span>
                              <span>
                                {event.company_name || "주최사 정보 없음"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Buttons */}
      <FloatingButtons
        showMapButton={true}
        onMapOpen={() => {
          setIsMapDrawerOpen(true);
          handleMapFocus();
        }}
      />
    </div>
  );
}
