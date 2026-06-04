import { useState } from "react";
import s from "./RestoreAccountModal.module.css";

const RestoreAccountModal = ({ tokens, onRestore, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleRestore = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users/me/restore", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      const result = await res.json();
      if (result.status !== "success") throw new Error(result.message);
      onRestore(tokens, result.data);
    } catch (err) {
      setError(err.message || "Не удалось восстановить аккаунт");
      setLoading(false);
    }
  };

  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <h2 className={s.title}>Аккаунт удалён</h2>
        <p className={s.text}>
          Ваш аккаунт был удалён, но все данные сохранены. Хотите восстановить его?
        </p>
        {error && <p className={s.error}>{error}</p>}
        <div className={s.actions}>
          <button className={s.cancelBtn} onClick={onCancel} disabled={loading}>
            Выйти
          </button>
          <button className={s.restoreBtn} onClick={handleRestore} disabled={loading}>
            {loading ? "Восстановление..." : "Восстановить"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreAccountModal;
