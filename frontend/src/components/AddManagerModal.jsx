import { useState } from "react";
import { X, Plus, User } from "lucide-react";
import "./AddManagerModal.css";

export default function AddManagerModal({
  eventId,
  eventName,
  onClose,
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    manager_name: "",
    manager_phone: "",
    manager_email: "",
    manager_position: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.manager_name.trim()) {
      alert("담당자 이름을 입력하세요");
      return;
    }

    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert("담당자 정보가 추가되었습니다");
      onSuccess();
      onClose();
    } catch (error) {
      alert("오류가 발생했습니다");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <div className="title-icon">
              <User size={24} />
            </div>
            <div>
              <h2>담당자 추가</h2>
              <p className="event-name">{eventName}</p>
            </div>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>담당자 이름 *</label>
            <input
              type="text"
              className="input"
              value={formData.manager_name}
              onChange={(e) => handleChange("manager_name", e.target.value)}
              placeholder="홍길동"
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>연락처</label>
              <input
                type="tel"
                className="input"
                value={formData.manager_phone}
                onChange={(e) => handleChange("manager_phone", e.target.value)}
                placeholder="010-1234-5678"
              />
            </div>

            <div className="form-group">
              <label>직책</label>
              <input
                type="text"
                className="input"
                value={formData.manager_position}
                onChange={(e) =>
                  handleChange("manager_position", e.target.value)
                }
                placeholder="마케팅 팀장"
              />
            </div>
          </div>

          <div className="form-group">
            <label>이메일</label>
            <input
              type="email"
              className="input"
              value={formData.manager_email}
              onChange={(e) => handleChange("manager_email", e.target.value)}
              placeholder="hong@company.com"
            />
          </div>

          <div className="form-group">
            <label>메모 (내부용)</label>
            <textarea
              className="input"
              rows="3"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="관리자 전용 메모..."
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner-small"></div>
                  추가 중...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  추가
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
