import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import MasonryGrid from "../../components/MasonryGrid/MasonryGrid";
import PortfolioPhotoModal from "../../components/PortfolioPhotoModal/PortfolioPhotoModal";
import s from "./InspirationPage.module.css";

const LIMIT = 20;

const InspirationPage = () => {
  const { accessToken, isAuth } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);

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
        setPage(pageNum + 1);
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

  const handleLike = async (photo) => {
    if (!isAuth) {
      showToast("Войдите, чтобы лайкать фото", "error");
      return;
    }

    const wasLiked = photo.isLiked;
    const optimisticCount = wasLiked ? photo.likesCount - 1 : photo.likesCount + 1;

    const applyUpdate = (p) =>
      p.id === photo.id
        ? { ...p, isLiked: !wasLiked, likesCount: optimisticCount }
        : p;

    setPhotos((prev) => prev.map(applyUpdate));
    if (selectedPhoto?.id === photo.id) {
      setSelectedPhoto((prev) => applyUpdate(prev));
    }

    try {
      const res = await fetch(`/api/photos/${photo.id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await res.json();

      if (result.status === "success") {
        const syncUpdate = (p) =>
          p.id === photo.id
            ? { ...p, isLiked: result.data.liked, likesCount: result.data.count }
            : p;
        setPhotos((prev) => prev.map(syncUpdate));
        if (selectedPhoto?.id === photo.id) {
          setSelectedPhoto((prev) => syncUpdate(prev));
        }
      } else {
        const rollback = (p) =>
          p.id === photo.id ? { ...p, isLiked: wasLiked, likesCount: photo.likesCount } : p;
        setPhotos((prev) => prev.map(rollback));
        if (selectedPhoto?.id === photo.id) {
          setSelectedPhoto((prev) => rollback(prev));
        }
      }
    } catch {
      const rollback = (p) =>
        p.id === photo.id ? { ...p, isLiked: wasLiked, likesCount: photo.likesCount } : p;
      setPhotos((prev) => prev.map(rollback));
    }
  };

  const handleAuthorClick = (author) => {
    if (!author?.tag) return;
    navigate(`/@${author.tag}`);
  };

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
  };

  const handleDescriptionUpdate = (photoId, description) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, description } : p))
    );
    setSelectedPhoto((prev) =>
      prev?.id === photoId ? { ...prev, description } : prev
    );
  };

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
            photos={photos}
            isOwner={false}
            onPhotoClick={handlePhotoClick}
            showLike={true}
            onLike={handleLike}
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
