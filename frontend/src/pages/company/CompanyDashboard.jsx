import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { getCompanyDashboard, getCompanyEvents } from "../../apiClient";

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [companyId, setCompanyId] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 로그인 시 전달된 company_id를 우선 사용하고, 없으면 저장된 값을 복원합니다.
    const queryId = searchParams.get("company_id");
    let resolvedId = queryId;

    if (!resolvedId) {
      try {
        resolvedId = window.localStorage.getItem("companyId");
      } catch (storageError) {
        console.warn("영구 저장소 접근에 실패했습니다.", storageError);
      }
    } else {
      try {
        window.localStorage.setItem("companyId", queryId);
      } catch (storageError) {
        console.warn("기업 ID를 저장하지 못했습니다.", storageError);
      }
    }

    if (!resolvedId) {
      setError("기업 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
      setLoading(false);
      return;
    }

    setCompanyId(resolvedId);
  }, [searchParams]);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const [dashboardData, eventsData] = await Promise.all([
          getCompanyDashboard(companyId),
          getCompanyEvents(companyId),
        ]);

        if (!active) return;

        setCompanyInfo(dashboardData?.company ?? null);

        if (dashboardData?.stats) {
          setStats({
            totalEvents: dashboardData.stats.total_events ?? 0,
            activeSurveys: dashboardData.stats.active_surveys ?? 0,
            totalResponses: dashboardData.stats.total_responses ?? 0,
            totalViews: dashboardData.stats.total_views ?? 0,
            totalLikes: dashboardData.stats.total_likes ?? 0,
          });
        } else {
          setStats({
            totalEvents: 0,
            activeSurveys: 0,
            totalResponses: 0,
            totalViews: 0,
            totalLikes: 0,
          });
        }

        const transformedEvents = (dashboardData?.recent_events ?? []).map(
          (event) => ({
            id: event.id,
            name: event.name,
            startDate: event.start_date,
            endDate: event.end_date,
            responses: event.response_count ?? 0,
            status: event.status ?? "ended",
          })
        );

        if (transformedEvents.length > 0) {
          setRecentEvents(transformedEvents);
        } else if (Array.isArray(eventsData)) {
          // 백엔드에서 최근 이벤트를 주지 않는 경우 전체 목록 일부를 보여줍니다.
          const fallback = eventsData.slice(0, 5).map((event) => ({
            id: event.id,
            name: event.event_name,
            startDate: event.start_date,
            endDate: event.end_date,
            responses: event.current_responses ?? 0,
            status: event.is_active ? "active" : "ended",
          }));
          setRecentEvents(fallback);
        } else {
          console.warn("기업 이벤트 목록이 배열 형태가 아닙니다.", eventsData);
          setRecentEvents([]);
        }
      } catch (err) {
        if (!active) return;
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "대시보드 데이터를 불러오는 중 문제가 발생했습니다."
        );
        setStats(null);
        setRecentEvents([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [companyId]);

  const statusMeta = useMemo(
    () => ({
      ongoing: { label: "진행중", className: "badge-success" },
      active: { label: "진행중", className: "badge-success" },
      upcoming: { label: "예정", className: "badge-primary" },
      ended: { label: "종료", className: "badge-warning" },
    }),
    []
  );

  const formatDateRange = (start, end) => {
    if (!start) return "일정 미정";
    const startDate = new Date(start);
    if (!end || start === end) {
      return startDate.toISOString().slice(0, 10);
    }
    const endDate = new Date(end);
    return `${startDate.toISOString().slice(0, 10)} ~ ${endDate
      .toISOString()
      .slice(0, 10)}`;
  };

  const buildCompanyPath = (path) => {
    if (!companyId) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}company_id=${companyId}`;
  };

  return (
    <div className="dashboard-page">
      <Header userType="company" userName={companyInfo?.name} />

      <div className="dashboard-container">
        {loading && (
          <div className="loading">
            <div className="spinner" />
          </div>
        )}

        {!loading && error && <div className="dashboard-error">{error}</div>}

        <div className="dashboard-header">
          <div>
            <h1>대시보드</h1>
            <p>이벤트와 설문조사를 관리하세요</p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => navigate(buildCompanyPath("/company/event/upload"))}
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
              <div className="stat-value">
                {stats ? stats.totalEvents : "--"}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#ECFDF5" }}>
              <FileText size={24} style={{ color: "#10B981" }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">진행 중 설문</div>
              <div className="stat-value">
                {stats ? stats.activeSurveys : "--"}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#FEF3C7" }}>
              <Users size={24} style={{ color: "#F59E0B" }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">총 응답 수</div>
              <div className="stat-value">
                {stats ? stats.totalResponses : "--"}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#FEE2E2" }}>
              <Eye size={24} style={{ color: "#EF4444" }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">총 조회 수</div>
              <div className="stat-value">
                {stats ? stats.totalViews : "--"}
              </div>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h2>빠른 작업</h2>
          <div className="action-grid">
            <button
              className="action-card"
              onClick={() =>
                navigate(buildCompanyPath("/company/event/upload"))
              }
            >
              <Upload size={32} />
              <span>이벤트 등록</span>
            </button>

            <button
              className="action-card"
              onClick={() =>
                navigate(buildCompanyPath("/company/survey/create"))
              }
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
                {recentEvents.map((event) => {
                  const status = statusMeta[event.status] || statusMeta.ended;
                  return (
                    <tr key={event.id}>
                      <td className="event-name">{event.name}</td>
                      <td>{formatDateRange(event.startDate, event.endDate)}</td>
                      <td>{event.responses}명</td>
                      <td>
                        <span className={`badge ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-icon"
                          onClick={() =>
                            navigate(
                              buildCompanyPath(
                                `/company/survey/${event.id}/statistics`
                              )
                            )
                          }
                        >
                          <BarChart3 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && !error && recentEvents.length === 0 && (
              <div className="empty-state">최근 등록된 이벤트가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
