import { useState, useRef, useEffect } from "react";
import s from "./Header.module.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import burgerIcon from "../../assets/icons/burger_menu.svg";

const Header = ({ isAuthenticated, onLoginClick }) => {
  const { logout } = useAuth();
  const { unreadTotal } = useSocket() || {};
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    closeMenu();
    logout();
  };

  return (
    <header className={s.header}>
      <Link to="/">
        <img src="/logo_psyshe.svg" alt="Psyshe" className={s.logo} />
      </Link>

      {/* Desktop nav */}
      <nav className={s.nav}>
        <Link to="/search">Поиск</Link>
        <Link to="/feed">Лента вдохновения</Link>
        {isAuthenticated ? (
          <>
            <Link to="/favorites">Избранное</Link>
            <Link to="/chats" className={s.chatLink}>
              Чат
              {unreadTotal > 0 && <span className={s.unreadBadge}>{unreadTotal}</span>}
            </Link>
            <Link to="/notifications">Уведомления</Link>
            <Link to="/profile" className={s.profileLink}>Профиль</Link>
            <button className={s.logoutBtn} onClick={logout}>Выйти</button>
          </>
        ) : (
          <button className={s.loginBtn} onClick={onLoginClick}>Войти</button>
        )}
      </nav>

      {/* Mobile burger button */}
      <div className={s.burgerWrap} ref={menuRef}>
        <button className={s.burgerBtn} onClick={() => setMenuOpen((v) => !v)} aria-label="Меню">
          <img src={burgerIcon} alt="Меню" className={s.burgerIcon} />
        </button>

        {menuOpen && (
          <div className={s.mobileMenu}>
            <Link to="/search" onClick={closeMenu}>Поиск</Link>
            <Link to="/feed" onClick={closeMenu}>Лента вдохновения</Link>
            {isAuthenticated ? (
              <>
                <Link to="/favorites" onClick={closeMenu}>Избранное</Link>
                <Link to="/chats" onClick={closeMenu}>
                  Чат {unreadTotal > 0 && `(${unreadTotal})`}
                </Link>
                <Link to="/notifications" onClick={closeMenu}>Уведомления</Link>
                <Link to="/profile" onClick={closeMenu}>Профиль</Link>
                <button className={s.mobileLogout} onClick={handleLogout}>Выйти</button>
              </>
            ) : (
              <button className={s.mobileLogin} onClick={() => { closeMenu(); onLoginClick(); }}>Войти</button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
