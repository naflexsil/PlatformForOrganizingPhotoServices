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
import RestoreAccountModal from "./components/RestoreAccountModal/RestoreAccountModal";
import NotificationsModal from "./components/NotificationsModal/NotificationsModal";
import AdminPage from "./pages/AdminPage/AdminPage";
import PublicProfile from "./pages/PublicProfile/PublicProfile";
import PortfolioPage from "./pages/Portfolio/PortfolioPage";
import PortfolioFolderPage from "./pages/Portfolio/PortfolioFolderPage";
import InspirationPage from "./pages/InspirationPage/InspirationPage";
import SearchPage from "./pages/SearchPage/SearchPage";
import ChatsPage from "./pages/ChatsPage/ChatsPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { SocketProvider } from "./context/SocketContext";

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
  const { isAuth, login, updateUser, logout, accessToken } = useAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [pendingTokens, setPendingTokens] = useState(null);
  const [pendingVkUser, setPendingVkUser] = useState(null);
  const [showRestoreModal, setShowRestoreModal]         = useState(false);
  const [restoreTokens, setRestoreTokens]               = useState(null);
  const [showNotifications, setShowNotifications]       = useState(false);
  const [unreadNotifications, setUnreadNotifications]   = useState(0);

  const fetchUnreadCount = async () => {
    if (!accessToken) return;
    try {
      const res  = await fetch("/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.status === "success") setUnreadNotifications(data.data.count);
    } catch {}
  };

  const handleLoginSuccess = (tokens, user) => {
    login(tokens, user);
    setShowAuthModal(false);
    navigate(`/profile`);
  };

  const handleNeedRestore = (tokens) => {
    setShowAuthModal(false);
    setRestoreTokens(tokens);
    setShowRestoreModal(true);
  };

  const handleRestored = (tokens, restoredUser) => {
    login(tokens, restoredUser);
    setShowRestoreModal(false);
    setRestoreTokens(null);
    navigate("/profile");
  };

  const handleRestoreCancel = () => {
    setShowRestoreModal(false);
    setRestoreTokens(null);
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
        onNotificationsClick={() => { setShowNotifications(true); fetchUnreadCount(); }}
        unreadNotifications={unreadNotifications}
      />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/feed" element={<InspirationPage />} />
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/chats/:chatId" element={<ChatsPage />} />
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
          onNeedRestore={handleNeedRestore}
        />
      )}

      {showNotifications && (
        <NotificationsModal
          onClose={() => { setShowNotifications(false); fetchUnreadCount(); }}
        />
      )}

      {showRestoreModal && (
        <RestoreAccountModal
          tokens={restoreTokens}
          onRestore={handleRestored}
          onCancel={handleRestoreCancel}
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
          <SocketProvider>
            <AppContent />
          </SocketProvider>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
