import s from "./AcceptDealModal.module.css";

const AcceptDealModal = ({ onAccept, onClose }) => (
  <div className={s.overlay} onClick={onClose}>
    <div className={s.modal} onClick={(e) => e.stopPropagation()}>
      <h2 className={s.title}>Важно перед подтверждением</h2>
      <div className={s.body}>
        <p>Платформа psyshe.art находится в разработке.</p>
        <p>Не переводите деньги, если не доверяете исполнителю лично.</p>
        <p>Сайт не несет ответственности за финансовые потери или утечку данных.</p>
        <p>Все денежные расчеты происходят за пределами платформы.</p>
        <p>При возникновении споров обращайтесь в поддержку.</p>
      </div>
      <div className={s.actions}>
        <button className={s.rejectBtn} onClick={(e) => { e.stopPropagation(); onClose(); }}>Отказаться</button>
        <button className={s.acceptBtn} onClick={(e) => { e.stopPropagation(); onAccept(); }}>Я принимаю условия</button>
      </div>
    </div>
  </div>
);

export default AcceptDealModal;
