import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import s from "./ChatItem.module.css";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDay.getTime() === today.getTime()) {
    return date.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  }
  if (msgDay.getTime() === yesterday.getTime()) return "Вчера";
  return date.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

function getMessagePreview(msg, myId) {
  if (!msg) return "Нет сообщений";
  const prefix = msg.senderId === myId ? "Вы: " : "";
  if (msg.attachmentType === "IMAGE") return `${prefix}Фото`;
  if (msg.attachmentType === "FILE") return `${prefix}Файл`;
  return `${prefix}${msg.text || ""}`;
}

const ChatItem = ({ chat, isActive }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { companion, lastMessage, unreadCount } = chat;

  return (
    <div
      className={`${s.item} ${isActive ? s.active : ""}`}
      onClick={() => navigate(`/chats/${chat.id}`)}
    >
      <div className={s.avatarWrap}>
        <img
          src={companion?.avatarUrl || "/image_placeholder.svg"}
          alt={companion?.firstName}
          className={s.avatar}
        />
        {companion?.isOnline && <span className={s.onlineDot} />}
      </div>

      <div className={s.info}>
        <div className={s.topRow}>
          <span className={s.name}>
            {companion?.firstName} {companion?.lastName}
          </span>
          <span className={s.date}>{formatDate(lastMessage?.createdAt || chat.updatedAt)}</span>
        </div>
        <div className={s.bottomRow}>
          <span className={s.preview}>
            {getMessagePreview(lastMessage, user?.id)}
          </span>
          {unreadCount > 0 && (
            <span className={s.unreadDot} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatItem;
