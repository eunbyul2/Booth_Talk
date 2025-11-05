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
      // 실제 API 호출로 토큰 검증
      const response = await fetch(
        `/api/auth/magic-verify?token=${encodeURIComponent(token)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // 로그인 성공 시 토큰과 기업 정보 저장
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("company_token", data.access_token);
        localStorage.setItem("company_id", data.company.id);
        localStorage.setItem("company_name", data.company.name);
        localStorage.setItem("companyId", data.company.id);

        setCompanyName(data.company.name);
        setIsFirstLogin(data.is_first_login || false);
        setStatus("success");

        // 2초 후 이벤트 등록 페이지로 이동
        setTimeout(() => {
          navigate(`/company/dashboard?company_id=${data.company.id}`);
        }, 2000);
      } else {
        setStatus("error");
      }
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
