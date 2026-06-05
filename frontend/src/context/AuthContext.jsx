import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

const decodeJwt = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem("accessToken"),
  );

  const login = (tokens, userData) => {
    localStorage.setItem("accessToken",  tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setAccessToken(tokens.accessToken);
    setUser(userData);
  };

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setAccessToken(null);
    setUser(null);
  }, []);

  const updateUser = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const refreshAccessToken = useCallback(async () => {
    const stored = localStorage.getItem("refreshToken");
    if (!stored) return false;
    try {
      const res  = await fetch("/api/auth/refresh", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ refreshToken: stored }),
      });
      const data = await res.json();
      if (data.status === "success") {
        localStorage.setItem("accessToken",  data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken);
        setAccessToken(data.data.accessToken);
        return true;
      }
    } catch {}
    return false;
  }, []);

  useEffect(() => {
    const checkAndRefresh = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const payload = decodeJwt(token);
      if (!payload) return;
      const expiresIn = payload.exp * 1000 - Date.now();
      if (expiresIn < 5 * 60 * 1000) {
        const ok = await refreshAccessToken();
        if (!ok) logout();
      }
    };

    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, 55 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshAccessToken, logout]);

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
        logout,
        updateUser,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
