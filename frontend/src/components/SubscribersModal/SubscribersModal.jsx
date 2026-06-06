import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import defaultAvatar from "../../assets/images/default_avatar.webp";
import s from "./SubscribersModal.module.css";

const SubscribersModal = ({ userId, type, onClose }) => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const url =
      type === "subscribers"
        ? `/api/subscriptions/${userId}/subscribers`
        : `/api/subscriptions/${userId}/subscriptions`;
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    fetch(url, { headers })
      .then((r) => r.json())
      .then((data) => { if (data.status === "success") setList(data.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [userId, type, accessToken]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const filterList = (arr) => {
    if (!search.trim()) return arr;
    const q = search.toLowerCase();
    return arr.filter(
      (u) =>
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.tag?.toLowerCase().includes(q)
    );
  };

  const allCount = list.length;
  const friendsCount = list.filter((u) => u.isFriend).length;
  const displayed =
    activeTab === "all" ? filterList(list) : filterList(list.filter((u) => u.isFriend));

  const title = type === "subscribers" ? "Подписчики" : "Подписки";
  const tab1Label =
    type === "subscribers"
      ? `Подписчики (${allCount})`
      : `Подписки (${allCount})`;

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.header}>
          <span className={s.title}>{title}</span>
          <button className={s.closeBtn} onClick={onClose}>&#x2715;</button>
        </div>

        <input
          className={s.search}
          placeholder="Поиск по имени или @тегу"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <div className={s.tabs}>
          <button
            className={activeTab === "all" ? s.tabActive : s.tab}
            onClick={() => setActiveTab("all")}
          >
            {tab1Label}
          </button>
          <button
            className={activeTab === "friends" ? s.tabActive : s.tab}
            onClick={() => setActiveTab("friends")}
          >
            {`Друзья (${friendsCount})`}
          </button>
        </div>

        <div className={s.list}>
          {isLoading ? (
            <div className={s.loadingWrap}><div className={s.spinner} /></div>
          ) : displayed.length === 0 ? (
            <div className={s.empty}>
              {search ? "Никого не найдено" : "Список пуст"}
            </div>
          ) : (
            displayed.map((u) => (
              <div
                key={u.id}
                className={s.userItem}
                onClick={() => { onClose(); navigate(`/@${u.tag}`); }}
              >
                <img
                  src={u.avatarUrl || defaultAvatar}
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

export default SubscribersModal;
