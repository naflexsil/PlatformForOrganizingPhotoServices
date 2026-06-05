import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import searchIcon from "../../assets/icons/search.svg";
import filterIcon from "../../assets/icons/filter.svg";
import closeIcon from "../../assets/icons/carousel_close.svg";
import radioIcon from "../../assets/icons/radio_button.svg";
import radioSelectedIcon from "../../assets/icons/radio_button_selected.svg";
import { useAuth } from "../../context/AuthContext";
import SearchCard from "./SearchCard";
import s from "./SearchPage.module.css";

const LIMIT = 12;

const RATING_OPTIONS = [
  { value: null, label: "Любой" },
  { value: "4",  label: "4 и выше" },
  { value: "3",  label: "3 и выше" },
  { value: "2",  label: "2 и выше" },
];

const readURL = (params) => ({
  tab:       params.get("tab")       || "photographer",
  q:         params.get("q")         || "",
  city:      params.get("city")      || "",
  minRating: params.get("minRating") || null,
  minPrice:  params.get("minPrice")  || "",
  maxPrice:  params.get("maxPrice")  || "",
});

const SearchPage = () => {
  const { accessToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const init = readURL(searchParams);

  const [tab, setTab]               = useState(init.tab);
  const [query, setQuery]           = useState(init.q);
  const [city, setCity]             = useState(init.city);
  const [cityInput, setCityInput]   = useState(init.city);
  const [cities, setCities]         = useState([]);
  const [showCities, setShowCities] = useState(false);
  const [openFilter, setOpenFilter] = useState(null);
  const [rating, setRating]         = useState(init.minRating);
  const [priceFrom, setPriceFrom]   = useState(init.minPrice);
  const [priceTo, setPriceTo]       = useState(init.maxPrice);

  const [results, setResults]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [hasMore, setHasMore]             = useState(true);

  const pageRef          = useRef(1);
  const loadingRef       = useRef(false);
  const hasMoreRef       = useRef(true);
  const seenIdsRef       = useRef(new Set());
  const sentinelRef      = useRef(null);
  const filterRef        = useRef(null);
  const cityInputRef     = useRef(null);
  const currentFiltersRef = useRef(init);

  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setOpenFilter(null);
      if (cityInputRef.current && !cityInputRef.current.contains(e.target)) setShowCities(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchCities = useCallback(async (currentTab) => {
    try {
      const res = await fetch(`/api/search/cities?tab=${currentTab}`);
      const data = await res.json();
      if (data.status === "success") setCities(data.data);
    } catch {}
  }, []);

  const loadPage = useCallback(async (pageNum, filters) => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        tab:   filters.tab,
        page:  pageNum,
        limit: LIMIT,
        ...(filters.q         && { q:         filters.q }),
        ...(filters.city      && { city:      filters.city }),
        ...(filters.minRating && { minRating: filters.minRating }),
        ...(filters.minPrice  && { minPrice:  filters.minPrice }),
        ...(filters.maxPrice  && { maxPrice:  filters.maxPrice }),
      });

      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      const res  = await fetch(`/api/search?${params}`, { headers });
      const data = await res.json();

      if (data.status === "success") {
        const fresh = pageNum === 1
          ? data.data
          : data.data.filter((u) => !seenIdsRef.current.has(u.id));

        if (pageNum === 1) {
          seenIdsRef.current = new Set(data.data.map((u) => u.id));
          setResults(data.data);
        } else {
          fresh.forEach((u) => seenIdsRef.current.add(u.id));
          setResults((prev) => [...prev, ...fresh]);
        }

        hasMoreRef.current = data.pagination.hasMore;
        setHasMore(data.pagination.hasMore);
        pageRef.current = pageNum + 1;
      }
    } catch {} finally {
      loadingRef.current   = false;
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [accessToken]);

  useEffect(() => {
    const filters = readURL(searchParams);

    setTab(filters.tab);
    setCity(filters.city);
    setCityInput(filters.city);
    setRating(filters.minRating);
    setPriceFrom(filters.minPrice);
    setPriceTo(filters.maxPrice);
    setQuery(filters.q);
    currentFiltersRef.current = filters;

    pageRef.current    = 1;
    hasMoreRef.current = true;
    seenIdsRef.current = new Set();
    setResults([]);
    setInitialLoaded(false);
    setHasMore(true);

    fetchCities(filters.tab);
    loadPage(1, filters);
  }, [searchParams]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current && hasMoreRef.current) {
          loadPage(pageRef.current, currentFiltersRef.current);
        }
      },
      { threshold: 0.1, rootMargin: "200px" },
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadPage]);

  const applyURL = (overrides = {}) => {
    const base = {
      tab,
      ...(query.trim() && { q:         query.trim() }),
      ...(city          && { city }),
      ...(rating        && { minRating: rating }),
      ...(priceFrom     && { minPrice:  priceFrom }),
      ...(priceTo       && { maxPrice:  priceTo }),
    };
    setSearchParams({ ...base, ...overrides });
  };

  const handleTabChange = (newTab) => {
    setCity(""); setCityInput(""); setRating(null);
    setPriceFrom(""); setPriceTo(""); setQuery("");
    setOpenFilter(null);
    setSearchParams({ tab: newTab });
  };

  const handleCitySelect = (c) => {
    setCity(c);
    setCityInput(c);
    setShowCities(false);
  };

  const handleApply = () => {
    setOpenFilter(null);
    applyURL();
  };

  const handleResetAll = () => {
    setQuery(""); setCity(""); setCityInput("");
    setRating(null); setPriceFrom(""); setPriceTo("");
    setOpenFilter(null);
    setSearchParams({ tab });
  };

  const filteredCities = cities.filter((c) =>
    c.toLowerCase().includes(cityInput.toLowerCase()),
  );

  const getPriceLabel = () => {
    if (priceFrom && priceTo) return `От ${priceFrom} до ${priceTo}`;
    if (priceFrom) return `От ${priceFrom}`;
    if (priceTo)   return `До ${priceTo}`;
    return "Цена";
  };

  const ratingLabel = rating
    ? RATING_OPTIONS.find((r) => r.value === rating)?.label
    : "Рейтинг";

  const applied = readURL(searchParams);
  const hasActiveFilters =
    applied.city || applied.minRating || applied.minPrice || applied.maxPrice || applied.q;

  return (
    <div className={s.page}>
      <div className={s.container}>
        <div className={s.topCard}>
          <div className={s.tabs}>
            <button
              className={`${s.tab} ${tab === "photographer" ? s.tabActive : ""}`}
              onClick={() => handleTabChange("photographer")}
            >
              Фотограф
            </button>
            <button
              className={`${s.tab} ${tab === "model" ? s.tabActive : ""}`}
              onClick={() => handleTabChange("model")}
            >
              Модель
            </button>
          </div>

          <div className={s.filtersRow} ref={filterRef}>
            <div className={s.cityWrap} ref={cityInputRef}>
              <div
                className={`${s.cityField} ${city ? s.cityFieldActive : ""}`}
                onClick={() => setShowCities(true)}
              >
                <img src={searchIcon} alt="" className={s.cityIcon} />
                <input
                  className={s.cityInput}
                  placeholder="Город"
                  value={cityInput}
                  onChange={(e) => {
                    setCityInput(e.target.value);
                    setCity("");
                    setShowCities(true);
                  }}
                  onFocus={() => setShowCities(true)}
                />
                {city && (
                  <img
                    src={closeIcon}
                    alt="Очистить"
                    className={s.cityClear}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCity(""); setCityInput(""); setShowCities(false);
                    }}
                  />
                )}
              </div>
              {showCities && filteredCities.length > 0 && (
                <div className={s.cityDropdown}>
                  {filteredCities.map((c) => (
                    <button
                      key={c}
                      className={`${s.cityOption} ${city === c ? s.cityOptionActive : ""}`}
                      onClick={() => handleCitySelect(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {tab === "photographer" && (
              <>
                <div className={s.dropdownWrap}>
                  <button
                    className={`${s.filterBtn} ${openFilter === "rating" ? s.filterBtnOpen : ""} ${rating ? s.filterBtnActive : ""}`}
                    onClick={() => setOpenFilter((p) => p === "rating" ? null : "rating")}
                  >
                    {ratingLabel}
                    <img
                      src={filterIcon}
                      alt=""
                      className={`${s.filterIcon} ${openFilter === "rating" ? "" : s.filterIconClosed}`}
                    />
                  </button>
                  {openFilter === "rating" && (
                    <div className={s.dropdown}>
                      {RATING_OPTIONS.map((opt) => (
                        <button
                          key={String(opt.value)}
                          className={`${s.dropdownOption} ${rating === opt.value ? s.dropdownOptionActive : ""}`}
                          onClick={() => { setRating(opt.value); setOpenFilter(null); }}
                        >
                          <img
                            src={rating === opt.value ? radioSelectedIcon : radioIcon}
                            alt=""
                            className={s.radioIcon}
                          />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={s.dropdownWrap}>
                  <button
                    className={`${s.filterBtn} ${openFilter === "price" ? s.filterBtnOpen : ""} ${(priceFrom || priceTo) ? s.filterBtnActive : ""}`}
                    onClick={() => setOpenFilter((p) => p === "price" ? null : "price")}
                  >
                    {getPriceLabel()}
                    <img
                      src={filterIcon}
                      alt=""
                      className={`${s.filterIcon} ${openFilter === "price" ? "" : s.filterIconClosed}`}
                    />
                  </button>
                  {openFilter === "price" && (
                    <div className={`${s.dropdown} ${s.priceDropdown}`}>
                      <div className={s.priceRow}>
                        <div className={s.priceField}>
                          <span className={s.priceLabel}>От</span>
                          <input
                            className={s.priceInput}
                            type="number"
                            min={0}
                            max={999999}
                            placeholder="0"
                            value={priceFrom}
                            onChange={(e) => setPriceFrom(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          />
                        </div>
                        <div className={s.priceField}>
                          <span className={s.priceLabel}>До</span>
                          <input
                            className={s.priceInput}
                            type="number"
                            min={0}
                            max={999999}
                            placeholder="999999"
                            value={priceTo}
                            onChange={(e) => setPriceTo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          />
                        </div>
                      </div>
                      <div className={s.priceActions}>
                        <button className={s.priceReset} onClick={() => { setPriceFrom(""); setPriceTo(""); }}>
                          Сбросить
                        </button>
                        <button className={s.priceDone} onClick={() => setOpenFilter(null)}>
                          Готово
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className={s.searchActions}>
              {hasActiveFilters && (
                <button className={s.resetBtn} onClick={handleResetAll}>
                  Сбросить все
                </button>
              )}
              <button className={s.findBtn} onClick={handleApply}>
                Найти
              </button>
            </div>
          </div>
        </div>

        {!initialLoaded && (
          <div className={s.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`${s.card} ${s.skeleton}`} />
            ))}
          </div>
        )}

        {initialLoaded && results.length === 0 && !loading && (
          <div className={s.empty}>
            <p className={s.emptyTitle}>Никого не нашлось...</p>
            <p className={s.emptyText}>Попробуйте изменить фильтры</p>
            {hasActiveFilters && (
              <button className={s.resetBtn} onClick={handleResetAll}>
                Сбросить все
              </button>
            )}
          </div>
        )}

        {results.length > 0 && (
          <div className={s.grid}>
            {results.map((user) => (
              <SearchCard key={user.id} user={user} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className={s.sentinel} />

        {loading && initialLoaded && (
          <div className={s.loadingMore}>
            <div className={s.spinner} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
