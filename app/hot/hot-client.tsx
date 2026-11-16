"use client";

import Link from "next/link";
import { useState } from "react";
import { compactCount } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { HotCategory, HotPeriod, HotRepoItem } from "@/lib/github";

export type HotRepoWithStatus = HotRepoItem & {
  saved: boolean;
  installed: boolean;
};

const CATEGORIES: { id: HotCategory; labelKey?: "hotCatAll" | "hotCatAi" | "hotCatSelfHosted"; staticLabel?: string }[] = [
  { id: "all", labelKey: "hotCatAll" },
  { id: "ai", labelKey: "hotCatAi" },
  { id: "self-hosted", labelKey: "hotCatSelfHosted" },
  { id: "python", staticLabel: "Python" },
  { id: "typescript", staticLabel: "TypeScript" },
  { id: "rust", staticLabel: "Rust" },
  { id: "go", staticLabel: "Go" },
];

export function HotClient({
  initialItems,
  initialFetchedAt,
  initialError,
}: {
  initialItems: HotRepoWithStatus[];
  initialFetchedAt: number;
  initialError?: string | null;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<HotRepoWithStatus[]>(initialItems);
  const [period, setPeriod] = useState<HotPeriod>("week");
  const [category, setCategory] = useState<HotCategory>("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [fetchedAt, setFetchedAt] = useState<number>(initialFetchedAt);

  const loadHot = async (nextPeriod: HotPeriod, nextCategory: HotCategory, isRefresh = false) => {
    setPeriod(nextPeriod);
    setCategory(nextCategory);
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/hot?period=${encodeURIComponent(nextPeriod)}&category=${encodeURIComponent(nextCategory)}${isRefresh ? "&refresh=1" : ""}`,
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load hot repos");
      }
      setItems(data.items ?? []);
      setFetchedAt(data.fetchedAt ?? Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hot repos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveToShelf = async (r: HotRepoWithStatus) => {
    const { fullName } = r;
    if (savingMap[fullName]) return;
    setSavingMap((prev) => ({ ...prev, [fullName]: true }));
    setError(null);
    try {
      const [owner, repo] = fullName.split("/");
      const res = await fetch("/api/shelf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo,
          fullName: r.fullName,
          description: r.description,
          stars: r.stars,
          language: r.language,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.fullName === fullName ? { ...item, saved: true } : item)),
        );
        try {
          localStorage.setItem(`gitmanual-shelf:${fullName.toLowerCase()}`, "1");
        } catch {}
      } else {
        setError(data.error || "Failed to save to shelf");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save to shelf");
    } finally {
      setSavingMap((prev) => ({ ...prev, [fullName]: false }));
    }
  };

  return (
    <div className="wrap shelf-page hot-page">
      <header className="hot-page-head">
        <div>
          <p className="eyebrow">🔥 {t("hotRepoEyebrow")}</p>
          <h1 className="display-md">{t("hotRepoTitle")}</h1>
          <p className="lead">{t("hotRepoDesc")}</p>
        </div>
        <div className="hot-head-actions">
          <button
            type="button"
            className="btn btn-sm hot-refresh-btn"
            onClick={() => loadHot(period, category, true)}
            disabled={refreshing || loading}
          >
            {refreshing ? `↻ ${t("hotRefreshing")}` : `↻ ${t("hotRefresh")}`}
          </button>
          {fetchedAt > 0 && (
            <span className="hot-updated">
              {new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </header>

      <div className="hot-filters-bar">
        <div className="hot-filter-group" role="group" aria-label="Time period">
          {(
            [
              ["day", t("hotPeriodDay")],
              ["week", t("hotPeriodWeek")],
              ["month", t("hotPeriodMonth")],
              ["year", t("hotPeriodYear")],
              ["top-star", t("hotPeriodTopStar")],
              ["top-fork", t("hotPeriodTopFork")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`hot-pill ${period === id ? "active" : ""}`}
              onClick={() => loadHot(id, category)}
              disabled={loading}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="hot-filter-group" role="group" aria-label="Category or language">
          {CATEGORIES.map((c) => {
            const label = c.labelKey ? t(c.labelKey) : c.staticLabel!;
            return (
              <button
                key={c.id}
                type="button"
                className={`hot-pill ${category === c.id ? "active" : ""}`}
                onClick={() => loadHot(period, c.id)}
                disabled={loading}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="panel shelf-empty" style={{ marginBottom: 24 }}>
          <p className="note">{error}</p>
          <button type="button" className="btn btn-go btn-sm" onClick={() => loadHot(period, category, true)}>
            ↻ {t("hotRefresh")}
          </button>
        </div>
      )}

      {loading ? (
        <div className="hot-loading-grid">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="shelf-card hot-skeleton" />
          ))}
        </div>
      ) : items.length ? (
        <ul className="shelf-grid">
          {items.map((r, index) => {
            const [owner, name] = r.fullName.split("/");
            const isSaving = Boolean(savingMap[r.fullName]);
            return (
              <li key={r.fullName}>
                <div className={`shelf-card ${r.installed ? "is-installed" : ""}`}>
                  <Link className="shelf-card-link" href={`/${r.fullName}`}>
                    <span className="shelf-top">
                      <span className="hot-rank-owner">
                        <span className="hot-rank num">#{index + 1}</span>
                        <span className="shelf-owner" translate="no">
                          {owner}/
                        </span>
                      </span>
                      <span className="shelf-top-badges">
                        {r.installed ? (
                          <span className="installed-tag">✓ {t("installed")}</span>
                        ) : r.saved ? (
                          <span className="saved-tag">{t("savedToShelf")}</span>
                        ) : null}
                      </span>
                      <span
                        className="shelf-stars num"
                        title={`${r.stars.toLocaleString()} stars · ${r.forks.toLocaleString()} forks`}
                      >
                        {period === "top-fork"
                          ? `⑂ ${compactCount(r.forks)} · ★ ${compactCount(r.stars)}`
                          : `★ ${compactCount(r.stars)}`}
                      </span>
                    </span>
                    <span className="shelf-name" translate="no">
                      {name}
                    </span>
                    {r.description && (
                      <span className="shelf-desc">{r.description.replace(/:[a-z0-9_+-]+:\s*/g, "")}</span>
                    )}
                    <span className="shelf-spec">
                      <span className="hot-topics">
                        {r.language && <span className="chip">{r.language}</span>}
                        {r.topics.slice(0, 2).map((topic) => (
                          <span className="chip ghost" key={topic}>
                            #{topic}
                          </span>
                        ))}
                      </span>
                    </span>
                  </Link>

                  <div className="shelf-foot">
                    <div className="shelf-foot-left">
                      {!r.saved && (
                        <button
                          type="button"
                          className="hot-save-btn"
                          onClick={() => handleSaveToShelf(r)}
                          disabled={isSaving}
                        >
                          {isSaving ? "..." : t("hotSaveBtn")}
                        </button>
                      )}
                    </div>
                    <Link className="hot-open-link" href={`/${r.fullName}`}>
                      {t("hotOpenManual")}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        !error && (
          <div className="panel shelf-empty">
            <h2>{t("hotEmpty")}</h2>
            <button type="button" className="btn btn-go btn-sm" onClick={() => loadHot("week", "all")}>
              {t("hotCatAll")}
            </button>
          </div>
        )
      )}
    </div>
  );
}

