import { useNavigate } from "react-router-dom";
import { Map, Sun, Moon, Settings } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import "./FloatingButtons.css";

export default function FloatingButtons({ showMapButton = false, onMapOpen }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Theme Toggle - 좌측 하단 위 */}
      <button
        onClick={toggleTheme}
        className="btn-floating btn-theme-toggle"
        title={`${theme === 'dark' ? '라이트' : '다크'} 모드로 전환`}
      >
        {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      {/* Map Toggle - 좌측 하단 (VisitorHome만) */}
      {showMapButton && (
        <button
          onClick={onMapOpen}
          className="btn-floating btn-map-toggle"
          title="지도 보기"
        >
          <Map size={24} />
        </button>
      )}

      {/* Admin - 우측 하단 */}
      <button
        onClick={() => navigate('/admin/login')}
        className="btn-floating btn-admin"
        title="관리자 페이지"
      >
        <Settings size={24} />
      </button>
    </>
  );
}
