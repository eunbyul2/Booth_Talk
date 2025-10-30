/**
 * EventExplorer - 관람객용 이벤트 탐색 컴포넌트
 * 
 * 기능:
 * - 현재 시간 기준 입장 가능한 이벤트 표시
 * - 방문 시간 변경 필터
 * - 깔끔한 UI
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventCard from './EventCard';
import TimeFilter from './TimeFilter';
import '../styles/EventExplorer.css';

interface Event {
  id: number;
  company_name: string;
  event_name: string;
  event_type: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location: string;
  description?: string;
  booth_number?: string;
  image_url?: string;
  is_available_now: boolean;
  available_hours: string;
  days_until_start: number;
}

interface SearchResponse {
  total: number;
  available_count: number;
  upcoming_count: number;
  events: Event[];
  filter_info: {
    target_date: string;
    target_time: string;
    filters_applied: any;
  };
}

interface Statistics {
  total_events: number;
  ongoing_events: number;
  upcoming_events: number;
  event_types: Record<string, number>;
}

const EventExplorer: React.FC = () => {
  // State
  const [events, setEvents] = useState<Event[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  
  // Filter State
  const [visitDate, setVisitDate] = useState<string>('');
  const [visitTime, setVisitTime] = useState<string>('');
  const [eventType, setEventType] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);
  
  // View Mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 초기 로드
  useEffect(() => {
    fetchStatistics();
    fetchEvents();
  }, []);

  // 통계 가져오기
  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/api/visitor/events/stats');
      setStatistics(response.data);
    } catch (error) {
      console.error('통계 로드 실패:', error);
    }
  };

  // 이벤트 검색
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: any = {
        only_available: onlyAvailable,
        limit: 50,
        offset: 0
      };

      if (visitDate) params.visit_date = visitDate;
      if (visitTime) params.visit_time = visitTime;
      if (eventType) params.event_type = eventType;
      if (location) params.location = location;
      if (companyName) params.company_name = companyName;

      const response = await axios.get<SearchResponse>('/api/visitor/events', { params });
      setSearchResponse(response.data);
      setEvents(response.data.events);
    } catch (error) {
      console.error('이벤트 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 필터 초기화
  const resetFilters = () => {
    setVisitDate('');
    setVisitTime('');
    setEventType('');
    setLocation('');
    setCompanyName('');
    setOnlyAvailable(true);
  };

  // 현재 시간으로 재설정
  const setToNow = () => {
    setVisitDate('');
    setVisitTime('');
    setOnlyAvailable(true);
    // 재검색은 사용자가 버튼 클릭 시 수행
  };

  return (
    <div className="event-explorer">
      {/* 헤더 */}
      <div className="explorer-header">
        <div className="header-content">
          <h1>🎨 전시회 둘러보기</h1>
          <p className="subtitle">
            실시간으로 입장 가능한 전시회를 찾아보세요
          </p>
        </div>

        {/* 통계 카드 */}
        {statistics && (
          <div className="stats-cards">
            <div className="stat-card stat-primary">
              <div className="stat-icon">🎪</div>
              <div className="stat-content">
                <div className="stat-label">전체 이벤트</div>
                <div className="stat-value">{statistics.total_events}</div>
              </div>
            </div>
            <div className="stat-card stat-success">
              <div className="stat-icon">✨</div>
              <div className="stat-content">
                <div className="stat-label">진행 중</div>
                <div className="stat-value">{statistics.ongoing_events}</div>
              </div>
            </div>
            <div className="stat-card stat-info">
              <div className="stat-icon">🔜</div>
              <div className="stat-content">
                <div className="stat-label">예정</div>
                <div className="stat-value">{statistics.upcoming_events}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 검색 필터 */}
      <TimeFilter
        visitDate={visitDate}
        visitTime={visitTime}
        eventType={eventType}
        location={location}
        companyName={companyName}
        onlyAvailable={onlyAvailable}
        onVisitDateChange={setVisitDate}
        onVisitTimeChange={setVisitTime}
        onEventTypeChange={setEventType}
        onLocationChange={setLocation}
        onCompanyNameChange={setCompanyName}
        onOnlyAvailableChange={setOnlyAvailable}
        onSearch={fetchEvents}
        onReset={resetFilters}
        onSetToNow={setToNow}
      />

      {/* 검색 결과 헤더 */}
      {searchResponse && (
        <div className="results-header">
          <div className="results-info">
            <h2>
              {onlyAvailable ? (
                <>
                  🟢 입장 가능한 이벤트 
                  <span className="count">{searchResponse.available_count}</span>
                </>
              ) : (
                <>
                  📋 전체 이벤트 
                  <span className="count">{searchResponse.total}</span>
                </>
              )}
            </h2>
            <p className="filter-summary">
              {visitDate ? (
                <>
                  📅 {visitDate} {visitTime && `${visitTime}`} 기준
                </>
              ) : (
                <>
                  🕐 현재 시간 기준
                </>
              )}
            </p>
          </div>

          {/* 뷰 모드 전환 */}
          <div className="view-controls">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="그리드 뷰"
            >
              ▦
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="리스트 뷰"
            >
              ☰
            </button>
          </div>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>이벤트를 불러오는 중...</p>
        </div>
      )}

      {/* 이벤트 목록 */}
      {!loading && events.length > 0 && (
        <div className={`events-container ${viewMode}`}>
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      {/* 결과 없음 */}
      {!loading && events.length === 0 && (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>검색 결과가 없습니다</h3>
          <p>
            {onlyAvailable
              ? '현재 입장 가능한 이벤트가 없습니다. 다른 시간대를 선택해보세요.'
              : '조건에 맞는 이벤트를 찾을 수 없습니다.'}
          </p>
          <button className="btn-primary" onClick={resetFilters}>
            필터 초기화
          </button>
        </div>
      )}

      {/* 더 보기 */}
      {searchResponse && searchResponse.total > events.length && (
        <div className="load-more">
          <button className="btn-secondary" onClick={fetchEvents}>
            더 보기 ({searchResponse.total - events.length}개 더 있음)
          </button>
        </div>
      )}
    </div>
  );
};

export default EventExplorer;
