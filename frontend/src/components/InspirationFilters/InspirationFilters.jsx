import { useState, useEffect, useRef } from "react";
import s from "./InspirationFilters.module.css";
import filterIcon from "../../assets/icons/filter.svg";
import radioIcon from "../../assets/icons/radio_button.svg";
import radioSelectedIcon from "../../assets/icons/radio_button_selected.svg";

const CATEGORIES = [
  { value: null,         label: "Все" },
  { value: "wedding",    label: "Свадьба" },
  { value: "family",     label: "Семья" },
  { value: "couple",     label: "Пара" },
  { value: "event",      label: "Событие" },
  { value: "portrait",   label: "Портрет" },
  { value: "commercial", label: "Коммерческое" },
];

const COLOR_TONES = [
  { value: null,      label: "Любая" },
  { value: "warm",    label: "Теплая" },
  { value: "cool",    label: "Холодная" },
  { value: "neutral", label: "Нейтральная" },
  { value: "light",   label: "Светлая" },
  { value: "dark",    label: "Темная" },
];

const FILTERS = [
  { id: "category",  label: "Категория",      options: CATEGORIES  },
  { id: "colorTone", label: "Цветовая гамма", options: COLOR_TONES },
];

const InspirationFilters = ({ onApply, onSearchPhoto, searchMode }) => {
  const [openFilter, setOpenFilter] = useState(null);
  const [pending, setPending]       = useState({ category: null, colorTone: null });
  const [applied, setApplied]       = useState({ category: null, colorTone: null });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleFilter = (id) => setOpenFilter((prev) => (prev === id ? null : id));

  const selectOption = (filterId, value) => {
    setPending((prev) => ({ ...prev, [filterId]: value }));
    setOpenFilter(null);
  };

  const handleApply = () => {
    setApplied(pending);
    onApply(pending);
  };

  const handleReset = () => {
    const empty = { category: null, colorTone: null };
    setPending(empty);
    setApplied(empty);
    setOpenFilter(null);
    onApply(empty);
  };

  const hasActiveFilters   = applied.category !== null || applied.colorTone !== null;
  const hasPendingChanges  =
    pending.category !== applied.category ||
    pending.colorTone !== applied.colorTone;

  const getLabel = (filterId) => {
    const filter   = FILTERS.find((f) => f.id === filterId);
    const selected = filter.options.find((o) => o.value === pending[filterId]);
    return selected?.value !== null ? selected?.label : filter.label;
  };

  return (
    <div className={s.wrapper} ref={containerRef}>
      <div className={s.header}>
        <h1 className={s.title}>Лента вдохновения</h1>
        <p className={s.subtitle}>Фотографии из портфолио фотографов платформы</p>
      </div>

      {!searchMode && (
        <div className={s.row}>
          <div className={s.filtersGroup}>
            {FILTERS.map((filter) => (
              <div className={s.dropdownWrap} key={filter.id}>
                <button
                  className={`${s.filterBtn} ${openFilter === filter.id ? s.filterBtnOpen : ""} ${pending[filter.id] !== null ? s.filterBtnActive : ""}`}
                  onClick={() => toggleFilter(filter.id)}
                >
                  {getLabel(filter.id)}
                  <img
                    src={filterIcon}
                    alt=""
                    className={`${s.filterIcon} ${openFilter === filter.id ? "" : s.filterIconClosed}`}
                  />
                </button>

                {openFilter === filter.id && (
                  <div className={s.dropdown}>
                    {filter.options.map((opt) => (
                      <button
                        key={String(opt.value)}
                        className={`${s.option} ${pending[filter.id] === opt.value ? s.optionActive : ""}`}
                        onClick={() => selectOption(filter.id, opt.value)}
                      >
                        <img
                          src={pending[filter.id] === opt.value ? radioSelectedIcon : radioIcon}
                          alt=""
                          className={s.radioIcon}
                        />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={s.actions}>
            {hasActiveFilters && (
              <button className={s.resetBtn} onClick={handleReset}>
                Сбросить все
              </button>
            )}
            <button
              className={s.applyBtn}
              onClick={handleApply}
              disabled={!hasPendingChanges && !hasActiveFilters}
            >
              Применить
            </button>
            <button className={s.searchPhotoBtn} onClick={onSearchPhoto}>
              Найти по фото
            </button>
          </div>
        </div>
      )}

      {searchMode && (
        <div className={s.searchOnlyRow}>
          <button className={s.searchPhotoBtn} onClick={onSearchPhoto}>
            Найти по фото
          </button>
        </div>
      )}
    </div>
  );
};

export default InspirationFilters;
