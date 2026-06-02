import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import MessageBubble from "../MessageBubble/MessageBubble";
import MessageInput from "../MessageInput/MessageInput";
import closeIcon from "../../assets/icons/carousel_close.svg";
import s from "./ChatWindow.module.css";

function formatLastSeen(companion) {
  if (!companion) return "";
  if (companion.isOnline) return "В сети";
  if (!companion.lastSeenAt) return "Не в сети";

  const seen = new Date(companion.lastSeenAt);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const seenDay = new Date(seen.getFullYear(), seen.getMonth(), seen.getDate());
  const timeStr = seen.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });

  if (seenDay >= todayStart) return `Был(а) в сети в ${timeStr}`;
  if (seenDay >= yesterdayStart) return `Был(а) в сети вчера в ${timeStr}`;
  return `Был(а) в сети ${seen.toLocaleDateString("ru", { day: "numeric", month: "long" })}`;
}

const ChatWindow = ({ chatId }) => {
  const { accessToken, user } = useAuth();
  const { socket, isConnected, setActiveChatId, refreshUnread } = useSocket();
  const navigate = useNavigate();

  const [companion, setCompanion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typingVisible, setTypingVisible] = useState(false);
  const typingTimerRef = useRef(null);
  const containerRef = useRef(null);
  const initialScrollDoneRef = useRef(false);

  // Register this chat as active (suppresses unread increment)
  useEffect(() => {
    setActiveChatId(chatId);
    return () => setActiveChatId(null);
  }, [chatId, setActiveChatId]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!accessToken || !chatId) return;
    setIsLoading(true);
    initialScrollDoneRef.current = false;
    try {
      const r = await fetch(`/api/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await r.json();
      if (data.status === "success") {
        setMessages(data.data);
        // Identify companion from first message or we need chat info
        const other = data.data.find((m) => m.senderId !== user?.id);
        if (other?.sender) setCompanion(other.sender);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, chatId, user?.id]);

  // Load chat info (for companion when there are no messages yet)
  const loadChatInfo = useCallback(async () => {
    if (!accessToken) return;
    try {
      const r = await fetch("/api/chats", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await r.json();
      if (data.status === "success") {
        const chat = data.data.find((c) => c.id === chatId);
        if (chat?.companion) setCompanion(chat.companion);
      }
    } catch {}
  }, [accessToken, chatId]);

  useEffect(() => {
    loadMessages();
    loadChatInfo();
  }, [loadMessages, loadChatInfo]);

  // Mark messages as read
  useEffect(() => {
    if (!socket || !chatId) return;
    socket.emit("mark-read", { chatId });
    refreshUnread();
  }, [socket, chatId, messages.length, refreshUnread]);

  // Scroll container to bottom (never touches document scroll)
  const scrollToBottom = (smooth = false) => {
    const c = containerRef.current;
    if (!c) return;
    if (smooth) {
      c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
    } else {
      c.scrollTop = c.scrollHeight;
    }
  };

  // Scroll to bottom on initial load
  useEffect(() => {
    if (isLoading || initialScrollDoneRef.current) return;
    initialScrollDoneRef.current = true;
    scrollToBottom(false);
  }, [isLoading]);

  // Auto-scroll when new message arrives (smooth, only if near bottom or own message)
  useEffect(() => {
    if (!initialScrollDoneRef.current || messages.length === 0) return;
    const c = containerRef.current;
    if (!c) return;
    const { scrollTop, scrollHeight, clientHeight } = c;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 160;
    const lastMsg = messages[messages.length - 1];
    if (isNearBottom || lastMsg?.senderId === user?.id) {
      scrollToBottom(true);
    }
  }, [messages.length]);

  // Socket: receive new messages + typing + online status
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ message }) => {
      if (message.chatId !== chatId) return;
      setMessages((prev) => [...prev, message]);
      socket.emit("mark-read", { chatId });
    };

    const handleTyping = ({ chatId: tid, userId }) => {
      if (tid !== chatId || userId === user?.id) return;
      setTypingVisible(true);
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setTypingVisible(false), 3000);
    };

    const handleStopTyping = ({ chatId: tid }) => {
      if (tid !== chatId) return;
      setTypingVisible(false);
      clearTimeout(typingTimerRef.current);
    };

    const handleOnline = ({ userId }) => {
      setCompanion((prev) => (prev?.id === userId ? { ...prev, isOnline: true } : prev));
    };

    const handleOffline = ({ userId, lastSeenAt }) => {
      setCompanion((prev) =>
        prev?.id === userId ? { ...prev, isOnline: false, lastSeenAt } : prev
      );
    };

    socket.on("new-message", handleNewMessage);
    socket.on("user-typing", handleTyping);
    socket.on("user-stop-typing", handleStopTyping);
    socket.on("user-online", handleOnline);
    socket.on("user-offline", handleOffline);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("user-typing", handleTyping);
      socket.off("user-stop-typing", handleStopTyping);
      socket.off("user-online", handleOnline);
      socket.off("user-offline", handleOffline);
      clearTimeout(typingTimerRef.current);
    };
  }, [socket, chatId, user?.id]);

  // Group consecutive messages by sender
  const groupedMessages = useMemo(
    () =>
      messages.map((msg, i) => ({
        ...msg,
        isFirstInGroup: i === 0 || messages[i - 1].senderId !== msg.senderId,
      })),
    [messages]
  );

  return (
    <div className={s.window}>
      {/* Header */}
      <div className={s.header}>
        <button className={s.closeBtn} onClick={() => navigate("/chats")} title="Закрыть">
          <img src={closeIcon} alt="Закрыть" className={s.closeBtnIcon} />
        </button>
        <div className={s.companionInfo}>
          {companion?.avatarUrl && (
            <img src={companion.avatarUrl} className={s.companionAvatar} alt="" />
          )}
          <div className={s.companionTexts}>
            <span className={s.companionName}>
              {companion?.firstName} {companion?.lastName}
            </span>
            <span className={`${s.status} ${companion?.isOnline ? s.statusOnline : s.statusOffline}`}>
              {formatLastSeen(companion)}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={s.messages} ref={containerRef}>
        {isLoading ? (
          <div className={s.loadingWrap}>
            <div className={s.spinner} />
          </div>
        ) : (
          <>
            {groupedMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === user?.id}
                isFirstInGroup={msg.isFirstInGroup}
                companion={companion}
              />
            ))}
            {typingVisible && (
              <div className={s.typingIndicator}>
                <span className={s.typingDot} />
                <span className={s.typingDot} />
                <span className={s.typingDot} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput chatId={chatId} socketReady={isConnected} />
    </div>
  );
};

export default ChatWindow;
