import s from "./Header.module.css";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";

const Header = ({ isAuthenticated, onLoginClick }) => {
  const { logout } = useAuth();
  const { unreadTotal } = useSocket() || {};

  return (
    <header className={s.header}>
      <Link to="/">
        <img src="/logo_psyshe.svg" alt="Psyshe" className={s.logo} />
      </Link>

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
            <Link to="/profile" className={s.profileLink}>
              Профиль
            </Link>
            <button className={s.logoutBtn} onClick={logout}>
              Выйти
            </button>
          </>
        ) : (
          <button className={s.loginBtn} onClick={onLoginClick}>
            Войти
          </button>
        )}
      </nav>
    </header>
  );
};

export default Header;
