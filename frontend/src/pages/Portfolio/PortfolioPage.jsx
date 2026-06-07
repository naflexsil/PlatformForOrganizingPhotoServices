import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import MasonryGrid from "../../components/MasonryGrid/MasonryGrid";
import PortfolioPhotoModal from "../../components/PortfolioPhotoModal/PortfolioPhotoModal";
import AddPhotoModal from "../../components/AddPhotoModal/AddPhotoModal";
import CreateFolderModal from "../../components/CreateFolderModal/CreateFolderModal";
import defaultAvatar from "../../assets/images/default_avatar.webp";
import editIcon from "../../assets/icons/edit.svg";
import deleteIcon from "../../assets/icons/delete.svg";
import s from "./PortfolioPage.module.css";

const PortfolioPage = () => {
  const { tag: rawTag } = useParams();
  const tag = rawTag?.replace(/^@/, "") ?? "";
  const { user, accessToken, isAuth } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isOwner = user?.tag === tag;

  const [author, setAuthor] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [folders, setFolders] = useState([]);
  const [status, setStatus] = useState("loading");

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [folderToEdit, setFolderToEdit] = useState(undefined);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  useEffect(() => {
    setStatus("loading");
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

    fetch(`/api/users/by-tag/${encodeURIComponent(tag)}`, { headers })
      .then((r) => r.json())
      .then((res) => {
        if (res.status !== "success") { setStatus("notfound"); return; }
        const userData = res.data;
        if (userData.role !== "PHOTOGRAPHER") { setStatus("notphotographer"); return; }
        setAuthor(userData);

        return Promise.all([
          fetch(`/api/portfolio/${userData.id}`).then((r) => r.json()),
          fetch(`/api/photos?userId=${userData.id}&standalone=true`, { headers }).then((r) => r.json()),
        ]);
      })
      .then((results) => {
        if (!results) return;
        const [foldersRes, photosRes] = results;
        if (foldersRes.status === "success") setFolders(foldersRes.data);
        if (photosRes.status === "success") setPhotos(photosRes.data);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, [tag, accessToken]);

  const handlePhotoUploaded = (photo) => {
    setPhotos((prev) => [photo, ...prev]);
    setShowAddPhoto(false);
    showToast("Фото добавлено", "success");
  };

  const handleDeletePhoto = async (photoId) => {
    const res = await fetch(`/api/photos/${photoId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const result = await res.json();
    if (result.status === "success") {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setSelectedPhoto(null);
      setPhotoToDelete(null);
      showToast("Фото удалено", "success");
    } else {
      showToast("Не удалось удалить фото", "error");
    }
  };

  const handleDescriptionUpdate = (photoId, description) => {
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, description } : p));
    setSelectedPhoto((prev) => prev?.id === photoId ? { ...prev, description } : prev);
  };

  const applyPhotoUpdate = (updater) => {
    setPhotos((prev) => prev.map(updater));
    setSelectedPhoto((prev) => (prev ? updater(prev) : prev));
  };

  const handleLike = async (photo) => {
    if (!isAuth) { showToast("Войдите, чтобы лайкать фото", "error"); return; }
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
          p.id === photo.id ? { ...p, isLiked: result.data.liked, likesCount: result.data.count } : p
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
    if (!isAuth) { showToast("Войдите, чтобы добавить в избранное", "error"); return; }
    const wasFavorited = photo.isFavorited;
    const optimisticCount = wasFavorited
      ? Math.max(0, (photo.favoritesCount ?? 0) - 1)
      : (photo.favoritesCount ?? 0) + 1;
    applyPhotoUpdate((p) =>
      p.id === photo.id ? { ...p, isFavorited: !wasFavorited, favoritesCount: optimisticCount } : p
    );
    try {
      const res = await fetch(`/api/photos/${photo.id}/favorite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await res.json();
      if (result.status === "success") {
        applyPhotoUpdate((p) =>
          p.id === photo.id ? { ...p, isFavorited: result.data.favorited, favoritesCount: result.data.count } : p
        );
      } else {
        applyPhotoUpdate((p) =>
          p.id === photo.id ? { ...p, isFavorited: wasFavorited, favoritesCount: photo.favoritesCount ?? 0 } : p
        );
      }
    } catch {
      applyPhotoUpdate((p) =>
        p.id === photo.id ? { ...p, isFavorited: wasFavorited, favoritesCount: photo.favoritesCount ?? 0 } : p
      );
    }
  };

  const handleFolderSaved = (folder) => {
    if (folderToEdit) {
      setFolders((prev) => prev.map((f) => f.id === folder.id ? folder : f));
      showToast("Папка переименована", "success");
    } else {
      setFolders((prev) => [...prev, folder]);
      showToast("Папка создана", "success");
    }
    setFolderToEdit(undefined);
    setShowCreateFolder(false);
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    const res = await fetch(`/api/portfolio/${folderToDelete.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const result = await res.json();
    if (result.status === "success") {
      setFolders((prev) => prev.filter((f) => f.id !== folderToDelete.id));
      showToast("Папка удалена", "success");
    } else {
      showToast("Не удалось удалить папку", "error");
    }
    setFolderToDelete(null);
  };

  if (status === "loading") return <div className={s.pageWrapper} />;

  if (status === "notfound") return (
    <div className={s.empty}>
      <p>Пользователь не найден</p>
      <button className={s.backBtn} onClick={() => navigate(-1)}>Назад</button>
    </div>
  );

  if (status === "notphotographer") return (
    <div className={s.empty}>
      <p>Портфолио доступно только у фотографов</p>
      <button className={s.backBtn} onClick={() => navigate(-1)}>Назад</button>
    </div>
  );

  if (status === "error") return (
    <div className={s.empty}>
      <p>Не удалось загрузить портфолио</p>
      <button className={s.backBtn} onClick={() => navigate(-1)}>Назад</button>
    </div>
  );

  return (
    <div className={s.pageWrapper}>
      <div className={s.container}>

        <div className={s.pageHeader}>
          <Link to={`/@${tag}`} className={s.authorLink}>
            <img
              src={author?.avatarUrl || defaultAvatar}
              alt="Avatar"
              className={s.authorAvatar}
            />
            <div className={s.authorInfo}>
              <span className={s.authorName}>{author?.firstName} {author?.lastName}</span>
              <span className={s.authorTag}>@{tag}</span>
            </div>
          </Link>

          {isOwner && (
            <div className={s.ownerActions}>
              <button className={s.actionBtn} onClick={() => setShowAddPhoto(true)}>
                Добавить фото
              </button>
              <button className={s.actionBtn} onClick={() => { setFolderToEdit(undefined); setShowCreateFolder(true); }}>
                Создать папку
              </button>
            </div>
          )}
        </div>

        {folders.length > 0 && (
          <div className={s.foldersRow}>
            {folders.map((folder) => (
              <div key={folder.id} className={s.folderBtnWrapper}>
                <button
                  className={s.folderBtn}
                  onClick={() => navigate(`/@${tag}/portfolio/${folder.id}`)}
                >
                  {folder.name}
                  <span className={s.folderCount}>{folder._count?.photos ?? 0}</span>
                </button>
                {isOwner && (
                  <div className={s.folderMenu}>
                    <button
                      className={s.folderMenuBtn}
                      onClick={() => { setFolderToEdit(folder); setShowCreateFolder(true); }}
                      title="Переименовать"
                    ><img src={editIcon} alt="Переименовать" /></button>
                    <button
                      className={`${s.folderMenuBtn} ${s.folderMenuBtnDanger}`}
                      onClick={() => setFolderToDelete(folder)}
                      title="Удалить"
                    ><img src={deleteIcon} alt="Удалить" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {photos.length > 0 ? (
          <MasonryGrid
            photos={photos}
            isOwner={isOwner}
            onPhotoClick={setSelectedPhoto}
            onDeletePhoto={(photo) => setPhotoToDelete(photo)}
            showLike={true}
            onLike={handleLike}
            showFavorite={true}
            onFavorite={handleFavorite}
          />
        ) : (
          <div className={s.emptyPhotos}>
            {isOwner
              ? <><p>Вы ещё не добавили ни одной работы</p><button className={s.actionBtn} onClick={() => setShowAddPhoto(true)}>Добавить фото</button></>
              : <p>Фотограф ещё не добавил работ</p>
            }
          </div>
        )}
      </div>

      {selectedPhoto && (
        <PortfolioPhotoModal
          photo={selectedPhoto}
          author={author}
          isOwner={isOwner}
          accessToken={accessToken}
          onClose={() => setSelectedPhoto(null)}
          onDelete={(id) => handleDeletePhoto(id)}
          onDescriptionUpdate={handleDescriptionUpdate}
          onPhotoUpdate={(updates) =>
            applyPhotoUpdate((p) => p.id === selectedPhoto.id ? { ...p, ...updates } : p)
          }
        />
      )}

      {showAddPhoto && (
        <AddPhotoModal
          accessToken={accessToken}
          onClose={() => setShowAddPhoto(false)}
          onUploaded={handlePhotoUploaded}
        />
      )}

      {showCreateFolder && (
        <CreateFolderModal
          accessToken={accessToken}
          folder={folderToEdit || null}
          onClose={() => { setShowCreateFolder(false); setFolderToEdit(undefined); }}
          onSaved={handleFolderSaved}
        />
      )}

      {photoToDelete && (
        <div className={s.confirmOverlay} onClick={() => setPhotoToDelete(null)}>
          <div className={s.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={s.confirmTitle}>Удалить фото?</h3>
            <p className={s.confirmText}>Фото будет удалено безвозвратно.</p>
            <div className={s.confirmActions}>
              <button className={s.confirmCancel} onClick={() => setPhotoToDelete(null)}>Отмена</button>
              <button className={s.confirmDelete} onClick={() => handleDeletePhoto(photoToDelete.id)}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      {folderToDelete && (
        <div className={s.confirmOverlay} onClick={() => setFolderToDelete(null)}>
          <div className={s.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={s.confirmTitle}>Удалить папку?</h3>
            <p className={s.confirmText}>
              В папке «{folderToDelete.name}» {folderToDelete._count?.photos ?? 0} фото.
              Все они будут удалены безвозвратно.
            </p>
            <div className={s.confirmActions}>
              <button className={s.confirmCancel} onClick={() => setFolderToDelete(null)}>Отмена</button>
              <button className={s.confirmDelete} onClick={handleDeleteFolder}>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;
