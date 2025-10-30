import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, ArrowLeft } from "lucide-react";
import "./SurveyResponse.css";

export default function SurveyResponse() {
  const { surveyId } = useParams();
  const navigate = useNavigate();

  const [answers, setAnswers] = useState({});
  const [userInfo, setUserInfo] = useState({
    name: "",
    affiliation: "개인",
    company: "",
    phone: "",
    email: "",
    privacyConsent: false,
  });

  const survey = {
    id: surveyId,
    title: "이벤트 만족도 조사",
    standardQuestions: [
      { id: 1, text: "이벤트 전반적인 만족도는?", type: "rating" },
      {
        id: 2,
        text: "가장 좋았던 점은?",
        type: "checkbox",
        choices: [
          { value: 1, label: "유익한 정보" },
          { value: 2, label: "친절한 직원" },
          { value: 3, label: "좋은 사은품" },
          { value: 4, label: "편리한 위치" },
        ],
      },
      { id: 3, text: "개선이 필요한 점은?", type: "textarea" },
    ],
    customQuestions: [
      {
        id: 4,
        text: "제품 품질 만족도",
        type: "radio",
        choices: [
          { value: 1, label: "매우 만족" },
          { value: 2, label: "만족" },
          { value: 3, label: "보통" },
          { value: 4, label: "불만족" },
        ],
      },
    ],
  };

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleCheckbox = (questionId, value) => {
    const current = answers[questionId] || [];
    if (current.includes(value)) {
      handleAnswer(
        questionId,
        current.filter((v) => v !== value)
      );
    } else {
      handleAnswer(questionId, [...current, value]);
    }
  };

  const handleSubmit = () => {
    if (!userInfo.privacyConsent && !userInfo.name) {
      alert("개인정보 동의 또는 정보 입력이 필요합니다");
      return;
    }

    console.log("Submit survey:", { userInfo, answers });
    alert("설문이 제출되었습니다. 감사합니다!");
    navigate("/visitor/events");
  };

  return (
    <div className="survey-response-page">
      <div className="survey-header">
        <div className="container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            돌아가기
          </button>
          <h1>{survey.title}</h1>
        </div>
      </div>

      <div className="survey-container container">
        <div className="card user-info-section">
          <h3>응답자 정보</h3>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={userInfo.privacyConsent}
              onChange={(e) =>
                setUserInfo({ ...userInfo, privacyConsent: e.target.checked })
              }
            />
            <span>개인정보 수집 및 이용 동의</span>
          </label>

          {userInfo.privacyConsent && (
            <div className="user-form">
              <input
                type="text"
                className="input"
                placeholder="이름"
                value={userInfo.name}
                onChange={(e) =>
                  setUserInfo({ ...userInfo, name: e.target.value })
                }
              />

              <select
                className="input"
                value={userInfo.affiliation}
                onChange={(e) =>
                  setUserInfo({ ...userInfo, affiliation: e.target.value })
                }
              >
                <option value="개인">개인</option>
                <option value="회사">회사</option>
              </select>

              {userInfo.affiliation === "회사" && (
                <input
                  type="text"
                  className="input"
                  placeholder="회사명"
                  value={userInfo.company}
                  onChange={(e) =>
                    setUserInfo({ ...userInfo, company: e.target.value })
                  }
                />
              )}

              <input
                type="tel"
                className="input"
                placeholder="연락처"
                value={userInfo.phone}
                onChange={(e) =>
                  setUserInfo({ ...userInfo, phone: e.target.value })
                }
              />

              <input
                type="email"
                className="input"
                placeholder="이메일"
                value={userInfo.email}
                onChange={(e) =>
                  setUserInfo({ ...userInfo, email: e.target.value })
                }
              />
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">📋 기본 질문</h3>
          {survey.standardQuestions.map((q, idx) => (
            <div key={q.id} className="question-box">
              <div className="question-number">Q{idx + 1}</div>
              <div className="question-text">{q.text}</div>

              {q.type === "rating" && (
                <div className="rating-group">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className={`star-btn ${
                        answers[q.id] >= star ? "active" : ""
                      }`}
                      onClick={() => handleAnswer(q.id, star)}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              )}

              {q.type === "checkbox" && (
                <div className="checkbox-group">
                  {q.choices.map((choice) => (
                    <label key={choice.value} className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={(answers[q.id] || []).includes(choice.value)}
                        onChange={() => handleCheckbox(q.id, choice.value)}
                      />
                      <span>{choice.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "textarea" && (
                <textarea
                  className="input"
                  rows="4"
                  placeholder="자유롭게 의견을 작성해주세요"
                  value={answers[q.id] || ""}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="section-title">➕ 추가 질문</h3>
          {survey.customQuestions.map((q, idx) => (
            <div key={q.id} className="question-box">
              <div className="question-number">
                Q{survey.standardQuestions.length + idx + 1}
              </div>
              <div className="question-text">{q.text}</div>

              {q.type === "radio" && (
                <div className="radio-group">
                  {q.choices.map((choice) => (
                    <label key={choice.value} className="radio-option">
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        checked={answers[q.id] === choice.value}
                        onChange={() => handleAnswer(q.id, choice.value)}
                      />
                      <span>{choice.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-submit" onClick={handleSubmit}>
          <Send size={20} />
          제출하기
        </button>
      </div>
    </div>
  );
}
