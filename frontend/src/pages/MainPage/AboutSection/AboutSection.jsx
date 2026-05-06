import React from "react";
import s from "./AboutSection.module.css";
import aboutImg from "../../../assets/images/picAboutSection.png";

const AboutSection = () => {
  return (
    <section className={s.about}>
      <div className={s.contentWrapper}>
        <div className={s.textSide}>
          <h2 className={s.title}>
            ФОТОГРАФИИ, КОТОРЫЕ <br /> ГРЕЮТ ДУШУ
          </h2>

          <div className={s.description}>
            <p>
              Каждая фотография – это история, которую хочется рассказывать в
              уютном кругу своих близких. А <strong>Psyshe</strong> поможет
              сделать вашу историю по-настоящему незабываемой.
            </p>
            <p>
              Мы соединяем клиентов с фотографами, помогаем безопасно
              договориться и организовать съемку.
            </p>
          </div>

          <button className={s.showBtn}>Показать фотографов</button>
        </div>

        <div className={s.imageSide}>
          <img src={aboutImg} alt="Декор и камера" className={s.mainImage} />
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
