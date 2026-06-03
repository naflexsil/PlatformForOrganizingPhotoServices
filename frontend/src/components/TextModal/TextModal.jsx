import s from "./TextModal.module.css";

const TextModal = ({ title, text, onClose }) => (
  <div className={s.overlay} onClick={onClose}>
    <div className={s.modal} onClick={(e) => e.stopPropagation()}>
      <div className={s.header}>
        <span className={s.title}>{title}</span>
        <button className={s.closeBtn} onClick={onClose}>&#x2715;</button>
      </div>
      <div className={s.body}>
        <p className={s.text}>{text}</p>
      </div>
    </div>
  </div>
);

export default TextModal;
