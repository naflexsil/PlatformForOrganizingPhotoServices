import { Link, useLocation } from "react-router-dom";
import s from "./DevPanel.module.css";
import { SHOW_DEV_PANEL } from "../../devConfig";

const DEV_ROUTES = [
  { path: "/dev/photographer-mine", label: "Фотограф (мой)" },
  { path: "/dev/photographer-other", label: "Фотограф (чужой)" },
  { path: "/dev/user-mine", label: "Клиент (мой)" },
  { path: "/dev/user-other", label: "Клиент (чужой)" },
];

const DevPanel = () => {
  if (!SHOW_DEV_PANEL) return null;
  const location = useLocation();

  return (
    <div className={s.panel}>
      <span className={s.label}>DEV</span>
      {DEV_ROUTES.map(({ path, label }) => (
        <Link
          key={path}
          to={path}
          className={`${s.link} ${location.pathname === path ? s.active : ""}`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
};

export default DevPanel;
