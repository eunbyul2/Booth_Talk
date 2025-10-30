import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  FileText,
  Upload,
  BarChart3,
  Eye,
  Users,
} from "lucide-react";
import Header from "../../components/Header.jsx";
import "./CompanyDashboard.css";

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const [stats] = useState({
    totalEvents: 12,
    activeSurveys: 8,
    totalResponses: 342,
    totalViews: 1567,
  });

  const [recentEvents] = useState([
    {
      id: 1,
      name: "AI Summit 2025",
      date: "2025-11-10",
      responses: 45,
      status: "active",
    },
    {
      id: 2,
      name: "전자제품 박람회",
      date: "2025-12-05",
      responses: 78,
      status: "active",
    },
    {
      id: 3,
      name: "바이오 테크놀로지",
      date: "2025-10-15",
      responses: 120,
      status: "ended",
    },
  ]);

  return (
    <div className="dashboard-page">
      <Header userType="company" userName="ABC Corporation" />

      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1>대시보드</h1>
            <p>이벤트와 설문조사를 관리하세요</p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => navigate("/company/event/upload")}
          >
            <Upload size={20} />새 이벤트 등록
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#EEF2FF" }}>
              <Calendar size={24} style={{ color: "#4F46E5" }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">총 이벤트</div>
              <div className="stat-value">{stats.totalEvents}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#ECFDF5" }}>
              <FileText size={24} style={{ color: "#10B981" }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">진행 중 설문</div>
              <div className="stat-value">{stats.activeSurveys}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#FEF3C7" }}>
              <Users size={24} style={{ color: "#F59E0B" }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">총 응답 수</div>
              <div className="stat-value">{stats.totalResponses}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#FEE2E2" }}>
              <Eye size={24} style={{ color: "#EF4444" }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">총 조회 수</div>
              <div className="stat-value">{stats.totalViews}</div>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h2>빠른 작업</h2>
          <div className="action-grid">
            <button
              className="action-card"
              onClick={() => navigate("/company/event/upload")}
            >
              <Upload size={32} />
              <span>이벤트 등록</span>
            </button>

            <button
              className="action-card"
              onClick={() => navigate("/company/survey/create")}
            >
              <FileText size={32} />
              <span>설문조사 만들기</span>
            </button>

            <button className="action-card">
              <BarChart3 size={32} />
              <span>통계 보기</span>
            </button>

            <button className="action-card">
              <Eye size={32} />
              <span>관람객 화면 미리보기</span>
            </button>
          </div>
        </div>

        <div className="recent-events">
          <h2>최근 이벤트</h2>
          <div className="events-table">
            <table>
              <thead>
                <tr>
                  <th>이벤트명</th>
                  <th>날짜</th>
                  <th>응답 수</th>
                  <th>상태</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="event-name">{event.name}</td>
                    <td>{event.date}</td>
                    <td>{event.responses}명</td>
                    <td>
                      <span
                        className={`badge ${
                          event.status === "active"
                            ? "badge-success"
                            : "badge-warning"
                        }`}
                      >
                        {event.status === "active" ? "진행중" : "종료"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-icon"
                        onClick={() =>
                          navigate(`/company/survey/${event.id}/statistics`)
                        }
                      >
                        <BarChart3 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
