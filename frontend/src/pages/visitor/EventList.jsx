import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Calendar, MapPin, Clock, ChevronRight } from "lucide-react";
import "./EventList.css";
import { getVisitorEvents, getVisitorEventDetail } from "../../apiClient";

const FALLBACK_POSTER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%231E3A8A'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='white'%3EEvent%3C/text%3E%3C/svg%3E";

export default function EventList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const exhibitionId = searchParams.get("exhibition_id");
  const urlSearchQuery = searchParams.get("search"); // URL에서 검색어 추출
  const locationParam = searchParams.get("location");
  const venueNameParam = searchParams.get("venue_name");
  const venueIdParam = searchParams.get("venue_id");
  const numericVenueIdParam =
    venueIdParam && !Number.isNaN(Number(venueIdParam))
      ? Number(venueIdParam)
      : null;
  const isVenueView = Boolean(locationParam || venueNameParam || venueIdParam);

  const [searchTerm, setSearchTerm] = useState(urlSearchQuery || ""); // URL 검색어로 초기화
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filterInfo, setFilterInfo] = useState(null);

  // URL 파라미터 변경 시 검색어 업데이트
  useEffect(() => {
    const newSearchQuery = searchParams.get("search");
    if (newSearchQuery !== searchTerm) {
      setSearchTerm(newSearchQuery || "");
    }
  }, [searchParams, searchTerm]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        if (
          exhibitionId &&
          !searchTerm &&
          !locationParam &&
          !venueNameParam &&
          !venueIdParam
        ) {
          const eventDetail = await getVisitorEventDetail(exhibitionId);
          if (!active) return;
          const detailArray = eventDetail ? [eventDetail] : [];
          setEvents(detailArray);
          setTotalCount(detailArray.length);
          setFilterInfo(null);
        } else {
          const params = {
            only_available: false,
            limit: 100,
          };

          if (searchTerm) {
            params.keyword = searchTerm;
          }

          if (locationParam) {
            params.location = locationParam;
          }

          if (numericVenueIdParam !== null) {
            params.venue_id = numericVenueIdParam;
          }

          if (venueNameParam) {
            params.venue_name = venueNameParam;
          }

          const data = await getVisitorEvents(params);
          if (!active) return;

          const fetchedEvents = Array.isArray(data?.events) ? data.events : [];
          setEvents(fetchedEvents);
          setTotalCount(data?.total ?? fetchedEvents.length);
          setFilterInfo(data?.filter_info ?? null);
        }
      } catch (err) {
        if (!active) return;
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "이벤트 목록을 불러오지 못했습니다."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm, exhibitionId, locationParam, venueNameParam, venueIdParam]);

  const exhibition = useMemo(() => {
    if (!events.length) {
      if (!venueNameParam && !locationParam && !venueIdParam) {
        return null;
      }
      return {
        id: venueIdParam || locationParam || "selected-venue",
        name: venueNameParam || locationParam || "전시 이벤트",
        code: "전시장",
        startDate: null,
        endDate: null,
        hallInfo: locationParam || "장소 정보 없음",
        venueName: venueNameParam || "",
        location: locationParam || "",
        venueId: numericVenueIdParam,
      };
    }

    const first = events[0];
    const startDate = events.reduce((min, event) => {
      const d = new Date(event.start_date);
      return d < min ? d : min;
    }, new Date(events[0].start_date));

    const endDate = events.reduce((max, event) => {
      const d = new Date(event.end_date || event.start_date);
      return d > max ? d : max;
    }, new Date(events[0].end_date || events[0].start_date));

    return {
      id:
        exhibitionId ||
        venueIdParam ||
        locationParam ||
        first.venue_id ||
        first.id,
      name:
        venueNameParam || first.venue_name || first.location || "전시 이벤트",
      code: first.venue_name ? "전시장" : first.event_type || "이벤트",
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      hallInfo: locationParam || first.location || "장소 정보 없음",
      venueName: venueNameParam || first.venue_name || "",
      location: locationParam || first.venue_location || "",
      venueId:
        numericVenueIdParam !== null
          ? numericVenueIdParam
          : first.venue_id || null,
    };
  }, [events, exhibitionId, locationParam, venueNameParam, venueIdParam]);

  // 현재 날짜/시간 포맷팅
  const getCurrentDateTime = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[now.getDay()];
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${month}.${day}(${dayName}) ${hours}:${minutes}`;
  };

  // 날짜 포맷팅 (YYYY-MM-DD -> MM.DD(요일))
  const formatDate = (dateStr) => {
    if (!dateStr) return "날짜 미정";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "날짜 미정";
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[date.getDay()];
    return `${month}.${day}(${dayName})`;
  };

  // 검색 필터링
  const filteredEvents = useMemo(() => {
    if (!searchTerm) return events;

    const searchLower = searchTerm.toLowerCase();
    return events.filter((event) => {
      const eventName = event.event_name?.toLowerCase() || "";
      const companyName = event.company_name?.toLowerCase() || "";
      const description = event.description?.toLowerCase() || "";
      const booth = event.booth_number?.toLowerCase() || "";
      return (
        eventName.includes(searchLower) ||
        companyName.includes(searchLower) ||
        description.includes(searchLower) ||
        booth.includes(searchLower)
      );
    });
  }, [searchTerm, events]);

  const venueExhibitions = useMemo(() => {
    if (!isVenueView) return [];
    const map = new Map();

    filteredEvents.forEach((event) => {
      const key = (event.event_name || "").trim();
      if (!key) return;

      const startDate = event.start_date;
      const endDate = event.end_date || event.start_date;
      const eventImage = event.image_url || FALLBACK_POSTER;

      if (!map.has(key)) {
        map.set(key, {
          id: `exhibition-${event.id}`,
          name: event.event_name || "전시 이벤트",
          description: event.description || "",
          startDate,
          endDate,
          image: eventImage,
          venueName: event.venue_name || venueNameParam || "",
          hallInfo: event.location || locationParam || "",
          primaryEventId: event.id,
          venueId: event.venue_id || numericVenueIdParam,
          companyNames: new Set(event.company_name ? [event.company_name] : []),
        });
        return;
      }

      const group = map.get(key);

      if (new Date(startDate) < new Date(group.startDate)) {
        group.startDate = startDate;
      }
      if (new Date(endDate) > new Date(group.endDate)) {
        group.endDate = endDate;
      }

      if (!group.description && event.description) {
        group.description = event.description;
      }

      if (group.image === FALLBACK_POSTER && event.image_url) {
        group.image = event.image_url;
      }

      if (event.company_name) {
        group.companyNames.add(event.company_name);
      }
    });

    return Array.from(map.values())
      .map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description || "등록된 설명이 없습니다.",
        startDate: group.startDate,
        endDate: group.endDate,
        image: group.image,
        venueName: group.venueName,
        hallInfo: group.hallInfo,
        primaryEventId: group.primaryEventId,
        venueId: group.venueId,
        companyCount: group.companyNames.size,
        organizers: Array.from(group.companyNames),
      }))
      .sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate) : new Date();
        const dateB = b.startDate ? new Date(b.startDate) : new Date();
        return dateA - dateB;
      });
  }, [
    filteredEvents,
    isVenueView,
    locationParam,
    venueNameParam,
    venueIdParam,
  ]);

  const handleExhibitionSelect = (exhibition) => {
    const params = new URLSearchParams();
    const locationValue = locationParam || exhibition.hallInfo || "";
    if (locationValue) {
      params.set("location", locationValue);
    }
    const venueNameValue = venueNameParam || exhibition.venueName || "";
    if (venueNameValue) {
      params.set("venue_name", venueNameValue);
    }
    const venueIdValue =
      venueIdParam ||
      (exhibition.venueId !== null && exhibition.venueId !== undefined
        ? String(exhibition.venueId)
        : "");
    if (venueIdValue) {
      params.set("venue_id", venueIdValue);
    }
    params.set("search", exhibition.name);
    setSearchTerm(exhibition.name);
    navigate(`/visitor/events?${params.toString()}`);
  };

  return (
    <div className="event-list-page">
      {/* 헤더 */}
      <div className="event-list-header">
        <div className="container">
          <button className="btn-back" onClick={() => navigate("/visitor")}>
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
        <div className="current-datetime">{getCurrentDateTime()}</div>

        {/* 행사 정보 카드 */}
        {exhibition && (
          <div className="exhibition-card">
            <div className="exhibition-badge">{exhibition.code}</div>
            <h2 className="exhibition-title">{exhibition.name}</h2>
            <div className="exhibition-info">
              <div className="info-item">
                <Calendar size={16} />
                <span>
                  {formatDate(exhibition.startDate)} ~{" "}
                  {formatDate(exhibition.endDate)}
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
        {isVenueView && (
          <div className="venue-exhibitions-section">
            <h3 className="section-title">
              {venueNameParam || "전시장"} 전시회 목록
            </h3>
            <p className="venue-exhibitions-info">
              총 {venueExhibitions.length}개의 전시회가 진행 중입니다.
            </p>

            {venueExhibitions.length === 0 && !loading && (
              <div className="empty-box">
                이 전시장에서는 현재 표시할 전시회가 없습니다.
              </div>
            )}

            <div className="venue-exhibitions-grid">
              {venueExhibitions.map((exhibition) => (
                <button
                  type="button"
                  key={exhibition.id}
                  className="venue-exhibition-card"
                  onClick={() => handleExhibitionSelect(exhibition)}
                >
                  <div className="venue-exhibition-thumb">
                    <img src={exhibition.image} alt={exhibition.name} />
                  </div>
                  <div className="venue-exhibition-body">
                    <div className="venue-exhibition-title">
                      <h4>{exhibition.name}</h4>
                      <span>
                        참가 기업 {exhibition.companyCount.toLocaleString()}개
                      </span>
                    </div>
                    <p className="venue-exhibition-desc">
                      {exhibition.description}
                    </p>
                    <div className="venue-exhibition-meta">
                      <span>
                        📍 {exhibition.venueName} {exhibition.hallInfo}
                      </span>
                      <span>
                        📅 {formatDate(exhibition.startDate)} ~{" "}
                        {formatDate(exhibition.endDate)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="events-section">
          <h3 className="section-title">참여 업체 이벤트</h3>
          <div className="results-info">
            <span>총 {totalCount}개의 이벤트</span>
            {filterInfo?.target_date && filterInfo?.target_time && (
              <span>
                {formatDate(filterInfo.target_date)} {filterInfo.target_time}{" "}
                기준
              </span>
            )}
          </div>

          {error && <div className="error-box">{error}</div>}

          {loading && (
            <div className="loading-box">이벤트를 불러오는 중입니다...</div>
          )}

          {!loading && !error && filteredEvents.length === 0 && (
            <div className="empty-box">
              조건에 맞는 이벤트가 없습니다. 다른 키워드로 검색해 보세요.
            </div>
          )}

          <div className="events-list">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="event-item"
                onClick={() => navigate(`/visitor/event/${event.id}`)}
              >
                {/* 이벤트 이미지 */}
                <div className="event-item-image">
                  <img
                    src={event.image_url || FALLBACK_POSTER}
                    alt={event.company_name}
                    onError={(e) => {
                      e.target.onerror = null; // Prevent infinite loop
                      e.target.src = FALLBACK_POSTER;
                    }}
                  />
                </div>

                {/* 이벤트 정보 */}
                <div className="event-item-info">
                  <div className="event-item-header">
                    <span className="booth-badge">
                      {event.booth_number || "부스 정보 없음"}
                    </span>
                    <h4 className="event-item-name">{event.event_name}</h4>
                  </div>

                  {/* 시간대 */}
                  <div className="time-slots">
                    <Clock size={14} />
                    <span className="time-slot">
                      {event.available_hours || "시간 정보 없음"}
                    </span>
                  </div>

                  <p className="event-item-description">
                    {event.description || "등록된 설명이 없습니다."}
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
  );
}
