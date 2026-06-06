import { useState } from "react";
import s from "./RegistrationFormModal.module.css";
import closeIcon from "../../assets/icons/carousel_close.svg";
import choiceArrowIcon from "../../assets/icons/choice_arrow_down.svg";
import defaultAvatar from "../../assets/images/default_avatar.webp";
import { RUSSIAN_CITIES } from "../../data/russianCities";
import { useAuth } from "../../context/AuthContext";

const NAME_REGEX = /[^a-zA-Zа-яёА-ЯЁ\s-]/g;
const TAG_REGEX = /[^a-z0-9_]/g;

const CitySelect = ({ value, onChange, error }) => {
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
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    onChange("");
    setIsOpen(false);
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
          onChange={(e) => {
            setQuery(e.target.value);
            onChange("");
            setIsOpen(true);
          }}
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

const RegistrationFormModal = ({ role, vkUser, onClose, onComplete }) => {
  const { accessToken } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    firstName: vkUser?.firstName || "",
    lastName: vkUser?.lastName || "",
    tag: "",
    city: "",
    bio: "",
    hourlyRate: "",
    priceList: "",
    experienceYears: "",
    experienceMonths: "",
    deliveryDays: "",
  });

  const [avatar] = useState(vkUser?.avatarUrl || null);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setName = (field) => (e) => {
    const val = e.target.value.replace(NAME_REGEX, "");
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleTagChange = (e) => {
    const val = e.target.value.toLowerCase().replace(TAG_REGEX, "").slice(0, 20);
    setForm((prev) => ({ ...prev, tag: val }));
    setErrors((prev) => ({ ...prev, tag: undefined }));
  };

  const setNumeric = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value.replace(/\D/g, "") }));

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = "Это поле обязательно к заполнению";
    if (!form.lastName.trim()) errs.lastName = "Это поле обязательно к заполнению";
    if (!form.tag.trim()) errs.tag = "Это поле обязательно к заполнению";
    if (!form.city) errs.city = "Это поле обязательно к заполнению";
    if (role === "PHOTOGRAPHER" && !form.hourlyRate)
      errs.hourlyRate = "Это поле обязательно к заполнению";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        tag: form.tag.trim(),
        role,
        city: form.city,
        bio: form.bio.trim(),
        ...(role === "PHOTOGRAPHER" && {
          pricePerHour: form.hourlyRate || undefined,
          additionalPriceInfo: form.priceList.trim() || undefined,
          experienceYears: form.experienceYears || undefined,
          experienceMonths: form.experienceMonths || undefined,
          deliveryTime: form.deliveryDays || undefined,
        }),
      };

      const res = await fetch("/api/auth/complete-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (result.status === "error") {
        if (result.message.includes("Тег")) {
          setErrors((prev) => ({ ...prev, tag: result.message }));
        } else {
          throw new Error(result.message);
        }
        return;
      }

      onComplete(result.data);
    } catch (err) {
      setErrors((prev) => ({ ...prev, _form: err.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <h2 className={s.title}>Заполните профиль</h2>
          <button className={s.closeBtn} onClick={() => setShowWarning(true)}>
            <img src={closeIcon} alt="Закрыть" />
          </button>
        </div>

        <div className={s.scrollBody}>
          <div className={s.avatarRow}>
            <div className={s.avatarWrapper}>
              <img
                src={avatar || defaultAvatar}
                alt="Аватар"
                className={s.avatarImg}
              />
            </div>
            <div className={s.roleTag}>
              {role === "PHOTOGRAPHER" ? "Фотограф" : "Клиент"}
            </div>
          </div>

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

            <Field label="Тег" required>
              <input
                className={`${s.input} ${errors.tag ? s.inputError : ""}`}
                value={form.tag}
                onChange={handleTagChange}
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
                  rows={4}
                />
                <span className={s.charCount}>{form.bio.length}/256</span>
              </div>
            </Field>

            {role === "PHOTOGRAPHER" && (
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
                    onChange={set("priceList")}
                    placeholder={"Свадебная съемка от 4500 руб\nПарная съемка от 4500 руб"}
                    rows={3}
                  />
                </Field>

                <Field label="Опыт">
                  <div className={s.experienceRow}>
                    <div className={s.inputWithSuffix}>
                      <input
                        className={s.input}
                        value={form.experienceYears}
                        onChange={setNumeric("experienceYears")}
                        placeholder="0"
                        inputMode="numeric"
                      />
                      <span className={s.suffix}>лет</span>
                    </div>
                    <div className={s.inputWithSuffix}>
                      <input
                        className={s.input}
                        value={form.experienceMonths}
                        onChange={setNumeric("experienceMonths")}
                        placeholder="0"
                        inputMode="numeric"
                      />
                      <span className={s.suffix}>месяцев</span>
                    </div>
                  </div>
                </Field>

                <Field label="Срок сдачи (от)">
                  <div className={s.inputWithSuffix}>
                    <input
                      className={s.input}
                      value={form.deliveryDays}
                      onChange={setNumeric("deliveryDays")}
                      placeholder="0"
                      inputMode="numeric"
                    />
                    <span className={s.suffix}>дней</span>
                  </div>
                </Field>
              </>
            )}

            {errors._form && (
              <p className={s.formError}>{errors._form}</p>
            )}
          </div>
        </div>

        <div className={s.footer}>
          <button
            className={s.submitBtn}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Сохраняем..." : "Завершить регистрацию"}
          </button>
        </div>

        {showWarning && (
          <div className={s.warningOverlay}>
            <div className={s.warningBox}>
              <p className={s.warningText}>Данные не сохранятся. Выйти?</p>
              <div className={s.warningButtons}>
                <button
                  className={s.warningStay}
                  onClick={() => setShowWarning(false)}
                >
                  Остаться
                </button>
                <button className={s.warningLeave} onClick={onClose}>
                  Выйти
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationFormModal;
