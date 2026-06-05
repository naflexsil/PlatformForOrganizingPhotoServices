import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import defaultAvatar from "../../assets/images/default_avatar.png";
import s from "./NotificationsModal.module.css";

const TABS = [
  { id: "orders",        label: "Заказы" },
  { id: "subscriptions", label: "Подписки" },
  { id: "likes",         label: "Лайки" },
  { id: "events",        label: "События" },
  { id: "system",        label: "Системные" },
];

const DEAL_LABELS = {
  DEAL_PROPOSED:          "предложил(-а) фотосессию",
  DEAL_ACCEPTED:          "принял(-а) предложение",
  DEAL_REJECTED:          "отклонил(-а) предложение",
  DEAL_COMPLETED:         "завершил(-а) фотосессию",
  DEAL_REVISION_REQUESTED:"отправил(-а) на доработку",
};

const timeAgo = (date) => {
  const diff  = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return "только что";
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 7)  return `${days} дн. назад`;
  return new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const NotificationItem = ({ notif, onRead, onNavigate }) => {
  const { type, fromUser, post, photo, deal, metadata, isRead, createdAt } = notif;

  const handleClick = () => {
    onRead(notif.id);
    if (type === "DEAL_PROPOSED" || type === "DEAL_ACCEPTED" || type === "DEAL_REJECTED" ||
        type === "DEAL_COMPLETED" || type === "DEAL_REVISION_REQUESTED") {
      if (deal?.chatId) onNavigate(`/chats/${deal.chatId}`);
    } else if (type === "NEW_SUBSCRIBER" && fromUser?.tag) {
      onNavigate(`/@${fromUser.tag}`);
    } else if (type === "FRIEND_DEAL_COMPLETED" && metadata?.photographerId) {
    } else if (type === "LIKE_POST" && fromUser?.tag) {
      onNavigate(`/@${fromUser.tag}`);
    } else if (type === "LIKE_PHOTO" && fromUser?.tag) {
      onNavigate(`/@${fromUser.tag}`);
    }
  };

  const avatar = fromUser?.avatarUrl || defaultAvatar;

  const renderText = () => {
    const name = fromUser ? `${fromUser.firstName} ${fromUser.lastName}` : "Пользователь";
    if (DEAL_LABELS[type]) return <><b>{name}</b> {DEAL_LABELS[type]}</>;
    if (type === "NEW_SUBSCRIBER") return <><b>{name}</b> подписался(-ась) на вас</>;
    if (type === "LIKE_POST")  return <><b>{name}</b> лайкнул(-а) ваш пост</>;
    if (type === "LIKE_PHOTO") return <><b>{name}</b> лайкнул(-а) вашу фотографию</>;
    if (type === "FRIEND_DEAL_COMPLETED") {
      return <><b>{name}</b> завершил(-а) фотосессию</>;
    }
    if (type === "SYSTEM_REPLY") return "Ответ от поддержки";
    return "";
  };

  const renderThumbnail = () => {
    if (type === "LIKE_POST" && post?.images?.[0]) {
      return <img src={post.images[0]} alt="" className={s.thumb} />;
    }
    if (type === "LIKE_PHOTO" && photo?.urlPreview) {
      return <img src={photo.urlPreview} alt="" className={s.thumb} />;
    }
    return null;
  };

  return (
    <div className={`${s.item} ${!isRead ? s.itemUnread : ""}`} onClick={handleClick}>
      {!isRead && <span className={s.dot} />}
      {type === "SYSTEM_REPLY" ? (
        <div className={s.systemIcon}>🔔</div>
      ) : (
        <img src={avatar} alt="" className={s.avatar} />
      )}
      <div className={s.itemBody}>
        <p className={s.itemText}>{renderText()}</p>
        {type === "SYSTEM_REPLY" && metadata && (
          <div className={s.systemBlock}>
            <p className={s.systemQuestion}><b>Ваш вопрос:</b> {metadata.ticketMessage}</p>
            <p className={s.systemAnswer}><b>Ответ поддержки:</b> {metadata.adminReply}</p>
          </div>
        )}
        {type === "FRIEND_DEAL_COMPLETED" && deal && (
          <p className={s.itemSub}>{deal.conditions}</p>
        )}
        <span className={s.time}>{timeAgo(createdAt)}</span>
      </div>
      {renderThumbnail()}
    </div>
  );
};

const NotificationsModal = ({ onClose }) => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]         = useState("orders");
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef    = useRef(1);
  const loadingRef = useRef(false);
  const sentinelRef = useRef(null);

  const load = useCallback(async (pageNum, currentTab) => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res  = await fetch(`/api/notifications?tab=${currentTab}&page=${pageNum}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.status === "success") {
        setItems((prev) => pageNum === 1 ? data.data : [...prev, ...data.data]);
        setHasMore(data.pagination.hasMore);
        pageRef.current = pageNum + 1;
      }
    } catch {} finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [accessToken, hasMore]);

  useEffect(() => {
    setItems([]);
    setHasMore(true);
    pageRef.current = 1;
    load(1, tab);
  }, [tab]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !loadingRef.current) load(pageRef.current, tab); },
      { threshold: 0.1 },
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [load, tab]);

  const markAllRead = async () => {
    await fetch(`/api/notifications/read-all?tab=${tab}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markOneRead = async (id) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleNavigate = (path) => {
    onClose();
    navigate(path);
  };

  const hasUnread = items.some((n) => !n.isRead);

  return (
    <div className={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.modal}>
        <div className={s.header}>
          <h2 className={s.title}>Уведомления</h2>
          <div className={s.headerActions}>
            {hasUnread && (
              <button className={s.readAllBtn} onClick={markAllRead}>
                Прочитать все
              </button>
            )}
            <button className={s.closeBtn} onClick={onClose}>×</button>
          </div>
        </div>

        <div className={s.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${s.tab} ${tab === t.id ? s.tabActive : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={s.list}>
          {!loading && items.length === 0 && (
            <div className={s.empty}>Пока ничего нет</div>
          )}
          {items.map((n) => (
            <NotificationItem
              key={n.id}
              notif={n}
              onRead={markOneRead}
              onNavigate={handleNavigate}
            />
          ))}
          <div ref={sentinelRef} />
          {loading && <div className={s.spinner} />}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;
