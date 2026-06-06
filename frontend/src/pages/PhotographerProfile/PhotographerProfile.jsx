import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import s from "./PhotographerProfile.module.css";
import settingsIcon from "../../assets/icons/settings.svg";
import starIcon from "../../assets/icons/star.svg";
import locIcon from "../../assets/icons/location.svg";
import clockIcon from "../../assets/icons/clock.svg";
import expIcon from "../../assets/icons/experience.svg";
import heartIcon from "../../assets/icons/heart.svg";
import heartFilledIcon from "../../assets/icons/heart_filled.svg";
import defaultAvatar from "../../assets/images/default_avatar.webp";
import chartIcon from "../../assets/icons/chart.svg";
import editIcon from "../../assets/icons/edit.svg";
import deleteIcon from "../../assets/icons/delete.svg";
import CreatePostModal from "../../components/CreatePostModal/CreatePostModal";
import PostModal from "../../components/PostModal/PostModal";
import PhotoModal from "../../components/PhotoModal/PhotoModal";
import EditPostModal from "../../components/EditPostModal/EditPostModal";
import EditProfile from "../EditProfile/EditProfile";
import SubscribersModal from "../../components/SubscribersModal/SubscribersModal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

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
  searchPhotos: [],
  subscribersCount: 0,
  subscriptionsCount: 0,
};

const normalizePost = (p) => ({
  id: p.id,
  photos: (p.photos || []).map((ph) => ({
    id: ph.id,
    urlPreview: ph.urlPreview,
    urlOriginal: ph.urlOriginal,
    likesCount: ph.likesCount ?? 0,
    favoritesCount: ph.favoritesCount ?? 0,
    isLiked: ph.isLiked ?? false,
    isFavorited: ph.isFavorited ?? false,
  })),
  images: p.photos?.map((ph) => ph.urlPreview) || p.images || [],
  description: p.description || "",
  likes: p.likesCount ?? 0,
  favoritesCount: p.favoritesCount ?? 0,
  isLiked: p.isLiked ?? false,
  isFavorited: p.isFavorited ?? false,
  isPinned: p.isPinned ?? false,
  createdAt: p.createdAt,
  author: p.author,
  authorId: p.authorId,
});

const PhotographerProfile = ({ isMyProfile = true, profileData = null }) => {
  const { accessToken, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(!profileData);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subsModal, setSubsModal] = useState(null);
  const settingsRef = useRef(null);

  const [userData, setUserData] = useState(profileData ?? EMPTY_PROFILE);

  // Load subscription status when viewing another photographer's profile
  useEffect(() => {
    if (isMyProfile || !accessToken || !userData.id) return;
    fetch(`/api/subscriptions/${userData.id}/check`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.status === "success") setIsSubscribed(data.subscribed); })
      .catch(() => {});
  }, [isMyProfile, accessToken, userData.id]);

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
          searchPhotos: ph?.searchPhotos || [],
          subscribersCount: d.subscribersCount ?? 0,
          subscriptionsCount: d.subscriptionsCount ?? 0,
        });
      })
      .finally(() => setIsLoading(false));
  }, [profileData, accessToken]);

  useEffect(() => {
    if (!userData.id) return;
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    fetch(`/api/posts?authorId=${userData.id}`, { headers })
      .then((r) => r.json())
      .then((result) => {
        if (result.status === "success") {
          setPosts(result.data.map(normalizePost));
        }
      });
  }, [userData.id, accessToken]);

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
    const { favorited, count } = result.data;
    const update = (p) =>
      p.id === postId ? { ...p, isFavorited: favorited, favoritesCount: count } : p;
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

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await res.json();
      if (result.status !== "success") throw new Error(result.message);
      logout();
      navigate("/");
    } catch (err) {
      showToast(err.message || "Не удалось удалить аккаунт", "error");
      setShowDeleteConfirm(false);
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
    if (result.status !== "success") {
      showToast("Вы не можете закрепить более 3 постов!", "error");
      return;
    }
    const updated = normalizePost(result.data);
    setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    setSelectedPost(updated);
    showToast(isPinned ? "Вы закрепили пост" : "Вы открепили пост", "success");
  };

  const handleEditPost = async (postId, { description, addPhotoIds, removePhotoIds }) => {
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ description, addPhotoIds, removePhotoIds }),
    });
    const result = await res.json();
    if (result.status !== "success") return;
    const updated = normalizePost(result.data);
    setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    setSelectedPost(updated);
    setEditingPost(null);
  };

  const handleSubscribe = async () => {
    if (!accessToken) {
      showToast("Войдите в аккаунт, чтобы подписаться", "error");
      return;
    }
    setSubscribeLoading(true);
    try {
      const r = await fetch(`/api/subscriptions/${userData.id}/toggle`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await r.json();
      if (data.status === "success") {
        setIsSubscribed(data.subscribed);
        setUserData((prev) => ({
          ...prev,
          subscribersCount: prev.subscribersCount + (data.subscribed ? 1 : -1),
        }));
        showToast(data.subscribed ? "Вы подписались" : "Вы отписались", "success");
      }
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!accessToken) {
      showToast("Войдите в аккаунт, чтобы написать сообщение", "error");
      return;
    }
    try {
      const r = await fetch("/api/chats/start", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companionId: userData.id }),
      });
      const data = await r.json();
      if (data.status === "success") {
        navigate(`/chats/${data.data.id}`);
      }
    } catch {
      showToast("Не удалось открыть чат", "error");
    }
  };

  const handleCopyTag = async () => {
    try {
      await navigator.clipboard.writeText(userData.username);
      showToast("Тег скопирован", "success");
    } catch {
      showToast("Не удалось скопировать", "error");
    }
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
          avatar: userData.avatarUrl,
          searchPhotos: userData.searchPhotos,
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
            ...(data.avatar && { avatarUrl: data.avatar }),
            ...(data.avatarUrlOriginal && { avatarUrlOriginal: data.avatarUrlOriginal }),
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
    <>
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
                <p
                  className={s.username}
                  onClick={handleCopyTag}
                  title="Нажмите, чтобы скопировать"
                >{userData.username}</p>
              </div>
              <div className={s.stats}>
                <p>
                  <span className={s.clickableStat} onClick={() => setSubsModal("subscribers")}>Подписчики</span>
                  {" "}{userData.subscribersCount}
                </p>
                <p>
                  <span className={s.clickableStat} onClick={() => setSubsModal("subscriptions")}>Подписки</span>
                  {" "}{userData.subscriptionsCount}
                </p>
              </div>
              {!isMyProfile && (
                <button
                  className={isSubscribed ? s.unsubscribeBtn : s.subscribeBtn}
                  onClick={handleSubscribe}
                  disabled={subscribeLoading}
                >
                  {isSubscribed ? "Отписаться" : "Подписаться"}
                </button>
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
                        <div
                          className={s.modalItem}
                          onClick={() => { setIsSettingsOpen(false); navigate('/stats'); }}
                        >
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
                        <div
                          className={`${s.modalItem} ${s.modalItemDelete}`}
                          onClick={() => {
                            setIsSettingsOpen(false);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <img src={deleteIcon} alt="Delete" />
                          <span>Удалить аккаунт</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className={s.bioText}>{userData.bio}</p>
              {!isMyProfile && (
                <button className={s.messageBtn} onClick={handleMessage}>Написать</button>
              )}
            </div>
          </div>
        </section>

        <div className={s.infoGrid}>
          <div className={s.priceBlock}>
            <div className={s.blockHeader}>
              <h2>Прайс</h2>
              <button
                className={s.portfolioBtn}
                onClick={() => navigate(`/@${userData.username.replace(/^@/, "")}/portfolio`)}
              >Портфолио</button>
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

      {selectedPost && !editingPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={handleLike}
          onFavorite={handleFavorite}
          onDelete={handleDelete}
          onPin={handlePin}
          onEdit={(post) => setEditingPost(post)}
          onPhotoClick={(photo) => setSelectedPhoto(photo)}
          isMyProfile={isMyProfile}
        />
      )}

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          accessToken={accessToken}
        />
      )}

      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={handleEditPost}
          accessToken={accessToken}
        />
      )}

      {isPriceModalOpen && (
        <PriceModal
          text={userData.priceText}
          onClose={() => setIsPriceModalOpen(false)}
        />
      )}

      {subsModal && (
        <SubscribersModal
          userId={userData.id}
          type={subsModal}
          onClose={() => setSubsModal(null)}
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

    {showDeleteConfirm && (
      <div className={s.confirmOverlay} onClick={() => setShowDeleteConfirm(false)}>
        <div className={s.confirmModal} onClick={(e) => e.stopPropagation()}>
          <h3 className={s.confirmTitle}>Удалить аккаунт?</h3>
          <p className={s.confirmText}>
            Ваш профиль и публикации будут скрыты. При следующем входе через VK ID вы сможете восстановить аккаунт.
          </p>
          <div className={s.confirmActions}>
            <button className={s.confirmCancel} onClick={() => setShowDeleteConfirm(false)}>
              Отмена
            </button>
            <button className={s.confirmDelete} onClick={handleDeleteAccount}>
              Удалить
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default PhotographerProfile;
