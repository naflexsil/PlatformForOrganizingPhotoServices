import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import MainPage from "./pages/MainPage/MainPage";
import PhotographerProfile from "./pages/PhotographerProfile/PhotographerProfile";
import UserProfile from "./pages/UserProfile/UserProfile";
import AuthModal from "./components/AuthModal/AuthModal";
import RoleModal from "./components/RoleModal/RoleModal";
import RegistrationFormModal from "./components/RegistrationFormModal/RegistrationFormModal";
import PublicProfile from "./pages/PublicProfile/PublicProfile";
import PortfolioPage from "./pages/Portfolio/PortfolioPage";
import PortfolioFolderPage from "./pages/Portfolio/PortfolioFolderPage";
import InspirationPage from "./pages/InspirationPage/InspirationPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

const MyProfile = () => {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "PHOTOGRAPHER") {
    return <PhotographerProfile isMyProfile={true} />;
  }
  return <UserProfile isMyProfile={true} />;
};

const AppContent = () => {
  const navigate = useNavigate();
  const { isAuth, login, updateUser, logout } = useAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [pendingTokens, setPendingTokens] = useState(null);
  const [pendingVkUser, setPendingVkUser] = useState(null);

  const handleLoginSuccess = (tokens, user) => {
    login(tokens, user);
    setShowAuthModal(false);
    navigate(`/profile`);
  };

  const handleNeedRegistration = (tokens, user) => {
    login(tokens, user);
    setShowAuthModal(false);
    setPendingTokens(tokens);
    setPendingVkUser(user);
    setShowRoleModal(true);
  };

  const handleRoleSelected = (role) => {
    setSelectedRole(role);
    setShowRoleModal(false);
    setShowRegForm(true);
  };

  const cancelPendingRegistration = async (tokens) => {
    if (!tokens) return;
    try {
      await fetch("/api/auth/cancel-registration", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
    } catch {}
    logout();
  };

  const handleRoleModalClose = async () => {
    await cancelPendingRegistration(pendingTokens);
    setShowRoleModal(false);
    setPendingTokens(null);
    setPendingVkUser(null);
  };

  const handleRegComplete = (updatedUser) => {
    updateUser(updatedUser);
    setShowRegForm(false);
    setSelectedRole(null);
    navigate(`/profile`);
  };

  const handleRegFormClose = async () => {
    await cancelPendingRegistration(pendingTokens);
    setShowRegForm(false);
    setSelectedRole(null);
  };

  return (
    <>
      <Header
        isAuthenticated={isAuth}
        onLoginClick={() => setShowAuthModal(true)}
      />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/feed" element={<InspirationPage />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/:tag/portfolio/:folderId" element={<PortfolioFolderPage />} />
        <Route path="/:tag/portfolio" element={<PortfolioPage />} />
        <Route path="/:handle" element={<PublicProfile />} />
      </Routes>
      <Footer />

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
          onNeedRegistration={handleNeedRegistration}
        />
      )}

      {showRoleModal && (
        <RoleModal
          onClose={handleRoleModalClose}
          onRoleSelected={handleRoleSelected}
        />
      )}

      {showRegForm && selectedRole && (
        <RegistrationFormModal
          role={selectedRole}
          vkUser={pendingVkUser}
          onClose={handleRegFormClose}
          onComplete={handleRegComplete}
        />
      )}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
