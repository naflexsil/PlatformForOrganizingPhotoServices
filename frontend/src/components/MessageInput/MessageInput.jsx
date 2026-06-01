import { useState, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import attachIcon from "../../assets/icons/attach.svg";
import sendIcon from "../../assets/icons/send_message.svg";
import s from "./MessageInput.module.css";

const MAX_PHOTOS = 10;

const MessageInput = ({ chatId }) => {
  const { accessToken } = useAuth();
  const { socket } = useSocket();
  const [text, setText] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState([]); // { previewUrl, originalUrl }
  const [pendingFile, setPendingFile] = useState(null);   // { url, fileName, fileSize }
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const textareaRef = useRef(null);

  const emitTyping = useCallback(() => {
    if (!socket || !chatId) return;
    socket.emit("typing", { chatId });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("stop-typing", { chatId });
    }, 2000);
  }, [socket, chatId]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    emitTyping();
    // Auto-resize textarea
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
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
          setPendingFile({
            url: data.data.attachmentUrl,
            fileName: data.data.fileName,
            fileSize: data.data.fileSize,
          });
          setPendingPhotos([]);
        }
      } else {
        // Image(s) — up to MAX_PHOTOS total
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

  const removePhoto = (idx) => {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = () => {
    if (!socket) return;
    const trimmed = text.trim();

    if (pendingPhotos.length > 0) {
      socket.emit("send-message", {
        chatId,
        text: trimmed || undefined,
        attachments: pendingPhotos,
        attachmentType: "IMAGE",
      });
      setPendingPhotos([]);
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      return;
    }

    if (pendingFile) {
      socket.emit("send-message", {
        chatId,
        text: trimmed || undefined,
        attachments: [pendingFile],
        attachmentType: "FILE",
      });
      setPendingFile(null);
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      return;
    }

    if (trimmed) {
      socket.emit("send-message", { chatId, text: trimmed });
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      clearTimeout(typingTimerRef.current);
      socket.emit("stop-typing", { chatId });
    }
  };

  const canSend = !isUploading && (text.trim().length > 0 || pendingPhotos.length > 0 || pendingFile);

  return (
    <div className={s.root}>
      {/* Pending photos preview */}
      {pendingPhotos.length > 0 && (
        <div className={s.pendingPhotos}>
          {pendingPhotos.map((p, i) => (
            <div key={i} className={s.pendingThumb}>
              <img src={p.previewUrl} alt="" className={s.thumbImg} />
              <button className={s.removeThumb} onClick={() => removePhoto(i)}>×</button>
            </div>
          ))}
          {pendingPhotos.length < MAX_PHOTOS && (
            <button
              className={s.addMoreBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Добавить ещё"
            >+</button>
          )}
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && (
        <div className={s.pendingFile}>
          <span className={s.pendingFileIcon}>📎</span>
          <span className={s.pendingFileName}>{pendingFile.fileName}</span>
          <button className={s.removePendingFile} onClick={() => setPendingFile(null)}>×</button>
        </div>
      )}

      {/* Input row */}
      <div className={s.inputRow}>
        <button
          className={s.attachBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Прикрепить файл"
        >
          <img src={attachIcon} alt="Прикрепить" className={s.icon} />
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

        <button
          className={s.sendBtn}
          onClick={handleSend}
          disabled={!canSend}
          title="Отправить"
        >
          <img src={sendIcon} alt="Отправить" className={s.icon} />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
