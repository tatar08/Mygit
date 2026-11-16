import { askAiText, extractJson, hasAiConfigured } from "./ai";
import type { FreebieRecord } from "./db";
import { fetchHotRepos } from "./github";

type RawCandidate = {
  id: string;
  title: string;
  url: string;
  source: string;
  hintCategory: FreebieRecord["category"];
  snippet?: string;
};

async function fetchJsonSafe<T>(url: string, timeoutMs = 4500): Promise<T | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": "Mygit-FreebieRadar/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function stableId(url: string): string {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fb_${(h >>> 0).toString(36)}`;
}

function heuristicCategory(title: string, fallback: FreebieRecord["category"]): FreebieRecord["category"] {
  const s = title.toLowerCase();
  if (/\b(llm|gpt|ai|claude|gemini|ollama|agent|mcp|hugging ?face|copilot)\b/.test(s)) return "AI";
  if (/\b(vps|cloud|server|oracle|aws|gcp|hetzner|cloudflare|free tier|hosting)\b/.test(s)) return "VPS";
  if (/\b(steam|epic|gog|itch\.io|game|dlc|giveaway)\b/.test(s)) return "Games";
  if (/\b(free|100% off|promo|discount|coupon|license|credit)\b/.test(s)) return "Deals";
  return fallback;
}

export async function collectAndFilterFreebies(): Promise<{
  items: FreebieRecord[];
  aiFiltered: boolean;
}> {
  const candidates: RawCandidate[] = [];

  const [fgf, selfhosted, hn, ghHot] = await Promise.all([
    fetchJsonSafe<{ data?: { children?: Array<{ data: { title: string; url: string; permalink: string; selftext?: string } }> } }>(
      "https://www.reddit.com/r/FreeGameFindings/new.json?limit=12",
    ),
    fetchJsonSafe<{ data?: { children?: Array<{ data: { title: string; url: string; permalink: string; selftext?: string } }> } }>(
      "https://www.reddit.com/r/selfhosted/top.json?t=week&limit=10",
    ),
    fetchJsonSafe<{ hits?: Array<{ objectID: string; title: string; url?: string }> }>(
      "https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=12",
    ),
    fetchHotRepos({ period: "day", limit: 8 }).catch(() => ({ items: [] })),
  ]);

  for (const c of fgf?.data?.children ?? []) {
    const d = c.data;
    const url = d.url || `https://reddit.com${d.permalink}`;
    candidates.push({
      id: stableId(url),
      title: d.title,
      url,
      source: "Reddit r/FreeGameFindings",
      hintCategory: "Games",
      snippet: d.selftext?.slice(0, 160),
    });
  }

  for (const c of selfhosted?.data?.children ?? []) {
    const d = c.data;
    const url = d.url || `https://reddit.com${d.permalink}`;
    candidates.push({
      id: stableId(url),
      title: d.title,
      url,
      source: "Reddit r/selfhosted",
      hintCategory: "Open Source",
      snippet: d.selftext?.slice(0, 160),
    });
  }

  for (const h of hn?.hits ?? []) {
    if (!h.title) continue;
    const url = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
    candidates.push({
      id: stableId(url),
      title: h.title,
      url,
      source: "Hacker News",
      hintCategory: heuristicCategory(h.title, "Open Source"),
    });
  }

  for (const r of ghHot.items) {
    candidates.push({
      id: stableId(r.htmlUrl),
      title: `${r.fullName}: ${r.description ?? "Trending open-source repository"}`,
      url: r.htmlUrl,
      source: "GitHub",
      hintCategory: heuristicCategory(`${r.fullName} ${r.description ?? ""}`, "Open Source"),
    });
  }

  const unique = Array.from(new Map(candidates.map((c) => [c.id, c])).values()).slice(0, 28);
  const now = Date.now();

  if (unique.length && hasAiConfigured()) {
    try {
      const listStr = unique
        .map((c, i) => `${i + 1}. [${c.id}] (${c.source}) ${c.title}`)
        .join("\n");

      const prompt = `Filter these items for a "Freebie & Tech Radar" dashboard.
Keep items that are genuinely free software, open-source tools, free AI credits/tools, free VPS/cloud tiers, free games, or genuine 100%-free giveaways. Drop paid-only ads, spam, or unrelated chatter.
Return JSON array only:
[
  {
    "id": "exact id",
    "keep": true,
    "category": "AI" | "VPS" | "Open Source" | "Games" | "Deals",
    "summaryTh": "สรุปภาษาไทยสั้นๆ 1 ประโยค ว่าแจกอะไร/ทำอะไรได้",
    "expiresAt": null
  }
]

Items:
${listStr}`;

      const { text } = await askAiText(prompt, {
        system: "You are an AI Freebie Radar curator. Output valid JSON array only.",
        json: true,
        temperature: 0.2,
      });

      const parsed = extractJson<
        Array<{
          id: string;
          keep?: boolean;
          category?: FreebieRecord["category"];
          summaryTh?: string;
          expiresAt?: string | null;
        }>
      >(text);

      const byId = new Map(unique.map((u) => [u.id, u]));
      const curated: FreebieRecord[] = [];
      for (const p of parsed) {
        if (p.keep === false) continue;
        const orig = byId.get(p.id);
        if (!orig) continue;
        curated.push({
          id: orig.id,
          title: orig.title,
          url: orig.url,
          source: orig.source,
          category: p.category ?? orig.hintCategory,
          summaryTh: p.summaryTh || orig.title,
          isFree: true,
          expiresAt: p.expiresAt ?? null,
          notified: false,
          createdAt: now,
        });
      }
      if (curated.length) {
        return { items: curated, aiFiltered: true };
      }
    } catch {
      // Fallback to heuristic if AI fails or hits quota
    }
  }

  return {
    items: unique.map((u) => ({
      id: u.id,
      title: u.title,
      url: u.url,
      source: u.source,
      category: heuristicCategory(u.title, u.hintCategory),
      summaryTh: u.title,
      isFree: true,
      expiresAt: null,
      notified: false,
      createdAt: now,
    })),
    aiFiltered: false,
  };
}
