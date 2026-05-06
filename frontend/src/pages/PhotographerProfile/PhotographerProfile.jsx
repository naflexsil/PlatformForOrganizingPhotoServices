import React, { useState } from "react";
import s from "./PhotographerProfile.module.css";
import settingsIcon from "../../assets/icons/settings.svg";
import starIcon from "../../assets/icons/star.svg";
import locIcon from "../../assets/icons/location.svg";
import clockIcon from "../../assets/icons/clock.svg";
import expIcon from "../../assets/icons/experience.svg";
import heartIcon from "../../assets/icons/heart.svg";
import heartFilledIcon from "../../assets/icons/heart_filled.svg";
import defaultAvatar from "../../assets/images/default_avatar.png";
import mailLogo from "../../assets/icons/mail_logo.svg";
import chartIcon from "../../assets/icons/chart.svg";
import editIcon from "../../assets/icons/edit.svg";

const PhotographerProfile = ({ isMyProfile = true }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [userData] = useState({
    firstName: "Алина",
    lastName: "Старикова",
    username: "@flexsana",
    bio: "Обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне обо мне...",
    rating: "4,56",
    city: "Кемерово",
    experience: "11 месяцев",
    deliveryTime: "от 3 дней",
    priceText:
      "Час от 4500 руб. Свадебная съемка от 4500 руб. Парная съемка от 4500 руб.",
    posts: [],
  });

  return (
    <div className={s.pageWrapper}>
      <div className={s.container}>
        <section className={s.profileCard}>
          <div className={s.avatarWrapper}>
            <img src={defaultAvatar} alt="Avatar" className={s.avatar} />
          </div>

          <div className={s.profileContent}>
            <div className={s.leftCol}>
              <div className={s.nameBlock}>
                <h1>
                  {userData.firstName} {userData.lastName}
                </h1>
                <p className={s.username}>{userData.username}</p>
              </div>

              <div className={s.stats}>
                <p>
                  <span className={s.clickableStat}>Подписчики</span> 0
                </p>
                <p>
                  <span className={s.clickableStat}>Подписки</span> 0
                </p>
              </div>

              <div className={s.rating}>
                <img src={starIcon} alt="Rating" /> {userData.rating}
              </div>
            </div>

            <div className={s.rightCol}>
              <div className={s.roleBlock}>
                <span className={s.roleLabel}>Фотограф</span>
                {isMyProfile && (
                  <div className={s.settingsWrapper}>
                    <img
                      src={settingsIcon}
                      className={s.iconBtn}
                      alt="Settings"
                      onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    />
                    {isSettingsOpen && (
                      <div className={s.settingsModal}>
                        <div className={s.modalItem}>
                          <img src={chartIcon} alt="Stats" />
                          <span>Статистика</span>
                        </div>
                        <div className={s.modalItem}>
                          <img src={editIcon} alt="Edit" />
                          <span>Редактировать профиль</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={s.bio}>
                <p>{userData.bio}</p>
                {!isMyProfile && (
                  <button className={s.messageBtn}>Написать</button>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className={s.infoGrid}>
          <div className={s.priceBlock}>
            <div className={s.blockHeader}>
              <h2>Прайс</h2>
              <button className={s.portfolioBtn}>Портфолио</button>
            </div>
            <div className={s.priceContent}>
              <p className={s.priceText}>{userData.priceText}</p>
              {userData.priceText.length > 50 && (
                <button className={s.moreBtn}>Подробнее</button>
              )}
            </div>
          </div>

          <div className={s.detailsBlock}>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>Оказываю услуги в</span>
              <div className={s.detailValueLine}>
                <img src={locIcon} alt="Location" />
                <strong>{userData.city}</strong>
              </div>
            </div>
            <div className={s.detailRow}>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Срок сдачи</span>
                <div className={s.detailValueLine}>
                  <img src={clockIcon} alt="Delivery" />
                  <strong>{userData.deliveryTime}</strong>
                </div>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Опыт</span>
                <div className={s.detailValueLine}>
                  <img src={expIcon} alt="Experience" />
                  <strong>{userData.experience}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isMyProfile && (
          <div className={s.createPostBanner}>
            <span>Есть чем поделиться? Мы ждем!</span>
            <button className={s.createBtn}>Создать пост</button>
          </div>
        )}

        <div className={s.postsSection}>
          {userData.posts.length > 0 ? (
            <div className={s.postsGrid}></div>
          ) : (
            <div className={s.emptyPosts}>
              <p>Здесь пока нет публикаций</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotographerProfile;
