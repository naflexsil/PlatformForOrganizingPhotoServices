import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import s from "./ChatsPage.module.css";
import ChatList from "../../components/ChatList/ChatList";
import ChatWindow from "../../components/ChatWindow/ChatWindow";
import NewChatModal from "../../components/NewChatModal/NewChatModal";
import DealsTab from "./DealsTab";
import chatIcon from "../../assets/icons/chat.svg";
import addIcon from "../../assets/icons/add.svg";

const EmptyState = () => (
  <div className={s.emptyState}>
    <img src={chatIcon} alt="" className={s.emptyIcon} />
    <p className={s.emptyText}>Выберите чат</p>
  </div>
);

const ChatsPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { isAuth } = useAuth();
  const [activeTab, setActiveTab] = useState("chats");
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  useEffect(() => {
    if (!isAuth) navigate("/", { replace: true });
  }, [isAuth, navigate]);

  return (
    <div className={s.page}>
      <div className={s.leftPanel}>
        {/* Tabs act as the title row */}
        <div className={s.leftHeader}>
          <div className={s.tabs}>
            <button
              className={activeTab === "chats" ? s.tabActive : s.tab}
              onClick={() => setActiveTab("chats")}
            >
              Чаты
            </button>
            <button
              className={activeTab === "deals" ? s.tabActive : s.tab}
              onClick={() => setActiveTab("deals")}
            >
              Сделки
            </button>
          </div>
          <button className={s.newChatBtn} onClick={() => setShowNewChatModal(true)} title="Новый чат">
            <img src={addIcon} alt="Новый чат" className={s.newChatIcon} />
          </button>
        </div>

        {activeTab === "chats" ? (
          <ChatList activeChatId={chatId} />
        ) : (
          <DealsTab />
        )}
      </div>

      <div className={`${s.rightPanel} ${chatId ? s.rightPanelOpen : ""}`}>
        {chatId ? (
          <ChatWindow key={chatId} chatId={chatId} />
        ) : (
          <EmptyState />
        )}
      </div>

      {showNewChatModal && (
        <NewChatModal onClose={() => setShowNewChatModal(false)} />
      )}
    </div>
  );
};

export default ChatsPage;
