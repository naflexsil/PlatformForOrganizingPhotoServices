import { useState } from "react";
import s from "./RoleModal.module.css";
import closeIcon from "../../assets/icons/carousel_close.svg";
import photographerBg from "../../assets/images/photographer_registration.webp";
import clientBg from "../../assets/images/client_registration.webp";

const RoleModal = ({ onClose, onRoleSelected }) => {
  const [showWarning, setShowWarning] = useState(false);

  const handleCloseAttempt = () => setShowWarning(true);

  const handleConfirmClose = () => {
    setShowWarning(false);
    onClose();
  };

  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <button className={s.closeBtn} onClick={handleCloseAttempt}>
          <img src={closeIcon} alt="Закрыть" />
        </button>

        <div className={s.header}>
          <h2 className={s.title}>Зарегистрироваться как</h2>
          <p className={s.subtitle}>Позже нельзя будет поменять роль аккаунта</p>
        </div>

        <div className={s.cards}>
          <button
            className={s.roleCard}
            onClick={() => onRoleSelected("PHOTOGRAPHER")}
          >
            <div
              className={s.cardImage}
              style={{ backgroundImage: `url(${photographerBg})` }}
            />
            <span className={s.cardLabel}>Я фотограф</span>
          </button>

          <button
            className={s.roleCard}
            onClick={() => onRoleSelected("USER")}
          >
            <div
              className={s.cardImage}
              style={{ backgroundImage: `url(${clientBg})` }}
            />
            <span className={s.cardLabel}>Я клиент</span>
          </button>
        </div>

        {showWarning && (
          <div className={s.warningOverlay}>
            <div className={s.warningBox}>
              <p className={s.warningText}>
                Данные не сохранятся. Выйти?
              </p>
              <div className={s.warningButtons}>
                <button
                  className={s.warningStay}
                  onClick={() => setShowWarning(false)}
                >
                  Остаться
                </button>
                <button
                  className={s.warningLeave}
                  onClick={handleConfirmClose}
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleModal;
