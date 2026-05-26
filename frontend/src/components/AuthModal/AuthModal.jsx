import { useEffect, useRef, useState } from "react";
import s from "./AuthModal.module.css";
import closeIcon from "../../assets/icons/carousel_close.svg";
import { SHOW_DEV_PANEL } from "../../devConfig";

let vkConfigInitialized = false;

const AuthModal = ({ onClose, onLoginSuccess, onNeedRegistration }) => {
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
    const res = await fetch("/api/auth/vk-sdk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: tokenData.id_token }),
    });
    const result = await res.json();

    if (result.status === "error") throw new Error(result.message);

    const { accessToken, refreshToken, user, registrationComplete } =
      result.data;

    if (registrationComplete) {
      onLoginSuccess({ accessToken, refreshToken }, user);
    } else {
      onNeedRegistration({ accessToken, refreshToken }, user);
    }
  };

  const handleMockLogin = async (role, id = "1") => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/auth/mock-login?role=${role}&id=${id}`);
      const result = await res.json();
      if (result.status === "error") throw new Error(result.message);
      const { accessToken, refreshToken, user } = result.data;
      const isComplete = user.tag && !user.tag.startsWith("vk_");
      if (isComplete) {
        onLoginSuccess({ accessToken, refreshToken }, user);
      } else {
        onNeedRegistration({ accessToken, refreshToken }, user);
      }
    } catch (err) {
      console.error("[Mock] login error:", err);
    } finally {
      setIsLoading(false);
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

        {SHOW_DEV_PANEL && (
          <div className={s.devSection}>
            <p className={s.devLabel}>Dev-режим (mock login)</p>
            <p className={s.devHint}>Существующий аккаунт (id=1)</p>
            <div className={s.devButtons}>
              <button
                className={s.devBtn}
                onClick={() => handleMockLogin("USER", "1")}
              >
                Клиент
              </button>
              <button
                className={s.devBtn}
                onClick={() => handleMockLogin("PHOTOGRAPHER", "1")}
              >
                Фотограф
              </button>
            </div>
            <p className={s.devHint}>Новый аккаунт (покажет форму регистрации)</p>
            <div className={s.devButtons}>
              <button
                className={s.devBtn}
                onClick={() => handleMockLogin("USER", String(Date.now()))}
              >
                Новый Клиент
              </button>
              <button
                className={s.devBtn}
                onClick={() => handleMockLogin("PHOTOGRAPHER", String(Date.now()))}
              >
                Новый Фотограф
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
