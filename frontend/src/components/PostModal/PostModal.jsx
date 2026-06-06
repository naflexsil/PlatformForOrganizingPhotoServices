import { useState, useEffect } from "react";
import s from "./PostModal.module.css";
import heartIcon from "../../assets/icons/heart.svg";
import heartFilledIcon from "../../assets/icons/heart_filled.svg";
import bookmarkIcon from "../../assets/icons/bookmark.svg";
import bookmarkFilledIcon from "../../assets/icons/bookmark_filled.svg";
import moreIcon from "../../assets/icons/more.svg";
import editIcon from "../../assets/icons/edit.svg";
import deleteIcon from "../../assets/icons/delete.svg";
import pinIcon from "../../assets/icons/pin.svg";
import unpinIcon from "../../assets/icons/unpin.svg";
import arrowLeftIcon from "../../assets/icons/carousel_arrow_left.svg";
import arrowRightIcon from "../../assets/icons/carousel_arrow_right.svg";
import closeIcon from "../../assets/icons/carousel_close.svg";
import defaultAvatar from "../../assets/images/default_avatar.webp";

const PostModal = ({
  post,
  onClose,
  onLike,
  onFavorite,
  onDelete,
  onPin,
  onEdit,
  onPhotoClick,
  isMyProfile,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      if (isMenuOpen) { setIsMenuOpen(false); return; }
      onClose();
    }
  };

  const photos = post.photos || [];
  const images = photos.length > 0
    ? photos.map((p) => p.urlPreview)
    : post.images || [];

  const handlePrev = () => setCurrentIndex((p) => p - 1);
  const handleNext = () => setCurrentIndex((p) => p + 1);

  const handlePhotoClick = () => {
    if (!onPhotoClick) return;
    const photo = photos[currentIndex];
    if (photo) {
      onPhotoClick(photo);
    }
  };

  const authorName = post.author
    ? `${post.author.firstName} ${post.author.lastName}`
    : post.authorName || "";

  const authorAvatar = post.author?.avatarUrl || null;

  const formatDate = (val) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleMenuAction = (action) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <div className={s.overlay} onClick={handleOverlayClick}>
      <div className={s.modal}>
        <div className={s.photoSide}>
          {images.length > 0 ? (
            <>
              <img
                src={images[currentIndex]}
                alt={`Фото ${currentIndex + 1}`}
                className={`${s.photo} ${photos.length > 0 ? s.photoClickable : ""}`}
                onClick={photos.length > 0 ? handlePhotoClick : undefined}
              />
              {images.length > 1 && currentIndex > 0 && (
                <button className={`${s.arrowBtn} ${s.arrowLeft}`} onClick={handlePrev}>
                  <img src={arrowLeftIcon} alt="Назад" />
                </button>
              )}
              {images.length > 1 && currentIndex < images.length - 1 && (
                <button className={`${s.arrowBtn} ${s.arrowRight}`} onClick={handleNext}>
                  <img src={arrowRightIcon} alt="Вперёд" />
                </button>
              )}
              {images.length > 1 && (
                <div className={s.counter}>{currentIndex + 1} / {images.length}</div>
              )}
            </>
          ) : (
            <div className={s.noPhoto} />
          )}
        </div>

        <div className={s.contentSide}>
          <div className={s.header}>
            <img src={authorAvatar || defaultAvatar} alt="Avatar" className={s.avatar} />
            <div className={s.authorInfo}>
              <span className={s.authorName}>{authorName}</span>
              <span className={s.date}>{formatDate(post.createdAt)}</span>
            </div>
            <button className={s.closeBtn} onClick={onClose}>
              <img src={closeIcon} alt="Закрыть" />
            </button>
          </div>

          <div className={s.actionsRow}>
            <button className={s.actionBtn} onClick={() => onLike(post.id)}>
              <img
                src={post.isLiked ? heartFilledIcon : heartIcon}
                alt="Лайк"
                className={s.actionIcon}
              />
              <span className={post.isLiked ? s.likedCount : s.actionCount}>
                {post.likes ?? 0}
              </span>
            </button>

            <button className={s.actionBtn} onClick={() => onFavorite?.(post.id)}>
              <img
                src={post.isFavorited ? bookmarkFilledIcon : bookmarkIcon}
                alt="В избранное"
                className={s.bookmarkIcon}
              />
              <span className={post.isFavorited ? s.favoritedCount : s.actionCount}>{post.favoritesCount ?? 0}</span>
            </button>
          </div>

          <div className={s.textBody}>
            {(post.description || post.text) && (
              <p className={s.text}>{post.description || post.text}</p>
            )}
          </div>

          <div className={s.footer}>
            {isMyProfile && (
              <div className={s.menuWrapper}>
                <button
                  className={s.moreBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                >
                  <img src={moreIcon} alt="Меню" className={s.moreIcon} />
                </button>

                {isMenuOpen && (
                  <div className={s.menu}>
                    <div
                      className={s.menuItem}
                      onClick={() => handleMenuAction(() => onEdit?.(post))}
                    >
                      <img src={editIcon} alt="Редактировать" />
                      <span>Редактировать</span>
                    </div>
                    <div
                      className={s.menuItem}
                      onClick={() =>
                        handleMenuAction(() => onPin?.(post.id, !post.isPinned))
                      }
                    >
                      <img
                        src={post.isPinned ? unpinIcon : pinIcon}
                        alt={post.isPinned ? "Открепить" : "Закрепить"}
                      />
                      <span>{post.isPinned ? "Открепить" : "Закрепить"}</span>
                    </div>
                    <div
                      className={`${s.menuItem} ${s.menuItemDanger}`}
                      onClick={() => handleMenuAction(() => onDelete(post.id))}
                    >
                      <img src={deleteIcon} alt="Удалить" />
                      <span>Удалить</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostModal;
