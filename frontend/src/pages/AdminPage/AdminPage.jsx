import { useState, useEffect } from "react";
import defaultAvatar from "../../assets/images/default_avatar.png";
import s from "./AdminPage.module.css";

const STATUS_LABELS = {
  OPEN:        "Открыт",
  IN_PROGRESS: "В работе",
  RESOLVED:    "Решён",
};

const AdminPage = () => {
  const [token, setToken]       = useState(() => sessionStorage.getItem("adminToken") || "");
  const [input, setInput]       = useState("");
  const [authed, setAuthed]     = useState(!!sessionStorage.getItem("adminToken"));
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [replies, setReplies]   = useState({});
  const [sending, setSending]   = useState({});
  const [error, setError]       = useState("");

  const authHeaders = { "X-Admin-Token": token, "Content-Type": "application/json" };

  const fetchTickets = async (t) => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/admin/tickets", { headers: { "X-Admin-Token": t } });
      const data = await res.json();
      if (data.status === "success") {
        setTickets(data.data);
      } else {
        setError("Неверный пароль");
        setAuthed(false);
        sessionStorage.removeItem("adminToken");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed && token) fetchTickets(token);
  }, [authed]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    sessionStorage.setItem("adminToken", t);
    setToken(t);
    setAuthed(true);
    await fetchTickets(t);
  };

  const handleReply = async (ticketId) => {
    const msg = replies[ticketId]?.trim();
    if (!msg) return;
    setSending((p) => ({ ...p, [ticketId]: true }));
    try {
      const res  = await fetch(`/api/admin/tickets/${ticketId}/reply`, {
        method:  "POST",
        headers: authHeaders,
        body:    JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setTickets((prev) => prev.map((t) => t.id === ticketId ? data.data : t));
        setReplies((p) => ({ ...p, [ticketId]: "" }));
      }
    } finally {
      setSending((p) => ({ ...p, [ticketId]: false }));
    }
  };

  if (!authed) {
    return (
      <div className={s.loginPage}>
        <div className={s.loginCard}>
          <h1 className={s.loginTitle}>Панель администратора</h1>
          <form onSubmit={handleLogin} className={s.loginForm}>
            <input
              className={s.loginInput}
              type="password"
              placeholder="Пароль администратора"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
            <button className={s.loginBtn} type="submit">Войти</button>
          </form>
          {error && <p className={s.loginError}>{error}</p>}
        </div>
      </div>
    );
  }

  const open     = tickets.filter((t) => t.status !== "RESOLVED");
  const resolved = tickets.filter((t) => t.status === "RESOLVED");
  const ordered  = [...open, ...resolved];

  return (
    <div className={s.page}>
      <div className={s.container}>
        <div className={s.topBar}>
          <h1 className={s.pageTitle}>Тикеты поддержки</h1>
          <button className={s.logoutBtn} onClick={() => {
            sessionStorage.removeItem("adminToken");
            setAuthed(false); setToken(""); setTickets([]);
          }}>
            Выйти
          </button>
        </div>

        {loading && <p className={s.hint}>Загрузка...</p>}

        <div className={s.ticketList}>
          {ordered.map((ticket) => (
            <div key={ticket.id} className={`${s.ticket} ${ticket.status === "RESOLVED" ? s.ticketResolved : ""}`}>
              <div className={s.ticketHeader}>
                <div className={s.userInfo}>
                  <img src={ticket.user?.avatarUrl || defaultAvatar} alt="" className={s.avatar} />
                  <div>
                    <p className={s.userName}>{ticket.user?.firstName} {ticket.user?.lastName}</p>
                    <p className={s.userTag}>@{ticket.user?.tag}</p>
                  </div>
                </div>
                <span className={`${s.statusBadge} ${s[`status${ticket.status}`]}`}>
                  {STATUS_LABELS[ticket.status]}
                </span>
              </div>

              <div className={s.ticketBody}>
                <p className={s.ticketMessage}>{ticket.message}</p>
                {ticket.dealId  && <p className={s.hint}>Сделка: {ticket.dealId}</p>}
                {ticket.chatId  && <p className={s.hint}>Чат: {ticket.chatId}</p>}
                <p className={s.hint}>{new Date(ticket.createdAt).toLocaleString("ru-RU")}</p>
              </div>

              {ticket.adminReply ? (
                <div className={s.existingReply}>
                  <b>Ответ:</b> {ticket.adminReply}
                </div>
              ) : (
                <div className={s.replyArea}>
                  <textarea
                    className={s.textarea}
                    placeholder="Напишите ответ..."
                    value={replies[ticket.id] || ""}
                    onChange={(e) => setReplies((p) => ({ ...p, [ticket.id]: e.target.value }))}
                  />
                  <button
                    className={s.replyBtn}
                    onClick={() => handleReply(ticket.id)}
                    disabled={sending[ticket.id] || !replies[ticket.id]?.trim()}
                  >
                    {sending[ticket.id] ? "Отправка..." : "Ответить"}
                  </button>
                </div>
              )}
            </div>
          ))}
          {!loading && ordered.length === 0 && (
            <p className={s.hint}>Тикетов нет</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
