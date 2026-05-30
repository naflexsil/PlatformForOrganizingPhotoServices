import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import MasonryGrid from "../../components/MasonryGrid/MasonryGrid";
import PortfolioPhotoModal from "../../components/PortfolioPhotoModal/PortfolioPhotoModal";
import s from "./InspirationPage.module.css";

const LIMIT = 20;

const getNumCols = () => {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth <= 480) return 1;
  if (window.innerWidth <= 900) return 2;
  return 3;
};

// Reorders sorted array so CSS columns layout displays items left-to-right by rank
// e.g. [9,8,7,6,5,4] with 3 cols → visual rows: [9,8,7], [6,5,4]
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

const InspirationPage = () => {
  const { accessToken, isAuth } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [numCols, setNumCols] = useState(() => getNumCols());

  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);

  useEffect(() => {
    const handleResize = () => setNumCols(getNumCols());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadPage = useCallback(async (pageNum) => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      const res = await fetch(`/api/inspiration?page=${pageNum}&limit=${LIMIT}`, { headers });
      const result = await res.json();

      if (result.status === "success") {
        setPhotos((prev) => (pageNum === 1 ? result.data : [...prev, ...result.data]));
        hasMoreRef.current = result.pagination.hasMore;
        setHasMore(result.pagination.hasMore);
        pageRef.current = pageNum + 1;
      }
    } catch {
      showToast("Не удалось загрузить ленту", "error");
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [accessToken, showToast]);

  useEffect(() => {
    loadPage(1);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current && hasMoreRef.current) {
          loadPage(pageRef.current);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadPage]);

  const applyPhotoUpdate = (updater) => {
    setPhotos((prev) => prev.map(updater));
    setSelectedPhoto((prev) => (prev ? updater(prev) : prev));
  };

  const handleLike = async (photo) => {
    if (!isAuth) {
      showToast("Войдите, чтобы лайкать фото", "error");
      return;
    }

    const wasLiked = photo.isLiked;
    const optimisticCount = wasLiked ? photo.likesCount - 1 : photo.likesCount + 1;

    applyPhotoUpdate((p) =>
      p.id === photo.id ? { ...p, isLiked: !wasLiked, likesCount: optimisticCount } : p
    );

    try {
      const res = await fetch(`/api/photos/${photo.id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await res.json();

      if (result.status === "success") {
        applyPhotoUpdate((p) =>
          p.id === photo.id
            ? { ...p, isLiked: result.data.liked, likesCount: result.data.count }
            : p
        );
      } else {
        applyPhotoUpdate((p) =>
          p.id === photo.id ? { ...p, isLiked: wasLiked, likesCount: photo.likesCount } : p
        );
      }
    } catch {
      applyPhotoUpdate((p) =>
        p.id === photo.id ? { ...p, isLiked: wasLiked, likesCount: photo.likesCount } : p
      );
    }
  };

  const handleFavorite = async (photo) => {
    if (!isAuth) {
      showToast("Войдите, чтобы добавить в избранное", "error");
      return;
    }

    const wasFavorited = photo.isFavorited;
    const optimisticCount = wasFavorited
      ? Math.max(0, (photo.favoritesCount ?? 0) - 1)
      : (photo.favoritesCount ?? 0) + 1;

    applyPhotoUpdate((p) =>
      p.id === photo.id
        ? { ...p, isFavorited: !wasFavorited, favoritesCount: optimisticCount }
        : p
    );

    try {
      const res = await fetch(`/api/photos/${photo.id}/favorite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await res.json();

      if (result.status === "success") {
        applyPhotoUpdate((p) =>
          p.id === photo.id
            ? { ...p, isFavorited: result.data.favorited, favoritesCount: result.data.count }
            : p
        );
      } else {
        applyPhotoUpdate((p) =>
          p.id === photo.id
            ? { ...p, isFavorited: wasFavorited, favoritesCount: photo.favoritesCount ?? 0 }
            : p
        );
      }
    } catch {
      applyPhotoUpdate((p) =>
        p.id === photo.id
          ? { ...p, isFavorited: wasFavorited, favoritesCount: photo.favoritesCount ?? 0 }
          : p
      );
    }
  };

  const handleAuthorClick = (author) => {
    if (!author?.tag) return;
    navigate(`/@${author.tag}`);
  };

  const handleDescriptionUpdate = (photoId, description) => {
    applyPhotoUpdate((p) => (p.id === photoId ? { ...p, description } : p));
  };

  const displayedPhotos = useMemo(
    () => reorderForColumns(photos, numCols),
    [photos, numCols]
  );

  return (
    <div className={s.pageWrapper}>
      <div className={s.container}>
        <div className={s.pageHeader}>
          <h1 className={s.title}>Лента вдохновения</h1>
          <p className={s.subtitle}>Фотографии из портфолио фотографов платформы</p>
        </div>

        {!initialLoaded && (
          <div className={s.skeletonGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={s.skeletonItem} />
            ))}
          </div>
        )}

        {initialLoaded && photos.length === 0 && (
          <div className={s.empty}>
            <p>Пока нет фотографий в ленте</p>
            <span>Фотографы ещё не добавили работы в портфолио</span>
          </div>
        )}

        {photos.length > 0 && (
          <MasonryGrid
            photos={displayedPhotos}
            isOwner={false}
            onPhotoClick={(photo) => setSelectedPhoto(photo)}
            showLike={true}
            onLike={handleLike}
            showFavorite={true}
            onFavorite={handleFavorite}
          />
        )}

        <div ref={sentinelRef} className={s.sentinel} />

        {loading && initialLoaded && (
          <div className={s.loadingMore}>
            <div className={s.spinner} />
          </div>
        )}

        {!hasMore && photos.length > 0 && (
          <p className={s.endMessage}>Вы посмотрели все фотографии</p>
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
          onDescriptionUpdate={handleDescriptionUpdate}
          onAuthorClick={handleAuthorClick}
        />
      )}
    </div>
  );
};

export default InspirationPage;
