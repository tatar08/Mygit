"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { compactCount } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { HotCategory, HotPeriod, HotRepoItem } from "@/lib/github";
import { getLocalShelf, saveToLocalShelf } from "@/lib/local-shelf";

export type HotRepoWithStatus = HotRepoItem & {
  saved: boolean;
  installed: boolean;
};

type AiSummary = {
  summary: string;
  whatItDoes: string;
  bestFor: string;
  tech: string;
};

const SUMMARY_STORAGE_KEY = "gitmanual-ai-summaries";

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
  const { t, locale } = useI18n();
  const th = locale === "th";

  const [items, setItems] = useState<HotRepoWithStatus[]>(initialItems);
  const [period, setPeriod] = useState<HotPeriod>("week");
  const [category, setCategory] = useState<HotCategory>("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [fetchedAt, setFetchedAt] = useState<number>(initialFetchedAt);

  // AI Summary & AI Search states
  const [summaries, setSummaries] = useState<Record<string, AiSummary>>({});
  const [summarizingMap, setSummarizingMap] = useState<Record<string, boolean>>({});
  const [summarizingAll, setSummarizingAll] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiSearching, setAiSearching] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<string | null>(null);

  const mergeLocalStatus = (list: HotRepoWithStatus[]): HotRepoWithStatus[] => {
    const local = getLocalShelf();
    if (!local.length) return list;
    const map = new Map(local.map((r) => [r.fullName.toLowerCase(), r]));
    return list.map((item) => {
      const loc = map.get(item.fullName.toLowerCase());
      if (!loc) return item;
      return {
        ...item,
        saved: item.saved || true,
        installed: item.installed || Boolean(loc.installed),
      };
    });
  };

  useEffect(() => {
    setItems((prev) => mergeLocalStatus(prev));
    try {
      const raw = localStorage.getItem(SUMMARY_STORAGE_KEY);
      if (raw) setSummaries(JSON.parse(raw));
    } catch {}
  }, []);

  const persistSummaries = (next: Record<string, AiSummary>) => {
    setSummaries(next);
    try {
      localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const loadHot = async (nextPeriod: HotPeriod, nextCategory: HotCategory, isRefresh = false) => {
    setPeriod(nextPeriod);
    setCategory(nextCategory);
    setAiStrategy(null);
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
      setItems(mergeLocalStatus(data.items ?? []));
      setFetchedAt(data.fetchedAt ?? Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hot repos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim() || aiSearching) return;
    setAiSearching(true);
    setError(null);
    setAiStrategy(null);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI search failed");
      setItems(mergeLocalStatus(data.items ?? []));
      setAiStrategy(data.strategyTh || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI search failed");
    } finally {
      setAiSearching(false);
    }
  };

  const handleSummarizeOne = async (r: HotRepoWithStatus) => {
    if (summarizingMap[r.fullName]) return;
    setSummarizingMap((prev) => ({ ...prev, [r.fullName]: true }));
    setError(null);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ fullName: r.fullName, description: r.description, language: r.language, topics: r.topics }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to summarize");
      if (data.summaries) {
        persistSummaries({ ...summaries, ...data.summaries });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize");
    } finally {
      setSummarizingMap((prev) => ({ ...prev, [r.fullName]: false }));
    }
  };

  const handleSummarizeAll = async () => {
    const missing = items.filter((r) => !summaries[r.fullName]).slice(0, 9);
    if (!missing.length || summarizingAll) return;
    setSummarizingAll(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: missing.map((r) => ({
            fullName: r.fullName,
            description: r.description,
            language: r.language,
            topics: r.topics,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to summarize");
      if (data.summaries) {
        persistSummaries({ ...summaries, ...data.summaries });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize");
    } finally {
      setSummarizingAll(false);
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
        saveToLocalShelf({
          fullName: r.fullName,
          description: r.description,
          stars: r.stars,
          language: r.language,
          difficulty: data.repo?.difficulty ?? "Moderate",
        });
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
        <div className="hot-head-actions" style={{ flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-go btn-sm"
            onClick={handleSummarizeAll}
            disabled={summarizingAll || loading || items.length === 0}
          >
            {summarizingAll
              ? th
                ? "✨ กำลังสรุปไทย..."
                : "✨ Summarizing..."
              : th
                ? "✨ AI สรุปไทย (9 อันดับแรก)"
                : "✨ AI Summarize Top 9"}
          </button>
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

      <form className="ai-search-bar" onSubmit={handleAiSearch}>
        <input
          type="text"
          value={aiQuery}
          onChange={(e) => setAiQuery(e.target.value)}
          placeholder={
            th
              ? "✨ ค้นหาด้วย AI เช่น: ระบบ POS ร้านกาแฟฟรี, AI Agent ไม่ต้องใช้ GPU, self-hosted notes..."
              : "✨ AI Repo Finder: e.g. free open-source coffee shop POS, local AI agent without GPU..."
          }
          className="ai-search-input"
        />
        <button type="submit" className="btn btn-go btn-sm" disabled={aiSearching || !aiQuery.trim()}>
          {aiSearching ? (th ? "กำลังค้นหา..." : "Searching...") : th ? "✨ ค้นหาด้วย AI" : "✨ AI Search"}
        </button>
      </form>

      {aiStrategy && (
        <p className="passcode-success" style={{ marginBottom: 16 }}>
          ✨ {aiStrategy}
        </p>
      )}

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
              className={`hot-pill ${period === id && !aiStrategy ? "active" : ""}`}
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
                className={`hot-pill ${category === c.id && !aiStrategy ? "active" : ""}`}
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

      {loading || aiSearching ? (
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
            const isSummarizing = Boolean(summarizingMap[r.fullName]);
            const aiSum = summaries[r.fullName];

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

                    {aiSum && (
                      <div className="ai-summary-box">
                        <p><strong>✨ สรุป:</strong> {aiSum.summary}</p>
                        <p><strong>🛠️ เอาไว้ทำ:</strong> {aiSum.whatItDoes}</p>
                        <p><strong>🎯 เหมาะกับ:</strong> {aiSum.bestFor}</p>
                      </div>
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
                    <div className="shelf-foot-left" style={{ gap: 6 }}>
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
                      {!aiSum && (
                        <button
                          type="button"
                          className="shelf-btn-installed"
                          onClick={() => handleSummarizeOne(r)}
                          disabled={isSummarizing}
                        >
                          {isSummarizing ? "..." : "✨ สรุปไทย"}
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
