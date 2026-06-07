import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import s from "./Footer.module.css";
import vkLogo from "../../assets/icons/vk_logo.svg";
import mailLogo from "../../assets/icons/mail_logo.svg";

const Footer = ({ onOpenAuthModal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const freepikLinks = [
    {
      id: 1,
      url: "https://ru.freepik.com/free-photo/young-friends-having-fun-together_29960982.htm",
    },
    {
      id: 2,
      url: "https://ru.freepik.com/free-photo/young-friends-having-fun-together_29961055.htm",
    },
    {
      id: 3,
      url: "https://ru.freepik.com/free-photo/high-angle-woman-laying-floor_32443524.htm",
    },
    {
      id: 4,
      url: "https://ru.freepik.com/free-photo/happy-young-family_5604019.htm",
    },
    {
      id: 5,
      url: "https://ru.freepik.com/free-photo/fragment-persian-carpet-texture-macro-photo-background_70414814.htm",
    },
    {
      id: 6,
      url: "https://ru.freepik.com/free-photo/fabric-texture-background_1154102.htm",
    },
    {
      id: 7,
      url: "https://www.magnific.com/ru/free-photo/attractive-gorgeous-woman-evening-dress-standing-white-background-dancing-position_12499217.htm",
    },
    {
      id: 8,
      url: "https://www.magnific.com/ru/free-photo/happy-family-three_1533552.htm",
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <footer className={s.footer}>
      <div className={s.grid}>
        <div className={`${s.card} ${s.topLeft}`}>
          <img
            src="/logo_psyshe.svg"
            alt="Psyshe"
            className={s.logo}
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          />
        </div>

        <div className={`${s.card} ${s.topRight}`}>
          <div className={s.socials}>
            <button
              type="button"
              className={s.socialIcon}
              onClick={() => showToast("Скоро создадим свое VK сообщество!", "success")}
            >
              <img src={vkLogo} alt="VK" />
            </button>
            <button
              type="button"
              className={s.socialIcon}
              onClick={() => showToast("Скоро можно будет написать нам на почту!", "success")}
            >
              <img src={mailLogo} alt="Email" />
            </button>
          </div>
        </div>

        <div className={`${s.card} ${s.bottomLeft}`}>
          <div className={s.legalContent}>
            <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate("/privacy"); }}>Политика конфиденциальности</a>
            <a href="/terms" onClick={(e) => { e.preventDefault(); navigate("/terms"); }}>Правила сервиса</a>

            <div className={s.detailsContainer} ref={dropdownRef}>
              <button
                type="button"
                className={s.summaryBtn}
                onClick={toggleDropdown}
              >
                Источники изображений
              </button>
              {isOpen && (
                <div className={s.linksDropdown}>
                  {freepikLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Freepik Asset {link.id}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`${s.card} ${s.bottomRight}`}>
          <div className={s.navGrid}>
            <div className={s.navColumn}>
              <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Главная</a>
              <a href="/search" onClick={(e) => { e.preventDefault(); navigate("/search"); }}>Поиск</a>
              <a href="/feed" onClick={(e) => { e.preventDefault(); navigate("/feed"); }}>Лента вдохновения</a>
            </div>
            <div className={s.navColumn}>
              <a href="/contacts" onClick={(e) => { e.preventDefault(); navigate("/contacts"); }}>Контакты</a>
              <a href="/login" onClick={(e) => { e.preventDefault(); onOpenAuthModal?.(); }}>Войти</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
