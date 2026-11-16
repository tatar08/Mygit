"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { RepoCard, ShelfQuery } from "@/lib/db";
import { getLocalShelf } from "@/lib/local-shelf";
import { ShelfCard } from "../cards";

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
  const [localRepos, setLocalRepos] = useState<RepoCard[] | null>(null);
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());

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
      setLocalRepos((prev) => (prev ? prev.filter((r) => r.fullName.toLowerCase() !== fullName.toLowerCase()) : prev));
    }
  };

  const displayTotal = dbAvailable ? Math.max(0, total - removedKeys.size) : displayedRepos.length;

  return (
    <>
      <p className="shelf-count" aria-live="polite">
        {displayTotal.toLocaleString()} {displayTotal === 1 ? "repo" : "repos"}
        {filtered && (
          <>
            {" · "}
            <Link href="/shelf">Clear filters</Link>
          </>
        )}
      </p>

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
          <h2>Nothing on this shelf yet</h2>
          <p className="note">
            {filtered
              ? "No repos match these filters. Try fewer stars or another language."
              : "Look up a repo and it shows up here."}
          </p>
          <Link className="btn btn-go btn-sm" href={filtered ? "/shelf" : "/"}>
            {filtered ? "Clear filters" : "Look up a repo"}
          </Link>
        </div>
      )}
    </>
  );
}
