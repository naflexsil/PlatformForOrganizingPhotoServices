import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem("accessToken"),
  );

  const login = (tokens, userData) => {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setAccessToken(tokens.accessToken);
    setUser(userData);
  };

  const updateUser = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setAccessToken(null);
    setUser(null);
  };

  const isRegistrationComplete =
    !!user && !!user.tag && !user.tag.startsWith("vk_");

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuth: !!accessToken,
        isRegistrationComplete,
        login,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
