import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import "./Header.css";

export default function Header({ userType, userName }) {
  const navigate = useNavigate();
  const { theme, toggleTheme, isDark } = useTheme();

  const handleLogout = () => {
    if (userType === "company") {
      navigate("/company/login");
    } else if (userType === "admin") {
      navigate("/admin/login");
    } else {
      navigate("/visitor");
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link
          to={
            userType === "company"
              ? "/company/dashboard"
              : userType === "admin"
              ? "/admin/dashboard"
              : "/visitor"
          }
          className="logo"
        >
          <span className="logo-icon">🎪</span>
          <span className="logo-text">전시회 플랫폼</span>
        </Link>

        <div className="header-actions">
          <button onClick={toggleTheme} className="btn-theme-toggle" title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {userName && (
          <div className="header-user">
            <div className="user-info">
              <User size={20} />
              <span>{userName}</span>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              <LogOut size={18} />
              로그아웃
            </button>
          </div>
          )}
        </div>
      </div>
    </header>
  );
}
