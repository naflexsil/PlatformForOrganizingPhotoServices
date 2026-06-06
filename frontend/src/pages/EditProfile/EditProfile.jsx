import { useState, useRef } from "react";
import s from "./EditProfile.module.css";
import choiceArrowIcon from "../../assets/icons/choice_arrow_down.svg";
import closeIcon from "../../assets/icons/carousel_close.svg";
import arrowLeftIcon from "../../assets/icons/carousel_arrow_left.svg";
import arrowRightIcon from "../../assets/icons/carousel_arrow_right.svg";
import imagePlaceholderIcon from "../../assets/icons/image_placeholder.svg";
import defaultAvatar from "../../assets/images/default_avatar.webp";
import { RUSSIAN_CITIES } from "../../data/russianCities";
import { useAuth } from "../../context/AuthContext";
import { apiFetch, uploadFile } from "../../services/api";

const NAME_REGEX = /[^a-zA-Zа-яёА-ЯЁ\s-]/g;
const TAG_REGEX = /[^a-z0-9_]/g;

const CitySelect = ({ value, onChange, onQueryChange, error }) => {
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);

  const filtered =
    query.length > 0
      ? RUSSIAN_CITIES.filter((c) =>
          c.toLowerCase().startsWith(query.toLowerCase()),
        )
      : RUSSIAN_CITIES;

  const handleSelect = (city) => {
    setQuery(city);
    onChange(city);
    onQueryChange?.(city);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    onChange("");
    onQueryChange?.("");
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    onChange("");
    onQueryChange?.(e.target.value);
    setIsOpen(true);
  };

  return (
    <div className={s.cityWrapper}>
      <div
        className={`${s.cityInputRow} ${error ? s.inputError : ""} ${value ? s.inputFilled : ""}`}
      >
        <input
          className={s.cityInput}
          type="text"
          placeholder="Не выбрано"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        />
        {value ? (
          <img
            src={closeIcon}
            alt="Очистить"
            className={s.cityIconSmall}
            onClick={handleClear}
          />
        ) : (
          <img
            src={choiceArrowIcon}
            alt="Выбрать"
            className={`${s.cityIcon} ${isOpen ? s.cityIconOpen : ""}`}
            onClick={() => setIsOpen(!isOpen)}
          />
        )}
      </div>
      {isOpen && filtered.length > 0 && (
        <div className={s.cityDropdown}>
          {filtered.map((city) => (
            <div
              key={city}
              className={s.cityOption}
              onMouseDown={() => handleSelect(city)}
            >
              {city}
            </div>
          ))}
        </div>
      )}
      {error && <span className={s.errorText}>{error}</span>}
    </div>
  );
};

const Field = ({ label, children, required }) => (
  <div className={s.fieldRow}>
    <span className={s.fieldLabel}>
      {label}
      {required && <span className={s.requiredMark}> *</span>}
    </span>
    <div className={s.fieldControl}>{children}</div>
  </div>
);

const EditProfile = ({
  isPhotographer = true,
  initialData = {},
  onSave,
  onCancel,
}) => {
  const { accessToken } = useAuth();
  const avatarInputRef = useRef(null);
  const searchPhotosInputRef = useRef(null);

  const rawCity = initialData.city && initialData.city !== "—" ? initialData.city : "";

  const [form, setForm] = useState({
    firstName: initialData.firstName || "",
    lastName: initialData.lastName || "",
    tag: initialData.username?.replace("@", "") || "",
    city: rawCity,
    bio: initialData.bio || "",
    hourlyRate: initialData.hourlyRate || "",
    priceList: initialData.priceList || "",
    experienceYears: initialData.experienceYears || "",
    experienceMonths: initialData.experienceMonths || "",
    deliveryDays: initialData.deliveryDays || "",
  });

  const [cityQuery, setCityQuery] = useState(rawCity);
  const [avatar, setAvatar] = useState(initialData.avatar || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Существующие фото в поиске (S3 URL), пришедшие с сервера
  const [existingSearchPhotos, setExistingSearchPhotos] = useState(
    initialData.searchPhotos || [],
  );
  // Удалённые существующие фото (нужно DELETE на сервере)
  const [removedSearchPhotos, setRemovedSearchPhotos] = useState([]);
  // Новые файлы для загрузки
  const [newSearchPhotoFiles, setNewSearchPhotoFiles] = useState([]);
  // Превью новых файлов (blob URL)
  const [newSearchPhotoPreviews, setNewSearchPhotoPreviews] = useState([]);

  // Все отображаемые фото (существующие + новые превью)
  const searchPhotos = [...existingSearchPhotos, ...newSearchPhotoPreviews];

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [errors, setErrors] = useState({});
  const [searchPhotosError, setSearchPhotosError] = useState("");

  const setName = (field) => (e) => {
    const val = e.target.value.replace(NAME_REGEX, "");
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleTagChange = (e) => {
    const val = e.target.value.toLowerCase().replace(TAG_REGEX, "").slice(0, 20);
    setForm((prev) => ({ ...prev, tag: val }));
    setErrors((prev) => ({ ...prev, tag: undefined }));
  };

  const handleTagBlur = async () => {
    const tag = form.tag.trim();
    if (!tag) return;
    try {
      const headers = accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {};
      const res = await fetch(`/api/users/check-tag?tag=${encodeURIComponent(tag)}`, { headers });
      const result = await res.json();
      if (result.status === "success" && !result.data.available) {
        setErrors((prev) => ({ ...prev, tag: "Этот тег уже занят другим пользователем" }));
      }
    } catch {
      // network error — skip check
    }
  };

  const setNumeric = (field) => (e) => {
    const val = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(URL.createObjectURL(file));
      setAvatarFile(file);
    }
  };

  const handleSearchPhotosChange = (e) => {
    const files = Array.from(e.target.files);
    const total = searchPhotos.length + files.length;
    const remaining = 5 - searchPhotos.length;
    if (remaining <= 0) {
      setSearchPhotosError("Нельзя добавить больше 5 фотографий для поисковой выдачи");
      return;
    }
    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      setSearchPhotosError("Нельзя добавить больше 5 фотографий для поисковой выдачи");
    } else {
      setSearchPhotosError("");
    }
    setNewSearchPhotoFiles((prev) => [...prev, ...toAdd]);
    setNewSearchPhotoPreviews((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
    if (total > 5) {
      // Лишние не добавляем
    }
  };

  const handleRemoveSearchPhoto = () => {
    const idx = currentPhotoIndex;
    const existingCount = existingSearchPhotos.length;
    if (idx < existingCount) {
      // Удаляем существующую S3-фотографию
      const url = existingSearchPhotos[idx];
      setRemovedSearchPhotos((prev) => [...prev, url]);
      setExistingSearchPhotos((prev) => prev.filter((_, i) => i !== idx));
    } else {
      // Удаляем новую (ещё не загруженную) фотографию
      const newIdx = idx - existingCount;
      setNewSearchPhotoFiles((prev) => prev.filter((_, i) => i !== newIdx));
      setNewSearchPhotoPreviews((prev) => prev.filter((_, i) => i !== newIdx));
    }
    setCurrentPhotoIndex((prev) => Math.max(0, prev - 1));
    setSearchPhotosError("");
  };

  const validate = () => {
    const newErrors = {};
    if (!form.firstName.trim())
      newErrors.firstName = "Это поле обязательно к заполнению";
    if (!form.lastName.trim())
      newErrors.lastName = "Это поле обязательно к заполнению";

    if (!form.city) {
      newErrors.city = cityQuery.trim()
        ? "Такого города нет в нашем списке городов"
        : "Это поле обязательно к заполнению";
    }

    if (isPhotographer && !form.hourlyRate)
      newErrors.hourlyRate = "Это поле обязательно к заполнению";
    if (isPhotographer && form.hourlyRate && isNaN(Number(form.hourlyRate)))
      newErrors.hourlyRate = "Введите число";
    if (
      form.experienceYears &&
      (isNaN(Number(form.experienceYears)) || Number(form.experienceYears) > 80)
    )
      newErrors.experienceYears = "От 0 до 80 лет";
    if (
      form.experienceMonths &&
      (isNaN(Number(form.experienceMonths)) ||
        Number(form.experienceMonths) > 12)
    )
      newErrors.experienceMonths = "От 0 до 12 месяцев";
    if (form.deliveryDays && isNaN(Number(form.deliveryDays)))
      newErrors.deliveryDays = "Введите число";

    // preserve existing tag error from blur check
    if (errors.tag) newErrors.tag = errors.tag;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSaving(true);
    setSaveError("");
    try {
      const authHeaders = { Authorization: `Bearer ${accessToken}` };
      const jsonHeaders = { "Content-Type": "application/json", ...authHeaders };

      // 1. Загрузка аватара (если выбран новый)
      let newAvatarUrl = null;
      let newAvatarUrlOriginal = null;
      if (avatarFile) {
        const avatarResult = await uploadFile("/api/upload/avatar", avatarFile, "image", accessToken);
        if (avatarResult.status !== "success") {
          throw new Error("Не удалось загрузить фото профиля: " + avatarResult.message);
        }
        newAvatarUrl = avatarResult.data?.previewUrl || null;
        newAvatarUrlOriginal = avatarResult.data?.originalUrl || null;
      }

      // 2. Удаление снятых фото поиска
      for (const url of removedSearchPhotos) {
        await apiFetch("/api/upload/search-photo", {
          method: "DELETE",
          headers: jsonHeaders,
          body: JSON.stringify({ url }),
        });
      }

      // 3. Загрузка новых фото поиска
      for (const file of newSearchPhotoFiles) {
        const result = await uploadFile("/api/upload/search-photo", file, "image", accessToken);
        if (result.status !== "success") {
          throw new Error("Не удалось загрузить фото для поиска: " + result.message);
        }
      }

      // 4. Сохранение основных данных профиля
      const userResult = await apiFetch("/api/users/me", {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          tag: form.tag || undefined,
          bio: form.bio,
          city: form.city,
        }),
      });
      if (userResult.status !== "success") throw new Error(userResult.message);

      // 5. Сохранение данных фотографа (если нужно)
      if (isPhotographer) {
        const phResult = await apiFetch("/api/users/me/photographer", {
          method: "PATCH",
          headers: jsonHeaders,
          body: JSON.stringify({
            pricePerHour: form.hourlyRate ? Number(form.hourlyRate) : undefined,
            additionalPriceInfo: form.priceList || undefined,
            experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
            experienceMonths: form.experienceMonths ? Number(form.experienceMonths) : undefined,
            deliveryTime: form.deliveryDays ? Number(form.deliveryDays) : undefined,
          }),
        });
        if (phResult.status !== "success") throw new Error(phResult.message);
      }

      onSave?.({
        ...form,
        avatar: newAvatarUrl || avatar,
        avatarUrlOriginal: newAvatarUrlOriginal,
        searchPhotos,
      });
    } catch (err) {
      setSaveError(err.message || "Не удалось сохранить изменения. Попробуйте позже");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={s.pageWrapper}>
      <div className={s.page}>
        <div className={s.avatarCard}>
          <div
            className={s.avatarWrapper}
            onClick={() => avatarInputRef.current.click()}
          >
            <img
              src={avatar || defaultAvatar}
              alt="Аватар"
              className={s.avatarImg}
            />
            <div className={s.avatarOverlay}>
              <img
                src={imagePlaceholderIcon}
                alt=""
                className={s.avatarOverlayIcon}
              />
              <span>Изменить</span>
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            ref={avatarInputRef}
            onChange={handleAvatarChange}
            className={s.hiddenInput}
          />
        </div>

        <div className={s.formCard}>
          <h2 className={s.pageTitle}>Редактирование профиля</h2>

          <div className={s.formSection}>
            <Field label="Имя" required>
              <input
                className={`${s.input} ${errors.firstName ? s.inputError : ""}`}
                value={form.firstName}
                onChange={setName("firstName")}
                placeholder="Введите имя"
              />
              {errors.firstName && (
                <span className={s.errorText}>{errors.firstName}</span>
              )}
            </Field>

            <Field label="Фамилия" required>
              <input
                className={`${s.input} ${errors.lastName ? s.inputError : ""}`}
                value={form.lastName}
                onChange={setName("lastName")}
                placeholder="Введите фамилию"
              />
              {errors.lastName && (
                <span className={s.errorText}>{errors.lastName}</span>
              )}
            </Field>

            <Field label="Тег">
              <input
                className={`${s.input} ${errors.tag ? s.inputError : ""}`}
                value={form.tag}
                onChange={handleTagChange}
                onBlur={handleTagBlur}
                placeholder="username"
                maxLength={20}
              />
              {errors.tag && (
                <span className={s.errorText}>{errors.tag}</span>
              )}
            </Field>

            <Field label="Город" required>
              <CitySelect
                value={form.city}
                onChange={(val) => setForm((prev) => ({ ...prev, city: val }))}
                onQueryChange={setCityQuery}
                error={errors.city}
              />
            </Field>

            <Field label="Обо мне">
              <div className={s.textareaWrapper}>
                <textarea
                  className={s.textarea}
                  value={form.bio}
                  onChange={(e) => {
                    if (e.target.value.length <= 256)
                      setForm((prev) => ({ ...prev, bio: e.target.value }));
                  }}
                  placeholder="Расскажите о себе"
                  rows={5}
                />
                <span className={s.charCount}>{form.bio.length}/256</span>
              </div>
            </Field>

            {isPhotographer && (
              <>
                <Field label="Стоимость часа (от)" required>
                  <div className={s.inputWithSuffix}>
                    <input
                      className={`${s.input} ${errors.hourlyRate ? s.inputError : ""}`}
                      value={form.hourlyRate}
                      onChange={setNumeric("hourlyRate")}
                      placeholder="0"
                      inputMode="numeric"
                    />
                    <span className={s.suffix}>руб</span>
                  </div>
                  {errors.hourlyRate && (
                    <span className={s.errorText}>{errors.hourlyRate}</span>
                  )}
                </Field>

                <Field label="Прайс">
                  <textarea
                    className={s.textarea}
                    value={form.priceList}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, priceList: e.target.value }))
                    }
                    placeholder={
                      "Свадебная съемка от 4500 руб\nПарная съемка от 4500 руб"
                    }
                    rows={4}
                  />
                </Field>

                <Field label="Опыт">
                  <div className={s.experienceRow}>
                    <div className={s.experienceField}>
                      <div className={s.inputWithSuffix}>
                        <input
                          className={`${s.input} ${errors.experienceYears ? s.inputError : ""}`}
                          value={form.experienceYears}
                          onChange={setNumeric("experienceYears")}
                          placeholder="0"
                          inputMode="numeric"
                        />
                        <span className={s.suffix}>лет</span>
                      </div>
                      {errors.experienceYears && (
                        <span className={s.errorText}>
                          {errors.experienceYears}
                        </span>
                      )}
                    </div>
                    <div className={s.experienceField}>
                      <div className={s.inputWithSuffix}>
                        <input
                          className={`${s.input} ${errors.experienceMonths ? s.inputError : ""}`}
                          value={form.experienceMonths}
                          onChange={setNumeric("experienceMonths")}
                          placeholder="0"
                          inputMode="numeric"
                        />
                        <span className={s.suffix}>месяцев</span>
                      </div>
                      {errors.experienceMonths && (
                        <span className={s.errorText}>
                          {errors.experienceMonths}
                        </span>
                      )}
                    </div>
                  </div>
                </Field>

                <Field label="Срок сдачи заказа (от)">
                  <div className={s.inputWithSuffix}>
                    <input
                      className={`${s.input} ${errors.deliveryDays ? s.inputError : ""}`}
                      value={form.deliveryDays}
                      onChange={setNumeric("deliveryDays")}
                      placeholder="0"
                      inputMode="numeric"
                    />
                    <span className={s.suffix}>дней</span>
                  </div>
                  {errors.deliveryDays && (
                    <span className={s.errorText}>{errors.deliveryDays}</span>
                  )}
                </Field>

                <Field
                  label={
                    <>
                      Фотографии для поисковой выдачи
                      <br />
                      <span className={s.fieldHint}>(до 5 фотографий)</span>
                    </>
                  }
                >
                  <div className={s.searchPhotosBlock}>
                    {searchPhotos.length > 0 ? (
                      <div className={s.searchPhotoCarousel}>
                        <button
                          className={s.removePhotoBtn}
                          onClick={handleRemoveSearchPhoto}
                          type="button"
                        >
                          <img src={closeIcon} alt="Удалить" />
                        </button>
                        {searchPhotos.length > 1 && currentPhotoIndex > 0 && (
                          <button
                            className={`${s.arrowBtn} ${s.arrowLeft}`}
                            onClick={() => setCurrentPhotoIndex((p) => p - 1)}
                            type="button"
                          >
                            <img src={arrowLeftIcon} alt="Назад" />
                          </button>
                        )}
                        <img
                          src={searchPhotos[currentPhotoIndex]}
                          alt="Фото"
                          className={s.searchPhotoImg}
                        />
                        {searchPhotos.length > 1 &&
                          currentPhotoIndex < searchPhotos.length - 1 && (
                            <button
                              className={`${s.arrowBtn} ${s.arrowRight}`}
                              onClick={() => setCurrentPhotoIndex((p) => p + 1)}
                              type="button"
                            >
                              <img src={arrowRightIcon} alt="Вперед" />
                            </button>
                          )}
                        <div className={s.photoCounter}>
                          {currentPhotoIndex + 1} / {searchPhotos.length}
                        </div>
                        <button
                          className={s.changePhotoBtn}
                          onClick={() => searchPhotosInputRef.current.click()}
                          type="button"
                        >
                          <img src={imagePlaceholderIcon} alt="" />
                          <span>Изменить</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        className={s.searchPhotoEmpty}
                        onClick={() => searchPhotosInputRef.current.click()}
                      >
                        <img
                          src={imagePlaceholderIcon}
                          alt=""
                          className={s.searchPhotoEmptyIcon}
                        />
                        <span className={s.searchPhotoEmptyText}>
                          Добавить фото
                        </span>
                      </div>
                    )}

                    {searchPhotos.length > 0 && searchPhotos.length < 5 && (
                      <button
                        className={s.addPhotoBtn}
                        onClick={() => searchPhotosInputRef.current.click()}
                        type="button"
                      >
                        Добавить еще
                      </button>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      ref={searchPhotosInputRef}
                      onChange={handleSearchPhotosChange}
                      className={s.hiddenInput}
                    />
                    {searchPhotosError && (
                      <span className={s.errorText}>{searchPhotosError}</span>
                    )}
                  </div>
                </Field>
              </>
            )}

            {saveError && (
              <span className={s.errorText}>{saveError}</span>
            )}
            <div className={s.buttons}>
              <button
                className={s.cancelBtn}
                onClick={onCancel}
                type="button"
                disabled={isSaving}
              >
                Отменить изменения
              </button>
              <button
                className={s.saveBtn}
                onClick={handleSubmit}
                type="button"
                disabled={isSaving}
              >
                {isSaving ? "Сохранение..." : "Сохранить изменения"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
