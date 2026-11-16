"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RepoCard, ShelfQuery } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { getLocalShelf, saveToLocalShelf } from "@/lib/local-shelf";
import { ShelfCard } from "../cards";

export function ShelfHeader({
  rising,
  all,
  isRisingView,
  allHref,
  risingHref,
}: {
  rising: number;
  all: number;
  isRisingView: boolean;
  allHref: string;
  risingHref: string;
}) {
  const { t } = useI18n();
  return (
    <div>
      <p className="eyebrow">{t("shelfPageEyebrow")}</p>
      <h1 className="display-md">{t("shelfPageTitle")}</h1>
      <p className="lead">
        {t("shelfPageDesc")}
        <Link href="/lists">{t("shelfPageLists")}</Link>.
      </p>
      {(rising > 0 || isRisingView) && (
        <nav className="view-switch" aria-label="Show">
          <Link href={allHref} aria-current={!isRisingView ? "page" : undefined} scroll={false}>
            {t("shelfAllRepos")} <span className="count">{all.toLocaleString()}</span>
          </Link>
          <Link href={risingHref} aria-current={isRisingView ? "page" : undefined} scroll={false}>
            {t("shelfRisingWeek")} <span className="count">{rising}</span>
          </Link>
        </nav>
      )}
    </div>
  );
}

export function ShelfList({
  dbAvailable,
  serverRepos,
  total,
  query,
  filtered,
}: {
  dbAvailable: boolean;
  serverRepos: RepoCard[];
  total: number;
  query: ShelfQuery;
  filtered: boolean;
}) {
  const { t, locale } = useI18n();
  const th = locale === "th";
  const [localRepos, setLocalRepos] = useState<RepoCard[] | null>(null);
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Shelf Assistant state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!dbAvailable) {
      setLocalRepos(getLocalShelf());
    }
  }, [dbAvailable]);

  const displayedRepos = useMemo(() => {
    if (dbAvailable) {
      return serverRepos.filter((r) => !removedKeys.has(r.fullName.toLowerCase()));
    }
    if (!localRepos) return [];

    let list = localRepos.filter((r) => !removedKeys.has(r.fullName.toLowerCase()));
    if (query.q) {
      const qLower = query.q.toLowerCase();
      list = list.filter(
        (r) =>
          r.fullName.toLowerCase().includes(qLower) ||
          (r.description?.toLowerCase().includes(qLower) ?? false),
      );
    }
    if (query.language) {
      list = list.filter((r) => r.language === query.language);
    }
    if (query.difficulty) {
      list = list.filter((r) => r.difficulty === query.difficulty);
    }
    if (query.minStars) {
      list = list.filter((r) => r.stars >= query.minStars!);
    }
    if (query.installed !== undefined) {
      list = list.filter((r) => Boolean(r.installed) === query.installed);
    }

    const sort = query.sort ?? "stars";
    list = [...list].sort((a, b) => {
      if (sort === "recent") return b.analyzedAt - a.analyzedAt;
      if (sort === "popular") return b.views - a.views || b.stars - a.stars;
      if (sort === "worked") return b.worked - a.worked || b.stars - a.stars;
      return b.stars - a.stars;
    });

    return list;
  }, [dbAvailable, serverRepos, localRepos, removedKeys, query]);

  const handleRemove = (fullName: string) => {
    setRemovedKeys((prev) => new Set(prev).add(fullName.toLowerCase()));
    if (localRepos) {
      setLocalRepos((prev) =>
        prev ? prev.filter((r) => r.fullName.toLowerCase() !== fullName.toLowerCase()) : prev,
      );
    }
  };

  const handleExportJson = () => {
    const data = dbAvailable ? serverRepos : getLocalShelf();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mygit-shelf-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const arr: unknown[] = Array.isArray(parsed) ? parsed : [];
      let count = 0;

      for (const item of arr) {
        if (!item || typeof item !== "object") continue;
        const rec = item as Partial<RepoCard>;
        if (typeof rec.fullName !== "string" || !rec.fullName.includes("/")) continue;

        saveToLocalShelf({ ...rec, fullName: rec.fullName });
        if (dbAvailable) {
          const [owner, repo] = rec.fullName.split("/");
          await fetch("/api/shelf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              owner,
              repo,
              fullName: rec.fullName,
              description: rec.description ?? null,
              stars: rec.stars ?? 0,
              language: rec.language ?? null,
              installed: Boolean(rec.installed),
            }),
          }).catch(() => {});
        }
        count++;
      }

      if (!dbAvailable) {
        setLocalRepos(getLocalShelf());
      } else {
        window.location.reload();
      }
      setImportMsg(t("shelfImportSuccess").replace("{n}", String(count)));
    } catch {
      setImportMsg(t("shelfImportInvalid"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAskShelfAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiAnswer(null);
    try {
      const reposForAi = dbAvailable ? serverRepos : getLocalShelf();
      const res = await fetch("/api/ai/shelf-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: aiQuestion.trim(),
          repos: reposForAi,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI query failed");
      setAiAnswer(data.answer);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI query failed");
    } finally {
      setAiLoading(false);
    }
  };

  const displayTotal = dbAvailable ? Math.max(0, total - removedKeys.size) : displayedRepos.length;

  return (
    <>
      <div className="shelf-toolbar">
        <p className="shelf-count" aria-live="polite" style={{ margin: 0 }}>
          {displayTotal.toLocaleString()}{" "}
          {displayTotal === 1 ? t("shelfRepoSingular") : t("shelfRepoPlural")}
          {filtered && (
            <>
              {" · "}
              <Link href="/shelf">{t("shelfClearFilters")}</Link>
            </>
          )}
        </p>

        <div className="shelf-json-actions">
          {importMsg && <span className="shelf-import-msg">{importMsg}</span>}
          <button
            type="button"
            className="btn btn-go btn-sm"
            style={{ height: 32, padding: "0 12px", fontSize: 12 }}
            onClick={() => setAiOpen((v) => !v)}
          >
            {th ? "✨ ถาม AI จากคลัง" : "✨ Ask AI about Shelf"}
          </button>
          <button type="button" className="btn btn-sm shelf-json-btn" onClick={handleExportJson}>
            ↓ {t("shelfExportJson")}
          </button>
          <button
            type="button"
            className="btn btn-sm shelf-json-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            ↑ {t("shelfImportJson")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportJson}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {aiOpen && (
        <section className="panel freebie-settings-panel" style={{ marginBottom: 20 }}>
          <form onSubmit={handleAskShelfAi} className="ai-search-bar" style={{ marginBottom: aiAnswer || aiError ? 12 : 0 }}>
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder={
                th
                  ? "ถาม AI เช่น: ในคลังมีตัวไหนทำระบบ POS หรือ Agent บนเครื่องได้บ้าง เทียบข้อดีข้อเสียให้หน่อย..."
                  : "Ask AI: e.g. Compare the local AI tools in my shelf, which one is easiest to set up?"
              }
              className="ai-search-input"
            />
            <button type="submit" className="btn btn-go btn-sm" disabled={aiLoading || !aiQuestion.trim()}>
              {aiLoading ? "..." : th ? "✨ ถาม AI" : "✨ Ask AI"}
            </button>
          </form>
          {aiError && <p className="add-modal-error" style={{ margin: 0 }}>{aiError}</p>}
          {aiAnswer && <div className="ai-answer-box">{aiAnswer}</div>}
        </section>
      )}

      {displayedRepos.length ? (
        <ul className="shelf-grid">
          {displayedRepos.map((r) => (
            <li key={r.fullName}>
              <ShelfCard repo={r} onRemove={handleRemove} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel shelf-empty">
          <h2>{t("shelfEmptyTitle")}</h2>
          <p className="note">{filtered ? t("shelfEmptyFilteredDesc") : t("shelfEmptyDesc")}</p>
          <Link className="btn btn-go btn-sm" href={filtered ? "/shelf" : "/"}>
            {filtered ? t("shelfClearFilters") : t("shelfLookupBtn")}
          </Link>
        </div>
      )}
    </>
  );
}
