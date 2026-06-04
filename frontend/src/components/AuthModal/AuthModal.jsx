import { useEffect, useRef, useState } from "react";
import s from "./AuthModal.module.css";
import closeIcon from "../../assets/icons/carousel_close.svg";
let vkConfigInitialized = false;

const AuthModal = ({ onClose, onLoginSuccess, onNeedRegistration, onNeedRestore }) => {
  const vkContainerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const VKID = window.VKIDSDK;
    if (!VKID || !vkContainerRef.current) return;

    if (!vkConfigInitialized) {
      VKID.Config.init({
        app: 54565351,
        redirectUrl: "https://psyshe.art/api/auth/callback",
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: "",
      });
      vkConfigInitialized = true;
    }

    const oneTap = new VKID.OneTap();

    oneTap
      .render({
        container: vkContainerRef.current,
        showAlternativeLogin: true,
        styles: { borderRadius: 12, height: 44 },
      })
      .on(VKID.WidgetEvents.ERROR, (err) => {
        console.error("[VK SDK] widget error:", err);
      })
      .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload) => {
        setIsLoading(true);
        try {
          const tokenData = await VKID.Auth.exchangeCode(
            payload.code,
            payload.device_id,
          );
          await handleVkTokens(tokenData);
        } catch (err) {
          console.error("[VK SDK] exchange error:", err);
        } finally {
          setIsLoading(false);
        }
      });

    return () => {
      if (vkContainerRef.current) vkContainerRef.current.innerHTML = "";
    };
  }, []);

  const handleVkTokens = async (tokenData) => {
    let firstName = "";
    let lastName = "";
    let avatarUrl = null;

    try {
      const userInfoRes = await fetch("https://id.vk.com/oauth2/user_info", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `access_token=${tokenData.access_token}&client_id=54565351`,
      });
      const userInfo = await userInfoRes.json();
      const u = userInfo?.user;
      if (u) {
        firstName = u.first_name || "";
        lastName = u.last_name || "";
        avatarUrl = u.avatar ? u.avatar.replace(/cs=\d+x\d+/, "cs=400x400") : null;
      }
    } catch (err) {
      console.error("[VK SDK] userinfo fetch error:", err);
    }

    const requestBody = {
      idToken: tokenData.id_token,
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(avatarUrl && { avatarUrl }),
    };

    const res = await fetch("/api/auth/vk-sdk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const result = await res.json();

    if (result.status === "error") throw new Error(result.message);

    const { accessToken, refreshToken, user, registrationComplete } =
      result.data;

    if (user.isDeleted) {
      onNeedRestore({ accessToken, refreshToken }, user);
      return;
    }

    if (registrationComplete) {
      onLoginSuccess({ accessToken, refreshToken }, user);
    } else {
      onNeedRegistration({ accessToken, refreshToken }, user);
    }
  };

  return (
    <div
      className={s.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={s.modal}>
        <button className={s.closeBtn} onClick={onClose}>
          <img src={closeIcon} alt="Закрыть" />
        </button>

        <h2 className={s.title}>Войти с помощью</h2>

        <div className={s.vkContainer} ref={vkContainerRef} />

        {isLoading && (
          <div className={s.loadingRow}>
            <div className={s.spinner} />
            <span>Входим...</span>
          </div>
        )}

      </div>
    </div>
  );
};

export default AuthModal;
