import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === "root" && password === "root") {
      navigate("/admin/dashboard");
    } else {
      alert("잘못된 관리자 계정입니다");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon" style={{ background: "#EF4444" }}>
              <Shield size={48} />
            </div>
            <h1>관리자 로그인</h1>
            <p>시스템 관리 페이지</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>아이디</label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="root"
                required
              />
            </div>

            <div className="form-group">
              <label>비밀번호</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="root"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-login">
              로그인
            </button>
          </form>
        </div>

        <div className="login-footer">
          <a href="/visitor">관람객 페이지</a>
          {/* <span>•</span>
          <a href="/company/login">기업 로그인</a> */}
        </div>
      </div>
    </div>
  );
}
