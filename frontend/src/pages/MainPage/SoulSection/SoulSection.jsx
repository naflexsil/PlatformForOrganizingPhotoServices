import React from "react";
import s from "./SoulSection.module.css";
import mirrorImg from "../../../assets/images/picSoulSection.webp";

const SoulSection = ({ onOpenAuthModal }) => {
  const benefits = [
    <>
      Оставь социальные сети для личной жизни, пусть{" "}
      <span className={s.accent}>Psyshe</span> будет твоим рабочим инструментом
    </>,
    "Каждый день сотни клиентов заходят к нам в поисках фотографа, твой профиль не останется без внимания",
    "Разнообразные типы фотосъемок, подробная настройка прайс-листов и скидок – заказы даже в путешествиях!",
  ];

  return (
    <section className={s.soul}>
      <div className={s.container}>
        <div className={s.contentWrapper}>
          <div className={s.textSide}>
            <h2 className={s.title}>PSYSHE ДЛЯ ДУШИ</h2>
            <p className={s.subtitle}>
              Вы уже работаете фотографом или только хотите начать свою карьеру?
            </p>

            <ul className={s.benefitsList}>
              {benefits.map((content, index) => (
                <li key={index} className={s.benefitItem}>
                  <span className={s.star}></span>
                  <span>{content}</span>
                </li>
              ))}
            </ul>

            <button className={s.regBtn} onClick={onOpenAuthModal}>
              Зарегистрироваться
            </button>
          </div>

          <div className={s.imageSide}>
            <img
              src={mirrorImg}
              alt="Зеркало для души"
              className={s.mainImage}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SoulSection;
