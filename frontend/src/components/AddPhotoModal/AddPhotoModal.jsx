import { useState, useRef } from "react";
import s from "./AddPhotoModal.module.css";
import imagePlaceholderIcon from "../../assets/icons/image_placeholder.svg";
import closeIcon from "../../assets/icons/carousel_close.svg";

const MAX_DESCRIPTION = 500;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 10;

const AddPhotoModal = ({ accessToken, folderId, onClose, onUploaded }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const validateAndSet = (f) => {
    setError("");
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Разрешены только JPG, PNG, WebP");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Файл слишком большой (макс. ${MAX_SIZE_MB} МБ)`);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) validateAndSet(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) validateAndSet(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file || isUploading) return;
    setIsUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (description.trim()) formData.append("description", description.trim());
      if (folderId) formData.append("folderId", folderId);

      const res = await fetch("/api/upload/photo", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const result = await res.json();
      if (result.status !== "success") {
        setError(result.message || "Не удалось загрузить фото");
        return;
      }
      onUploaded(result.data.photo);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <h2 className={s.title}>Добавить фото</h2>
          <button className={s.closeBtn} onClick={onClose}>
            <img src={closeIcon} alt="Закрыть" />
          </button>
        </div>

        {!preview ? (
          <div
            className={`${s.dropZone} ${isDragging ? s.dragging : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <img src={imagePlaceholderIcon} alt="" className={s.dropIcon} />
            <p className={s.dropText}>Перетащите фото или нажмите для выбора</p>
            <p className={s.dropHint}>JPG, PNG, WebP · макс. 10 МБ</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={s.hiddenInput}
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className={s.previewWrapper}>
            <img src={preview} alt="Превью" className={s.previewImg} />
            <button className={s.changeBtn} onClick={() => { setFile(null); setPreview(null); inputRef.current?.click(); }}>
              Выбрать другое
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={s.hiddenInput}
              onChange={handleFileChange}
            />
          </div>
        )}

        {error && <p className={s.errorText}>{error}</p>}

        <div className={s.descriptionWrapper}>
          <textarea
            className={s.textarea}
            placeholder="Описание фото (необязательно)"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
            rows={3}
          />
          <span className={s.charCount}>{description.length}/{MAX_DESCRIPTION}</span>
        </div>

        <div className={s.actions}>
          <button className={s.cancelBtn} onClick={onClose} disabled={isUploading}>Отмена</button>
          <button
            className={s.uploadBtn}
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? "Загрузка..." : "Опубликовать"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPhotoModal;
