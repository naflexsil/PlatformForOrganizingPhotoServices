import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import s from "./StatsPage.module.css";

const PERIODS = [
  { value: "7d", label: "7 дней" },
  { value: "30d", label: "30 дней" },
  { value: "90d", label: "3 месяца" },
  { value: "all", label: "Всё время" },
];

const STATUS_LABELS = {
  PENDING: "Ожидает",
  AWAITING_PAYMENT: "Ожидает оплаты",
  IN_PROGRESS: "В работе",
  AWAITING_REVIEW: "На проверке",
  REVISION: "На доработке",
  COMPLETED: "Завершено",
  REJECTED: "Отклонено",
};

const STATUS_COLORS = {
  PENDING: "#ead0d0",
  AWAITING_PAYMENT: "#d4aaaa",
  IN_PROGRESS: "#be8080",
  AWAITING_REVIEW: "#b07070",
  REVISION: "#a06060",
  COMPLETED: "#a25555",
  REJECTED: "#d9d9d9",
};

const formatNum = (n) => {
  if (n == null) return "—";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".", ",") + "к";
  return String(n);
};

const SummaryCard = ({ value, label, accent }) => (
  <div className={s.summaryCard}>
    <div className={`${s.summaryValue} ${accent ? s.summaryValueAccent : ""}`}>{value}</div>
    <div className={s.summaryLabel}>{label}</div>
  </div>
);

const BarChart = ({ data, valueKey, color, secondKey, secondColor, chartHeight = 160 }) => {
  const maxVal = Math.max(...data.map((d) => d[valueKey] || 0), 1);
  return (
    <div className={s.barChart}>
      {data.map((item, i) => {
        const barH = Math.max(((item[valueKey] || 0) / maxVal) * chartHeight, item[valueKey] > 0 ? 3 : 0);
        const secondH =
          secondKey && item[valueKey] > 0 && (item[secondKey] || 0) > 0
            ? ((item[secondKey] || 0) / item[valueKey]) * barH
            : 0;
        return (
          <div key={i} className={s.barColumn}>
            <div className={s.barSpacer} style={{ height: chartHeight - barH }} />
            <div
              className={s.barFill}
              style={{ height: barH, background: color }}
              title={`${item.label}: ${item[valueKey] || 0}`}
            >
              {secondH > 0 && (
                <div
                  className={s.barFillSecond}
                  style={{ height: secondH, background: secondColor }}
                  title={`Завершено: ${item[secondKey] || 0}`}
                />
              )}
            </div>
            <span className={s.barLabel}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const StatsPage = () => {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("30d");
  const [content, setContent] = useState(null);
  const [deals, setDeals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accessToken) { navigate("/"); return; }
    if (user && user.role !== "PHOTOGRAPHER") navigate("/");
  }, [accessToken, user, navigate]);

  const fetchData = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/stats/content?period=${period}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json()),
      fetch(`/api/stats/deals?period=${period}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json()),
    ])
      .then(([d1, d2]) => {
        if (d1.status === "success") setContent(d1.data);
        if (d2.status === "success") setDeals(d2.data);
        if (d1.status !== "success" || d2.status !== "success") {
          setError("Не удалось загрузить данные");
        }
      })
      .catch(() => setError("Не удалось загрузить статистику. Проверьте соединение."))
      .finally(() => setLoading(false));
  }, [period, accessToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxComparison = content
    ? Math.max(
        content.contentComparison.avgPostReactions,
        content.contentComparison.avgPhotoReactions,
        1,
      )
    : 1;

  return (
    <div className={s.pageWrapper}>
      <div className={s.container}>

        <div className={s.topBar}>
          <button className={s.backBtn} onClick={() => navigate("/profile")}>
            ← Назад
          </button>
          <h1 className={s.pageTitle}>Статистика</h1>
        </div>

        <div className={s.periodTabs}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={period === p.value ? s.periodTabActive : s.periodTab}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {error && (
          <div className={s.errorBanner}>
            {error}
            <button className={s.retryBtn} onClick={fetchData}>Повторить</button>
          </div>
        )}

        {loading ? (
          <div className={s.skeletonWrap}>
            {[1, 2].map((n) => (
              <div key={n} className={s.skeletonSection}>
                <div className={`${s.skeleton} ${s.skeletonTitle}`} />
                <div className={s.skeletonRow}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`${s.skeleton} ${s.skeletonCard}`} />
                  ))}
                </div>
                <div className={`${s.skeleton} ${s.skeletonChart}`} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {content && (
              <div className={s.section}>
                <h2 className={s.sectionTitle}>Эффективность контента</h2>

                <div className={s.summaryRow}>
                  <SummaryCard value={formatNum(content.summary.totalLikes)} label="Лайки" />
                  <SummaryCard value={formatNum(content.summary.totalFavorites)} label="Избранное" />
                  <SummaryCard value={formatNum(content.summary.totalPosts)} label="Постов" />
                  <SummaryCard value={formatNum(content.summary.totalPortfolioPhotos)} label="Фото портфолио" />
                </div>

                <div className={s.topContentGrid}>
                  <div className={s.topBlock}>
                    <h3 className={s.blockSubtitle}>Топ постов</h3>
                    {content.topPosts.length === 0 ? (
                      <div className={s.emptyHint}>Нет публикаций за выбранный период</div>
                    ) : (
                      content.topPosts.map((post, i) => (
                        <div key={post.id} className={s.topItem}>
                          <span className={s.topRank}>{i + 1}</span>
                          {post.previewUrl ? (
                            <img src={post.previewUrl} alt="" className={s.topThumb} />
                          ) : (
                            <div className={`${s.topThumb} ${s.topThumbEmpty}`} />
                          )}
                          <div className={s.topItemInfo}>
                            <span className={s.topItemDesc}>
                              {post.description
                                ? post.description.slice(0, 45) + (post.description.length > 45 ? "…" : "")
                                : "Без описания"}
                            </span>
                            <span className={s.topItemStats}>
                              {post.likes} лайк. · {post.favorites} изб.
                            </span>
                          </div>
                          <span className={s.topItemTotal}>{post.total}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className={s.topBlock}>
                    <h3 className={s.blockSubtitle}>Топ фото портфолио</h3>
                    {content.topPhotos.length === 0 ? (
                      <div className={s.emptyHint}>Нет фото за выбранный период</div>
                    ) : (
                      content.topPhotos.map((photo, i) => (
                        <div key={photo.id} className={s.topItem}>
                          <span className={s.topRank}>{i + 1}</span>
                          <img src={photo.urlPreview} alt="" className={s.topThumb} />
                          <div className={s.topItemInfo}>
                            <span className={s.topItemDesc}>
                              {photo.folderName || "Общее портфолио"}
                            </span>
                            <span className={s.topItemStats}>{photo.likesCount} лайк.</span>
                          </div>
                          <span className={s.topItemTotal}>{photo.likesCount}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={s.chartSection}>
                  <h3 className={s.blockSubtitle}>Активность за 8 недель</h3>
                  <div className={s.chartLegend}>
                    <span className={s.legendDot} style={{ background: "#a25555" }} />
                    <span className={s.legendText}>Суммарные реакции (лайки + избранное) по неделям</span>
                  </div>
                  <BarChart
                    data={content.weeklyTrend}
                    valueKey="total"
                    color="#a25555"
                    chartHeight={160}
                  />
                </div>

                <div className={s.comparisonSection}>
                  <h3 className={s.blockSubtitle}>Посты vs Портфолио</h3>
                  <p className={s.hintText}>Среднее количество реакций на единицу контента (за всё время)</p>
                  <div className={s.comparisonRows}>
                    <div className={s.comparisonItem}>
                      <span className={s.comparisonLabel}>
                        Посты ({content.contentComparison.postsCount})
                      </span>
                      <div className={s.comparisonTrack}>
                        <div
                          className={s.comparisonFill}
                          style={{
                            width: `${(content.contentComparison.avgPostReactions / maxComparison) * 100}%`,
                            background: "#a25555",
                          }}
                        />
                      </div>
                      <span className={s.comparisonValue}>
                        {content.contentComparison.avgPostReactions.toFixed(1)}
                      </span>
                    </div>
                    <div className={s.comparisonItem}>
                      <span className={s.comparisonLabel}>
                        Портфолио ({content.contentComparison.photosCount})
                      </span>
                      <div className={s.comparisonTrack}>
                        <div
                          className={s.comparisonFill}
                          style={{
                            width: `${(content.contentComparison.avgPhotoReactions / maxComparison) * 100}%`,
                            background: "#c47a7a",
                          }}
                        />
                      </div>
                      <span className={s.comparisonValue}>
                        {content.contentComparison.avgPhotoReactions.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {deals && (
              <div className={s.section}>
                <h2 className={s.sectionTitle}>Аналитика сделок</h2>

                {deals.summary.total === 0 ? (
                  <div className={s.emptySection}>
                    Нет сделок за выбранный период
                  </div>
                ) : (
                  <>
                    <div className={s.summaryRow}>
                      <SummaryCard
                        value={deals.summary.reliabilityIndex != null ? `${deals.summary.reliabilityIndex}%` : "—"}
                        label="Надёжность"
                        accent
                      />
                      <SummaryCard
                        value={deals.avgRating != null ? String(deals.avgRating.toFixed(1)) : "—"}
                        label="Средний рейтинг"
                      />
                      <SummaryCard
                        value={String(deals.avgRevisions.toFixed(1))}
                        label="Доработок / сделку"
                      />
                      <SummaryCard
                        value={formatNum(deals.summary.completed)}
                        label="Завершено"
                      />
                    </div>

                    {deals.monthlyTrend.length > 0 && (
                      <div className={s.chartSection}>
                        <h3 className={s.blockSubtitle}>Заказы за 6 месяцев</h3>
                        <div className={s.chartLegend}>
                          <span className={s.legendDot} style={{ background: "#ead0d0" }} />
                          <span className={s.legendText}>Всего</span>
                          <span className={s.legendDot} style={{ background: "#a25555", marginLeft: 12 }} />
                          <span className={s.legendText}>Завершено</span>
                        </div>
                        <BarChart
                          data={deals.monthlyTrend}
                          valueKey="total"
                          color="#ead0d0"
                          secondKey="completed"
                          secondColor="#a25555"
                          chartHeight={160}
                        />
                      </div>
                    )}

                    {(() => {
                      const entries = Object.entries(deals.statusBreakdown).filter(([, c]) => c > 0);
                      const maxCount = Math.max(...entries.map(([, c]) => c), 1);
                      return entries.length > 0 ? (
                        <div className={s.statusSection}>
                          <h3 className={s.blockSubtitle}>Статусы сделок</h3>
                          {entries.map(([status, count]) => (
                            <div key={status} className={s.statusRow}>
                              <span className={s.statusLabel}>{STATUS_LABELS[status] || status}</span>
                              <div className={s.statusTrack}>
                                <div
                                  className={s.statusFill}
                                  style={{
                                    width: `${(count / maxCount) * 100}%`,
                                    background: STATUS_COLORS[status] || "#d9d9d9",
                                  }}
                                />
                              </div>
                              <span className={s.statusCount}>{count}</span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StatsPage;
