import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Image as ImageIcon, Edit, Check, Eye } from "lucide-react";
import Header from "../../components/Header.jsx";
import "./EventUpload.css";

export default function EventUpload() {
  const navigate = useNavigate();
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  const [eventData, setEventData] = useState({
    eventName: "",
    boothNumber: "",
    date: "",
    time: "",
    description: "",
    participationMethod: "",
    benefits: "",
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      setIsProcessing(true);
      setTimeout(() => {
        setEventData({
          eventName: "AI Summit Seoul & EXPO",
          boothNumber: "B-123",
          date: "2025-11-10",
          time: "14:00",
          description: "AI 기술의 최신 트렌드를 소개합니다",
          participationMethod: "현장 참여 또는 QR 코드 스캔",
          benefits: "기념품 증정, 추첨 이벤트",
        });
        setIsProcessing(false);
      }, 2000);
    }
  };

  const handleChange = (field, value) => {
    setEventData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    console.log("Submit event:", eventData);
    alert("이벤트가 업로드되었습니다!");
    navigate("/company/dashboard");
  };

  return (
    <div className="event-upload-page">
      <Header userType="company" userName="ABC Corporation" />

      <div className="upload-container">
        <div className="upload-header">
          <h1>이벤트 등록</h1>
          <p>이미지를 업로드하면 OCR로 자동 입력됩니다</p>
        </div>

        <div className="upload-content">
          <div className="upload-section">
            <div className="section-title">
              <ImageIcon size={20} />
              <span>이벤트 이미지</span>
            </div>

            {!imagePreview ? (
              <label className="upload-box">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
                <Upload size={48} />
                <span className="upload-text">이미지를 업로드하세요</span>
                <span className="upload-hint">
                  클릭하거나 드래그하여 업로드
                </span>
              </label>
            ) : (
              <div className="image-preview">
                <img src={imagePreview} alt="Event" />
                <button
                  className="btn-change-image"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    setEventData({
                      eventName: "",
                      boothNumber: "",
                      date: "",
                      time: "",
                      description: "",
                      participationMethod: "",
                      benefits: "",
                    });
                  }}
                >
                  이미지 변경
                </button>
              </div>
            )}

            {isProcessing && (
              <div className="processing">
                <div className="spinner"></div>
                <span>OCR 처리 중...</span>
              </div>
            )}
          </div>

          <div className="form-section">
            <div className="section-header">
              <div className="section-title">
                <Edit size={20} />
                <span>이벤트 정보</span>
              </div>

              {imagePreview && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "수정 완료" : "수정하기"}
                </button>
              )}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>이벤트명 *</label>
                <input
                  type="text"
                  className="input"
                  value={eventData.eventName}
                  onChange={(e) => handleChange("eventName", e.target.value)}
                  disabled={!isEditing}
                  placeholder="이벤트명을 입력하세요"
                />
              </div>

              <div className="form-group">
                <label>부스 번호</label>
                <input
                  type="text"
                  className="input"
                  value={eventData.boothNumber}
                  onChange={(e) => handleChange("boothNumber", e.target.value)}
                  disabled={!isEditing}
                  placeholder="예: B-123"
                />
              </div>

              <div className="form-group">
                <label>날짜 *</label>
                <input
                  type="date"
                  className="input"
                  value={eventData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-group">
                <label>시간 *</label>
                <input
                  type="time"
                  className="input"
                  value={eventData.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-group full-width">
                <label>설명</label>
                <textarea
                  className="input"
                  rows="3"
                  value={eventData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  disabled={!isEditing}
                  placeholder="이벤트 설명을 입력하세요"
                />
              </div>

              <div className="form-group full-width">
                <label>참여 방법</label>
                <input
                  type="text"
                  className="input"
                  value={eventData.participationMethod}
                  onChange={(e) =>
                    handleChange("participationMethod", e.target.value)
                  }
                  disabled={!isEditing}
                  placeholder="참여 방법을 입력하세요"
                />
              </div>

              <div className="form-group full-width">
                <label>혜택 사항</label>
                <input
                  type="text"
                  className="input"
                  value={eventData.benefits}
                  onChange={(e) => handleChange("benefits", e.target.value)}
                  disabled={!isEditing}
                  placeholder="사은품, 할인 등"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="upload-actions">
          <button
            className="btn btn-outline"
            onClick={() => navigate("/company/dashboard")}
          >
            취소
          </button>

          <div style={{ display: "flex", gap: "12px" }}>
            <button className="btn btn-outline">
              <Eye size={18} />
              미리보기
            </button>

            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={
                !eventData.eventName || !eventData.date || !eventData.time
              }
            >
              <Check size={18} />
              등록하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
