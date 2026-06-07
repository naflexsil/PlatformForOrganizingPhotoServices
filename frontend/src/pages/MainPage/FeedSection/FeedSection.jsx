import React from "react";
import { useNavigate } from "react-router-dom";
import s from "./FeedSection.module.css";
import feedPhoto from "../../../assets/images/feed_preview.webp";

const FeedSection = () => {
  const navigate = useNavigate();

  return (
    <section className={s.feed}>
      <div className={s.container}>
        <div className={s.mainCard}>
          <div className={s.textContent}>
            <h2 className={s.title}>ЛЕНТА ВДОХНОВЕНИЯ</h2>
            <p className={s.description}>
              Не знаете, какой образ себе подобрать? <br />
              Какой ракурс будет тем самым? <br />
              Или может в какую позу лучше встать? <br />
              Посмотрите, что фотографируют другие!
            </p>
            <button className={s.showBtn} onClick={() => navigate("/feed")}>
              Перейти на ленту
            </button>
          </div>

          <div className={s.imageWrapper}>
            <img src={feedPhoto} alt="Лента вдохновения" className={s.photo} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeedSection;
