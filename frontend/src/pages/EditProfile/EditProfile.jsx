import { useState, useRef } from "react";
import s from "./EditProfile.module.css";
import choiceArrowIcon from "../../assets/icons/choice_arrow_down.svg";
import closeIcon from "../../assets/icons/carousel_close.svg";
import arrowLeftIcon from "../../assets/icons/carousel_arrow_left.svg";
import arrowRightIcon from "../../assets/icons/carousel_arrow_right.svg";
import imagePlaceholderIcon from "../../assets/icons/image_placeholder.svg";
import defaultAvatar from "../../assets/images/default_avatar.png";
import { RUSSIAN_CITIES } from "../../data/russianCities";
import { useAuth } from "../../context/AuthContext";

const NAME_REGEX = /[^a-zA-Zа-яёА-ЯЁ\s-]/g;
const TAG_REGEX = /[^a-zA-Z0-9_]/g;

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

  const [form, setForm] = useState({
    firstName: initialData.firstName || "Алина",
    lastName: initialData.lastName || "Старикова",
    tag: initialData.username?.replace("@", "") || "flexsana",
    city: initialData.city || "Кемерово",
    bio: initialData.bio || "",
    hourlyRate: initialData.hourlyRate || "",
    priceList: initialData.priceList || "",
    experienceYears: initialData.experienceYears || "",
    experienceMonths: initialData.experienceMonths || "",
    deliveryDays: initialData.deliveryDays || "",
  });

  const [cityQuery, setCityQuery] = useState(initialData.city || "Кемерово");
  const [avatar, setAvatar] = useState(initialData.avatar || null);
  const [searchPhotos, setSearchPhotos] = useState(
    initialData.searchPhotos || [],
  );
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [errors, setErrors] = useState({});
  const [searchPhotosError, setSearchPhotosError] = useState("");

  const setName = (field) => (e) => {
    const val = e.target.value.replace(NAME_REGEX, "");
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleTagChange = (e) => {
    const val = e.target.value.replace(TAG_REGEX, "");
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
    if (file) setAvatar(URL.createObjectURL(file));
  };

  const handleSearchPhotosChange = (e) => {
    const files = Array.from(e.target.files);
    const total = searchPhotos.length + files.length;
    if (total > 5) {
      setSearchPhotosError(
        "Нельзя добавить больше 5 фотографий для поисковой выдачи",
      );
      const allowed = files.slice(0, 5 - searchPhotos.length);
      setSearchPhotos((prev) => [
        ...prev,
        ...allowed.map((f) => URL.createObjectURL(f)),
      ]);
      return;
    }
    setSearchPhotosError("");
    setSearchPhotos((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const handleRemoveSearchPhoto = () => {
    setSearchPhotos((prev) => prev.filter((_, i) => i !== currentPhotoIndex));
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

  const handleSubmit = () => {
    if (!validate()) return;
    onSave?.({ ...form, avatar, searchPhotos });
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

            <div className={s.buttons}>
              <button className={s.cancelBtn} onClick={onCancel} type="button">
                Отменить изменения
              </button>
              <button
                className={s.saveBtn}
                onClick={handleSubmit}
                type="button"
              >
                Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
