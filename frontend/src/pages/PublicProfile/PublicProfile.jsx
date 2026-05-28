import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PhotographerProfile from "../PhotographerProfile/PhotographerProfile";
import UserProfile from "../UserProfile/UserProfile";

const normalizeProfileData = (data) => ({
  id: data.id,
  firstName: data.firstName || "",
  lastName: data.lastName || "",
  username: "@" + (data.tag || ""),
  bio: data.bio || "",
  city: data.city || "—",
  avatarUrl: data.avatarUrl || null,
  avatarUrlOriginal: data.avatarUrlOriginal || data.avatarUrl || null,
  rating: data.photographer?.rating != null
    ? String(data.photographer.rating).replace(".", ",") : "—",
  experienceYears: data.photographer?.experienceYears != null
    ? String(data.photographer.experienceYears) : "",
  experienceMonths: data.photographer?.experienceMonths != null
    ? String(data.photographer.experienceMonths) : "",
  deliveryDays: data.photographer?.deliveryTime != null
    ? String(data.photographer.deliveryTime) : "",
  hourlyRate: data.photographer?.pricePerHour != null
    ? String(data.photographer.pricePerHour) : "",
  priceText: data.photographer?.additionalPriceInfo || "",
  searchPhotos: data.photographer?.searchPhotos || [],
});

const PublicProfile = () => {
  const { tag } = useParams();
  const { user, accessToken } = useAuth();
  const [rawData, setRawData] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    setStatus("loading");
    setRawData(null);
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    fetch(`/api/users/by-tag/${encodeURIComponent(tag)}`, { headers })
      .then((r) => r.json())
      .then((result) => {
        if (result.status === "success") {
          setRawData(result.data);
          setStatus("found");
        } else {
          setStatus("notfound");
        }
      })
      .catch(() => setStatus("error"));
  }, [tag, accessToken]);

  if (user?.tag === tag) return <Navigate to="/profile" replace />;

  if (status === "loading") {
    return <div style={{ minHeight: "100vh" }} />;
  }

  if (status === "notfound") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "var(--dark-text)" }}>
          Пользователь не найден
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "var(--dark-text)" }}>
          Не удалось загрузить профиль. Попробуйте позже.
        </p>
      </div>
    );
  }

  const profileData = normalizeProfileData(rawData);

  if (rawData.role === "PHOTOGRAPHER") {
    return <PhotographerProfile isMyProfile={false} profileData={profileData} />;
  }
  return <UserProfile isMyProfile={false} profileData={profileData} />;
};

export default PublicProfile;
