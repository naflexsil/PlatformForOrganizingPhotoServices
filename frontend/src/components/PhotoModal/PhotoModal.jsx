import { useState, useEffect } from "react";
import s from "./PhotoModal.module.css";
import heartIcon from "../../assets/icons/heart.svg";
import heartFilledIcon from "../../assets/icons/heart_filled.svg";
import bookmarkIcon from "../../assets/icons/bookmark.svg";
import bookmarkFilledIcon from "../../assets/icons/bookmark_filled.svg";
import closeIcon from "../../assets/icons/carousel_close.svg";

const PhotoModal = ({ photo, onClose, accessToken }) => {
  const [likesCount, setLikesCount] = useState(photo.likesCount ?? 0);
  const [isLiked, setIsLiked] = useState(photo.isLiked ?? false);
  const [favoritesCount, setFavoritesCount] = useState(photo.favoritesCount ?? 0);
  const [isFavorited, setIsFavorited] = useState(photo.isFavorited ?? false);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleLike = async () => {
    if (!accessToken) return;
    const res = await fetch(`/api/photos/${photo.id}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const result = await res.json();
    if (result.status === "success") {
      setIsLiked(result.data.liked);
      setLikesCount(result.data.count);
    }
  };

  const handleFavorite = async () => {
    if (!accessToken) return;
    const res = await fetch(`/api/photos/${photo.id}/favorite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const result = await res.json();
    if (result.status === "success") {
      setIsFavorited(result.data.favorited);
      setFavoritesCount(result.data.count);
    }
  };

  const handlePhotoClick = () => {
    if (photo.urlOriginal) {
      window.open(photo.urlOriginal, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.card}>
        <div className={s.photoSide}>
          <img
            src={photo.urlPreview}
            alt="Фото"
            className={s.photo}
            onClick={handlePhotoClick}
            title="Нажмите для просмотра в полном качестве"
          />
          <button className={s.closeBtn} onClick={onClose}>
            <img src={closeIcon} alt="Закрыть" />
          </button>
        </div>

        <div className={s.actionsRow}>
          <button className={s.actionBtn} onClick={handleLike} disabled={!accessToken}>
            <img
              src={isLiked ? heartFilledIcon : heartIcon}
              alt="Лайк"
              className={s.actionIcon}
            />
            <span className={isLiked ? s.likedCount : s.actionCount}>{likesCount}</span>
          </button>

          <button className={s.actionBtn} onClick={handleFavorite} disabled={!accessToken}>
            <img
              src={isFavorited ? bookmarkFilledIcon : bookmarkIcon}
              alt="В избранное"
              className={s.bookmarkIcon}
            />
            <span className={s.actionCount}>{favoritesCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoModal;
