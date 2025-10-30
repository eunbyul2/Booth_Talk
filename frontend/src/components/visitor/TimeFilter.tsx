/**
 * TimeFilter - 방문 시간 필터 컴포넌트
 * 날짜/시간 선택 및 검색 필터
 */

import React, { useState } from 'react';
import '../styles/EventExplorer.css';

interface TimeFilterProps {
  visitDate: string;
  visitTime: string;
  eventType: string;
  location: string;
  companyName: string;
  onlyAvailable: boolean;
  onVisitDateChange: (value: string) => void;
  onVisitTimeChange: (value: string) => void;
  onEventTypeChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onCompanyNameChange: (value: string) => void;
  onOnlyAvailableChange: (value: boolean) => void;
  onSearch: () => void;
  onReset: () => void;
  onSetToNow: () => void;
}

const TimeFilter: React.FC<TimeFilterProps> = ({
  visitDate,
  visitTime,
  eventType,
  location,
  companyName,
  onlyAvailable,
  onVisitDateChange,
  onVisitTimeChange,
  onEventTypeChange,
  onLocationChange,
  onCompanyNameChange,
  onOnlyAvailableChange,
  onSearch,
  onReset,
  onSetToNow
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 오늘 날짜
  const today = new Date().toISOString().split('T')[0];

  // 현재 시간 (HH:MM)
  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // 빠른 시간 설정
  const setQuickTime = (hours: number) => {
    const date = new Date();
    date.setHours(hours, 0, 0, 0);
    
    onVisitDateChange(date.toISOString().split('T')[0]);
    onVisitTimeChange(`${String(hours).padStart(2, '0')}:00`);
  };

  const eventTypes = [
    '전시회',
    '박람회',
    '컨퍼런스',
    '세미나',
    '워크샵',
    '페스티벌',
    '기타'
  ];

  return (
    <div className="time-filter">
      <div className="filter-main">
        {/* 메인 필터 - 항상 표시 */}
        <div className="filter-row">
          {/* 날짜 선택 */}
          <div className="filter-group">
            <label htmlFor="visit-date">
              <span className="filter-icon">📅</span>
              방문 날짜
            </label>
            <div className="input-with-btn">
              <input
                id="visit-date"
                type="date"
                value={visitDate}
                min={today}
                onChange={(e) => onVisitDateChange(e.target.value)}
                className="filter-input"
              />
              <button
                className="btn-icon"
                onClick={onSetToNow}
                title="현재 시간으로"
              >
                🔄
              </button>
            </div>
          </div>

          {/* 시간 선택 */}
          <div className="filter-group">
            <label htmlFor="visit-time">
              <span className="filter-icon">🕐</span>
              방문 시간
            </label>
            <input
              id="visit-time"
              type="time"
              value={visitTime}
              onChange={(e) => onVisitTimeChange(e.target.value)}
              className="filter-input"
            />
          </div>

          {/* 입장 가능만 보기 */}
          <div className="filter-group filter-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => onOnlyAvailableChange(e.target.checked)}
                className="toggle-input"
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">
                {onlyAvailable ? '✅ 입장 가능만' : '📋 전체 보기'}
              </span>
            </label>
          </div>

          {/* 검색 버튼 */}
          <div className="filter-actions">
            <button className="btn-primary" onClick={onSearch}>
              🔍 검색
            </button>
            <button
              className="btn-secondary"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▲ 접기' : '▼ 상세'}
            </button>
          </div>
        </div>

        {/* 빠른 시간 선택 */}
        {!visitDate && (
          <div className="quick-times">
            <span className="quick-times-label">빠른 선택:</span>
            <button
              className="btn-quick-time"
              onClick={() => setQuickTime(9)}
            >
              🌅 오전 9시
            </button>
            <button
              className="btn-quick-time"
              onClick={() => setQuickTime(12)}
            >
              ☀️ 정오 12시
            </button>
            <button
              className="btn-quick-time"
              onClick={() => setQuickTime(15)}
            >
              🌤️ 오후 3시
            </button>
            <button
              className="btn-quick-time"
              onClick={() => setQuickTime(18)}
            >
              🌆 오후 6시
            </button>
          </div>
        )}

        {/* 상세 필터 - 펼침/접기 */}
        {isExpanded && (
          <div className="filter-advanced">
            <div className="filter-row">
              {/* 이벤트 타입 */}
              <div className="filter-group">
                <label htmlFor="event-type">
                  <span className="filter-icon">🎨</span>
                  이벤트 타입
                </label>
                <select
                  id="event-type"
                  value={eventType}
                  onChange={(e) => onEventTypeChange(e.target.value)}
                  className="filter-input"
                >
                  <option value="">전체</option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* 장소 */}
              <div className="filter-group">
                <label htmlFor="location">
                  <span className="filter-icon">📍</span>
                  장소
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => onLocationChange(e.target.value)}
                  placeholder="예: 코엑스, 킨텍스"
                  className="filter-input"
                />
              </div>

              {/* 회사명 */}
              <div className="filter-group">
                <label htmlFor="company-name">
                  <span className="filter-icon">🏢</span>
                  회사명
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={companyName}
                  onChange={(e) => onCompanyNameChange(e.target.value)}
                  placeholder="회사 검색"
                  className="filter-input"
                />
              </div>
            </div>

            {/* 초기화 버튼 */}
            <div className="filter-reset">
              <button className="btn-text" onClick={onReset}>
                🔄 필터 초기화
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 현재 필터 요약 */}
      {(visitDate || eventType || location || companyName) && (
        <div className="filter-summary">
          <span className="summary-label">적용된 필터:</span>
          {visitDate && (
            <span className="summary-tag">
              📅 {visitDate}
              <button onClick={() => onVisitDateChange('')}>×</button>
            </span>
          )}
          {visitTime && (
            <span className="summary-tag">
              🕐 {visitTime}
              <button onClick={() => onVisitTimeChange('')}>×</button>
            </span>
          )}
          {eventType && (
            <span className="summary-tag">
              🎨 {eventType}
              <button onClick={() => onEventTypeChange('')}>×</button>
            </span>
          )}
          {location && (
            <span className="summary-tag">
              📍 {location}
              <button onClick={() => onLocationChange('')}>×</button>
            </span>
          )}
          {companyName && (
            <span className="summary-tag">
              🏢 {companyName}
              <button onClick={() => onCompanyNameChange('')}>×</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeFilter;
