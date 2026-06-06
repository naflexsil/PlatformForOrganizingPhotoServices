import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import MasonryGrid from "../../components/MasonryGrid/MasonryGrid";
import PortfolioPhotoModal from "../../components/PortfolioPhotoModal/PortfolioPhotoModal";
import PostModal from "../../components/PostModal/PostModal";
import defaultAvatar from "../../assets/images/default_avatar.webp";
import heartIcon from "../../assets/icons/heart.svg";
import heartFilledIcon from "../../assets/icons/heart_filled.svg";
import s from "./FavoritesPage.module.css";

const LIMIT = 20;

const getNumCols = () => {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth <= 480) return 1;
  if (window.innerWidth <= 900) return 2;
  return 3;
};

const reorderForColumns = (arr, numCols) => {
  if (numCols <= 1 || arr.length === 0) return arr;
  const n = arr.length;
  const r = Math.ceil(n / numCols);
  const result = new Array(n).fill(null);
  arr.forEach((item, i) => {
    const col = i % numCols;
    const row = Math.floor(i / numCols);
    const newIdx = col * r + row;
    if (newIdx < n) result[newIdx] = item;
  });
  return result.filter(Boolean);
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

const FavoritesPage = () => {
  const { accessToken, isAuth } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState("photos");

  const [photos, setPhotos] = useState([]);
  const [photosHasMore, setPhotosHasMore] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosInitialLoaded, setPhotosInitialLoaded] = useState(false);
  const photosPageRef = useRef(1);
  const photosLoadingRef = useRef(false);
  const photosHasMoreRef = useRef(true);
  const photosSeenRef = useRef(new Set());

  const [posts, setPosts] = useState([]);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsInitialLoaded, setPostsInitialLoaded] = useState(false);
  const postsPageRef = useRef(1);
  const postsLoadingRef = useRef(false);
  const postsHasMoreRef = useRef(true);

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [numCols, setNumCols] = useState(() => getNumCols());

  const photosSentinelRef = useRef(null);
  const postsSentinelRef = useRef(null);

  useEffect(() => {
    if (!isAuth) {
      navigate("/", { replace: true });
    }
  }, [isAuth, navigate]);

  useEffect(() => {
    const handleResize = () => setNumCols(getNumCols());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadPhotos = useCallback(async (pageNum) => {
    if (photosLoadingRef.current || !photosHasMoreRef.current) return;
    photosLoadingRef.current = true;
    setPhotosLoading(true);
    try {
      const res = await fetch(`/api/photos/favorites?page=${pageNum}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await res.json();
      if (result.status === "success") {
        if (pageNum === 1) {
          photosSeenRef.current = new Set(result.data.map((p) => p.id));
          setPhotos(result.data);
        } else {
          const fresh = result.data.filter((p) => !photosSeenRef.current.has(p.id));
          fresh.forEach((p) => photosSeenRef.current.add(p.id));
          setPhotos((prev) => [...prev, ...fresh]);
        }
        photosHasMoreRef.current = result.pagination.hasMore;
        setPhotosHasMore(result.pagination.hasMore);
        photosPageRef.current = pageNum + 1;
      } else {
        showToast("Не удалось загрузить избранные фото", "error");
      }
    } catch {
      showToast("Не удалось загрузить избранные фото", "error");
    } finally {
      photosLoadingRef.current = false;
      setPhotosLoading(false);
      setPhotosInitialLoaded(true);
    }
  }, [accessToken, showToast]);

  const loadPosts = useCallback(async (pageNum) => {
    if (postsLoadingRef.current || !postsHasMoreRef.current) return;
    postsLoadingRef.current = true;
    setPostsLoading(true);
    try {
      const res = await fetch(`/api/posts/favorites?page=${pageNum}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await res.json();
      if (result.status === "success") {
        if (pageNum === 1) {
          setPosts(result.data.map(normalizePost));
        } else {
          setPosts((prev) => [...prev, ...result.data.map(normalizePost)]);
        }
        postsHasMoreRef.current = result.pagination.hasMore;
        setPostsHasMore(result.pagination.hasMore);
        postsPageRef.current = pageNum + 1;
      } else {
        showToast("Не удалось загрузить избранные посты", "error");
      }
    } catch {
      showToast("Не удалось загрузить избранные посты", "error");
    } finally {
      postsLoadingRef.current = false;
      setPostsLoading(false);
      setPostsInitialLoaded(true);
    }
  }, [accessToken, showToast]);

  useEffect(() => {
    if (!isAuth || !accessToken) return;
    if (tab === "photos" && !photosInitialLoaded) loadPhotos(1);
    if (tab === "posts"  && !postsInitialLoaded)  loadPosts(1);
  }, [tab, isAuth, accessToken]);

  useEffect(() => {
    if (tab !== "photos") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !photosLoadingRef.current && photosHasMoreRef.current) {
          loadPhotos(photosPageRef.current);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );
    if (photosSentinelRef.current) observer.observe(photosSentinelRef.current);
    return () => observer.disconnect();
  }, [loadPhotos, tab]);

  useEffect(() => {
    if (tab !== "posts") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !postsLoadingRef.current && postsHasMoreRef.current) {
          loadPosts(postsPageRef.current);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );
    if (postsSentinelRef.current) observer.observe(postsSentinelRef.current);
    return () => observer.disconnect();
  }, [loadPosts, tab]);

  const handlePhotoLike = async (photo) => {
    const wasLiked = photo.isLiked;
    const optimistic = wasLiked ? photo.likesCount - 1 : photo.likesCount + 1;
    const upd = (p) => p.id === photo.id ? { ...p, isLiked: !wasLiked, likesCount: optimistic } : p;
    setPhotos((prev) => prev.map(upd));
    setSelectedPhoto((prev) => prev ? upd(prev) : prev);
    try {
      const res = await fetch(`/api/photos/${photo.id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await res.json();
      if (result.status === "success") {
        const upd2 = (p) => p.id === photo.id ? { ...p, isLiked: result.data.liked, likesCount: result.data.count } : p;
        setPhotos((prev) => prev.map(upd2));
        setSelectedPhoto((prev) => prev ? upd2(prev) : prev);
      } else {
        const revert = (p) => p.id === photo.id ? { ...p, isLiked: wasLiked, likesCount: photo.likesCount } : p;
        setPhotos((prev) => prev.map(revert));
        setSelectedPhoto((prev) => prev ? revert(prev) : prev);
      }
    } catch {
      const revert = (p) => p.id === photo.id ? { ...p, isLiked: wasLiked, likesCount: photo.likesCount } : p;
      setPhotos((prev) => prev.map(revert));
      setSelectedPhoto((prev) => prev ? revert(prev) : prev);
    }
  };

  const handlePhotoFavorite = async (photo) => {
    const wasFavorited = photo.isFavorited;
    const optimistic = wasFavorited ? Math.max(0, (photo.favoritesCount ?? 0) - 1) : (photo.favoritesCount ?? 0) + 1;
    const upd = (p) => p.id === photo.id ? { ...p, isFavorited: !wasFavorited, favoritesCount: optimistic } : p;
    setPhotos((prev) => prev.map(upd));
    setSelectedPhoto((prev) => prev ? upd(prev) : prev);
    try {
      const res = await fetch(`/api/photos/${photo.id}/favorite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await res.json();
      if (result.status === "success") {
        if (!result.data.favorited) {
          setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
          setSelectedPhoto(null);
        } else {
          const upd2 = (p) => p.id === photo.id ? { ...p, isFavorited: true, favoritesCount: result.data.count } : p;
          setPhotos((prev) => prev.map(upd2));
          setSelectedPhoto((prev) => prev ? upd2(prev) : prev);
        }
      } else {
        const revert = (p) => p.id === photo.id ? { ...p, isFavorited: wasFavorited, favoritesCount: photo.favoritesCount ?? 0 } : p;
        setPhotos((prev) => prev.map(revert));
        setSelectedPhoto((prev) => prev ? revert(prev) : prev);
      }
    } catch {
      const revert = (p) => p.id === photo.id ? { ...p, isFavorited: wasFavorited, favoritesCount: photo.favoritesCount ?? 0 } : p;
      setPhotos((prev) => prev.map(revert));
      setSelectedPhoto((prev) => prev ? revert(prev) : prev);
    }
  };

  const handlePostLike = async (postId) => {
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const result = await res.json();
    if (result.status !== "success") return;
    const { liked, count } = result.data;
    const upd = (p) => p.id === postId ? { ...p, isLiked: liked, likes: count } : p;
    setPosts((prev) => prev.map(upd));
    setSelectedPost((prev) => prev?.id === postId ? upd(prev) : prev);
  };

  const handlePostFavorite = async (postId) => {
    const res = await fetch(`/api/posts/${postId}/favorite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const result = await res.json();
    if (result.status !== "success") return;
    const { favorited, count } = result.data;
    if (!favorited) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSelectedPost(null);
    } else {
      const upd = (p) => p.id === postId ? { ...p, isFavorited: true, favoritesCount: count } : p;
      setPosts((prev) => prev.map(upd));
      setSelectedPost((prev) => prev?.id === postId ? upd(prev) : prev);
    }
  };

  const handleAuthorClick = (author) => {
    if (!author?.tag) return;
    navigate(`/@${author.tag}`);
  };

  const handlePhotoDescriptionUpdate = (photoId, description) => {
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, description } : p));
  };

  const displayedPhotos = useMemo(() => reorderForColumns(photos, numCols), [photos, numCols]);

  const formatLikes = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(".", ",") + "к";
    return String(n);
  };

  return (
    <div className={s.pageWrapper}>
      <div className={s.container}>
        <div className={s.tabsCard}>
          <div className={s.tabs}>
            <button
              className={`${s.tab} ${tab === "photos" ? s.tabActive : ""}`}
              onClick={() => setTab("photos")}
            >
              Фотографии
            </button>
            <button
              className={`${s.tab} ${tab === "posts" ? s.tabActive : ""}`}
              onClick={() => setTab("posts")}
            >
              Посты
            </button>
          </div>
        </div>

        {tab === "photos" && (
          <>
            {!photosInitialLoaded && (
              <div className={s.skeletonGrid}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={s.skeletonItem} />
                ))}
              </div>
            )}

            {photosInitialLoaded && photos.length === 0 && (
              <div className={s.empty}>
                <p>Нет избранных фотографий</p>
                <span>Лайкайте фото из ленты вдохновения</span>
              </div>
            )}

            {photos.length > 0 && (
              <MasonryGrid
                photos={displayedPhotos}
                isOwner={false}
                onPhotoClick={(photo) => setSelectedPhoto(photo)}
                showLike={true}
                onLike={handlePhotoLike}
                showFavorite={true}
                onFavorite={handlePhotoFavorite}
              />
            )}

            <div ref={photosSentinelRef} className={s.sentinel} />

            {photosLoading && photosInitialLoaded && (
              <div className={s.loadingMore}>
                <div className={s.spinner} />
              </div>
            )}

            {!photosHasMore && photos.length > 0 && (
              <p className={s.endMessage}>Вы просмотрели все избранные фото</p>
            )}
          </>
        )}

        {tab === "posts" && (
          <>
            {!postsInitialLoaded && (
              <div className={s.postsSkeletonGrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={s.postSkeletonItem} />
                ))}
              </div>
            )}

            {postsInitialLoaded && posts.length === 0 && (
              <div className={s.empty}>
                <p>Нет избранных постов</p>
                <span>Добавляйте посты из профилей фотографов</span>
              </div>
            )}

            {posts.length > 0 && (
              <div className={s.postsGrid}>
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className={s.postCard}
                    onClick={() => setSelectedPost(post)}
                  >
                    {post.author && (
                      <div
                        className={s.postAuthor}
                        onClick={(e) => { e.stopPropagation(); handleAuthorClick(post.author); }}
                      >
                        <img
                          src={post.author.avatarUrl || defaultAvatar}
                          alt=""
                          className={s.postAuthorAvatar}
                        />
                        <span className={s.postAuthorName}>
                          {post.author.firstName} {post.author.lastName}
                        </span>
                      </div>
                    )}
                    <div className={s.postImageWrapper}>
                      {post.images[0] ? (
                        <img src={post.images[0]} alt="" className={s.postImage} />
                      ) : (
                        <div className={s.postNoImage} />
                      )}
                    </div>
                    <div className={s.postFooter}>
                      <button
                        className={s.likeBtn}
                        onClick={(e) => { e.stopPropagation(); handlePostLike(post.id); }}
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
            )}

            <div ref={postsSentinelRef} className={s.sentinel} />

            {postsLoading && postsInitialLoaded && (
              <div className={s.loadingMore}>
                <div className={s.spinner} />
              </div>
            )}

            {!postsHasMore && posts.length > 0 && (
              <p className={s.endMessage}>Вы просмотрели все избранные посты</p>
            )}
          </>
        )}
      </div>

      {selectedPhoto && (
        <PortfolioPhotoModal
          photo={selectedPhoto}
          author={selectedPhoto.author}
          isOwner={false}
          accessToken={accessToken}
          onClose={() => setSelectedPhoto(null)}
          onDelete={() => {}}
          onDescriptionUpdate={handlePhotoDescriptionUpdate}
          onAuthorClick={handleAuthorClick}
          onPhotoUpdate={(updates) =>
            setPhotos((prev) => prev.map((p) => p.id === selectedPhoto.id ? { ...p, ...updates } : p))
          }
        />
      )}

      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={handlePostLike}
          onFavorite={handlePostFavorite}
          isMyProfile={false}
        />
      )}
    </div>
  );
};

export default FavoritesPage;
