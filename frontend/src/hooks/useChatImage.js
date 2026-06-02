import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const cache = new Map();

export function useChatImage(url) {
  const { accessToken } = useAuth();
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    if (!url || !accessToken) return;

    if (cache.has(url)) {
      setBlobUrl(cache.get(url));
      return;
    }

    let cancelled = false;
    let objectUrl = null;

    fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        cache.set(url, objectUrl);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [url, accessToken]);

  return blobUrl;
}
