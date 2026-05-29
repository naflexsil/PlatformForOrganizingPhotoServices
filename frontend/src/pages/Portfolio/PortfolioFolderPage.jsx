import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import MasonryGrid from "../../components/MasonryGrid/MasonryGrid";
import PortfolioPhotoModal from "../../components/PortfolioPhotoModal/PortfolioPhotoModal";
import AddPhotoModal from "../../components/AddPhotoModal/AddPhotoModal";
import defaultAvatar from "../../assets/images/default_avatar.png";
import arrowLeftIcon from "../../assets/icons/carousel_arrow_left.svg";
import s from "./PortfolioFolderPage.module.css";

const PortfolioFolderPage = () => {
  const { tag: rawTag, folderId } = useParams();
  const tag = rawTag?.replace(/^@/, "") ?? "";
  const { user, accessToken } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isOwner = user?.tag === tag;

  const [author, setAuthor] = useState(null);
  const [folder, setFolder] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState("loading");

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showAddPhoto, setShowAddPhoto] = useState(false);

  useEffect(() => {
    setStatus("loading");
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

    fetch(`/api/users/by-tag/${encodeURIComponent(tag)}`, { headers })
      .then((r) => r.json())
      .then((res) => {
        if (res.status !== "success") { setStatus("notfound"); return; }
        setAuthor(res.data);

        return Promise.all([
          fetch(`/api/portfolio/${res.data.id}`).then((r) => r.json()),
          fetch(`/api/photos?folderId=${folderId}`, { headers }).then((r) => r.json()),
        ]);
      })
      .then((results) => {
        if (!results) return;
        const [foldersRes, photosRes] = results;
        if (foldersRes.status === "success") {
          const found = foldersRes.data.find((f) => f.id === folderId);
          if (!found) { setStatus("notfound"); return; }
          setFolder(found);
        }
        if (photosRes.status === "success") setPhotos(photosRes.data);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, [tag, folderId, accessToken]);

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
      showToast("Фото удалено", "success");
    } else {
      showToast("Не удалось удалить фото", "error");
    }
  };

  const handleDescriptionUpdate = (photoId, description) => {
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, description } : p));
    setSelectedPhoto((prev) => prev?.id === photoId ? { ...prev, description } : prev);
  };

  if (status === "loading") return <div className={s.pageWrapper} />;

  if (status === "notfound") return (
    <div className={s.empty}>
      <p>Папка не найдена</p>
      <button className={s.backBtn} onClick={() => navigate(`/@${tag}/portfolio`)}>
        Вернуться к портфолио
      </button>
    </div>
  );

  if (status === "error") return (
    <div className={s.empty}>
      <p>Не удалось загрузить папку</p>
      <button className={s.backBtn} onClick={() => navigate(`/@${tag}/portfolio`)}>
        Вернуться к портфолио
      </button>
    </div>
  );

  return (
    <div className={s.pageWrapper}>
      <div className={s.container}>

        {/* Шапка папки */}
        <div className={s.pageHeader}>
          <div className={s.headerLeft}>
            <button className={s.backLink} onClick={() => navigate(`/@${tag}/portfolio`)}>
              <img src={arrowLeftIcon} alt="Назад" className={s.backIcon} />
              <span>Портфолио</span>
            </button>
            <div className={s.folderMeta}>
              <img
                src={author?.avatarUrl || defaultAvatar}
                alt="Avatar"
                className={s.authorAvatar}
              />
              <h1 className={s.folderName}>{folder?.name}</h1>
            </div>
          </div>

          {isOwner && (
            <button className={s.actionBtn} onClick={() => setShowAddPhoto(true)}>
              + Добавить фото
            </button>
          )}
        </div>

        {/* Сетка фото */}
        {photos.length > 0 ? (
          <MasonryGrid
            photos={photos}
            isOwner={isOwner}
            onPhotoClick={setSelectedPhoto}
            onDeletePhoto={(photo) => handleDeletePhoto(photo.id)}
          />
        ) : (
          <div className={s.emptyPhotos}>
            {isOwner
              ? <><p>Папка пустая — добавьте первое фото</p><button className={s.actionBtn} onClick={() => setShowAddPhoto(true)}>Добавить фото</button></>
              : <p>В этой папке пока нет фотографий</p>
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
        />
      )}

      {showAddPhoto && (
        <AddPhotoModal
          accessToken={accessToken}
          folderId={folderId}
          onClose={() => setShowAddPhoto(false)}
          onUploaded={handlePhotoUploaded}
        />
      )}
    </div>
  );
};

export default PortfolioFolderPage;
