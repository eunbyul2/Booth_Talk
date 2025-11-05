import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  FileText,
  MessageSquare,
  Filter,
  UserPlus,
  Plus,
  Send,
  Calendar,
} from "lucide-react";
import Header from "../../components/Header.jsx";
import AddManagerModal from "../../components/AddManagerModal";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("companies");
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [sendingEventId, setSendingEventId] = useState(null);
  const [regeneratingCompanyId, setRegeneratingCompanyId] = useState(null);

  // 데이터 상태 추가
  const [stats, setStats] = useState({
    total_companies: 0,
    total_events: 0,
    total_responses: 0,
    active_surveys: 0,
  });
  const [companies, setCompanies] = useState([]);
  const [events, setEvents] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    company: "",
    date: "",
    booth: "",
  });

  // API 호출 함수들
  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/admin/dashboard");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("통계 데이터 로딩 실패:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/admin/companies");
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error("기업 데이터 로딩 실패:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/admin/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("이벤트 데이터 로딩 실패:", error);
    }
  };

  const fetchResponses = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.company) params.append("company_id", filters.company);
      if (filters.booth) params.append("booth", filters.booth);
      if (filters.date) params.append("date_from", filters.date);

      const response = await fetch(`/api/admin/responses?${params}`);
      if (response.ok) {
        const data = await response.json();
        setResponses(data);
      }
    } catch (error) {
      console.error("응답 데이터 로딩 실패:", error);
    }
  };

  // 초기 데이터 로딩
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardStats(),
        fetchCompanies(),
        fetchEvents(),
        fetchResponses(),
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // 탭 변경 시 데이터 새로고침
  useEffect(() => {
    if (activeTab === "responses") {
      fetchResponses();
    }
  }, [filters]);

  const sendEventReport = async (eventId) => {
    setSendingEventId(eventId);
    try {
      const response = await fetch("/api/admin/send-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event_id: eventId }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`이벤트 리포트 발송 완료: ${data.message}`);
      } else {
        throw new Error("리포트 발송에 실패했습니다.");
      }
    } catch (error) {
      alert("리포트 발송 중 오류가 발생했습니다: " + error.message);
    } finally {
      setSendingEventId(null);
    }
  };

  // 매직링크 재발행 함수
  const regenerateMagicLink = async (companyId, companyName) => {
    const reason = prompt(
      `"${companyName}" 기업의 매직링크를 재발행합니다.\n\n재발행 사유를 입력하세요 (예: 기간 만료, 다른 부서 요청, 링크 분실 등):`,
      "기간 만료"
    );

    if (!reason) {
      return; // 사용자가 취소한 경우
    }

    setRegeneratingCompanyId(companyId);
    try {
      const response = await fetch(
        `/api/admin/companies/${companyId}/regenerate-magic-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            company_id: companyId,
            reason: reason.trim(),
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const message = `✅ 매직링크 재발행 완료!

🏢 기업: ${data.company_name}
🔗 새 매직링크: ${data.magic_link}
⏰ 만료일: ${new Date(data.expires_at).toLocaleString()}
${data.previous_token_revoked ? "🔒 이전 토큰 무효화됨" : ""}
📝 사유: ${data.reason}

매직링크가 클립보드에 복사되었습니다.`;

        // 클립보드에 복사
        navigator.clipboard.writeText(data.magic_link);
        alert(message);
      } else {
        const error = await response.json();
        throw new Error(error.detail || "매직링크 재발행에 실패했습니다.");
      }
    } catch (error) {
      alert("매직링크 재발행 중 오류가 발생했습니다: " + error.message);
    } finally {
      setRegeneratingCompanyId(null);
    }
  };

  return (
    <div className="admin-dashboard-page">
      <Header userType="admin" userName="관리자" />

      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>관리자 대시보드</h1>
            <p>모든 데이터를 조회하고 관리하세요</p>
          </div>

          <div className="admin-header-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate("/admin/create-company")}
            >
              <Plus size={20} />
              기업 계정 생성
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: "var(--primary-50)" }}
            >
              <Building2 size={24} style={{ color: "var(--primary-600)" }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">총 기업 수</div>
              <div className="stat-value">{stats.total_companies}</div>
            </div>
          </div>

          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: "var(--danger-50)" }}
            >
              <Users size={24} style={{ color: "var(--danger-600)" }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">활성 설문 수</div>
              <div className="stat-value">{stats.active_surveys}</div>
            </div>
          </div>

          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: "var(--success-50)" }}
            >
              <FileText size={24} style={{ color: "var(--success-600)" }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">총 이벤트 수</div>
              <div className="stat-value">{stats.total_events}</div>
            </div>
          </div>

          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: "var(--warning-50)" }}
            >
              <MessageSquare
                size={24}
                style={{ color: "var(--warning-600)" }}
              />
            </div>
            <div className="stat-content">
              <div className="stat-label">총 응답 수</div>
              <div className="stat-value">{stats.total_responses}</div>
            </div>
          </div>
        </div>

        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === "companies" ? "active" : ""}`}
            onClick={() => setActiveTab("companies")}
          >
            <Building2 size={18} />
            기업 관리
          </button>
          <button
            className={`tab-btn ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            <FileText size={18} />
            이벤트 관리
          </button>
          <button
            className={`tab-btn ${activeTab === "responses" ? "active" : ""}`}
            onClick={() => setActiveTab("responses")}
          >
            <MessageSquare size={18} />
            응답 조회
          </button>
        </div>

        <div className="tab-content card">
          {activeTab === "companies" && (
            <div>
              <div className="table-header">
                <h3>기업 목록</h3>
                <span className="result-count">{companies.length}개 기업</span>
              </div>
              {loading ? (
                <div className="loading">데이터를 불러오는 중...</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>기업명</th>
                      <th>이벤트 수</th>
                      <th>응답 수</th>
                      <th>상태</th>
                      <th>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.id}>
                        <td className="company-name">
                          <Building2 size={16} />
                          {company.name}
                        </td>
                        <td>{company.events}개</td>
                        <td>{company.responses}개</td>
                        <td>
                          <span
                            className={`badge ${
                              company.status === "active"
                                ? "badge-success"
                                : "badge-danger"
                            }`}
                          >
                            {company.status === "active" ? "활성" : "비활성"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button className="btn-sm btn-outline">
                              상세보기
                            </button>
                            <button
                              className="btn-sm btn-primary"
                              onClick={() =>
                                regenerateMagicLink(company.id, company.name)
                              }
                              disabled={regeneratingCompanyId === company.id}
                              title="새로운 매직링크 발행"
                            >
                              {regeneratingCompanyId === company.id
                                ? "발행중..."
                                : "🔗 재발행"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "events" && (
            <div>
              <div className="table-header">
                <h3>이벤트 목록</h3>
                <span className="result-count">{events.length}개 이벤트</span>
              </div>
              {loading ? (
                <div className="loading">데이터를 불러오는 중...</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>이벤트명</th>
                      <th>기업</th>
                      <th>날짜</th>
                      <th>응답 수</th>
                      <th>담당자</th>
                      <th>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td className="event-name">{event.name}</td>
                        <td>{event.company}</td>
                        <td>{event.date}</td>
                        <td>{event.responses}개</td>
                        <td>
                          <div className="manager-count">
                            <Users size={16} />
                            <span>{event.manager_count}명</span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-sm btn-outline"
                              onClick={() => {
                                setSelectedEvent(event);
                                setShowManagerModal(true);
                              }}
                            >
                              <UserPlus size={14} />
                              담당자 추가
                            </button>
                            <button
                              className="btn-sm btn-primary"
                              onClick={() => sendEventReport(event.id)}
                              disabled={sendingEventId === event.id}
                            >
                              <Send size={14} />
                              {sendingEventId === event.id
                                ? "발송중..."
                                : "리포트 발송"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "responses" && (
            <div>
              <div className="filter-section">
                <h3>응답 조회</h3>
                <div className="filter-controls">
                  <select
                    className="input"
                    value={filters.company}
                    onChange={(e) =>
                      setFilters({ ...filters, company: e.target.value })
                    }
                  >
                    <option value="">전체 기업</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    className="input"
                    value={filters.date}
                    onChange={(e) =>
                      setFilters({ ...filters, date: e.target.value })
                    }
                  />

                  <input
                    type="text"
                    className="input"
                    placeholder="부스 번호"
                    value={filters.booth}
                    onChange={(e) =>
                      setFilters({ ...filters, booth: e.target.value })
                    }
                  />

                  <button className="btn btn-primary" onClick={fetchResponses}>
                    <Filter size={18} />
                    필터 적용
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="loading">데이터를 불러오는 중...</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>기업</th>
                      <th>이벤트</th>
                      <th>응답자</th>
                      <th>부스</th>
                      <th>제출일시</th>
                      <th>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((response) => (
                      <tr key={response.id}>
                        <td>{response.company}</td>
                        <td>{response.event}</td>
                        <td>{response.respondent}</td>
                        <td>
                          <span className="badge badge-primary">
                            {response.booth}
                          </span>
                        </td>
                        <td>{new Date(response.date).toLocaleString()}</td>
                        <td>
                          <button className="btn-sm btn-outline">
                            상세보기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <button className="btn btn-outline" style={{ marginTop: "16px" }}>
                📥 Excel 다운로드
              </button>
            </div>
          )}
        </div>
      </div>

      {showManagerModal && selectedEvent && (
        <AddManagerModal
          eventId={selectedEvent.id}
          eventName={selectedEvent.name}
          onClose={() => {
            setShowManagerModal(false);
            setSelectedEvent(null);
          }}
          onSuccess={() => {
            console.log("Manager added successfully");
          }}
        />
      )}
    </div>
  );
}
