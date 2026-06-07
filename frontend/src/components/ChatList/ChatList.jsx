import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import ChatItem from "../ChatItem/ChatItem";
import s from "./ChatList.module.css";

const ChatList = ({ activeChatId }) => {
  const { accessToken } = useAuth();
  const { socket } = useSocket();
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadChats = useCallback(async () => {
    if (!accessToken) return;
    try {
      const r = await fetch("/api/chats", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await r.json();
      if (data.status === "success") setChats(data.data);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ message }) => {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === message.chatId);
        if (idx === -1) {
          loadChats();
          return prev;
        }
        const updated = [...prev];
        const chat = { ...updated[idx] };
        chat.lastMessage = message;
        if (message.chatId !== activeChatId) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }
        updated.splice(idx, 1);
        return [chat, ...updated]; 
      });
    };

    const handleMessagesRead = ({ chatId }) => {
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
      );
    };

    socket.on("new-message", handleNewMessage);
    socket.on("messages-read", handleMessagesRead);
    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("messages-read", handleMessagesRead);
    };
  }, [socket, activeChatId, loadChats]);

  useEffect(() => {
    if (!socket) return;

    const handleOnline = ({ userId }) => {
      setChats((prev) =>
        prev.map((c) =>
          c.companion?.id === userId
            ? { ...c, companion: { ...c.companion, isOnline: true } }
            : c
        )
      );
    };

    const handleOffline = ({ userId, lastSeenAt }) => {
      setChats((prev) =>
        prev.map((c) =>
          c.companion?.id === userId
            ? { ...c, companion: { ...c.companion, isOnline: false, lastSeenAt } }
            : c
        )
      );
    };

    socket.on("user-online", handleOnline);
    socket.on("user-offline", handleOffline);
    return () => {
      socket.off("user-online", handleOnline);
      socket.off("user-offline", handleOffline);
    };
  }, [socket]);

  if (isLoading) {
    return (
      <div className={s.list}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={s.skeleton} />
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return <div className={s.empty}>Чатов пока нет</div>;
  }

  return (
    <div className={s.list}>
      {chats.map((chat) => (
        <ChatItem key={chat.id} chat={chat} isActive={chat.id === activeChatId} />
      ))}
    </div>
  );
};

export default ChatList;
