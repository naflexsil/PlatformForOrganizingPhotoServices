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
import chartIcon from "../../assets/icons/chart.svg";
import editIcon from "../../assets/icons/edit.svg";
import CreatePostModal from "../../components/CreatePostModal/CreatePostModal";
import PostModal from "../../components/PostModal/PostModal";

const PhotographerProfile = ({ isMyProfile = true }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [posts, setPosts] = useState([]);

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
  });

  const handleCreatePost = ({ images, text }) => {
    if (images.length === 0 && !text.trim()) return;
    const newPost = {
      id: Date.now(),
      images,
      image: images[0] || null,
      text,
      likes: 0,
      liked: false,
      bookmarks: 0,
      pinned: false,
      authorName: `${userData.firstName} ${userData.lastName}`,
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleLike = (postId) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked: !p.liked,
              likes: p.liked ? p.likes - 1 : p.likes + 1,
            }
          : p,
      ),
    );

    setSelectedPost((prev) =>
      prev && prev.id === postId
        ? {
            ...prev,
            liked: !prev.liked,
            likes: prev.liked ? prev.likes - 1 : prev.likes + 1,
          }
        : prev,
    );
  };

  const handleDelete = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setSelectedPost(null);
  };

  const handlePin = (postId) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, pinned: !p.pinned } : p)),
    );
    setSelectedPost(null);
  };

  const handleEdit = (post) => {
    console.log("Редактировать пост:", post);
    setSelectedPost(null);
  };

  const formatLikes = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(".", ",") + "к";
    return String(n);
  };

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
            <button
              className={s.createBtn}
              onClick={() => setIsCreatePostOpen(true)}
            >
              Создать пост
            </button>
          </div>
        )}

        <div className={s.postsSection}>
          {posts.length > 0 ? (
            <div className={s.postsGrid}>
              {posts.map((post) => (
                <div
                  key={post.id}
                  className={s.postCard}
                  onClick={() => setSelectedPost(post)}
                >
                  <div className={s.postImageWrapper}>
                    {post.image ? (
                      <img
                        src={post.image}
                        alt="Пост"
                        className={s.postImage}
                      />
                    ) : (
                      <div className={s.postNoImage} />
                    )}
                  </div>
                  <div className={s.postFooter}>
                    <button
                      className={s.likeBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(post.id);
                      }}
                    >
                      <img
                        src={post.liked ? heartFilledIcon : heartIcon}
                        alt="Лайк"
                        className={s.heartIcon}
                      />
                      <span className={post.liked ? s.likedCount : s.likeCount}>
                        {formatLikes(post.likes)}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={s.emptyPosts}>
              <p>Здесь пока нет публикаций</p>
            </div>
          )}
        </div>
      </div>

      {isCreatePostOpen && (
        <CreatePostModal
          onClose={() => setIsCreatePostOpen(false)}
          onPublish={(data) => {
            handleCreatePost(data);
            setIsCreatePostOpen(false);
          }}
        />
      )}

      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={handleLike}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onPin={handlePin}
          isMyProfile={isMyProfile}
        />
      )}
    </div>
  );
};

export default PhotographerProfile;
