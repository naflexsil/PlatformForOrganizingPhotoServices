import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import s from "./DealsTab.module.css";

const STATUS_LABELS = {
  PENDING: "Ожидает подтверждения",
  AWAITING_PAYMENT: "Ожидает оплаты",
  IN_PROGRESS: "В работе",
  AWAITING_REVIEW: "На проверке",
  REVISION: "На доработку",
  COMPLETED: "Завершено",
  REJECTED: "Отклонено",
};

const ACTIVE = ["PENDING", "AWAITING_PAYMENT", "IN_PROGRESS", "AWAITING_REVIEW", "REVISION"];

const DealsTab = () => {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/deals", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((data) => { if (data.status === "success") setDeals(data.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const active = deals.filter((d) => ACTIVE.includes(d.status));
  const finished = deals.filter((d) => !ACTIVE.includes(d.status));

  const DealItem = ({ deal }) => {
    const companion =
      deal.chat?.user1?.id === user?.id ? deal.chat?.user2 : deal.chat?.user1;
    const isClient = deal.clientId === user?.id;

    return (
      <div
        className={`${s.item} ${!ACTIVE.includes(deal.status) ? s.itemFinished : ""}`}
        onClick={() => navigate(`/chats/${deal.chatId}`)}
      >
        <div className={s.itemTop}>
          {companion?.avatarUrl && (
            <img src={companion.avatarUrl} className={s.avatar} alt="" />
          )}
          <div className={s.itemInfo}>
            <span className={s.name}>{companion?.firstName} {companion?.lastName}</span>
            <span className={s.role}>{isClient ? "Вы — клиент" : "Вы — исполнитель"}</span>
          </div>
          <span className={`${s.badge} ${s[`badge_${deal.status}`]}`}>
            {STATUS_LABELS[deal.status]}
          </span>
        </div>
        <p className={s.conditions}>{deal.conditions.slice(0, 80)}{deal.conditions.length > 80 ? "..." : ""}</p>
        {deal.rating !== null && (
          <span className={s.stars}>{"★".repeat(deal.rating)}{"☆".repeat(5 - deal.rating)}</span>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={s.list}>
        {[1, 2].map((i) => <div key={i} className={s.skeleton} />)}
      </div>
    );
  }

  if (deals.length === 0) {
    return <div className={s.empty}>Сделок пока нет</div>;
  }

  return (
    <div className={s.list}>
      {active.length > 0 && (
        <>
          <div className={s.section}>Активные</div>
          {active.map((d) => <DealItem key={d.id} deal={d} />)}
        </>
      )}
      {finished.length > 0 && (
        <>
          <div className={s.section}>Завершённые</div>
          {finished.map((d) => <DealItem key={d.id} deal={d} />)}
        </>
      )}
    </div>
  );
};

export default DealsTab;
