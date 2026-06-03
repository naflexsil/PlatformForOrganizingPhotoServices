import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import AcceptDealModal from "../AcceptDealModal/AcceptDealModal";
import RejectReasonModal from "../RejectReasonModal/RejectReasonModal";
import SupportModal from "../SupportModal/SupportModal";
import s from "./DealCard.module.css";

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
const MAX_CONDITIONS = 160;

const DealCard = ({ deal, onDealUpdated, onRevision, onRate }) => {
  const { accessToken, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [rejectConfig, setRejectConfig] = useState(null);

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

  const triggerReject = (endpoint, title, placeholder) => {
    setRejectConfig({ endpoint, title, placeholder });
    setShowRejectModal(true);
  };

  const handleRejectConfirm = (reason) => {
    setShowRejectModal(false);
    call(rejectConfig.endpoint, "PATCH", { reason });
  };

  const add = (label, onClick, variant = "primary") => ({ label, onClick, variant });

  const getButtons = () => {
    const btns = [];

    switch (deal.status) {
      case "PENDING":
        if (isPhotographer) {
          btns.push(add("Согласиться", () => setShowAcceptModal(true), "primary"));
          btns.push(add("Отказаться", () => triggerReject("reject", "Причина отказа", "Почему вы отказываетесь от сделки?"), "danger"));
        }
        if (isClient) {
          btns.push(add("Отменить", () => triggerReject("cancel", "Причина отмены", "Почему вы отменяете сделку?"), "outline"));
        }
        break;

      case "AWAITING_PAYMENT":
        if (isClient && !deal.clientPaid)
          btns.push(add("Я оплатил(а)", () => call("paid"), "primary"));
        if (isPhotographer && deal.clientPaid && !deal.photographerConfirmedPayment)
          btns.push(add("Оплата получена", () => call("payment-received"), "primary"));
        if (isPhotographer && !deal.clientPaid)
          btns.push({ label: "Ожидает оплаты от клиента...", onClick: null, variant: "info" });
        btns.push(add("Написать в поддержку", () => setShowSupportModal(true), "outline"));
        break;

      case "IN_PROGRESS":
        if (isPhotographer) btns.push(add("Работа выполнена", () => call("complete"), "primary"));
        btns.push(add("Написать в поддержку", () => setShowSupportModal(true), "outline"));
        break;

      case "AWAITING_REVIEW":
        if (isClient) {
          btns.push(add("Принять работу", () => call("approve"), "primary"));
          btns.push(add("На доработку", () => onRevision(deal), "outline"));
        }
        btns.push(add("Написать в поддержку", () => setShowSupportModal(true), "outline"));
        break;

      case "REVISION":
        if (isPhotographer) btns.push(add("Работа выполнена", () => call("complete"), "primary"));
        btns.push(add("Написать в поддержку", () => setShowSupportModal(true), "outline"));
        break;

      case "COMPLETED":
        if (isClient && deal.rating === null)
          btns.push(add("Оставить оценку", () => onRate(deal), "primary"));
        break;

      default:
        break;
    }

    return btns;
  };

  const buttons = getButtons();
  const isLong = deal.conditions.length > MAX_CONDITIONS;
  const displayText = isLong && !showFullText
    ? deal.conditions.slice(0, MAX_CONDITIONS) + "..."
    : deal.conditions;

  return (
    <>
      <div className={`${s.card} ${!isActive ? s.cardTerminal : ""}`}>
        <div className={s.topRow}>
          <span className={`${s.badge} ${s[`badge_${deal.status}`]}`}>
            {STATUS_LABELS[deal.status]}
          </span>
          {deal.status === "AWAITING_PAYMENT" && (
            <div className={s.paymentStatus}>
              <span className={deal.clientPaid ? s.confirmed : s.pending}>
                Клиент: {deal.clientPaid ? "оплатил" : "не оплатил"}
              </span>
              <span className={deal.photographerConfirmedPayment ? s.confirmed : s.pending}>
                Исполнитель: {deal.photographerConfirmedPayment ? "подтвердил" : "ожидает"}
              </span>
            </div>
          )}
        </div>

        <p className={s.conditions}>{displayText}</p>
        {isLong && (
          <button className={s.moreBtn} onClick={() => setShowFullText((v) => !v)}>
            {showFullText ? "Свернуть" : "Подробнее"}
          </button>
        )}

        {deal.revisions?.[deal.revisions.length - 1] && deal.status === "REVISION" && (
          <p className={s.revisionReason}>
            Причина доработки: {deal.revisions[deal.revisions.length - 1].reason}
          </p>
        )}

        {deal.rating !== null && (
          <div className={s.ratingRow}>
            {"★".repeat(deal.rating)}{"☆".repeat(5 - deal.rating)}
            {deal.ratingComment && <span className={s.ratingComment}> {deal.ratingComment}</span>}
          </div>
        )}

        {buttons.length > 0 && (
          <div className={s.actions}>
            {buttons.map((btn) => btn.variant === "info" ? (
              <span key={btn.label} className={s.infoText}>{btn.label}</span>
            ) : (
              <button
                key={btn.label}
                className={s[btn.variant]}
                onClick={btn.onClick}
                disabled={isLoading || !btn.onClick}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {showAcceptModal && (
        <AcceptDealModal
          onAccept={() => { setShowAcceptModal(false); call("accept"); }}
          onClose={() => setShowAcceptModal(false)}
        />
      )}

      {showRejectModal && rejectConfig && (
        <RejectReasonModal
          title={rejectConfig.title}
          placeholder={rejectConfig.placeholder}
          onConfirm={handleRejectConfirm}
          onClose={() => setShowRejectModal(false)}
        />
      )}

      {showSupportModal && (
        <SupportModal
          dealId={deal.id}
          chatId={deal.chatId}
          onClose={() => setShowSupportModal(false)}
        />
      )}
    </>
  );
};

export default DealCard;
