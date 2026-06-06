import { useState, useEffect } from "react";
import s from "./PortfolioPhotoModal.module.css";
import heartIcon from "../../assets/icons/heart.svg";
import heartFilledIcon from "../../assets/icons/heart_filled.svg";
import bookmarkIcon from "../../assets/icons/bookmark.svg";
import bookmarkFilledIcon from "../../assets/icons/bookmark_filled.svg";
import moreIcon from "../../assets/icons/more.svg";
import editIcon from "../../assets/icons/edit.svg";
import deleteIcon from "../../assets/icons/delete.svg";
import closeIcon from "../../assets/icons/carousel_close.svg";
import defaultAvatar from "../../assets/images/default_avatar.webp";

const PortfolioPhotoModal = ({
  photo,
  author,
  isOwner,
  accessToken,
  onClose,
  onDelete,
  onDescriptionUpdate,
  onAuthorClick,
  onPhotoUpdate,
}) => {
  const [isLiked, setIsLiked] = useState(photo.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(photo.likesCount ?? 0);
  const [isFavorited, setIsFavorited] = useState(photo.isFavorited ?? false);
  const [favoritesCount, setFavoritesCount] = useState(photo.favoritesCount ?? 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(photo.description || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      onPhotoUpdate?.({ isLiked: result.data.liked, likesCount: result.data.count });
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
      onPhotoUpdate?.({ isFavorited: result.data.favorited, favoritesCount: result.data.count });
    }
  };

  const handleSaveDescription = async () => {
    const res = await fetch(`/api/photos/${photo.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ description: editText }),
    });
    const result = await res.json();
    if (result.status === "success") {
      onDescriptionUpdate?.(photo.id, editText);
      setIsEditing(false);
    }
  };

  const handlePhotoClick = () => {
    if (photo.urlOriginal) {
      window.open(photo.urlOriginal, "_blank", "noopener,noreferrer");
    }
  };

  const formatDate = (val) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.modal}>
        <div className={s.photoSide}>
          <img
            src={photo.urlPreview}
            alt="Фото"
            className={s.photo}
            onClick={handlePhotoClick}
            title="Нажмите для просмотра в полном качестве"
          />
        </div>

        <div className={s.contentSide}>
          <div className={s.header}>
            <div
              className={onAuthorClick ? s.authorClickable : s.authorStatic}
              onClick={onAuthorClick ? () => onAuthorClick(author) : undefined}
              title={onAuthorClick ? `Перейти на страницу ${author?.firstName}` : undefined}
            >
              <img src={author?.avatarUrl || defaultAvatar} alt="Avatar" className={s.avatar} />
              <div className={s.authorInfo}>
                <span className={s.authorName}>{author?.firstName} {author?.lastName}</span>
                <span className={s.date}>{formatDate(photo.createdAt)}</span>
              </div>
            </div>
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
              <span className={isFavorited ? s.favoritedCount : s.actionCount}>{favoritesCount}</span>
            </button>
          </div>

          <div className={s.textBody}>
            {isEditing ? (
              <div className={s.editBlock}>
                <textarea
                  className={s.editTextarea}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  maxLength={500}
                  placeholder="Описание фото..."
                  autoFocus
                />
                <div className={s.editActions}>
                  <button className={s.editSaveBtn} onClick={handleSaveDescription}>Сохранить</button>
                  <button className={s.editCancelBtn} onClick={() => { setIsEditing(false); setEditText(photo.description || ""); }}>Отмена</button>
                </div>
              </div>
            ) : (
              photo.description && <p className={s.text}>{photo.description}</p>
            )}
          </div>

          <div className={s.footer}>
            {isOwner && (
              <div className={s.menuWrapper}>
                <button
                  className={s.moreBtn}
                  onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                >
                  <img src={moreIcon} alt="Меню" className={s.moreIcon} />
                </button>
                {isMenuOpen && (
                  <div className={s.menu}>
                    <div className={s.menuItem} onClick={() => { setIsMenuOpen(false); setIsEditing(true); }}>
                      <img src={editIcon} alt="Редактировать" />
                      <span>Редактировать описание</span>
                    </div>
                    <div
                      className={`${s.menuItem} ${s.menuItemDanger}`}
                      onClick={() => { setIsMenuOpen(false); setShowDeleteConfirm(true); }}
                    >
                      <img src={deleteIcon} alt="Удалить" />
                      <span>Удалить фото</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    {showDeleteConfirm && (
      <div className={s.confirmOverlay} onClick={() => setShowDeleteConfirm(false)}>
        <div className={s.confirmModal} onClick={(e) => e.stopPropagation()}>
          <h3 className={s.confirmTitle}>Удалить фото?</h3>
          <p className={s.confirmText}>Фото будет удалено безвозвратно.</p>
          <div className={s.confirmActions}>
            <button className={s.confirmCancel} onClick={() => setShowDeleteConfirm(false)}>Отмена</button>
            <button className={s.confirmDelete} onClick={() => { setShowDeleteConfirm(false); onDelete(photo.id); }}>Удалить</button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default PortfolioPhotoModal;
