import s from "./MasonryGrid.module.css";
import closeIcon from "../../assets/icons/carousel_close.svg";
import heartIcon from "../../assets/icons/heart.svg";
import heartFilledIcon from "../../assets/icons/heart_filled.svg";
import bookmarkIcon from "../../assets/icons/bookmark.svg";
import bookmarkFilledIcon from "../../assets/icons/bookmark_filled.svg";

const MasonryGrid = ({
  photos,
  isOwner,
  onPhotoClick,
  onDeletePhoto,
  showLike,
  onLike,
  showFavorite,
  onFavorite,
}) => {
  if (!photos.length) return null;

  return (
    <div className={s.grid}>
      {photos.map((photo) => (
        <div
          key={photo.id}
          className={s.item}
          onClick={() => onPhotoClick(photo)}
        >
          <img src={photo.urlPreview} alt="" className={s.img} />

          {showLike && (
            <button
              className={s.likeBtn}
              onClick={(e) => {
                e.stopPropagation();
                onLike?.(photo);
              }}
              title={photo.isLiked ? "Убрать лайк" : "Лайкнуть"}
            >
              <img
                src={photo.isLiked ? heartFilledIcon : heartIcon}
                alt="Лайк"
                className={photo.isLiked ? s.likeIconFilled : s.likeIcon}
              />
              {photo.likesCount > 0 && (
                <span className={photo.isLiked ? s.likeCountActive : s.likeCount}>
                  {photo.likesCount}
                </span>
              )}
            </button>
          )}

          {showFavorite && (
            <button
              className={s.favoriteBtn}
              onClick={(e) => {
                e.stopPropagation();
                onFavorite?.(photo);
              }}
              title={photo.isFavorited ? "Убрать из избранного" : "В избранное"}
            >
              <img
                src={photo.isFavorited ? bookmarkFilledIcon : bookmarkIcon}
                alt="Избранное"
                className={photo.isFavorited ? s.favoriteIconFilled : s.favoriteIcon}
              />
              {photo.favoritesCount > 0 && (
                <span className={photo.isFavorited ? s.favoriteCountActive : s.favoriteCount}>
                  {photo.favoritesCount}
                </span>
              )}
            </button>
          )}

          {isOwner && (
            <button
              className={s.deleteBtn}
              onClick={(e) => {
                e.stopPropagation();
                onDeletePhoto(photo);
              }}
              title="Удалить фото"
            >
              <img src={closeIcon} alt="Удалить" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default MasonryGrid;
