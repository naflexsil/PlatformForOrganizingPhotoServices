import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import s from "./NewChatModal.module.css";

const TABS = [
  { key: "friends", label: "Друзья" },
  { key: "subscriptions", label: "Подписки" },
  { key: "subscribers", label: "Подписчики" },
];

const NewChatModal = ({ onClose }) => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("friends");
  const [search, setSearch] = useState("");
  const [subscriptions, setSubscriptions] = useState([]); 
  const [subscribers, setSubscribers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [r1, r2] = await Promise.all([
          fetch("/api/subscriptions/me", { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch("/api/subscriptions/me/subscribers", { headers: { Authorization: `Bearer ${accessToken}` } }),
        ]);
        const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
        if (d1.status === "success") setSubscriptions(d1.data);
        if (d2.status === "success") setSubscribers(d2.data);
      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [accessToken]);

  const filterUsers = (list) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (u) =>
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.tag?.toLowerCase().includes(q)
    );
  };

  const getList = () => {
    if (activeTab === "friends") return filterUsers(subscriptions.filter((u) => u.isFriend));
    if (activeTab === "subscriptions") return filterUsers(subscriptions);
    return filterUsers(subscribers);
  };

  const handleStartChat = async (userId) => {
    if (starting) return;
    setStarting(true);
    try {
      const r = await fetch("/api/chats/start", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companionId: userId }),
      });
      const data = await r.json();
      if (data.status === "success") {
        onClose();
        navigate(`/chats/${data.data.id}`);
      }
    } catch {
    } finally {
      setStarting(false);
    }
  };

  const list = getList();

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.header}>
          <span className={s.title}>Новый чат</span>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <input
          className={s.search}
          placeholder="Поиск по имени или @тегу"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <div className={s.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={activeTab === t.key ? s.tabActive : s.tab}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={s.list}>
          {isLoading ? (
            <div className={s.loadingWrap}><div className={s.spinner} /></div>
          ) : list.length === 0 ? (
            <div className={s.empty}>
              {search ? "Никого не найдено" : "Список пуст"}
            </div>
          ) : (
            list.map((u) => (
              <div key={u.id} className={s.userItem} onClick={() => handleStartChat(u.id)}>
                <img
                  src={u.avatarUrl || "/image_placeholder.svg"}
                  alt=""
                  className={s.avatar}
                />
                <div className={s.userInfo}>
                  <span className={s.userName}>{u.firstName} {u.lastName}</span>
                  <span className={s.userTag}>@{u.tag}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
