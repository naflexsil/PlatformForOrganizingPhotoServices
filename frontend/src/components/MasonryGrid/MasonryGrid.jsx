import s from "./MasonryGrid.module.css";
import closeIcon from "../../assets/icons/carousel_close.svg";

const MasonryGrid = ({ photos, isOwner, onPhotoClick, onDeletePhoto }) => {
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
