import { useState, useRef } from "react";
import s from "./SearchByPhotoModal.module.css";
import imagePlaceholderIcon from "../../assets/icons/image_placeholder.svg";
import closeIcon from "../../assets/icons/carousel_close.svg";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;

const SearchByPhotoModal = ({ onClose, onSearch }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const applyFile = (f) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Можно загрузить только изображение (JPEG, PNG, WebP)");
      return;
    }
    if (f.size > MAX_SIZE) {
      setError("Файл слишком большой. Максимум 10 МБ");
      return;
    }
    setError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
    e.target.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyFile(f);
  };

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setError("");
  };

  const handleSearch = () => {
    if (!file) return;
    onSearch(file);
    onClose();
  };

  return (
    <div
      className={s.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <h2 className={s.title}>Поиск по фото</h2>
        </div>

        <div className={s.body}>
          <div
            className={`${s.photoBlock} ${isDragging ? s.dragging : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!previewUrl ? (
              <div className={s.emptyPhoto}>
                <img src={imagePlaceholderIcon} alt="" className={s.placeholderIcon} />
                <p className={s.placeholderText}>
                  {isDragging ? "Отпустите фото сюда" : "Загрузите фото для поиска похожих работ"}
                </p>
              </div>
            ) : (
              <div className={s.previewWrapper}>
                <button className={s.removeBtn} onClick={handleRemove}>
                  <img src={closeIcon} alt="Удалить" />
                </button>
                <img src={previewUrl} alt="" className={s.previewImage} />
              </div>
            )}

            <button
              className={s.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? "Загрузить другое фото" : "Загрузить с устройства"}
            </button>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              ref={fileInputRef}
              onChange={handleFileChange}
              className={s.hiddenInput}
            />

            {error && <p className={s.errorText}>{error}</p>}
          </div>
        </div>

        <div className={s.modalFooter}>
          <button className={s.cancelBtn} onClick={onClose}>
            Отменить
          </button>
          <button className={s.searchBtn} onClick={handleSearch} disabled={!file}>
            Найти
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchByPhotoModal;
