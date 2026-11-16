"use client";

import type { RepoCard } from "./db";

const STORAGE_KEY = "gitmanual-local-shelf";

export function getLocalShelf(): RepoCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToLocalShelf(repo: Partial<RepoCard> & { fullName: string }): RepoCard[] {
  const list = getLocalShelf();
  const key = repo.fullName.toLowerCase();
  const existing = list.find((r) => r.fullName.toLowerCase() === key);
  const nextItem: RepoCard = {
    fullName: repo.fullName,
    description: repo.description ?? existing?.description ?? null,
    stars: repo.stars ?? existing?.stars ?? 0,
    language: repo.language ?? existing?.language ?? null,
    difficulty: repo.difficulty ?? existing?.difficulty ?? "Moderate",
    views: repo.views ?? existing?.views ?? 0,
    worked: repo.worked ?? existing?.worked ?? 0,
    stuck: repo.stuck ?? existing?.stuck ?? 0,
    analyzedAt: repo.analyzedAt ?? existing?.analyzedAt ?? Date.now(),
    risingAt: repo.risingAt ?? existing?.risingAt ?? null,
    installed: repo.installed ?? existing?.installed ?? false,
  };
  const updated = [nextItem, ...list.filter((r) => r.fullName.toLowerCase() !== key)];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(`gitmanual-shelf:${key}`, "1");
  } catch {}
  return updated;
}

export function setLocalInstalled(fullName: string, installed: boolean): RepoCard[] {
  const list = getLocalShelf();
  const key = fullName.toLowerCase();
  let found = false;
  const updated = list.map((r) => {
    if (r.fullName.toLowerCase() === key) {
      found = true;
      return { ...r, installed };
    }
    return r;
  });
  if (!found && installed) {
    updated.unshift({
      fullName,
      description: null,
      stars: 0,
      language: null,
      difficulty: "Moderate",
      views: 0,
      worked: 0,
      stuck: 0,
      analyzedAt: Date.now(),
      risingAt: null,
      installed: true,
    });
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function removeFromLocalShelf(fullName: string): RepoCard[] {
  const list = getLocalShelf();
  const key = fullName.toLowerCase();
  const updated = list.filter((r) => r.fullName.toLowerCase() !== key);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    localStorage.removeItem(`gitmanual-shelf:${key}`);
  } catch {}
  return updated;
}

export function getLocalRepoStatus(fullName: string): { saved: boolean; installed: boolean } {
  const list = getLocalShelf();
  const key = fullName.toLowerCase();
  const item = list.find((r) => r.fullName.toLowerCase() === key);
  if (item) return { saved: true, installed: Boolean(item.installed) };
  try {
    const legacy = localStorage.getItem(`gitmanual-shelf:${key}`) === "1";
    return { saved: legacy, installed: false };
  } catch {
    return { saved: false, installed: false };
  }
}
