/**
 * EventCard - 이벤트 카드 컴포넌트
 * 그리드/리스트 뷰 지원
 */

import React from 'react';
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

interface EventCardProps {
  event: Event;
  viewMode: 'grid' | 'list';
}

const EventCard: React.FC<EventCardProps> = ({ event, viewMode }) => {
  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // D-day 계산
  const getDdayText = () => {
    if (event.days_until_start < 0) {
      return '진행 중';
    } else if (event.days_until_start === 0) {
      return '오늘 시작';
    } else {
      return `D-${event.days_until_start}`;
    }
  };

  // 이벤트 타입 아이콘
  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      '전시회': '🎨',
      '박람회': '🏢',
      '컨퍼런스': '🎤',
      '세미나': '📚',
      '워크샵': '🛠️',
      '페스티벌': '🎪',
      '기타': '📌'
    };
    return icons[type] || '📌';
  };

  return (
    <div className={`event-card ${viewMode} ${event.is_available_now ? 'available' : 'upcoming'}`}>
      {/* 이미지 영역 */}
      <div className="event-image">
        {event.image_url ? (
          <img src={event.image_url} alt={event.event_name} />
        ) : (
          <div className="image-placeholder">
            <span className="placeholder-icon">
              {getTypeIcon(event.event_type)}
            </span>
          </div>
        )}
        
        {/* 상태 뱃지 */}
        <div className="event-badges">
          {event.is_available_now ? (
            <span className="badge badge-success">
              ✓ 입장 가능
            </span>
          ) : (
            <span className="badge badge-warning">
              {getDdayText()}
            </span>
          )}
        </div>
      </div>

      {/* 정보 영역 */}
      <div className="event-info">
        {/* 회사명 */}
        <div className="event-company">
          <span className="company-icon">🏢</span>
          {event.company_name}
        </div>

        {/* 이벤트명 */}
        <h3 className="event-title">{event.event_name}</h3>

        {/* 타입 & 부스 */}
        <div className="event-meta">
          <span className="meta-item">
            {getTypeIcon(event.event_type)} {event.event_type}
          </span>
          {event.booth_number && (
            <span className="meta-item">
              🎯 부스 {event.booth_number}
            </span>
          )}
        </div>

        {/* 날짜 & 시간 */}
        <div className="event-schedule">
          <div className="schedule-item">
            <span className="schedule-icon">📅</span>
            <div className="schedule-text">
              <div className="schedule-label">기간</div>
              <div className="schedule-value">
                {formatDate(event.start_date)}
                {event.start_date !== event.end_date && (
                  <> ~ {formatDate(event.end_date)}</>
                )}
              </div>
            </div>
          </div>
          
          <div className="schedule-item">
            <span className="schedule-icon">🕐</span>
            <div className="schedule-text">
              <div className="schedule-label">운영 시간</div>
              <div className="schedule-value">{event.available_hours}</div>
            </div>
          </div>
        </div>

        {/* 장소 */}
        <div className="event-location">
          <span className="location-icon">📍</span>
          <span className="location-text">{event.location}</span>
        </div>

        {/* 설명 (리스트 뷰에서만) */}
        {viewMode === 'list' && event.description && (
          <p className="event-description">{event.description}</p>
        )}

        {/* 액션 버튼 */}
        <div className="event-actions">
          <button className="btn-primary-sm">
            📋 상세보기
          </button>
          {event.is_available_now && (
            <button className="btn-success-sm">
              🎟️ 지금 입장
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
