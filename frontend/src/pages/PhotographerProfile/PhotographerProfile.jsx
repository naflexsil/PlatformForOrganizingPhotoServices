import { useState, useEffect, useRef } from "react";
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
import EditProfile from "../EditProfile/EditProfile";
import { useAuth } from "../../context/AuthContext";

const PRICE_PREVIEW_LIMIT = 80;

const PriceModal = ({ text, onClose }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className={s.priceOverlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={s.priceModal}>
        <h2 className={s.priceModalTitle}>Прайс</h2>
        <p className={s.priceModalText}>{text}</p>
        <button className={s.priceModalClose} onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
};

const EMPTY_PROFILE = {
  id: null,
  firstName: "",
  lastName: "",
  username: "",
  bio: "",
  rating: "—",
  city: "—",
  experienceYears: "",
  experienceMonths: "",
  deliveryDays: "",
  hourlyRate: "",
  priceText: "",
  avatarUrl: null,
  avatarUrlOriginal: null,
};

const normalizePost = (p) => ({
  id: p.id,
  images: p.photos?.map((ph) => ph.urlPreview) || p.images || [],
  originalImages: p.photos?.map((ph) => ph.urlOriginal) || p.images || [],
  description: p.description || "",
  likes: p._count?.likes ?? 0,
  isLiked: p.isLiked ?? false,
  isFavorited: p.isFavorited ?? false,
  isPinned: p.isPinned ?? false,
  createdAt: p.createdAt,
  author: p.author,
  authorId: p.authorId,
});

const PhotographerProfile = ({ isMyProfile = true, profileData = null }) => {
  const { accessToken } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
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
        const ph = d.photographer;
        setUserData({
          id: d.id,
          firstName: d.firstName || "",
          lastName: d.lastName || "",
          username: "@" + (d.tag || ""),
          bio: d.bio || "",
          rating: ph?.rating != null ? String(ph.rating).replace(".", ",") : "—",
          city: d.city || "—",
          experienceYears: ph?.experienceYears != null ? String(ph.experienceYears) : "",
          experienceMonths: ph?.experienceMonths != null ? String(ph.experienceMonths) : "",
          deliveryDays: ph?.deliveryTime != null ? String(ph.deliveryTime) : "",
          hourlyRate: ph?.pricePerHour != null ? String(ph.pricePerHour) : "",
          priceText: ph?.additionalPriceInfo || "",
          avatarUrl: d.avatarUrl || null,
          avatarUrlOriginal: d.avatarUrlOriginal || d.avatarUrl || null,
        });
      })
      .finally(() => setIsLoading(false));
  }, [profileData, accessToken]);

  useEffect(() => {
    if (!userData.id || profileData) return;
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    fetch(`/api/posts?authorId=${userData.id}`, { headers })
      .then((r) => r.json())
      .then((result) => {
        if (result.status === "success") {
          setPosts(result.data.map(normalizePost));
        }
      });
  }, [userData.id, accessToken, profileData]);

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

  const formatExperience = (years, months) => {
    const y = Number(years);
    const m = Number(months);
    const parts = [];
    if (y > 0) parts.push(`${y} лет`);
    if (m > 0) parts.push(`${m} месяцев`);
    return parts.length > 0 ? parts.join(" ") : "—";
  };

  const formatDelivery = (days) => {
    const d = Number(days);
    return d > 0 ? `от ${d} дней` : "—";
  };

  const handleCreatePost = async ({ photoIds, description }) => {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ description, photoIds }),
    });
    const result = await res.json();
    if (result.status === "success") {
      setPosts((prev) => [normalizePost(result.data), ...prev]);
    }
  };

  const handleLike = async (postId) => {
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const result = await res.json();
    if (result.status !== "success") return;
    const { liked, count } = result.data;
    const update = (p) =>
      p.id === postId ? { ...p, isLiked: liked, likes: count } : p;
    setPosts((prev) => prev.map(update));
    setSelectedPost((prev) => (prev?.id === postId ? update(prev) : prev));
  };

  const handleFavorite = async (postId) => {
    const res = await fetch(`/api/posts/${postId}/favorite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const result = await res.json();
    if (result.status !== "success") return;
    const { favorited } = result.data;
    const update = (p) =>
      p.id === postId ? { ...p, isFavorited: favorited } : p;
    setPosts((prev) => prev.map(update));
    setSelectedPost((prev) => (prev?.id === postId ? update(prev) : prev));
  };

  const handleDelete = async (postId) => {
    const res = await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSelectedPost(null);
    }
  };

  const handlePin = async (postId, isPinned) => {
    const res = await fetch(`/api/posts/${postId}/pin`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ isPinned }),
    });
    const result = await res.json();
    if (result.status !== "success") return;
    const updated = normalizePost(result.data);
    setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    setSelectedPost(updated);
  };

  const handleSaveEdit = async (postId, description) => {
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ description }),
    });
    const result = await res.json();
    if (result.status !== "success") return;
    const updated = normalizePost(result.data);
    setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    setSelectedPost(updated);
  };

  const formatLikes = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(".", ",") + "к";
    return String(n);
  };

  if (isLoading) return <div className={s.pageWrapper} />;

  if (isEditProfileOpen) {
    return (
      <EditProfile
        isPhotographer={true}
        initialData={{
          firstName: userData.firstName,
          lastName: userData.lastName,
          username: userData.username,
          city: userData.city,
          bio: userData.bio,
          hourlyRate: userData.hourlyRate,
          priceList: userData.priceText,
          experienceYears: userData.experienceYears,
          experienceMonths: userData.experienceMonths,
          deliveryDays: userData.deliveryDays,
        }}
        onSave={(data) => {
          setUserData((prev) => ({
            ...prev,
            firstName: data.firstName,
            lastName: data.lastName,
            username: "@" + data.tag,
            city: data.city,
            bio: data.bio,
            hourlyRate: data.hourlyRate,
            priceText: data.priceList || prev.priceText,
            experienceYears: data.experienceYears,
            experienceMonths: data.experienceMonths,
            deliveryDays: data.deliveryDays,
          }));
          setIsEditProfileOpen(false);
        }}
        onCancel={() => setIsEditProfileOpen(false)}
      />
    );
  }

  const pricePreview =
    userData.priceText.length > PRICE_PREVIEW_LIMIT
      ? userData.priceText.slice(0, PRICE_PREVIEW_LIMIT) + "..."
      : userData.priceText;

  return (
    <div className={s.pageWrapper}>
      <div className={s.container}>
        <section className={s.profileCard}>
          <div className={s.avatarWrapper}>
            <img
              src={userData.avatarUrl || defaultAvatar}
              alt="Avatar"
              className={`${s.avatar} ${userData.avatarUrl ? s.avatarClickable : ""}`}
              onClick={() => userData.avatarUrl && setIsAvatarOpen(true)}
            />
          </div>

          <div className={s.profileContent}>
            <div className={s.leftCol}>
              <div className={s.nameBlock}>
                <h1>{userData.firstName} {userData.lastName}</h1>
                <p className={s.username}>{userData.username}</p>
              </div>
              <div className={s.stats}>
                <p><span className={s.clickableStat}>Подписчики</span> 0</p>
                <p><span className={s.clickableStat}>Подписки</span> 0</p>
              </div>
              {!isMyProfile && (
                <button className={s.subscribeBtn}>Подписаться</button>
              )}
            </div>

            <div className={s.rightCol}>
              <div className={s.roleBlock}>
                <span className={s.roleLabel}>Фотограф</span>
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
                          <img src={chartIcon} alt="Stats" />
                          <span>Статистика</span>
                        </div>
                        <div
                          className={s.modalItem}
                          onClick={() => {
                            setIsSettingsOpen(false);
                            setIsEditProfileOpen(true);
                          }}
                        >
                          <img src={editIcon} alt="Edit" />
                          <span>Редактировать профиль</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className={s.bioText}>{userData.bio}</p>
              {!isMyProfile && (
                <button className={s.messageBtn}>Написать</button>
              )}
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
              <p className={s.priceText}>{pricePreview}</p>
              {userData.priceText.length > PRICE_PREVIEW_LIMIT && (
                <button
                  className={s.moreBtn}
                  onClick={() => setIsPriceModalOpen(true)}
                >
                  Подробнее
                </button>
              )}
            </div>
          </div>

          <div className={s.detailsBlock}>
            <div className={s.detailRow}>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Оказываю услуги в</span>
                <div className={s.detailValueLine}>
                  <img src={locIcon} alt="Location" />
                  <strong>{userData.city}</strong>
                </div>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Рейтинг</span>
                <div className={s.detailValueLine}>
                  <img src={starIcon} alt="Rating" />
                  <strong>{userData.rating}</strong>
                </div>
              </div>
            </div>
            <div className={s.detailRow}>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Срок сдачи</span>
                <div className={s.detailValueLine}>
                  <img src={clockIcon} alt="Delivery" />
                  <strong>{formatDelivery(userData.deliveryDays)}</strong>
                </div>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Опыт</span>
                <div className={s.detailValueLine}>
                  <img src={expIcon} alt="Experience" />
                  <strong>
                    {formatExperience(userData.experienceYears, userData.experienceMonths)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isMyProfile && (
          <div className={s.createPostBanner}>
            <span>Есть чем поделиться? Мы ждем!</span>
            <button className={s.createBtn} onClick={() => setIsCreatePostOpen(true)}>
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
                    {post.images[0] ? (
                      <img
                        src={post.images[0]}
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
                        src={post.isLiked ? heartFilledIcon : heartIcon}
                        alt="Лайк"
                        className={s.heartIcon}
                      />
                      <span className={post.isLiked ? s.likedCount : s.likeCount}>
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
          accessToken={accessToken}
          onClose={() => setIsCreatePostOpen(false)}
          onPublish={async (data) => {
            await handleCreatePost(data);
            setIsCreatePostOpen(false);
          }}
        />
      )}

      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={handleLike}
          onFavorite={handleFavorite}
          onDelete={handleDelete}
          onPin={handlePin}
          onSaveEdit={handleSaveEdit}
          isMyProfile={isMyProfile}
        />
      )}

      {isPriceModalOpen && (
        <PriceModal
          text={userData.priceText}
          onClose={() => setIsPriceModalOpen(false)}
        />
      )}

      {isAvatarOpen && (
        <div
          className={s.avatarOverlayModal}
          onClick={() => setIsAvatarOpen(false)}
        >
          <img
            src={userData.avatarUrlOriginal || userData.avatarUrl}
            alt="Фото профиля"
            className={s.avatarFullImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default PhotographerProfile;
