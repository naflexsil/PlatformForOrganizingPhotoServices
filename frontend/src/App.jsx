import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import MainPage from "./pages/MainPage/MainPage";
import PhotographerProfile from "./pages/PhotographerProfile/PhotographerProfile";
import AuthModal from "./components/AuthModal/AuthModal";
import RoleModal from "./components/RoleModal/RoleModal";
import RegistrationFormModal from "./components/RegistrationFormModal/RegistrationFormModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

const AppContent = () => {
  const navigate = useNavigate();
  const { isAuth, login, updateUser } = useAuth();

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

  const handleRoleModalClose = () => {
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

  const handleRegFormClose = () => {
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
        <Route
          path="/profile"
          element={<PhotographerProfile isMyProfile={true} />}
        />
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
