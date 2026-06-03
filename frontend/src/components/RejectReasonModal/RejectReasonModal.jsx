import { useState } from "react";
import s from "./RejectReasonModal.module.css";

const RejectReasonModal = ({ title, placeholder, onConfirm, onClose }) => {
  const [reason, setReason] = useState("");

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={s.title}>{title}</h2>
        <label className={s.label}>Причина (необязательно)</label>
        <textarea
          className={s.textarea}
          placeholder={placeholder || "Укажите причину..."}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
        />
        <div className={s.actions}>
          <button className={s.cancelBtn} onClick={onClose}>Назад</button>
          <button className={s.confirmBtn} onClick={() => onConfirm(reason)}>Подтвердить</button>
        </div>
      </div>
    </div>
  );
};

export default RejectReasonModal;
