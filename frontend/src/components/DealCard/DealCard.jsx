import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import s from "./DealCard.module.css";

const SUPPORT_EMAIL = "mailto:laceebbarffq2d@outlook.com";

const STATUS_LABELS = {
  PENDING: "Ожидает подтверждения",
  AWAITING_PAYMENT: "Ожидает оплаты",
  IN_PROGRESS: "В работе",
  AWAITING_REVIEW: "На проверке",
  REVISION: "На доработку",
  COMPLETED: "Завершено",
  REJECTED: "Отклонено",
};

const TERMINAL = ["COMPLETED", "REJECTED"];

const DealCard = ({ deal, onDealUpdated, onRevision, onRate }) => {
  const { accessToken, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const isClient = deal.clientId === user?.id;
  const isPhotographer = deal.photographerId === user?.id;
  const isActive = !TERMINAL.includes(deal.status);

  const call = async (endpoint, method = "PATCH", body) => {
    setIsLoading(true);
    try {
      const r = await fetch(`/api/deals/${deal.id}/${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        ...(body && { body: JSON.stringify(body) }),
      });
      const data = await r.json();
      if (data.status === "success") onDealUpdated(data.data);
    } finally { setIsLoading(false); }
  };

  const renderActions = () => {
    const btns = [];
    const add = (label, onClick, variant = "primary") =>
      btns.push(<button key={label} className={s[variant]} onClick={onClick} disabled={isLoading}>{label}</button>);

    switch (deal.status) {
      case "PENDING":
        if (isPhotographer) {
          add("Согласиться", () => call("accept"), "primary");
          add("Отказаться", () => call("reject"), "danger");
        }
        if (isClient) {
          add("Отменить", () => call("cancel"), "outline");
        }
        break;

      case "AWAITING_PAYMENT":
        if (isClient && !deal.clientPaid)
          add("Я оплатил(а)", () => call("paid"), "primary");
        if (isPhotographer && !deal.photographerConfirmedPayment)
          add("Оплата получена", () => call("payment-received"), "primary");
        add("Написать в поддержку", () => window.location.href = SUPPORT_EMAIL, "outline");
        break;

      case "IN_PROGRESS":
        if (isPhotographer) add("Работа выполнена", () => call("complete"), "primary");
        add("Написать в поддержку", () => window.location.href = SUPPORT_EMAIL, "outline");
        break;

      case "AWAITING_REVIEW":
        if (isClient) {
          add("Принять работу", () => call("approve"), "primary");
          add("На доработку", () => onRevision(deal), "outline");
        }
        add("Написать в поддержку", () => window.location.href = SUPPORT_EMAIL, "outline");
        break;

      case "REVISION":
        if (isPhotographer) add("Работа выполнена", () => call("complete"), "primary");
        add("Написать в поддержку", () => window.location.href = SUPPORT_EMAIL, "outline");
        break;

      case "COMPLETED":
        if (isClient && deal.rating === null)
          add("Оставить оценку", () => onRate(deal), "primary");
        break;

      default:
        break;
    }

    return btns.length > 0 ? <div className={s.actions}>{btns}</div> : null;
  };

  return (
    <div className={`${s.card} ${!isActive ? s.cardTerminal : ""}`}>
      <div className={s.topRow}>
        <span className={`${s.badge} ${s[`badge_${deal.status}`]}`}>
          {STATUS_LABELS[deal.status]}
        </span>
        {deal.status === "AWAITING_PAYMENT" && (
          <div className={s.paymentStatus}>
            <span className={deal.clientPaid ? s.confirmed : s.pending}>
              Клиент: {deal.clientPaid ? "оплатил ✓" : "ожидает оплаты..."}
            </span>
            <span className={deal.photographerConfirmedPayment ? s.confirmed : s.pending}>
              Исполнитель: {deal.photographerConfirmedPayment ? "подтвердил ✓" : "ожидает..."}
            </span>
          </div>
        )}
      </div>

      <p className={s.conditions}>{deal.conditions}</p>

      {deal.revisions?.[0] && deal.status === "REVISION" && (
        <p className={s.revisionReason}>↩ Причина: {deal.revisions[0].reason}</p>
      )}

      {deal.rating !== null && (
        <div className={s.ratingRow}>
          {"★".repeat(deal.rating)}{"☆".repeat(5 - deal.rating)}
          {deal.ratingComment && <span className={s.ratingComment}> — {deal.ratingComment}</span>}
        </div>
      )}

      {renderActions()}
    </div>
  );
};

export default DealCard;
