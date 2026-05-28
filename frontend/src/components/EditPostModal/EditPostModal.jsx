import { useState, useRef, useEffect } from "react";
import s from "./EditPostModal.module.css";
import imagePlaceholderIcon from "../../assets/icons/image_placeholder.svg";
import arrowLeftIcon from "../../assets/icons/carousel_arrow_left.svg";
import arrowRightIcon from "../../assets/icons/carousel_arrow_right.svg";
import closeIcon from "../../assets/icons/carousel_close.svg";
import { uploadFile } from "../../services/api";

const MAX_PHOTOS = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

const filterFiles = (files) =>
  Array.from(files).filter((f) => ALLOWED_TYPES.includes(f.type));

const EditPostModal = ({ post, onClose, onSave, accessToken }) => {
  const initialExisting = (post.photos || []).map((p) => ({
    id: p.id,
    url: p.urlPreview,
  }));

  const [existing, setExisting] = useState(initialExisting);
  const [removedIds, setRemovedIds] = useState(new Set());
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [description, setDescription] = useState(post.description || "");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const preventScroll = (e) => {
      if (textareaRef.current && textareaRef.current.contains(e.target)) return;
      e.preventDefault();
    };
    document.addEventListener("wheel", preventScroll, { passive: false });
    document.addEventListener("touchmove", preventScroll, { passive: false });
    return () => {
      document.removeEventListener("wheel", preventScroll);
      document.removeEventListener("touchmove", preventScroll);
    };
  }, []);

  const visibleExisting = existing.filter((p) => !removedIds.has(p.id));
  const allPreviews = [
    ...visibleExisting.map((p) => p.url),
    ...newPreviews,
  ];
  const totalCount = visibleExisting.length + newFiles.length;

  const addFiles = (files) => {
    const valid = filterFiles(files);
    if (valid.length < files.length) {
      setUploadError("Допустимы только файлы PNG и JPEG");
    } else {
      setUploadError("");
    }
    const remaining = MAX_PHOTOS - totalCount;
    const toAdd = valid.slice(0, remaining);
    if (valid.length > remaining) {
      setUploadError(`Максимум ${MAX_PHOTOS} фотографий`);
    }
    if (toAdd.length === 0) return;
    setNewFiles((prev) => [...prev, ...toAdd]);
    setNewPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    setCurrentIndex(0);
  };

  const handleFileChange = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleRemove = () => {
    const idx = currentIndex;
    if (idx < visibleExisting.length) {
      const id = visibleExisting[idx].id;
      setRemovedIds((prev) => new Set([...prev, id]));
    } else {
      const newIdx = idx - visibleExisting.length;
      setNewFiles((prev) => prev.filter((_, i) => i !== newIdx));
      setNewPreviews((prev) => {
        URL.revokeObjectURL(prev[newIdx]);
        return prev.filter((_, i) => i !== newIdx);
      });
    }
    setCurrentIndex(Math.max(0, idx - 1));
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSave = async () => {
    if (totalCount === 0) return;
    setIsUploading(true);
    setUploadError("");
    try {
      const addPhotoIds = [];
      for (let i = 0; i < newFiles.length; i++) {
        const result = await uploadFile("/api/upload/photo", newFiles[i], "image", accessToken);
        if (result.status !== "success") {
          throw new Error(`Фото ${i + 1}: ${result.message}`);
        }
        addPhotoIds.push(result.data.photo.id);
      }
      await onSave(post.id, {
        description,
        addPhotoIds,
        removePhotoIds: [...removedIds],
      });
    } catch (err) {
      setUploadError(err.message || "Не удалось сохранить пост. Попробуйте ещё раз");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={s.overlay}
      onClick={(e) => { if (e.target === e.currentTarget && !isUploading) onClose(); }}
    >
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <h2 className={s.title}>Редактировать пост</h2>
        </div>

        <div className={s.scrollBody}>
          <div
            className={`${s.photoBlock} ${isDragging ? s.dragging : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {allPreviews.length === 0 ? (
              <div className={s.emptyPhoto}>
                <img src={imagePlaceholderIcon} alt="Добавьте фото" className={s.placeholderIcon} />
                <p className={s.placeholderText}>
                  {isDragging ? "Отпустите фото сюда" : "Добавьте фото"}
                </p>
              </div>
            ) : (
              <div className={s.carouselWrapper}>
                <div className={s.carousel}>
                  <button className={s.removeBtn} onClick={handleRemove}>
                    <img src={closeIcon} alt="Удалить" />
                  </button>

                  {allPreviews.length > 1 && currentIndex > 0 && (
                    <button className={`${s.arrowBtn} ${s.arrowLeft}`} onClick={() => setCurrentIndex((p) => p - 1)}>
                      <img src={arrowLeftIcon} alt="Назад" />
                    </button>
                  )}

                  <img
                    src={allPreviews[currentIndex]}
                    alt={`Фото ${currentIndex + 1}`}
                    className={s.carouselImage}
                  />

                  {allPreviews.length > 1 && currentIndex < allPreviews.length - 1 && (
                    <button className={`${s.arrowBtn} ${s.arrowRight}`} onClick={() => setCurrentIndex((p) => p + 1)}>
                      <img src={arrowRightIcon} alt="Вперёд" />
                    </button>
                  )}

                  {allPreviews.length > 1 && (
                    <div className={s.counter}>{currentIndex + 1} / {allPreviews.length}</div>
                  )}
                </div>
              </div>
            )}

            {totalCount < MAX_PHOTOS && (
              <button
                className={s.uploadBtn}
                onClick={() => fileInputRef.current.click()}
                disabled={isUploading}
              >
                Загрузить с устройства
              </button>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className={s.hiddenInput}
            />

            {uploadError && <p className={s.errorText}>{uploadError}</p>}
          </div>

          <textarea
            ref={textareaRef}
            className={s.textarea}
            placeholder="Напишите что-нибудь..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isUploading}
          />
        </div>

        <div className={s.modalFooter}>
          <button
            className={s.saveBtn}
            onClick={handleSave}
            disabled={totalCount === 0 || isUploading}
          >
            {isUploading ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPostModal;
