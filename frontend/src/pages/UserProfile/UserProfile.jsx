import { useState, useEffect, useRef } from "react";
import s from "./UserProfile.module.css";
import settingsIcon from "../../assets/icons/settings.svg";
import locIcon from "../../assets/icons/location.svg";
import heartIcon from "../../assets/icons/heart.svg";
import heartFilledIcon from "../../assets/icons/heart_filled.svg";
import defaultAvatar from "../../assets/images/default_avatar.png";
import editIcon from "../../assets/icons/edit.svg";
import PostModal from "../../components/PostModal/PostModal";
import { useAuth } from "../../context/AuthContext";

const EMPTY_PROFILE = {
  firstName: "",
  lastName: "",
  username: "",
  bio: "",
  city: "—",
};

const UserProfile = ({ isMyProfile = true, profileData = null }) => {
  const { accessToken } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(!profileData);
  const settingsRef = useRef(null);

  const [userData, setUserData] = useState(profileData ?? EMPTY_PROFILE);

  useEffect(() => {
    if (profileData || !accessToken) return;
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((result) => {
        if (result.status !== "success") return;
        const d = result.data;
        setUserData({
          firstName: d.firstName || "",
          lastName: d.lastName || "",
          username: "@" + (d.tag || ""),
          bio: d.bio || "",
          city: d.city || "—",
        });
      })
      .finally(() => setIsLoading(false));
  }, [profileData, accessToken]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsOpen]);

  const handleLike = (postId) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p,
      ),
    );
    setSelectedPost((prev) =>
      prev && prev.id === postId
        ? { ...prev, liked: !prev.liked, likes: prev.liked ? prev.likes - 1 : prev.likes + 1 }
        : prev,
    );
  };

  const handleDelete = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setSelectedPost(null);
  };

  const formatLikes = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(".", ",") + "к";
    return String(n);
  };

  if (isLoading) {
    return <div className={s.pageWrapper} />;
  }

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
                {userData.city && userData.city !== "—" && (
                  <p className={s.cityRow}>
                    <img src={locIcon} alt="" className={s.cityIcon} />
                    {userData.city}
                  </p>
                )}
              </div>
            </div>

            <div className={s.rightCol}>
              <div className={s.roleBlock}>
                <span className={s.roleLabel}>Клиент</span>
                {isMyProfile && (
                  <div className={s.settingsWrapper} ref={settingsRef}>
                    <img
                      src={settingsIcon}
                      className={s.iconBtn}
                      alt="Settings"
                      onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    />
                    {isSettingsOpen && (
                      <div className={s.settingsModal}>
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
              </div>
              {!isMyProfile && (
                <div className={s.actionRow}>
                  <button className={s.subscribeBtn}>Подписаться</button>
                  <button className={s.messageBtn}>Написать</button>
                </div>
              )}
            </div>
          </div>
        </section>

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
                      <img src={post.image} alt="Пост" className={s.postImage} />
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

      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={handleLike}
          onDelete={handleDelete}
          onEdit={() => setSelectedPost(null)}
          onPin={() => setSelectedPost(null)}
          isMyProfile={isMyProfile}
        />
      )}
    </div>
  );
};

export default UserProfile;
