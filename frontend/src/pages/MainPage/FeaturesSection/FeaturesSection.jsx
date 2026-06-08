import React from "react";
import s from "./FeaturesSection.module.css";
import photoFilter from "../../../assets/images/photo_filter.webp";
import photoComm from "../../../assets/images/photo_comm.webp";

const FeaturesSection = () => {
  const features = [
    {
      title: "СОЗДАНИЕ СДЕЛОК",
      desc: (
        <>
          Договаривайтесь с фотографом внутри чата <br />и просматривайте историю сделок
        </>
      ),
      overlayPhoto: null,
    },
    {
      title: "ПОИСК И ФИЛЬТРАЦИЯ",
      desc: (
        <>
          Найдите фотографа именно <br /> под ваш стиль и бюджет
        </>
      ),
      overlayPhoto: photoFilter,
    },
    {
      title: "ДРУЖНОЕ КОМЬЮНИТИ",
      desc: (
        <>
          Обсудите с пользователем, <br /> как прошла его съемка
        </>
      ),
      overlayPhoto: photoComm,
    },
    {
      title: "ЭКОНОМИЯ ВРЕМЕНИ",
      desc: (
        <>
          Лента вдохновения, чат и фотографы – <br /> в одном окне браузера
        </>
      ),
      overlayPhoto: null,
    },
  ];

  return (
    <section className={s.features}>
      <div className={s.titleDivider}>
        <h2 className={s.mainTitle}>СОСРЕДОТОЧЬТЕСЬ НА ГЛАВНОМ</h2>
      </div>

      <div className={s.grid}>
        {features.map((f, index) => (
          <div key={index} className={s.card}>
            {f.overlayPhoto && (
              <img
                src={f.overlayPhoto}
                alt={f.title}
                className={s.overlayImage}
              />
            )}

            <div className={s.contentOverlay}>
              <h3 className={s.cardTitle}>{f.title}</h3>
              <p className={s.cardDesc}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
