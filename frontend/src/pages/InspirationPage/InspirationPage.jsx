import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import MasonryGrid from "../../components/MasonryGrid/MasonryGrid";
import PortfolioPhotoModal from "../../components/PortfolioPhotoModal/PortfolioPhotoModal";
import SearchByPhotoModal from "../../components/SearchByPhotoModal/SearchByPhotoModal";
import s from "./InspirationPage.module.css";

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

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPreviewUrl, setSearchPreviewUrl] = useState(null);

  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const searchControllerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setNumCols(getNumCols());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (searchPreviewUrl) URL.revokeObjectURL(searchPreviewUrl);
    };
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
    setSearchResults((prev) => prev.map(updater));
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

  const handleSearch = async (file) => {
    if (searchControllerRef.current) searchControllerRef.current.abort();
    searchControllerRef.current = new AbortController();

    const newPreviewUrl = URL.createObjectURL(file);
    if (searchPreviewUrl) URL.revokeObjectURL(searchPreviewUrl);
    setSearchPreviewUrl(newPreviewUrl);
    setSearchMode(true);
    setSearchLoading(true);
    setSearchResults([]);
    setSelectedPhoto(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      const res = await fetch("/api/search/by-image", {
        method: "POST",
        headers,
        body: formData,
        signal: searchControllerRef.current.signal,
      });
      const result = await res.json();
      if (result.status === "success") {
        setSearchResults(result.data);
      } else {
        showToast(result.message || "Ошибка поиска", "error");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        showToast("Сервис поиска недоступен", "error");
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const handleReturnToFeed = () => {
    if (searchControllerRef.current) searchControllerRef.current.abort();
    setSearchMode(false);
    setSearchResults([]);
    if (searchPreviewUrl) URL.revokeObjectURL(searchPreviewUrl);
    setSearchPreviewUrl(null);
    setSelectedPhoto(null);
  };

  const displayedPhotos = useMemo(
    () => reorderForColumns(photos, numCols),
    [photos, numCols]
  );

  const displayedSearchResults = useMemo(
    () => reorderForColumns(searchResults, numCols),
    [searchResults, numCols]
  );

  return (
    <div className={s.pageWrapper}>
      <div className={s.container}>
        <div className={s.pageHeader}>
          <h1 className={s.title}>Лента вдохновения</h1>
          <p className={s.subtitle}>Фотографии из портфолио фотографов платформы</p>
        </div>

        <div className={s.searchBar}>
          {searchMode && (
            <div className={s.searchBarLeft}>
              {searchPreviewUrl && (
                <img src={searchPreviewUrl} alt="" className={s.searchBarPreview} />
              )}
              <div className={s.searchBarInfo}>
                {searchLoading ? (
                  <span className={s.searchBarStatus}>Идёт поиск...</span>
                ) : (
                  <>
                    <span className={s.searchBarStatus}>Найдено: {searchResults.length}</span>
                    <button className={s.backBtn} onClick={handleReturnToFeed}>
                      ← Вернуться к ленте
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          <button className={s.searchPhotoBtn} onClick={() => setSearchModalOpen(true)}>
            Найти по фото
          </button>
        </div>

        {searchMode ? (
          <>
            {searchLoading && (
              <div className={s.searchSpinnerWrap}>
                <div className={s.spinner} />
              </div>
            )}

            {!searchLoading && searchResults.length === 0 && (
              <div className={s.empty}>
                <p>Похожих работ не найдено</p>
                <span>Попробуйте загрузить другое фото</span>
              </div>
            )}

            {displayedSearchResults.length > 0 && (
              <MasonryGrid
                photos={displayedSearchResults}
                isOwner={false}
                onPhotoClick={(photo) => setSelectedPhoto(photo)}
                showLike={true}
                onLike={handleLike}
                showFavorite={true}
                onFavorite={handleFavorite}
              />
            )}
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {searchModalOpen && (
        <SearchByPhotoModal
          onClose={() => setSearchModalOpen(false)}
          onSearch={handleSearch}
        />
      )}

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
          onPhotoUpdate={(updates) =>
            applyPhotoUpdate((p) => p.id === selectedPhoto.id ? { ...p, ...updates } : p)
          }
        />
      )}
    </div>
  );
};

export default InspirationPage;
