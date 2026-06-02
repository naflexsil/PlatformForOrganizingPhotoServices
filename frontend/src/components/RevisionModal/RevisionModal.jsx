import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import s from "./RevisionModal.module.css";

const RevisionModal = ({ deal, onClose, onRevisionSent }) => {
  const { accessToken } = useAuth();
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const r = await fetch(`/api/deals/${deal.id}/revision`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || "Причина не указана" }),
      });
      const data = await r.json();
      if (data.status === "success") { onRevisionSent(data.data); onClose(); }
    } finally { setIsLoading(false); }
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={s.title}>Отправить на доработку</h2>
        <form onSubmit={handleSubmit}>
          <label className={s.label}>Что нужно исправить?</label>
          <textarea
            className={s.textarea}
            placeholder="Опишите, что именно требует доработки..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <div className={s.actions}>
            <button type="button" className={s.cancelBtn} onClick={onClose}>Отмена</button>
            <button type="submit" className={s.submitBtn} disabled={isLoading}>
              {isLoading ? "Отправляем..." : "Отправить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RevisionModal;
