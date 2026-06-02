import { useChatImage } from "../../hooks/useChatImage";

const ChatImage = ({ src, alt = "", className, onClick, style }) => {
  const blobUrl = useChatImage(src);

  if (!blobUrl) {
    return (
      <div
        className={className}
        style={{ background: "#f0e8e8", display: "flex", alignItems: "center", justifyContent: "center", ...style }}
      >
        <div style={{ width: 24, height: 24, border: "3px solid #e0d0d0", borderTopColor: "#a25555", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} onClick={onClick} style={style} />;
};

export default ChatImage;
