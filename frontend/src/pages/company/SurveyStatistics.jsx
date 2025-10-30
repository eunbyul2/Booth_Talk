import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Download, ArrowLeft, Users, MessageSquare } from "lucide-react";
import Header from "../../components/Header.jsx";
import "./SurveyStatistics.css";

const COLORS = [
  "#4F46E5",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];

export default function SurveyStatistics() {
  const { surveyId } = useParams();
  const navigate = useNavigate();

  const [stats] = useState({
    survey_info: {
      title: "이벤트 만족도 조사",
      total_responses: 125,
      created_at: "2025-11-10",
    },
    questions: [
      {
        id: 1,
        question_text: "이벤트 전반적인 만족도는?",
        question_type: "rating",
        total_responses: 125,
        distribution: {
          "1점": { count: 5, percentage: 4 },
          "2점": { count: 10, percentage: 8 },
          "3점": { count: 25, percentage: 20 },
          "4점": { count: 45, percentage: 36 },
          "5점": { count: 40, percentage: 32 },
        },
        statistics: {
          average: 3.84,
          min: 1,
          max: 5,
        },
      },
      {
        id: 2,
        question_text: "가장 좋았던 점은?",
        question_type: "checkbox",
        total_responses: 125,
        distribution: {
          "유익한 정보": { count: 85, percentage: 68 },
          "친절한 직원": { count: 72, percentage: 58 },
          "좋은 사은품": { count: 45, percentage: 36 },
          "편리한 위치": { count: 38, percentage: 30 },
        },
      },
      {
        id: 4,
        question_text: "제품 품질 만족도",
        question_type: "radio",
        total_responses: 125,
        distribution: {
          "매우 만족": { count: 52, percentage: 42 },
          만족: { count: 48, percentage: 38 },
          보통: { count: 20, percentage: 16 },
          불만족: { count: 5, percentage: 4 },
        },
        most_selected: {
          label: "매우 만족",
          count: 52,
          percentage: 42,
        },
      },
    ],
  });

  const convertToChartData = (distribution) => {
    return Object.entries(distribution).map(([label, data]) => ({
      name: label,
      value: data.count,
      percentage: data.percentage,
    }));
  };

  return (
    <div className="statistics-page">
      <Header userType="company" userName="ABC Corporation" />

      <div className="statistics-container">
        <div className="statistics-header">
          <button
            className="btn btn-outline"
            onClick={() => navigate("/company/dashboard")}
          >
            <ArrowLeft size={18} />
            돌아가기
          </button>

          <button className="btn btn-primary">
            <Download size={18} />
            보고서 다운로드
          </button>
        </div>

        <div className="survey-info card">
          <h1>{stats.survey_info.title}</h1>
          <div className="info-stats">
            <div className="info-item">
              <Users size={20} />
              <span>총 {stats.survey_info.total_responses}명 응답</span>
            </div>
            <div className="info-item">
              <MessageSquare size={20} />
              <span>{stats.questions.length}개 질문</span>
            </div>
          </div>
        </div>

        <div className="overview-cards">
          <div className="overview-card">
            <div className="card-label">응답률</div>
            <div className="card-value">78%</div>
            <div className="card-change positive">+12% 전주 대비</div>
          </div>

          <div className="overview-card">
            <div className="card-label">평균 만족도</div>
            <div className="card-value">3.84/5</div>
            <div className="card-change positive">+0.3점</div>
          </div>

          <div className="overview-card">
            <div className="card-label">완료율</div>
            <div className="card-value">92%</div>
            <div className="card-change positive">+5%</div>
          </div>
        </div>

        {stats.questions.map((question, index) => (
          <div key={question.id} className="question-stats card">
            <div className="question-header">
              <h3>
                Q{index + 1}. {question.question_text}
              </h3>
              <span className="response-count">
                {question.total_responses}명 응답
              </span>
            </div>

            <div className="chart-container">
              {question.question_type === "radio" ||
              question.question_type === "checkbox" ? (
                <div className="chart-row">
                  <div className="chart-box">
                    <h4>분포 차트</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={convertToChartData(question.distribution)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) =>
                            `${name} (${percentage}%)`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {convertToChartData(question.distribution).map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            )
                          )}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-box">
                    <h4>막대 그래프</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={convertToChartData(question.distribution)}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#4F46E5" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : question.question_type === "rating" ? (
                <div className="chart-box full">
                  <h4>별점 분포</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={convertToChartData(question.distribution)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="rating-stats">
                    <div className="stat-item">
                      <span className="stat-label">평균</span>
                      <span className="stat-value">
                        {question.statistics.average}점
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">최고</span>
                      <span className="stat-value">
                        {question.statistics.max}점
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">최저</span>
                      <span className="stat-value">
                        {question.statistics.min}점
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <table className="stats-table">
              <thead>
                <tr>
                  <th>선택지</th>
                  <th>응답 수</th>
                  <th>비율</th>
                  <th>그래프</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(question.distribution).map(([label, data]) => (
                  <tr key={label}>
                    <td className="label-cell">{label}</td>
                    <td>{data.count}명</td>
                    <td>{data.percentage}%</td>
                    <td>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${data.percentage}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {question.most_selected && (
              <div className="insight">
                <span className="insight-icon">💡</span>
                <span>
                  가장 많이 선택된 항목:{" "}
                  <strong>{question.most_selected.label}</strong>(
                  {question.most_selected.percentage}%)
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
