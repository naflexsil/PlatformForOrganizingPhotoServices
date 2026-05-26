import { useState, useRef, useEffect } from "react";
import s from "./CreatePostModal.module.css";
import imagePlaceholderIcon from "../../assets/icons/image_placeholder.svg";
import arrowLeftIcon from "../../assets/icons/carousel_arrow_left.svg";
import arrowRightIcon from "../../assets/icons/carousel_arrow_right.svg";
import closeIcon from "../../assets/icons/carousel_close.svg";

const MAX_PHOTOS = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

const filterFiles = (files) =>
  Array.from(files).filter((f) => ALLOWED_TYPES.includes(f.type));

const CreatePostModal = ({ onClose, onPublish, accessToken }) => {
  const [previews, setPreviews] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [text, setText] = useState("");
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

  const addFiles = (newFiles) => {
    const valid = filterFiles(newFiles);
    if (valid.length < newFiles.length) {
      setUploadError("Допустимы только файлы PNG и JPEG");
    } else {
      setUploadError("");
    }
    const remaining = MAX_PHOTOS - files.length;
    const toAdd = valid.slice(0, remaining);
    if (valid.length > remaining) {
      setUploadError(`Максимум ${MAX_PHOTOS} фотографий`);
    }
    if (toAdd.length === 0) return;
    setPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    setFiles((prev) => [...prev, ...toAdd]);
    setCurrentIndex(0);
  };

  const handleFileChange = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    const idx = currentIndex;
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setCurrentIndex(Math.max(0, idx - 1));
  };

  const handlePrev = () => setCurrentIndex((prev) => prev - 1);
  const handleNext = () => setCurrentIndex((prev) => prev + 1);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handlePublish = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadError("");
    try {
      const photoIds = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("image", file);
        const res = await fetch("/api/upload/photo", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });
        const result = await res.json();
        if (result.status !== "success") throw new Error(result.message);
        photoIds.push(result.data.photo.id);
      }
      await onPublish({ photoIds, description: text });
    } catch (err) {
      setUploadError(err.message || "Ошибка при загрузке фото");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={s.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) onClose();
      }}
    >
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <h2 className={s.title}>Новый пост</h2>
        </div>

        <div className={s.scrollBody}>
          <div
            className={`${s.photoBlock} ${isDragging ? s.dragging : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {previews.length === 0 ? (
              <div className={s.emptyPhoto}>
                <img
                  src={imagePlaceholderIcon}
                  alt="Добавьте фото"
                  className={s.placeholderIcon}
                />
                <p className={s.placeholderText}>
                  {isDragging ? "Отпустите фото сюда" : "Добавьте фото"}
                </p>
              </div>
            ) : (
              <div className={s.carouselWrapper}>
                <div className={s.carousel}>
                  <button className={s.removeBtn} onClick={handleRemoveImage}>
                    <img src={closeIcon} alt="Удалить" />
                  </button>

                  {previews.length > 1 && currentIndex > 0 && (
                    <button
                      className={`${s.arrowBtn} ${s.arrowLeft}`}
                      onClick={handlePrev}
                    >
                      <img src={arrowLeftIcon} alt="Назад" />
                    </button>
                  )}

                  <img
                    src={previews[currentIndex]}
                    alt={`Фото ${currentIndex + 1}`}
                    className={s.carouselImage}
                  />

                  {previews.length > 1 && currentIndex < previews.length - 1 && (
                    <button
                      className={`${s.arrowBtn} ${s.arrowRight}`}
                      onClick={handleNext}
                    >
                      <img src={arrowRightIcon} alt="Вперёд" />
                    </button>
                  )}

                  {previews.length > 1 && (
                    <div className={s.counter}>
                      {currentIndex + 1} / {previews.length}
                    </div>
                  )}
                </div>
              </div>
            )}

            {files.length < MAX_PHOTOS && (
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

            {uploadError && (
              <p className={s.errorText}>{uploadError}</p>
            )}
          </div>

          <textarea
            ref={textareaRef}
            className={s.textarea}
            placeholder="Напишите что-нибудь..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isUploading}
          />
        </div>

        <div className={s.modalFooter}>
          <button
            className={s.publishBtn}
            onClick={handlePublish}
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? "Публикация..." : "Выложить"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
