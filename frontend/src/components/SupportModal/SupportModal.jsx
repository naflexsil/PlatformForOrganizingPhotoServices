import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import s from "./SupportModal.module.css";

const SupportModal = ({ dealId, chatId, onClose }) => {
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsLoading(true);
    try {
      const r = await fetch("/api/support", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: message.trim(), dealId, chatId }),
      });
      const data = await r.json();
      if (data.status === "success") {
        onClose();
        showToast("Спасибо за обращение! Мы рассмотрим вашу заявку как можно скорее", "success");
      } else {
        showToast("Не удалось отправить обращение", "error");
      }
    } catch {
      showToast("Ошибка соединения", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.header}>
          <h2 className={s.title}>Написать в поддержку</h2>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <p className={s.hint}>
          Опишите проблему подробно. Мы ответим в ближайшее время.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            className={s.textarea}
            placeholder="Опишите вашу проблему или вопрос..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            maxLength={2000}
            autoFocus
          />
          <div className={s.counter}>{message.length}/2000</div>

          <div className={s.actions}>
            <button type="button" className={s.cancelBtn} onClick={onClose}>
              Отмена
            </button>
            <button
              type="submit"
              className={s.submitBtn}
              disabled={!message.trim() || isLoading}
            >
              {isLoading ? "Отправляем..." : "Отправить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupportModal;
