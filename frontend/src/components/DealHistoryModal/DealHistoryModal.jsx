import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import StarRating from "../StarRating/StarRating";
import s from "./DealHistoryModal.module.css";

function fmt(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("ru", {
    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

const DealHistoryModal = ({ dealId, onClose }) => {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!dealId || !accessToken) return;
    fetch(`/api/deals/${dealId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((data) => { if (data.status === "success") setDeal(data.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [dealId, accessToken]);

  if (!deal && !isLoading) return null;

  const companion = deal?.chat?.user1?.id === user?.id ? deal?.chat?.user2 : deal?.chat?.user1;
  const isClient = deal?.clientId === user?.id;

  const timeline = [];
  if (deal) {
    timeline.push({ label: "Предложение о съемке", time: deal.createdAt, note: deal.conditions, isKey: true });

    if (deal.status !== "PENDING") {
      if (deal.status === "REJECTED" && deal.revisions?.length === 0) {
        timeline.push({ label: "Отклонено / отменено", time: deal.updatedAt });
      } else {
        timeline.push({ label: "Принята исполнителем", time: null });
      }
    }

    if (deal.clientPaid) {
      timeline.push({ label: "Клиент подтвердил оплату", time: null });
    }
    if (deal.photographerConfirmedPayment) {
      timeline.push({ label: "Исполнитель подтвердил получение оплаты", time: null });
    }

    for (const rev of (deal.revisions || [])) {
      if (rev.reason?.startsWith("Отказ:") || rev.reason?.startsWith("Отмена:")) {
        timeline.push({ label: rev.reason, time: rev.createdAt });
      } else {
        timeline.push({ label: "Доработка", time: rev.createdAt, note: rev.reason });
      }
    }

    if (deal.status === "COMPLETED") {
      timeline.push({ label: "Сделка завершена", time: deal.updatedAt, isKey: true });
      if (deal.rating) {
        timeline.push({
          label: "Оценка",
          rating: deal.rating,
          time: null,
          note: deal.ratingComment,
        });
      }
    }
    if (deal.status === "REJECTED" && deal.revisions?.length > 0) {
      timeline.push({ label: "Отклонено / отменено", time: deal.updatedAt, isKey: true });
    }
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.header}>
          <div>
            {companion && (
              <div className={s.companion}>
                {companion.avatarUrl && <img src={companion.avatarUrl} className={s.avatar} alt="" />}
                <span className={s.companionName}>{companion.firstName} {companion.lastName}</span>
              </div>
            )}
            <span className={s.roleHint}>{isClient ? "Вы клиент" : "Вы исполнитель"}</span>
          </div>
          <button className={s.closeBtn} onClick={onClose}>&#x2715;</button>
        </div>

        {isLoading ? (
          <div className={s.loading}><div className={s.spinner} /></div>
        ) : (
          <div className={s.timeline}>
            {timeline.map((item, i) => (
              <div key={i} className={`${s.step} ${item.isKey ? s.stepKey : ""}`}>
                <div className={s.stepLeft}>
                  <div className={s.stepDot} />
                  {i < timeline.length - 1 && <div className={s.stepLine} />}
                </div>
                <div className={s.stepContent}>
                  <div className={s.stepLabelRow}>
                    <span className={s.stepLabel}>{item.label}</span>
                    {item.rating && <StarRating rating={item.rating} size={14} />}
                  </div>
                  {item.time && <span className={s.stepTime}>{fmt(item.time)}</span>}
                  {item.note && <p className={s.stepNote}>{item.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={s.footer}>
          <button
            className={s.chatBtn}
            onClick={() => { onClose(); navigate(`/chats/${deal?.chatId}`); }}
          >
            Перейти в чат
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealHistoryModal;
