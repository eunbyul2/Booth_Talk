import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import Header from "../../components/Header.jsx";
import "./SurveyCreate.css";

const QUESTION_TYPES = [
  { value: "text", label: "주관식 (단답형)", icon: "📝" },
  { value: "textarea", label: "주관식 (장문형)", icon: "📄" },
  { value: "radio", label: "객관식 (단일 선택)", icon: "⭕" },
  { value: "checkbox", label: "객관식 (다중 선택)", icon: "☑️" },
  { value: "dropdown", label: "드롭다운", icon: "🔽" },
  { value: "rating", label: "별점 (1-5점)", icon: "⭐" },
  { value: "scale", label: "척도 (1-10점)", icon: "📊" },
  { value: "toggle", label: "토글 (예/아니오)", icon: "🔘" },
];

export default function SurveyCreate() {
  const navigate = useNavigate();
  const [surveyTitle, setSurveyTitle] = useState("");
  const [questions, setQuestions] = useState([]);

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      question_text: "",
      question_type: "text",
      options: { choices: [] },
      is_required: false,
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const addChoice = (questionId) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newChoice = {
            value: q.options.choices.length + 1,
            label: "",
          };
          return {
            ...q,
            options: {
              ...q.options,
              choices: [...q.options.choices, newChoice],
            },
          };
        }
        return q;
      })
    );
  };

  const updateChoice = (questionId, choiceIndex, label) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newChoices = [...q.options.choices];
          newChoices[choiceIndex].label = label;
          return {
            ...q,
            options: { ...q.options, choices: newChoices },
          };
        }
        return q;
      })
    );
  };

  const removeChoice = (questionId, choiceIndex) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newChoices = q.options.choices.filter(
            (_, idx) => idx !== choiceIndex
          );
          return {
            ...q,
            options: { ...q.options, choices: newChoices },
          };
        }
        return q;
      })
    );
  };

  const handleSubmit = () => {
    if (!surveyTitle.trim()) {
      alert("설문조사 제목을 입력하세요");
      return;
    }
    if (questions.length === 0) {
      alert("최소 1개 이상의 질문을 추가하세요");
      return;
    }

    console.log("Submit survey:", { title: surveyTitle, questions });
    alert("설문조사가 생성되었습니다!");
    navigate("/company/dashboard");
  };

  return (
    <div className="survey-create-page">
      <Header userType="company" userName="ABC Corporation" />

      <div className="survey-container">
        <div className="survey-header">
          <h1>설문조사 만들기</h1>
          <p>질문을 추가하고 유형을 선택하세요</p>
        </div>

        <div className="survey-title-section card">
          <label>설문조사 제목 *</label>
          <input
            type="text"
            className="input survey-title-input"
            value={surveyTitle}
            onChange={(e) => setSurveyTitle(e.target.value)}
            placeholder="예: 이벤트 만족도 조사"
          />
        </div>

        <div className="standard-questions card">
          <h3>📋 기본 질문 (자동 포함)</h3>
          <div className="standard-list">
            <div className="standard-item">
              <span className="q-number">1</span>
              <span>이벤트 전반적인 만족도는? (별점 1-5)</span>
            </div>
            <div className="standard-item">
              <span className="q-number">2</span>
              <span>가장 좋았던 점은? (다중 선택)</span>
            </div>
            <div className="standard-item">
              <span className="q-number">3</span>
              <span>개선이 필요한 점은? (주관식)</span>
            </div>
          </div>
        </div>

        <div className="custom-questions">
          <div className="section-header">
            <h3>➕ 추가 질문</h3>
            <button className="btn btn-primary" onClick={addQuestion}>
              <Plus size={18} />
              질문 추가
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="empty-state card">
              <p>추가 질문이 없습니다</p>
              <button className="btn btn-outline" onClick={addQuestion}>
                첫 질문 만들기
              </button>
            </div>
          ) : (
            <div className="questions-list">
              {questions.map((question, qIndex) => (
                <div key={question.id} className="question-card card">
                  <div className="question-header">
                    <div className="question-number">
                      <GripVertical size={18} />
                      <span>질문 {qIndex + 4}</span>
                    </div>
                    <button
                      className="btn-icon-danger"
                      onClick={() => removeQuestion(question.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="form-group">
                    <label>질문 유형</label>
                    <select
                      className="input"
                      value={question.question_type}
                      onChange={(e) =>
                        updateQuestion(
                          question.id,
                          "question_type",
                          e.target.value
                        )
                      }
                    >
                      {QUESTION_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>질문 내용 *</label>
                    <input
                      type="text"
                      className="input"
                      value={question.question_text}
                      onChange={(e) =>
                        updateQuestion(
                          question.id,
                          "question_text",
                          e.target.value
                        )
                      }
                      placeholder="질문을 입력하세요"
                    />
                  </div>

                  {["radio", "checkbox", "dropdown"].includes(
                    question.question_type
                  ) && (
                    <div className="choices-section">
                      <label>선택지</label>
                      {question.options.choices.map((choice, idx) => (
                        <div key={idx} className="choice-input-group">
                          <span className="choice-number">{idx + 1}</span>
                          <input
                            type="text"
                            className="input"
                            value={choice.label}
                            onChange={(e) =>
                              updateChoice(question.id, idx, e.target.value)
                            }
                            placeholder={`선택지 ${idx + 1}`}
                          />
                          <button
                            className="btn-icon-danger"
                            onClick={() => removeChoice(question.id, idx)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => addChoice(question.id)}
                      >
                        <Plus size={16} />
                        선택지 추가
                      </button>
                    </div>
                  )}

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={question.is_required}
                      onChange={(e) =>
                        updateQuestion(
                          question.id,
                          "is_required",
                          e.target.checked
                        )
                      }
                    />
                    <span>필수 질문</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="survey-actions">
          <button
            className="btn btn-outline"
            onClick={() => navigate("/company/dashboard")}
          >
            취소
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            <Save size={18} />
            설문조사 생성
          </button>
        </div>
      </div>
    </div>
  );
}
