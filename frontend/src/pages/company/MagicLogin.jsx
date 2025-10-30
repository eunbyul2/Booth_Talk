import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import "./MagicLogin.css";

export default function MagicLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [companyName, setCompanyName] = useState("");
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      return;
    }

    authenticateWithToken(token);
  }, [searchParams]);

  const authenticateWithToken = async (token) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockData = {
        access_token: "mock_token_123",
        company_name: "TechCorp",
        company_id: 1,
        is_first_login: true,
      };

      localStorage.setItem("access_token", mockData.access_token);
      localStorage.setItem("company_id", mockData.company_id);
      localStorage.setItem("company_name", mockData.company_name);

      setCompanyName(mockData.company_name);
      setIsFirstLogin(mockData.is_first_login);
      setStatus("success");

      setTimeout(() => {
        navigate("/company/event/upload");
      }, 2000);
    } catch (error) {
      console.error("Authentication error:", error);
      setStatus("error");
    }
  };

  return (
    <div className="magic-login-page">
      <div className="magic-login-container">
        {status === "loading" && (
          <div className="status-box">
            <div className="status-icon loading">
              <Loader size={64} className="spin-animation" />
            </div>
            <h2>로그인 중...</h2>
            <p>잠시만 기다려주세요</p>
          </div>
        )}

        {status === "success" && (
          <div className="status-box">
            <div className="status-icon success">
              <CheckCircle size={64} />
            </div>
            <h2>로그인 성공!</h2>
            <div className="company-info">
              <span className="company-badge">{companyName}</span>
            </div>
            {isFirstLogin && (
              <div className="first-login-notice">
                <span className="notice-icon">🎉</span>
                <span>처음 방문하셨네요! 환영합니다</span>
              </div>
            )}
            <p className="redirect-text">이벤트 등록 페이지로 이동합니다...</p>
          </div>
        )}

        {status === "error" && (
          <div className="status-box">
            <div className="status-icon error">
              <XCircle size={64} />
            </div>
            <h2>유효하지 않은 링크</h2>
            <p>링크가 만료되었거나 이미 사용되었습니다</p>

            <div className="error-actions">
              <button
                className="btn btn-outline"
                onClick={() => navigate("/company/login")}
              >
                일반 로그인
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/visitor")}
              >
                홈으로 가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
