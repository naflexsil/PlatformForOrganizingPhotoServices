import { useState, useEffect, useRef } from "react";
import s from "./UserProfile.module.css";
import settingsIcon from "../../assets/icons/settings.svg";
import locIcon from "../../assets/icons/location.svg";
import heartIcon from "../../assets/icons/heart.svg";
import heartFilledIcon from "../../assets/icons/heart_filled.svg";
import defaultAvatar from "../../assets/images/default_avatar.png";
import editIcon from "../../assets/icons/edit.svg";
import PostModal from "../../components/PostModal/PostModal";
import PhotoModal from "../../components/PhotoModal/PhotoModal";
import CreatePostModal from "../../components/CreatePostModal/CreatePostModal";
import EditPostModal from "../../components/EditPostModal/EditPostModal";
import EditProfile from "../EditProfile/EditProfile";
import { useAuth } from "../../context/AuthContext";

const EMPTY_PROFILE = {
  id: null,
  firstName: "",
  lastName: "",
  username: "",
  bio: "",
  city: "—",
  avatarUrl: null,
  avatarUrlOriginal: null,
};

const normalizePost = (p) => ({
  id: p.id,
  photos: (p.photos || []).map((ph) => ({
    id: ph.id,
    urlPreview: ph.urlPreview,
    urlOriginal: ph.urlOriginal,
    likesCount: ph._count?.likes ?? 0,
    favoritesCount: ph._count?.favorites ?? 0,
    isLiked: ph.isLiked ?? false,
    isFavorited: ph.isFavorited ?? false,
  })),
  images: p.photos?.map((ph) => ph.urlPreview) || p.images || [],
  description: p.description || "",
  likes: p._count?.likes ?? 0,
  isLiked: p.isLiked ?? false,
  isFavorited: p.isFavorited ?? false,
  isPinned: p.isPinned ?? false,
  createdAt: p.createdAt,
  author: p.author,
  authorId: p.authorId,
});

const UserProfile = ({ isMyProfile = true, profileData = null }) => {
  const { accessToken } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
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
          id: d.id,
          firstName: d.firstName || "",
          lastName: d.lastName || "",
          username: "@" + (d.tag || ""),
          bio: d.bio || "",
          city: d.city || "—",
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

  const formatLikes = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(".", ",") + "к";
    return String(n);
  };

  if (isLoading) return <div className={s.pageWrapper} />;

  if (isEditProfileOpen) {
    return (
      <EditProfile
        isPhotographer={false}
        initialData={{
          firstName: userData.firstName,
          lastName: userData.lastName,
          username: userData.username,
          city: userData.city,
          bio: userData.bio,
          avatar: userData.avatarUrl,
        }}
        onSave={(data) => {
          setUserData((prev) => ({
            ...prev,
            firstName: data.firstName,
            lastName: data.lastName,
            username: "@" + data.tag,
            city: data.city,
            bio: data.bio,
            ...(data.avatar && { avatarUrl: data.avatar }),
            ...(data.avatarUrlOriginal && { avatarUrlOriginal: data.avatarUrlOriginal }),
          }));
          setIsEditProfileOpen(false);
        }}
        onCancel={() => setIsEditProfileOpen(false)}
      />
    );
  }

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
                {userData.city && userData.city !== "—" && (
                  <p className={s.cityRow}>
                    <img src={locIcon} alt="" className={s.cityIcon} />
                    {userData.city}
                  </p>
                )}
              </div>
              {!isMyProfile && (
                <button className={s.subscribeBtn}>Подписаться</button>
              )}
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

        {isMyProfile && (
          <div className={s.createPostBanner}>
            <span>Есть чем поделиться? Мы ждём!</span>
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
                      <img src={post.images[0]} alt="Пост" className={s.postImage} />
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

export default UserProfile;
