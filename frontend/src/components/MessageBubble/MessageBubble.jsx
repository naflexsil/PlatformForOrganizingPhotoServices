import { useState } from "react";
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

// Photo grid layouts depending on count
const PhotoGrid = ({ photos }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const count = photos.length;

  const openOriginal = (url) => window.open(url, "_blank");

  const imgEl = (photo, i, cls) => (
    <img
      key={i}
      src={photo.previewUrl}
      alt=""
      className={`${s.gridImg} ${cls || ""}`}
      onClick={() => setPreviewUrl(previewUrl === photo.previewUrl ? null : photo.previewUrl)}
      onDoubleClick={() => openOriginal(photo.originalUrl)}
    />
  );

  let grid;
  if (count === 1) {
    grid = <div className={s.grid1}>{imgEl(photos[0], 0, s.singleImg)}</div>;
  } else if (count === 2) {
    grid = <div className={s.grid2}>{photos.map((p, i) => imgEl(p, i))}</div>;
  } else if (count === 3) {
    grid = <div className={s.grid3}>{photos.map((p, i) => imgEl(p, i))}</div>;
  } else if (count === 4) {
    grid = <div className={s.grid4}>{photos.map((p, i) => imgEl(p, i))}</div>;
  } else if (count === 5) {
    grid = (
      <div className={s.grid5}>
        <div className={s.grid5Left}>{imgEl(photos[0], 0, s.grid5Main)}</div>
        <div className={s.grid5Right}>
          {photos.slice(1).map((p, i) => imgEl(p, i + 1, s.grid5Side))}
        </div>
      </div>
    );
  } else {
    // 6+: 3 columns
    grid = (
      <div className={s.grid6plus}>
        {photos.map((p, i) => imgEl(p, i))}
      </div>
    );
  }

  return (
    <>
      {grid}
      {previewUrl && (
        <div className={s.previewOverlay} onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} className={s.previewImg} alt="" onClick={(e) => e.stopPropagation()} />
          <span className={s.previewHint}>Двойной клик → оригинал в новой вкладке</span>
        </div>
      )}
    </>
  );
};

const MessageBubble = ({ message, isOwn, isFirstInGroup, companion }) => {
  const { text, attachments, attachmentType, createdAt } = message;

  const renderContent = () => {
    if (attachmentType === "IMAGE" && attachments?.length) {
      return (
        <div className={s.contentWrap}>
          <PhotoGrid photos={attachments} />
          {text && <p className={s.caption}>{text}</p>}
        </div>
      );
    }

    if (attachmentType === "FILE" && attachments?.length) {
      const file = attachments[0];
      return (
        <div className={s.contentWrap}>
          <a
            href={file.url}
            download={file.fileName}
            className={s.fileCard}
            onClick={(e) => e.stopPropagation()}
          >
            <span className={s.fileIcon}>📎</span>
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
  );
};

export default MessageBubble;
