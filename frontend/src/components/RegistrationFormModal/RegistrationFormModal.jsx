import { useState, useRef } from "react";
import s from "./RegistrationFormModal.module.css";
import closeIcon from "../../assets/icons/carousel_close.svg";
import choiceArrowIcon from "../../assets/icons/choice_arrow_down.svg";
import defaultAvatar from "../../assets/images/default_avatar.png";
import imagePlaceholderIcon from "../../assets/icons/image_placeholder.svg";
import { RUSSIAN_CITIES } from "../../data/russianCities";
import { useAuth } from "../../context/AuthContext";

const CitySelect = ({ value, onChange, error }) => {
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);

  const filtered =
    query.length > 0
      ? RUSSIAN_CITIES.filter((c) =>
          c.toLowerCase().startsWith(query.toLowerCase()),
        )
      : RUSSIAN_CITIES;

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
        <img
          src={choiceArrowIcon}
          alt=""
          className={`${s.cityIcon} ${isOpen ? s.cityIconOpen : ""}`}
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>
      {isOpen && filtered.length > 0 && (
        <div className={s.cityDropdown}>
          {filtered.map((city) => (
            <div
              key={city}
              className={s.cityOption}
              onMouseDown={() => {
                setQuery(city);
                onChange(city);
                setIsOpen(false);
              }}
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
  const avatarInputRef = useRef(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const formatBirthDate = (dateVal) => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      return d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const [form, setForm] = useState({
    firstName: vkUser?.firstName || "",
    lastName: vkUser?.lastName || "",
    tag: "",
    gender: vkUser?.gender || "",
    birthDate: formatBirthDate(vkUser?.birthDate),
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

  const setNumeric = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value.replace(/\D/g, "") }));

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = "Обязательное поле";
    if (!form.lastName.trim()) errs.lastName = "Обязательное поле";
    if (!form.tag.trim()) errs.tag = "Обязательное поле";
    if (/\s/.test(form.tag)) errs.tag = "Тег не может содержать пробелы";
    if (!form.gender) errs.gender = "Выберите пол";
    if (!form.birthDate) errs.birthDate = "Обязательное поле";
    if (!form.city) errs.city = "Обязательное поле";
    if (role === "PHOTOGRAPHER" && !form.hourlyRate)
      errs.hourlyRate = "Обязательное поле";
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
        gender: form.gender,
        birthDate: form.birthDate,
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
            <div
              className={s.avatarWrapper}
              onClick={() => avatarInputRef.current?.click()}
            >
              <img
                src={avatar || defaultAvatar}
                alt="Аватар"
                className={s.avatarImg}
              />
              <div className={s.avatarOverlay}>
                <img src={imagePlaceholderIcon} alt="" className={s.avatarOverlayIcon} />
                <span>Изменить</span>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              ref={avatarInputRef}
              className={s.hiddenInput}
            />
            <div className={s.roleTag}>
              {role === "PHOTOGRAPHER" ? "Фотограф" : "Клиент"}
            </div>
          </div>

          <div className={s.formSection}>
            <Field label="Имя" required>
              <input
                className={`${s.input} ${errors.firstName ? s.inputError : ""}`}
                value={form.firstName}
                onChange={set("firstName")}
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
                onChange={set("lastName")}
                placeholder="Введите фамилию"
              />
              {errors.lastName && (
                <span className={s.errorText}>{errors.lastName}</span>
              )}
            </Field>

            <Field label="Тег (@)" required>
              <input
                className={`${s.input} ${errors.tag ? s.inputError : ""}`}
                value={form.tag}
                onChange={set("tag")}
                placeholder="username"
              />
              {errors.tag && (
                <span className={s.errorText}>{errors.tag}</span>
              )}
            </Field>

            <Field label="Пол" required>
              <div className={s.genderRow}>
                <label className={`${s.genderOption} ${form.gender === "male" ? s.genderSelected : ""}`}>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={form.gender === "male"}
                    onChange={set("gender")}
                    className={s.hiddenInput}
                  />
                  Мужской
                </label>
                <label className={`${s.genderOption} ${form.gender === "female" ? s.genderSelected : ""}`}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={form.gender === "female"}
                    onChange={set("gender")}
                    className={s.hiddenInput}
                  />
                  Женский
                </label>
              </div>
              {errors.gender && (
                <span className={s.errorText}>{errors.gender}</span>
              )}
            </Field>

            <Field label="Дата рождения" required>
              <input
                type="date"
                className={`${s.input} ${errors.birthDate ? s.inputError : ""}`}
                value={form.birthDate}
                onChange={set("birthDate")}
              />
              {errors.birthDate && (
                <span className={s.errorText}>{errors.birthDate}</span>
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
