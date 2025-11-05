import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Company Pages
import CompanyLogin from "./pages/company/CompanyLogin.jsx"; // ✅ 기업 로그인 활성화
import MagicLogin from "./pages/company/MagicLogin.jsx";
import CompanyDashboard from "./pages/company/CompanyDashboard.jsx";
import EventUpload from "./pages/company/EventUpload.jsx";
import SurveyCreate from "./pages/company/SurveyCreate.jsx";
import SurveyStatistics from "./pages/company/SurveyStatistics.jsx";

// Visitor Pages
import VisitorHome from "./pages/visitor/VisitorHome.jsx";
import EventList from "./pages/visitor/EventList.jsx";
import EventDetail from "./pages/visitor/EventDetail.jsx";
import SurveyResponse from "./pages/visitor/SurveyResponse.jsx";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import CreateCompanyAccount from "./pages/admin/CreateCompanyAccount.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Navigate to="/visitor" />} />

        {/* Company Routes - 일반 로그인과 매직링크 모두 지원 */}
        <Route path="/company/login" element={<CompanyLogin />} />
        <Route path="/company/magic-login" element={<MagicLogin />} />
        <Route path="/company/dashboard" element={<CompanyDashboard />} />
        <Route path="/company/event/upload" element={<EventUpload />} />
        <Route path="/company/survey/create" element={<SurveyCreate />} />
        <Route
          path="/company/survey/:surveyId/statistics"
          element={<SurveyStatistics />}
        />

        {/* Visitor Routes */}
        <Route path="/visitor" element={<VisitorHome />} />
        <Route path="/visitor/events" element={<EventList />} />
        <Route path="/visitor/event/:eventId" element={<EventDetail />} />
        <Route path="/visitor/survey/:surveyId" element={<SurveyResponse />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route
          path="/admin/create-company"
          element={<CreateCompanyAccount />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
