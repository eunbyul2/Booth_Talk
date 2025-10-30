import { Link, useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import "./Header.css";

export default function Header({ userType, userName }) {
  const navigate = useNavigate();

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
    </header>
  );
}
