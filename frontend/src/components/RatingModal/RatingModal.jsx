import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import s from "./RatingModal.module.css";

const RatingModal = ({ deal, companionName, onClose, onRated }) => {
  const { accessToken } = useAuth();
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!stars) return;
    setIsLoading(true);
    try {
      const r = await fetch(`/api/deals/${deal.id}/rating`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rating: stars, ratingComment: comment.trim() || undefined }),
      });
      const data = await r.json();
      if (data.status === "success") { onRated(data.data); onClose(); }
    } finally { setIsLoading(false); }
  };

  const displayStars = hovered || stars;

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={s.title}>Оцените работу</h2>
        {companionName && <p className={s.subtitle}>Исполнитель: {companionName}</p>}

        <div className={s.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`${s.star} ${n <= displayStars ? s.starFilled : ""}`}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setStars(n)}
            >★</button>
          ))}
        </div>
        {stars > 0 && (
          <p className={s.starLabel}>
            {["", "Плохо", "Неплохо", "Нормально", "Хорошо", "Отлично"][stars]}
          </p>
        )}

        <textarea
          className={s.textarea}
          placeholder="Комментарий (необязательно)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />

        <div className={s.actions}>
          <button className={s.skipBtn} onClick={onClose}>Пропустить</button>
          <button className={s.submitBtn} onClick={handleSubmit} disabled={!stars || isLoading}>
            {isLoading ? "Отправляем..." : "Отправить оценку"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
