import React, { useState, useRef, useEffect } from "react";
import s from "./CreatePostModal.module.css";
import imagePlaceholderIcon from "../../assets/icons/image_placeholder.svg";
import arrowLeftIcon from "../../assets/icons/carousel_arrow_left.svg";
import arrowRightIcon from "../../assets/icons/carousel_arrow_right.svg";
import closeIcon from "../../assets/icons/carousel_close.svg";

const CreatePostModal = ({ onClose, onPublish }) => {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [text, setText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const preventScroll = (e) => {
      if (textareaRef.current && textareaRef.current.contains(e.target)) {
        return;
      }
      e.preventDefault();
    };
    document.addEventListener("wheel", preventScroll, { passive: false });
    document.addEventListener("touchmove", preventScroll, { passive: false });
    return () => {
      document.removeEventListener("wheel", preventScroll);
      document.removeEventListener("touchmove", preventScroll);
    };
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const urls = files.map((file) => URL.createObjectURL(file));
    setImages((prev) => [...prev, ...urls]);
    setCurrentIndex(0);
  };

  const handleRemoveImage = () => {
    const updated = images.filter((_, i) => i !== currentIndex);
    setImages(updated);
    setCurrentIndex(Math.max(0, currentIndex - 1));
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
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length === 0) return;
    const urls = files.map((file) => URL.createObjectURL(file));
    setImages((prev) => [...prev, ...urls]);
    setCurrentIndex(0);
  };

  const handlePublish = () => {
    if (images.length === 0 && !text.trim()) return;
    onPublish({ images, text });
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={s.overlay} onClick={handleOverlayClick}>
      <div className={s.modal} ref={modalRef}>
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
            {images.length === 0 ? (
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

                  {images.length > 1 && currentIndex > 0 && (
                    <button
                      className={`${s.arrowBtn} ${s.arrowLeft}`}
                      onClick={handlePrev}
                    >
                      <img src={arrowLeftIcon} alt="Назад" />
                    </button>
                  )}

                  <img
                    src={images[currentIndex]}
                    alt={`Фото ${currentIndex + 1}`}
                    className={s.carouselImage}
                  />

                  {images.length > 1 && currentIndex < images.length - 1 && (
                    <button
                      className={`${s.arrowBtn} ${s.arrowRight}`}
                      onClick={handleNext}
                    >
                      <img src={arrowRightIcon} alt="Вперёд" />
                    </button>
                  )}

                  {images.length > 1 && (
                    <div className={s.counter}>
                      {currentIndex + 1} / {images.length}
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              className={s.uploadBtn}
              onClick={() => fileInputRef.current.click()}
            >
              Загрузить с устройства
            </button>
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className={s.hiddenInput}
            />
          </div>

          <textarea
            ref={textareaRef}
            className={s.textarea}
            placeholder="Напишите что-нибудь..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className={s.modalFooter}>
          <button
            className={s.publishBtn}
            onClick={handlePublish}
            disabled={images.length === 0 && !text.trim()}
          >
            Выложить
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
