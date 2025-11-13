import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Image as ImageIcon,
  Edit,
  Check,
  Eye,
  FileText,
  X,
} from "lucide-react";
import Header from "../../components/Header.jsx";
import "./EventUpload.css";

const INITIAL_EVENT_DATA = {
  eventName: "",
  boothNumber: "",
  location: "", // 전시장/장소
  venue: "", // 상세 장소

  // 분리된 날짜 필드
  startDate: "",
  endDate: "",
  date: "", // 기존 필드 (backward compatibility)

  // 분리된 시간 필드
  startTime: "",
  endTime: "",
  time: "", // 기존 필드 (backward compatibility)

  description: "",
  participationMethod: "",
  benefits: "",
};

export default function EventUpload() {
  const navigate = useNavigate();
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [createdEventId, setCreatedEventId] = useState(null);

  const [eventData, setEventData] = useState(INITIAL_EVENT_DATA);

  // LLM 분석 결과 저장
  const [llmResult, setLlmResult] = useState(null);

  // 기업 정보 로드
  useEffect(() => {
    const companyId = localStorage.getItem("company_id");
    const companyName = localStorage.getItem("company_name");

    if (companyId && companyName) {
      setCompanyInfo({
        id: companyId,
        name: companyName,
      });
    } else {
      // 로그인 정보가 없으면 로그인 페이지로 이동
      navigate("/company/login");
    }
  }, [navigate]);

  // LLM 이미지 분석 처리
  const processImageWithLLM = async (file) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("provider", "openai");

      const response = await fetch("/api/events/analyze-image", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("LLM 분석 결과:", data);

        // LLM 결과 저장 (이벤트 생성 시 사용)
        setLlmResult(data);

        // 폼 데이터 설정 - 새로운 분리된 필드 우선 처리
        setEventData({
          eventName: data.form_data.eventName || "",
          boothNumber: data.form_data.boothNumber || "",
          location: data.form_data.location || "",
          venue: data.form_data.venue || "",

          // 분리된 날짜 필드 처리
          startDate: data.form_data.startDate || data.form_data.date || "",
          endDate: data.form_data.endDate || data.form_data.date || "",
          date: data.form_data.date || "", // 기존 필드 유지

          // 분리된 시간 필드 처리
          startTime: data.form_data.startTime || "",
          endTime: data.form_data.endTime || "",
          time: data.form_data.time || "", // 기존 필드 유지

          description: data.form_data.description || "",
          participationMethod: data.form_data.participationMethod || "",
          benefits: data.form_data.benefits || "",
        });

        // 알림 메시지 개선
        const dateInfo = data.form_data.startDate
          ? `${data.form_data.startDate}${
              data.form_data.endDate &&
              data.form_data.endDate !== data.form_data.startDate
                ? ` ~ ${data.form_data.endDate}`
                : ""
            }`
          : data.form_data.date;
        const timeInfo = data.form_data.startTime
          ? `${data.form_data.startTime}${
              data.form_data.endTime ? ` ~ ${data.form_data.endTime}` : ""
            }`
          : data.form_data.time;

        alert(
          `이미지 분석 완료!\n🎯 이벤트: ${
            data.form_data.eventName
          }\n날짜: ${dateInfo}\n시간: ${timeInfo}\n장소: ${
            data.form_data.location
          }${data.form_data.venue ? ` (${data.form_data.venue})` : ""}`
        );
      } else {
        console.warn("LLM 분석 실패, 수동 입력으로 진행");
        alert("이미지 분석에 실패했습니다. 수동으로 입력해주세요.");
      }
    } catch (error) {
      console.error("LLM 처리 중 오류:", error);
      alert("이미지 분석 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (e) => {
    if (createdEventId) {
      alert(
        "이미 이벤트가 등록되었습니다. 새로운 이벤트를 추가하려면 페이지를 새로고침하세요."
      );
      return;
    }
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // LLM 이미지 분석 호출
      processImageWithLLM(file);
    }
  };

  // PDF 업로드 핸들러 추가
  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    } else {
      alert("PDF 파일만 업로드할 수 있습니다.");
    }
  };

  // PDF 드래그앤드롭 핸들러
  const handlePdfDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    } else {
      alert("PDF 파일만 업로드할 수 있습니다.");
    }
  };

  const handlePdfDragOver = (e) => {
    e.preventDefault();
  };

  const handlePdfSubmit = async () => {
    if (!createdEventId) {
      alert("먼저 이벤트를 등록해주세요.");
      return;
    }

    if (!pdfFile) {
      alert(
        "업로드할 PDF 파일을 선택해주세요. 필요 없다면 '건너뛰기' 버튼을 눌러주세요."
      );
      return;
    }

    setIsPdfUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("event_id", createdEventId);

      const response = await fetch(`/api/events/${createdEventId}/upload-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "PDF 업로드에 실패했습니다.");
      }

      alert("PDF 안내물이 업로드되었습니다!");
      navigate("/company/dashboard");
    } catch (error) {
      alert("PDF 업로드 중 오류가 발생했습니다: " + error.message);
    } finally {
      setIsPdfUploading(false);
    }
  };

  const handleSkipPdf = () => {
    navigate("/company/dashboard");
  };

  const handleChange = (field, value) => {
    setEventData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    // 유효성 검사 개선 - 분리된 필드 고려
    if (!eventData.eventName) {
      alert("이벤트명을 입력해주세요.");
      return;
    }

    // 날짜 검증: 시작날짜가 있거나 기존 date 필드가 있어야 함
    if (!eventData.startDate && !eventData.date) {
      alert("시작 날짜를 입력해주세요.");
      return;
    }

    if (createdEventId) {
      alert(
        "이 이벤트는 이미 등록되었습니다. 새로운 이벤트를 등록하려면 페이지를 새로고침하세요."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // 이벤트 생성 API 호출
      const eventPayload = {
        form_data: {
          eventName: eventData.eventName,
          boothNumber: eventData.boothNumber,
          location: eventData.location, // 전시장/장소
          venue: eventData.venue, // 상세 장소

          // 분리된 날짜/시간 필드 (우선)
          startDate: eventData.startDate,
          endDate: eventData.endDate || eventData.startDate, // 종료날짜 없으면 시작날짜와 동일
          startTime: eventData.startTime,
          endTime: eventData.endTime,

          // 기존 필드 (backward compatibility)
          date: eventData.date,
          time: eventData.time,

          description: eventData.description,
          participationMethod: eventData.participationMethod,
          benefits: eventData.benefits,
        },
        tags: llmResult?.tags || [], // LLM 분석 태그
        categories: llmResult?.categories || [], // LLM 분석 카테고리
        company_id: companyInfo?.id || 1,
        // 임시 이미지 정보 (LLM 분석 결과에서)
        temp_image_path: llmResult?.temp_image_path || null,
        original_filename: llmResult?.original_filename || null,
      };

      const response = await fetch("/api/events/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      if (response.ok) {
        const result = await response.json();
        setCreatedEventId(result.id);
        setIsEditing(false);
        setPdfFile(null);
        alert(
          "이벤트가 성공적으로 등록되었습니다! 필요하다면 아래에서 PDF 안내물을 추가로 업로드할 수 있어요."
        );
      } else {
        const error = await response.json();
        throw new Error(error.detail || "이벤트 등록에 실패했습니다.");
      }
    } catch (error) {
      alert("이벤트 등록 중 오류가 발생했습니다: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="event-upload-page">
      <Header userType="company" userName={companyInfo?.name || "기업"} />

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
                    setEventData({ ...INITIAL_EVENT_DATA });
                  }}
                  disabled={!!createdEventId}
                >
                  이미지 변경
                </button>
              </div>
            )}

            {isProcessing && (
              <div className="processing">
                <div className="spinner"></div>
                <span>이미지 분석 중...</span>
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
                  disabled={!!createdEventId}
                >
                  {createdEventId
                    ? "등록 완료"
                    : isEditing
                    ? "수정 완료"
                    : "수정하기"}
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
                <label>전시장/장소</label>
                <input
                  type="text"
                  className="input"
                  value={eventData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  disabled={!isEditing}
                  placeholder="예: 코엑스, 킨텍스"
                />
              </div>

              <div className="form-group">
                <label>상세 위치</label>
                <input
                  type="text"
                  className="input"
                  value={eventData.venue}
                  onChange={(e) => handleChange("venue", e.target.value)}
                  disabled={!isEditing}
                  placeholder="예: 1층 A홀, 컨퍼런스룸"
                />
              </div>

              <div className="form-group">
                <label>시작 날짜 *</label>
                <input
                  type="date"
                  className="input"
                  value={eventData.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-group">
                <label>종료 날짜</label>
                <input
                  type="date"
                  className="input"
                  value={eventData.endDate}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                  disabled={!isEditing}
                />
                <small className="form-hint">
                  단일 날짜인 경우 비워두셔도 됩니다
                </small>
              </div>

              <div className="form-group">
                <label>시작 시간</label>
                <input
                  type="time"
                  className="input"
                  value={eventData.startTime}
                  onChange={(e) => handleChange("startTime", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-group">
                <label>종료 시간</label>
                <input
                  type="time"
                  className="input"
                  value={eventData.endTime}
                  onChange={(e) => handleChange("endTime", e.target.value)}
                  disabled={!isEditing}
                />
                <small className="form-hint">
                  단일 시간인 경우 비워두셔도 됩니다
                </small>
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

        {createdEventId && (
          <div className="pdf-step">
            <div className="upload-section">
              <div className="section-title">
                <FileText size={20} />
                <span>PDF 안내물 추가</span>
                <span className="optional-badge">선택사항</span>
              </div>

              <p className="pdf-step-description">
                방금 등록한 이벤트에 안내 자료를 첨부할 수 있어요. PDF를
                업로드하지 않아도 등록은 완료된 상태입니다.
              </p>

              {!pdfFile ? (
                <label
                  className="upload-box pdf-upload-box"
                  onDrop={handlePdfDrop}
                  onDragOver={handlePdfDragOver}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    style={{ display: "none" }}
                  />
                  <FileText size={48} />
                  <span className="upload-text">PDF 안내물을 업로드하세요</span>
                  <span className="upload-hint">
                    설문 참여자에게 제공할 회사 소개자료, 카탈로그 등을 선택할
                    수 있습니다.
                  </span>
                </label>
              ) : (
                <div className="pdf-preview">
                  <div className="pdf-info">
                    <FileText size={24} />
                    <div className="pdf-details">
                      <span className="pdf-name">{pdfFile.name}</span>
                      <span className="pdf-size">
                        {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-remove-pdf"
                    onClick={() => setPdfFile(null)}
                    title="PDF 제거"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="upload-actions">
          <button
            className="btn btn-outline"
            onClick={
              createdEventId
                ? handleSkipPdf
                : () => navigate("/company/dashboard")
            }
            disabled={isSubmitting || isPdfUploading}
          >
            {createdEventId ? "PDF 없이 완료하기" : "취소"}
          </button>

          {createdEventId ? (
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="btn btn-primary"
                onClick={handlePdfSubmit}
                disabled={isPdfUploading || !pdfFile}
              >
                <Upload size={18} />
                {isPdfUploading ? "업로드 중..." : "PDF 업로드"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn btn-outline">
                <Eye size={18} />
                미리보기
              </button>

              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !eventData.eventName ||
                  (!eventData.startDate && !eventData.date)
                }
              >
                <Check size={18} />
                {isSubmitting ? "등록 중..." : "등록하기"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
