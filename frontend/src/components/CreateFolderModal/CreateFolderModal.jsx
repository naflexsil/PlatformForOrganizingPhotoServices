import { useState, useEffect, useRef } from "react";
import s from "./CreateFolderModal.module.css";
import closeIcon from "../../assets/icons/carousel_close.svg";

const CreateFolderModal = ({ accessToken, folder, onClose, onSaved }) => {
  const isEditing = Boolean(folder);
  const [name, setName] = useState(folder?.name || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Введите название папки"); return; }
    if (trimmed.length > 50) { setError("Не более 50 символов"); return; }

    setIsLoading(true);
    setError("");
    try {
      const url = isEditing ? `/api/portfolio/${folder.id}` : "/api/portfolio";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: trimmed }),
      });
      const result = await res.json();
      if (result.status !== "success") {
        setError(result.message || "Ошибка");
        return;
      }
      onSaved(result.data);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.modal}>
        <div className={s.header}>
          <h2 className={s.title}>{isEditing ? "Переименовать папку" : "Новая папка"}</h2>
          <button className={s.closeBtn} onClick={onClose}>
            <img src={closeIcon} alt="Закрыть" />
          </button>
        </div>

        <input
          ref={inputRef}
          className={`${s.input} ${error ? s.inputError : ""}`}
          type="text"
          placeholder="Название папки"
          value={name}
          maxLength={50}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
        />
        {error && <p className={s.errorText}>{error}</p>}

        <div className={s.actions}>
          <button className={s.cancelBtn} onClick={onClose} disabled={isLoading}>Отмена</button>
          <button className={s.saveBtn} onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Сохранение..." : isEditing ? "Сохранить" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateFolderModal;
