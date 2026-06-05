import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import defaultAvatar from "../../assets/images/default_avatar.png";
import arrowLeftIcon from "../../assets/icons/carousel_arrow_left.svg";
import arrowRightIcon from "../../assets/icons/carousel_arrow_right.svg";
import s from "./SearchPage.module.css";

const SearchCard = ({ user }) => {
  const navigate = useNavigate();
  const { isAuth } = useAuth();
  const { showToast } = useToast();

  const isPhotographer = user.role === "PHOTOGRAPHER";
  const photos = user.photographer?.searchPhotos ?? [];
  const [photoIdx, setPhotoIdx] = useState(0);

  const handleWrite = () => {
    if (!isAuth) {
      showToast("Войдите, чтобы написать", "error");
      return;
    }
    navigate("/chats", { state: { newChat: { userId: user.id } } });
  };

  const handleAuthorClick = () => navigate(`/@${user.tag}`);

  return (
    <div className={s.card}>
      {isPhotographer && (
        <div className={s.carouselSection}>
          {photos.length > 0 ? (
            <>
              <img
                src={photos[photoIdx]}
                alt=""
                className={s.carouselImg}
              />
              {photos.length > 1 && photoIdx > 0 && (
                <button
                  className={`${s.carouselArrow} ${s.arrowLeft}`}
                  onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => i - 1); }}
                >
                  <img src={arrowLeftIcon} alt="" />
                </button>
              )}
              {photos.length > 1 && photoIdx < photos.length - 1 && (
                <button
                  className={`${s.carouselArrow} ${s.arrowRight}`}
                  onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => i + 1); }}
                >
                  <img src={arrowRightIcon} alt="" />
                </button>
              )}
            </>
          ) : null}
        </div>
      )}

      <div className={`${s.avatarWrap} ${!isPhotographer ? s.avatarWrapModel : ""}`}>
        <img
          src={user.avatarUrl || defaultAvatar}
          alt=""
          className={s.avatar}
          onClick={handleAuthorClick}
        />
      </div>

      <div className={s.cardInfo}>
        <p className={s.cardName} onClick={handleAuthorClick}>
          {user.firstName} {user.lastName}
        </p>
        <p className={s.cardCity}>{user.city || "Город не указан"}</p>
        {isPhotographer && user.photographer?.pricePerHour && (
          <p className={s.cardPrice}>
            от {Math.round(user.photographer.pricePerHour).toLocaleString("ru-RU")} ₽/час
          </p>
        )}
      </div>

      <div className={s.cardFooter}>
        <button className={s.writeBtn} onClick={handleWrite}>
          Написать
        </button>
      </div>
    </div>
  );
};

export default SearchCard;
