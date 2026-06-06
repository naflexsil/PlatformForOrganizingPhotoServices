import React from "react";
import s from "./WelcomeSection.module.css";
import welcomeImg from "../../../assets/images/picWelcomeSection.webp";

const WelcomeSection = () => {
  return (
    <section className={s.welcome}>
      <div className={s.contentWrapper}>
        <div className={s.textSide}>
          <h1 className={s.title}>
            <span className={s.pink}>МОМЕНТЫ</span>
            <span className={s.red}>,</span> <br />
            <span className={s.red}>КОТОРЫЕ СТОИТ</span>{" "}
            <span className={s.pink}>ПОМНИТЬ</span>
          </h1>

          <h2 className={`${s.title} ${s.subtitle}`}>
            <span className={s.pink}>ФОТОГРАФ</span>
            <span className={s.red}>,</span>{" "}
            <span className={s.red}>КОТОРЫЙ ИХ</span> <br />
            <span className={s.pink}>ПОЧУВСТВУЕТ</span>
          </h2>
        </div>

        <div className={s.imageSide}>
          <img src={welcomeImg} alt="Коллаж работ" className={s.mainImage} />
          <button className={s.actionBtn}>Найти фотографа</button>
        </div>
      </div>
    </section>
  );
};

export default WelcomeSection;
