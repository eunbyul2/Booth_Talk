import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Clock,
  Gift,
  ArrowLeft,
  Share2,
  Heart,
} from "lucide-react";
import { getVisitorEventDetail } from "../../apiClient";
import FloatingButtons from "../../components/FloatingButtons";
import "./EventDetail.css";

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEventDetail = async () => {
      try {
        setLoading(true);
        const data = await getVisitorEventDetail(eventId);
        setEvent(data);
      } catch (err) {
        console.error("이벤트 정보를 불러오는 데 실패했습니다:", err);
        setError("이벤트 정보를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventDetail();
    }
  }, [eventId]);

  if (loading) {
    return (
      <div className="event-detail-page">
        <div className="detail-container container">
          <p style={{ textAlign: "center", padding: "2rem", color: "rgba(200, 210, 255, 0.7)" }}>
            로딩 중...
          </p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-detail-page">
        <div className="detail-container container">
          <p style={{ textAlign: "center", padding: "2rem", color: "rgba(255, 100, 120, 0.9)" }}>
            {error || "이벤트를 찾을 수 없습니다."}
          </p>
          <button onClick={() => navigate("/visitor/events")} style={{ marginTop: "1rem" }}>
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (startDate, endDate) => {
    if (!startDate) return "";
    const start = new Date(startDate).toLocaleDateString("ko-KR");
    if (endDate && startDate !== endDate) {
      const end = new Date(endDate).toLocaleDateString("ko-KR");
      return `${start} ~ ${end}`;
    }
    return start;
  };

  const formatTime = (startTime, endTime) => {
    if (!startTime) return "시간 미정";
    if (endTime) {
      return `${startTime} - ${endTime}`;
    }
    return startTime;
  };

  const handleShare = () => {
    alert("공유 기능 (슬랙/카카오톡)");
  };

  return (
    <div className="event-detail-page">
      <div className="detail-header">
        <div className="container">
          <button
            className="btn-back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
            목록으로
          </button>

          <div className="header-actions">
            <button
              className={`btn-icon ${isFavorite ? "active" : ""}`}
              onClick={() => setIsFavorite(!isFavorite)}
            >
              <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button className="btn-icon" onClick={handleShare}>
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="detail-container container">
        <div className="detail-content">
          <div className={`event-main-image ${!event.image_url ? "pending" : ""}`}>
            {event.image_url ? (
              <>
                <img
                  src={event.image_url}
                  alt={event.event_name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
                <div className="image-overlay">
                  주최측이 이미지를 등록할 예정입니다
                </div>
              </>
            ) : (
              <div className="image-placeholder">
                <span>📸</span>
                <p>주최측이 이미지를 등록할 예정입니다</p>
              </div>
            )}
          </div>

          <div className="event-info-section">
            {event.booth_number && (
              <div className="booth-badge">부스 {event.booth_number}</div>
            )}
            <h1 className="event-title">{event.event_name}</h1>
            <p className="event-company">{event.company_name}</p>

            <div className="info-grid">
              <div className="info-item">
                <div className="info-icon">
                  <Calendar size={20} />
                </div>
                <div className="info-content">
                  <div className="info-label">날짜</div>
                  <div className="info-value">
                    {formatDate(event.start_date, event.end_date)}
                  </div>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">
                  <Clock size={20} />
                </div>
                <div className="info-content">
                  <div className="info-label">시간</div>
                  <div className="info-value">
                    {formatTime(event.start_time, event.end_time)}
                  </div>
                </div>
              </div>

              {event.location && (
                <div className="info-item">
                  <div className="info-icon">
                    <MapPin size={20} />
                  </div>
                  <div className="info-content">
                    <div className="info-label">장소</div>
                    <div className="info-value">{event.location}</div>
                  </div>
                </div>
              )}

              {event.benefits && (
                <div className="info-item">
                  <div className="info-icon">
                    <Gift size={20} />
                  </div>
                  <div className="info-content">
                    <div className="info-label">혜택</div>
                    <div className="info-value">{event.benefits}</div>
                  </div>
                </div>
              )}
            </div>

            {event.description && (
              <div className="section-box">
                <h3>이벤트 설명</h3>
                <p>{event.description}</p>
              </div>
            )}

            {event.participation_method && (
              <div className="section-box">
                <h3>참여 방법</h3>
                <p>{event.participation_method}</p>
              </div>
            )}

            {event.active_survey_id && (
              <button
                className="btn btn-primary btn-large"
                onClick={() => navigate(`/visitor/survey/${eventId}`)}
              >
                설문조사 참여하기 →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Buttons */}
      <FloatingButtons showMapButton={false} />
    </div>
  );
}
