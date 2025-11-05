import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Lock } from "lucide-react";
import "./CompanyLogin.css";

export default function CompanyLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/company/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 로그인 성공 시 토큰을 localStorage에 저장
        localStorage.setItem("company_token", data.access_token);
        localStorage.setItem("company_id", data.company_id);
        localStorage.setItem("company_name", data.company_name);

        // 기업 대시보드로 이동
        navigate("/company/dashboard");
      } else {
        setError(data.detail || "로그인에 실패했습니다.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon">
              <Building2 size={48} />
            </div>
            <h1>기업 로그인</h1>
            <p>전시회 이벤트 관리 플랫폼</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {error && (
              <div
                className="error-message"
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group">
              <label>아이디</label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력하세요"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label>비밀번호</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <span>자동 로그인</span>
              </label>

              <a href="#" className="forgot-password">
                비밀번호 찾기
              </a>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-login"
              disabled={isLoading}
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </button>

            <div className="register-link">
              계정이 없으신가요? <a href="#">회원가입</a>
            </div>
          </form>
        </div>

        <div className="login-footer">
          <a href="/visitor">관람객으로 둘러보기</a>
          <span>•</span>
          <a href="/admin/login">관리자 로그인</a>
        </div>
      </div>
    </div>
  );
}
