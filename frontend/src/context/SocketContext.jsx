import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { accessToken, isAuth, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const activeChatIdRef = useRef(null);

  const refreshUnread = useCallback(async () => {
    if (!accessToken) return;
    try {
      const r = await fetch("/api/chats", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await r.json();
      if (data.status === "success") {
        const total = data.data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadTotal(total);
      }
    } catch {}
  }, [accessToken]);

  const refreshUnreadNotifications = useCallback(async () => {
    if (!accessToken) return;
    try {
      const r = await fetch("/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await r.json();
      if (data.status === "success") setUnreadNotifications(data.data.count);
    } catch {}
  }, [accessToken]);

  useEffect(() => {
    if (!isAuth || !accessToken) {
      setUnreadTotal(0);
      setUnreadNotifications(0);
      return;
    }
    refreshUnread();
    refreshUnreadNotifications();
  }, [isAuth, accessToken, refreshUnread, refreshUnreadNotifications]);

  // Socket lifecycle tied to auth token
  useEffect(() => {
    if (!isAuth || !accessToken) {
      setSocket(null);
      return;
    }

    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.DEV ? "http://localhost:3000" : "/");

    const s = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    setSocket(s);

    s.on("connect", () => {
      setIsConnected(true);
      console.log("[Socket] connected via", s.io.engine.transport.name);
    });

    s.on("disconnect", () => {
      setIsConnected(false);
    });

    s.on("new-message", ({ message }) => {
      if (user?.id && message.senderId !== user.id && activeChatIdRef.current !== message.chatId) {
        setUnreadTotal((prev) => prev + 1);
      }
    });

    s.on("new-notification", () => {
      setUnreadNotifications((prev) => prev + 1);
    });

    s.on("connect_error", (err) => {
      console.error("[Socket] connect error:", err.message);
      setIsConnected(false);
    });

    return () => {
      s.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuth, accessToken]);

  const setActiveChatId = useCallback((id) => {
    activeChatIdRef.current = id;
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, unreadTotal, refreshUnread, setActiveChatId, unreadNotifications, refreshUnreadNotifications }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
