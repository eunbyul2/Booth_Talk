import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Copy,
  Send,
  Check,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import Header from "../../components/Header.jsx";
import "./CreateCompanyAccount.css";

export default function CreateCompanyAccount() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState({
    link: false,
    username: false,
    password: false,
  });

  const handleCreate = async () => {
    if (!companyName.trim()) {
      alert("회사명을 입력하세요");
      return;
    }

    setIsLoading(true);

    try {
      // 🔄 실제 API 호출로 변경
      const response = await fetch("/api/admin/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TODO: Authorization 헤더 추가 필요
        },
        body: JSON.stringify({
          company_name: companyName,
          email: `contact@${companyName.toLowerCase().replace(/\s+/g, "")}.com`, // 임시 이메일
        }),
      });

      if (!response.ok) {
        throw new Error("기업 생성에 실패했습니다");
      }

      const responseData = await response.json();
      setResult(responseData);
      setCompanyName("");
    } catch (error) {
      alert("오류가 발생했습니다: " + error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied({ ...copied, [type]: true });
      setTimeout(() => {
        setCopied({ ...copied, [type]: false });
      }, 2000);
    });
  };

  const handleSendLink = () => {
    alert(
      "기업에게 매직 링크를 전송했습니다!\n(실제로는 이메일/SMS/카카오톡으로 전송)"
    );
  };

  return (
    <div className="create-company-page">
      <Header userType="admin" userName="관리자" />

      <div className="create-company-container">
        <div className="page-header">
          <button
            className="btn-back"
            onClick={() => navigate("/admin/dashboard")}
          >
            <ArrowLeft size={20} />
            대시보드로
          </button>

          <div className="header-content">
            <div className="header-icon">
              <Building2 size={32} />
            </div>
            <div>
              <h1>기업 계정 생성</h1>
              <p>기업 정보를 입력하고 매직 링크를 발급하세요</p>
            </div>
          </div>
        </div>

        <div className="form-section card">
          <h3>회사 정보</h3>
          <div className="input-group">
            <label>회사명 *</label>
            <input
              type="text"
              className="input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="예: 테크코퍼레이션"
              disabled={isLoading}
              onKeyPress={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleCreate}
            disabled={isLoading || !companyName.trim()}
          >
            {isLoading ? (
              <>
                <div className="spinner-small"></div>
                생성 중...
              </>
            ) : (
              <>
                <Building2 size={20} />
                계정 생성
              </>
            )}
          </button>
        </div>

        {result && (
          <div className="result-section">
            <div className="success-banner">
              <Check size={24} />
              <span>계정이 성공적으로 생성되었습니다!</span>
            </div>

            <div className="card result-card">
              <div className="result-header">
                <h3>{result.company_name}</h3>
                <span className="badge badge-success">활성</span>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <label>아이디</label>
                  <div className="copy-field">
                    <code>{result.username}</code>
                    <button
                      className="btn-copy"
                      onClick={() =>
                        copyToClipboard(result.username, "username")
                      }
                    >
                      {copied.username ? (
                        <Check size={16} />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="info-item">
                  <label>임시 비밀번호</label>
                  <div className="copy-field">
                    <code>{result.temp_password}</code>
                    <button
                      className="btn-copy"
                      onClick={() =>
                        copyToClipboard(result.temp_password, "password")
                      }
                    >
                      {copied.password ? (
                        <Check size={16} />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="divider"></div>

              <div className="magic-link-section">
                <div className="section-header">
                  <h4>🔗 매직 링크</h4>
                  <span className="expiry-badge">
                    {new Date(result.expires_at).toLocaleDateString()} 까지 유효
                  </span>
                </div>

                <div className="link-display">
                  <div className="link-text">{result.magic_link}</div>
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(result.magic_link, "link")}
                  >
                    {copied.link ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>

                <div className="link-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => window.open(result.magic_link, "_blank")}
                  >
                    <ExternalLink size={18} />
                    링크 테스트
                  </button>

                  <button className="btn btn-primary" onClick={handleSendLink}>
                    <Send size={18} />
                    기업에게 전송
                  </button>
                </div>
              </div>

              <div className="notice-box">
                <span className="notice-icon">💡</span>
                <div>
                  <strong>안내사항</strong>
                  <ul>
                    <li>매직 링크를 기업 담당자에게 전송하세요</li>
                    <li>링크 클릭만으로 자동 로그인됩니다</li>
                    <li>아이디/비밀번호는 백업용으로 보관하세요</li>
                  </ul>
                </div>
              </div>
            </div>

            <button className="btn btn-outline" onClick={() => setResult(null)}>
              새 계정 생성
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
