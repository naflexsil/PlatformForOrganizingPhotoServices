import React from "react";
import s from "./Header.module.css";
import { Link, useNavigate } from "react-router-dom";

const Header = ({ isAuthenticated }) => {
  const navigate = useNavigate();

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
            <Link to="/chat">Чат</Link>
            <Link to="/notifications">Уведомления</Link>
            <Link to="/profile" className={s.profileLink}>
              Профиль
            </Link>
          </>
        ) : (
          <button className={s.loginBtn} onClick={() => navigate("/login")}>
            Войти
          </button>
        )}
      </nav>
    </header>
  );
};

export default Header;
