import { useState, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import attachIcon from "../../assets/icons/attach.svg";
import sendIcon from "../../assets/icons/send_message.svg";
import closeIcon from "../../assets/icons/carousel_close.svg";
import addIcon from "../../assets/icons/add.svg";
import s from "./MessageInput.module.css";

const MAX_PHOTOS = 10;

const MessageInput = ({ chatId, socketReady = true }) => {
  const { accessToken } = useAuth();
  const { socket } = useSocket();
  const [text, setText] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [pendingFile, setPendingFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const textareaRef = useRef(null);

  const emitTyping = useCallback(() => {
    if (!socket || !chatId) return;
    socket.emit("typing", { chatId });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => socket.emit("stop-typing", { chatId }), 2000);
  }, [socket, chatId]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    emitTyping();
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      const newH = Math.min(ta.scrollHeight, 120);
      ta.style.height = `${newH}px`;
      // Only show scrollbar when text doesn't fit within max height
      ta.style.overflowY = ta.scrollHeight > 120 ? "auto" : "hidden";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    e.target.value = "";

    const ext = files[0].name.split(".").pop().toLowerCase();
    const isArchive = ext === "zip" || ext === "rar";

    setIsUploading(true);
    try {
      if (isArchive) {
        const formData = new FormData();
        formData.append("file", files[0]);
        formData.append("chatId", chatId);
        const r = await fetch("/api/upload/chat-attachment", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });
        const data = await r.json();
        if (data.status === "success") {
          setPendingFile({ url: data.data.attachmentUrl, fileName: data.data.fileName, fileSize: data.data.fileSize });
          setPendingPhotos([]);
        }
      } else {
        const toUpload = files.slice(0, MAX_PHOTOS - pendingPhotos.length);
        const results = await Promise.all(
          toUpload.map(async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("chatId", chatId);
            const r = await fetch("/api/upload/chat-attachment", {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}` },
              body: formData,
            });
            const data = await r.json();
            if (data.status === "success" && data.data.attachmentType === "IMAGE") {
              return { previewUrl: data.data.previewUrl, originalUrl: data.data.attachmentUrl };
            }
            return null;
          })
        );
        const valid = results.filter(Boolean);
        if (valid.length) {
          setPendingPhotos((prev) => [...prev, ...valid]);
          setPendingFile(null);
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (idx) => setPendingPhotos((prev) => prev.filter((_, i) => i !== idx));

  const resetTextarea = () => {
    setText("");
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.overflowY = "hidden"; }
  };

  const handleSend = () => {
    if (!socket || !canSend || !socketReady) return;
    const trimmed = text.trim();

    if (pendingPhotos.length > 0) {
      socket.emit("send-message", { chatId, text: trimmed || undefined, attachments: pendingPhotos, attachmentType: "IMAGE" });
      setPendingPhotos([]);
      resetTextarea();
      return;
    }
    if (pendingFile) {
      socket.emit("send-message", { chatId, text: trimmed || undefined, attachments: [pendingFile], attachmentType: "FILE" });
      setPendingFile(null);
      resetTextarea();
      return;
    }
    if (trimmed) {
      socket.emit("send-message", { chatId, text: trimmed });
      resetTextarea();
      clearTimeout(typingTimerRef.current);
      socket.emit("stop-typing", { chatId });
    }
  };

  const canSend = !isUploading && (text.trim().length > 0 || pendingPhotos.length > 0 || pendingFile);

  return (
    <div className={s.root}>
      {/* Upload progress */}
      {isUploading && (
        <div className={s.uploadingBar}>
          <div className={s.uploadSpinner} />
          <span>Загружаем...</span>
        </div>
      )}

      {/* Pending photos strip */}
      {pendingPhotos.length > 0 && (
        <div className={s.pendingPhotos}>
          {pendingPhotos.map((p, i) => (
            <div key={i} className={s.pendingThumb}>
              <img src={p.previewUrl} alt="" className={s.thumbImg} />
              <button className={s.removeThumb} onClick={() => removePhoto(i)}>
                <img src={closeIcon} alt="×" />
              </button>
            </div>
          ))}
          {pendingPhotos.length < MAX_PHOTOS && (
            <button className={s.addMoreBtn} onClick={() => fileInputRef.current?.click()} title="Добавить ещё">
              <img src={addIcon} alt="+" className={s.addMoreIcon} />
            </button>
          )}
        </div>
      )}

      {/* Pending file */}
      {pendingFile && (
        <div className={s.pendingFile}>
          <img src={attachIcon} alt="" className={s.pendingFileIcon} />
          <span className={s.pendingFileName}>{pendingFile.fileName}</span>
          <button className={s.removePendingFile} onClick={() => setPendingFile(null)}>
            <img src={closeIcon} alt="×" className={s.removePendingFileIcon} />
          </button>
        </div>
      )}

      {/* Offline notice */}
      {!socketReady && (
        <div className={s.offlineNotice}>
          <div className={s.uploadSpinner} />
          <span>Подключение к серверу...</span>
        </div>
      )}

      {/* Input row */}
      <div className={s.inputRow}>
        <button className={`${s.attachBtn} ${isUploading ? s.attachBtnDisabled : ""}`} onClick={() => !isUploading && fileInputRef.current?.click()} title="Прикрепить файл">
          <img src={attachIcon} alt="Прикрепить" className={s.attachIcon} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,.zip,.rar"
          multiple
          className={s.hiddenInput}
          onChange={handleFileSelect}
        />

        <textarea
          ref={textareaRef}
          className={s.textarea}
          placeholder="Сообщение..."
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        {/* No disabled attr — prevents iOS touch issues; guard inside handleSend */}
        <button className={`${s.sendBtn} ${canSend ? s.sendBtnActive : ""}`} onClick={handleSend} title="Отправить">
          <img src={sendIcon} alt="Отправить" className={s.sendIcon} />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
