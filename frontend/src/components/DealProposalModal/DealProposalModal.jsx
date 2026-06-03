import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import s from "./DealProposalModal.module.css";

const DealProposalModal = ({ chatId, onClose, onCreated }) => {
  const { accessToken } = useAuth();
  const [conditions, setConditions] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!conditions.trim()) { setError("Опишите условия съёмки"); return; }
    setIsLoading(true);
    setError("");
    try {
      const r = await fetch("/api/deals", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, conditions: conditions.trim() }),
      });
      const data = await r.json();
      if (data.status === "success") {
        onCreated(data.data);
        onClose();
      } else {
        setError(data.message || "Ошибка");
      }
    } catch { setError("Не удалось создать сделку"); }
    finally { setIsLoading(false); }
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.header}>
          <span className={s.title}>Предложить съемку</span>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className={s.label}>Условия съемки</label>
          <textarea
            className={s.textarea}
            placeholder="Опишите дату, место, формат съемки, пожелания..."
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={5}
            maxLength={1000}
          />
          <div className={s.counter}>{conditions.length}/1000</div>

          {error && <p className={s.error}>{error}</p>}

          <div className={s.actions}>
            <button type="button" className={s.cancelBtn} onClick={onClose}>Отмена</button>
            <button type="submit" className={s.submitBtn} disabled={isLoading}>
              {isLoading ? "Отправляем..." : "Предложить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DealProposalModal;
