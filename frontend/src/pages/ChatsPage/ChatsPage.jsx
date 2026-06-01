import { useState } from "react";
import { useParams } from "react-router-dom";
import s from "./ChatsPage.module.css";
import ChatList from "../../components/ChatList/ChatList";
import ChatWindow from "../../components/ChatWindow/ChatWindow";
import NewChatModal from "../../components/NewChatModal/NewChatModal";
import chatIcon from "../../assets/icons/chat.svg";

const EmptyState = () => (
  <div className={s.emptyState}>
    <img src={chatIcon} alt="" className={s.emptyIcon} />
    <p className={s.emptyText}>Выберите чат</p>
  </div>
);

const ChatsPage = () => {
  const { chatId } = useParams();
  const [activeTab, setActiveTab] = useState("chats");
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  return (
    <div className={s.page}>
      <div className={s.leftPanel}>
        <div className={s.leftHeader}>
          <span className={s.title}>Чаты</span>
          <button className={s.newChatBtn} onClick={() => setShowNewChatModal(true)} title="Новый чат">
            +
          </button>
        </div>

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

        {activeTab === "chats" ? (
          <ChatList activeChatId={chatId} />
        ) : (
          <div className={s.dealsPlaceholder}>Сделки появятся здесь</div>
        )}
      </div>

      <div className={s.rightPanel}>
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
