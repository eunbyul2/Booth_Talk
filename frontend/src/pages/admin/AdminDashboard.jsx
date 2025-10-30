import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  FileText,
  MessageSquare,
  Filter,
  UserPlus,
  Plus,
} from "lucide-react";
import Header from "../../components/Header.jsx";
import AddManagerModal from "../../components/AddManagerModal";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("companies");
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [filters, setFilters] = useState({
    company: "",
    date: "",
    booth: "",
  });

  const stats = {
    totalCompanies: 45,
    totalUsers: 1280,
    totalEvents: 120,
    totalResponses: 3450,
  };

  const companies = [
    { id: 1, name: "TechCorp", events: 12, responses: 342, status: "active" },
    { id: 2, name: "ElecTech", events: 8, responses: 215, status: "active" },
    {
      id: 3,
      name: "BioInnovate",
      events: 15,
      responses: 489,
      status: "active",
    },
  ];

  const events = [
    {
      id: 1,
      name: "AI Summit 2025",
      company: "TechCorp",
      date: "2025-11-10",
      responses: 125,
      managerCount: 1,
    },
    {
      id: 2,
      name: "전자제품 박람회",
      company: "ElecTech",
      date: "2025-11-15",
      responses: 78,
      managerCount: 0,
    },
    {
      id: 3,
      name: "바이오 테크",
      company: "BioInnovate",
      date: "2025-11-12",
      responses: 156,
      managerCount: 2,
    },
  ];

  const responses = [
    {
      id: 1,
      company: "TechCorp",
      event: "AI Summit",
      respondent: "홍길동",
      date: "2025-11-10 14:23",
      booth: "B-123",
    },
    {
      id: 2,
      company: "ElecTech",
      event: "전자제품 박람회",
      respondent: "김철수",
      date: "2025-11-15 10:45",
      booth: "A-45",
    },
    {
      id: 3,
      company: "BioInnovate",
      event: "바이오 테크",
      respondent: "이영희",
      date: "2025-11-12 13:15",
      booth: "C-78",
    },
  ];

  return (
    <div className="admin-dashboard-page">
      <Header userType="admin" userName="관리자" />

      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>관리자 대시보드</h1>
            <p>모든 데이터를 조회하고 관리하세요</p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => navigate("/admin/create-company")}
          >
            <Plus size={20} />
            기업 계정 생성
          </button>
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
              <div className="stat-value">{stats.totalCompanies}</div>
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
              <div className="stat-label">총 사용자 수</div>
              <div className="stat-value">{stats.totalUsers}</div>
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
              <div className="stat-value">{stats.totalEvents}</div>
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
              <div className="stat-value">{stats.totalResponses}</div>
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
                        <span className="badge badge-success">활성</span>
                      </td>
                      <td>
                        <button className="btn-sm btn-outline">상세보기</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "events" && (
            <div>
              <div className="table-header">
                <h3>이벤트 목록</h3>
                <span className="result-count">{events.length}개 이벤트</span>
              </div>
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
                          <span>{event.managerCount}명</span>
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    <option value="1">TechCorp</option>
                    <option value="2">ElecTech</option>
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

                  <button className="btn btn-primary">
                    <Filter size={18} />
                    필터 적용
                  </button>
                </div>
              </div>

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
                      <td>{response.date}</td>
                      <td>
                        <button className="btn-sm btn-outline">상세보기</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

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
