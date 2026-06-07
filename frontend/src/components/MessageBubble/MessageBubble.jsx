import { useState } from "react";
import attachIcon from "../../assets/icons/attach.svg";
import arrowLeft from "../../assets/icons/carousel_arrow_left.svg";
import arrowRight from "../../assets/icons/carousel_arrow_right.svg";
import s from "./MessageBubble.module.css";

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

const Gallery = ({ photos, startIndex, onClose }) => {
  const [index, setIndex] = useState(startIndex);

  const prev = (e) => { e.stopPropagation(); setIndex((i) => i - 1); };
  const next = (e) => { e.stopPropagation(); setIndex((i) => i + 1); };
  const openOriginal = (e) => {
    e.stopPropagation();
    window.open(photos[index].originalUrl, "_blank");
  };

  return (
    <div className={s.galleryOverlay} onClick={onClose}>
      {index > 0 && (
        <button className={`${s.galleryArrow} ${s.galleryArrowLeft}`} onClick={prev}>
          <img src={arrowLeft} alt="←" />
        </button>
      )}
      <img
        src={photos[index].previewUrl}
        alt=""
        className={s.galleryImg}
        style={{ cursor: "pointer" }}
        onClick={openOriginal}
      />
      {index < photos.length - 1 && (
        <button className={`${s.galleryArrow} ${s.galleryArrowRight}`} onClick={next}>
          <img src={arrowRight} alt="→" />
        </button>
      )}
      {photos.length > 1 && (
        <span className={s.galleryCounter}>{index + 1} / {photos.length}</span>
      )}
    </div>
  );
};

const PhotoGrid = ({ photos, onOpen }) => {
  const count = photos.length;

  const img = (photo, i, cls = "") => (
    <img
      key={i}
      src={photo.previewUrl}
      alt=""
      className={`${s.gridImg} ${cls}`}
      onClick={() => onOpen(i)}
    />
  );

  if (count === 1) {
    return <div className={s.gridSolo}>{img(photos[0], 0, s.gridImgSolo)}</div>;
  }

  if (count === 2) {
    return <div className={s.grid2}>{photos.map((p, i) => img(p, i))}</div>;
  }

  const restRows = [];
  for (let i = 1; i < count; i += 3) {
    restRows.push(photos.slice(i, i + 3));
  }

  return (
    <div className={s.gridStack}>
      <div className={s.gridTopRow}>{img(photos[0], 0, s.gridImgTop)}</div>
      {restRows.map((row, ri) => (
        <div key={ri} className={s.gridBottomRow}>
          {row.map((p, pi) => img(p, 1 + ri * 3 + pi))}
        </div>
      ))}
    </div>
  );
};

const MessageBubble = ({ message, isOwn, isFirstInGroup, companion }) => {
  const { text, attachments, attachmentType, createdAt } = message;
  const [gallery, setGallery] = useState(null); // { photos, index }

  const openGallery = (index) => setGallery({ photos: attachments, index });

  const renderContent = () => {
    if (attachmentType === "IMAGE" && attachments?.length) {
      return (
        <div className={s.contentWrap}>
          <PhotoGrid photos={attachments} onOpen={openGallery} />
          {text && <p className={s.caption}>{text}</p>}
        </div>
      );
    }

    if (attachmentType === "FILE" && attachments?.length) {
      const file = attachments[0];
      return (
        <div className={s.contentWrap}>
          <a href={file.url} download={file.fileName} className={s.fileCard} onClick={(e) => e.stopPropagation()}>
            <img src={attachIcon} alt="" className={s.fileAttachIcon} />
            <div className={s.fileMeta}>
              <span className={s.fileName}>{file.fileName}</span>
              <span className={s.fileSize}>{formatFileSize(file.fileSize)}</span>
            </div>
          </a>
          {text && <p className={s.caption}>{text}</p>}
        </div>
      );
    }

    return <p className={s.text}>{text}</p>;
  };

  return (
    <>
      <div
        id={`msg-${message.id}`}
        className={`${s.wrapper} ${isOwn ? s.own : s.theirs} ${isFirstInGroup ? s.firstInGroup : ""}`}
      >
        {!isOwn && (
          <div className={s.avatarSlot}>
            {isFirstInGroup && companion?.avatarUrl ? (
              <img src={companion.avatarUrl} className={s.avatar} alt="" />
            ) : (
              <div className={s.avatarSpacer} />
            )}
          </div>
        )}

        <div className={s.bubbleWrap}>
          {!isOwn && isFirstInGroup && companion && (
            <span className={s.senderName}>{companion.firstName}</span>
          )}
          <div className={s.bubble}>
            {renderContent()}
            <span className={s.time}>{formatTime(createdAt)}</span>
          </div>
        </div>
      </div>

      {gallery && (
        <Gallery
          photos={gallery.photos}
          startIndex={gallery.index}
          onClose={() => setGallery(null)}
        />
      )}
    </>
  );
};

export default MessageBubble;
