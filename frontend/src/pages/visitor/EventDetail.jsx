import { useState } from "react";
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
import "./EventDetail.css";

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);

  const event = {
    id: Number(eventId),
    name: "AI Summit Seoul & EXPO",
    company: "TechCorp",
    booth: "B-123",
    date: "2025-11-10",
    time: "14:00 - 17:00",
    venue: "코엑스 그랜드볼룸 + B홀",
    description:
      "AI 기술의 최신 트렌드와 혁신적인 솔루션을 소개합니다. 전문가들의 강연과 데모 체험이 준비되어 있습니다.",
    participationMethod: "현장 참여 또는 QR 코드 스캔",
    benefits: "기념품 증정, 경품 추첨 이벤트, 무료 상담",
    hasSurvey: true,
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
            onClick={() => navigate("/visitor/events")}
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
          <div className="event-main-image">
            <div className="image-placeholder">
              <span>📸</span>
              <p>이벤트 포스터</p>
            </div>
          </div>

          <div className="event-info-section">
            <div className="booth-badge">부스 {event.booth}</div>
            <h1 className="event-title">{event.name}</h1>
            <p className="event-company">{event.company}</p>

            <div className="info-grid">
              <div className="info-item">
                <div className="info-icon">
                  <Calendar size={20} />
                </div>
                <div className="info-content">
                  <div className="info-label">날짜</div>
                  <div className="info-value">{event.date}</div>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">
                  <Clock size={20} />
                </div>
                <div className="info-content">
                  <div className="info-label">시간</div>
                  <div className="info-value">{event.time}</div>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">
                  <MapPin size={20} />
                </div>
                <div className="info-content">
                  <div className="info-label">장소</div>
                  <div className="info-value">{event.venue}</div>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">
                  <Gift size={20} />
                </div>
                <div className="info-content">
                  <div className="info-label">혜택</div>
                  <div className="info-value">{event.benefits}</div>
                </div>
              </div>
            </div>

            <div className="section-box">
              <h3>이벤트 설명</h3>
              <p>{event.description}</p>
            </div>

            <div className="section-box">
              <h3>참여 방법</h3>
              <p>{event.participationMethod}</p>
            </div>

            {event.hasSurvey && (
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
    </div>
  );
}
