import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Calendar, MapPin, Clock, ChevronRight } from "lucide-react";
import "./EventList.css";
import { getVisitorEvents } from "../../apiClient";

const FALLBACK_POSTER = "https://placehold.co/120x120?text=Event";

export default function EventList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const exhibitionId = searchParams.get("exhibition_id");
  const urlSearchQuery = searchParams.get("search"); // URL에서 검색어 추출

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
        const params = {
          only_available: false,
          limit: 100,
        };

        if (searchTerm) {
          params.keyword = searchTerm;
        }

        if (exhibitionId) {
          params.event_type = exhibitionId;
        }

        const data = await getVisitorEvents(params);
        if (!active) return;

        const fetchedEvents = Array.isArray(data?.events) ? data.events : [];
        setEvents(fetchedEvents);
        setTotalCount(data?.total ?? fetchedEvents.length);
        setFilterInfo(data?.filter_info ?? null);
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
  }, [searchTerm, exhibitionId]);

  const exhibition = useMemo(() => {
    if (!events.length) return null;
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
      id: exhibitionId || first.venue_id || first.id,
      name: first.venue_name || "전시 이벤트",
      code: first.event_type || "이벤트",
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      hallInfo: first.location || "장소 정보 없음",
      venueName: first.venue_name || "",
      location: first.venue_location || "",
    };
  }, [events, exhibitionId]);

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
