import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar } from 'lucide-react';
import { useIntersectionObserver } from '../../utils/useIntersectionObserver';

export default function ExhibitionCard({ exhibition, hoveredExhibitionId, setHoveredExhibitionId, formatDate }) {
  const navigate = useNavigate();
  const [ref, entry] = useIntersectionObserver({ threshold: 0.1 });

  const isVisible = entry?.isIntersecting;

  return (
    <div
      ref={ref}
      key={exhibition.id}
      className={`exhibition-card ${isVisible ? 'visible' : ''}`}
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
  );
}
