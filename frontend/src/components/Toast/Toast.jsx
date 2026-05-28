import { useEffect, useState } from "react";
import s from "./Toast.module.css";

const Toast = ({ message, type = "error", onClose }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 2650);
    return () => clearTimeout(exitTimer);
  }, []);

  return (
    <div
      className={`${s.toast} ${s[type]} ${exiting ? s.exit : ""}`}
      onClick={() => { setExiting(true); setTimeout(onClose, 350); }}
    >
      <span className={s.message}>{message}</span>
      <button className={s.closeBtn} onClick={(e) => { e.stopPropagation(); setExiting(true); setTimeout(onClose, 350); }}>
        ×
      </button>
    </div>
  );
};

export default Toast;
