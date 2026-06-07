import { useNavigate } from "react-router-dom";
import s from "./ContactsPage.module.css";

const CONTACTS = [
  { name: "Дмитрий", url: "https://vk.com/bread11" },
  { name: "Алина", url: "https://vk.com/fle0019" },
];

const ContactsPage = () => {
  const navigate = useNavigate();

  return (
    <div className={s.pageWrapper}>
      <div className={s.container}>
        <div className={s.topBar}>
          <button className={s.backBtn} onClick={() => navigate("/")}>
            ← Назад
          </button>
          <h1 className={s.pageTitle}>Контакты</h1>
        </div>

        <div className={s.card}>
          <p className={s.intro}>
            Если у вас есть вопросы по проекту Psyshe, свяжитесь с нами в VK:
          </p>

          <ul className={s.list}>
            {CONTACTS.map((c) => (
              <li key={c.url} className={s.item}>
                <span className={s.name}>{c.name}:</span>{" "}
                <a href={c.url} target="_blank" rel="noreferrer" className={s.link}>
                  {c.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ContactsPage;
