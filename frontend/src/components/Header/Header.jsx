import React from "react";
import s from "./Header.module.css";

const Header = () => {
  return (
    <header className={s.header}>
      <img src="/logo_psyshe.svg" alt="Psyshe" className={s.logo} />
      <nav className={s.nav}>
        <a href="#">Поиск</a>
        <a href="#">Лента вдохновения</a>
        <button className={s.loginBtn}>Войти</button>
      </nav>
    </header>
  );
};

export default Header;
