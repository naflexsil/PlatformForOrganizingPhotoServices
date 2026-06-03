import s from "./AcceptDealModal.module.css";

const AcceptDealModal = ({ onAccept, onClose }) => (
  <div className={s.overlay} onClick={onClose}>
    <div className={s.modal} onClick={(e) => e.stopPropagation()}>
      <h2 className={s.title}>Важно перед подтверждением</h2>
      <div className={s.body}>
        <p>Платформа <strong>psyshe.art</strong> находится в разработке.</p>
        <ul>
          <li>Не переводите деньги, если не доверяете исполнителю лично.</li>
          <li>Сайт <strong>не несёт ответственности</strong> за финансовые потери или утечку данных.</li>
          <li>Все расчёты происходят за пределами платформы.</li>
          <li>При возникновении споров обращайтесь в поддержку.</li>
        </ul>
      </div>
      <div className={s.actions}>
        <button className={s.rejectBtn} onClick={onClose}>Отказаться</button>
        <button className={s.acceptBtn} onClick={onAccept}>Я принимаю условия</button>
      </div>
    </div>
  </div>
);

export default AcceptDealModal;
