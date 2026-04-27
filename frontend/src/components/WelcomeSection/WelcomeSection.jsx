import React from "react";
import s from "./WelcomeSection.module.css";
import welcomeImg from "../../assets/images/picWelcomeSection.png";

const WelcomeSection = () => {
  return (
    <section className={s.welcome}>
      <div className={s.textSide}>
        <h1 className={s.title}>
          МОМЕНТЫ, <br />
          <span className={s.highlight}>КОТОРЫЕ СТОИТ ПОМНИТЬ</span>
        </h1>
        <p className={s.subtitle}>ФОТОГРАФ, КОТОРЫЙ ИХ ПОЧУВСТВУЕТ</p>
        <button className={s.actionBtn}>Найти фотографа</button>
      </div>

      <div className={s.imageSide}>
        <img src={welcomeImg} alt="Коллаж работ" className={s.mainImage} />
      </div>
    </section>
  );
};

export default WelcomeSection;
