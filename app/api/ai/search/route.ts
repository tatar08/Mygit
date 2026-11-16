import { NextResponse } from "next/server";
import { askAiText, extractJson } from "@/lib/ai";
import { getRepoStatuses } from "@/lib/db";
import { searchRepositories, type HotRepoItem } from "@/lib/github";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) {
      return NextResponse.json({ error: "Please enter what you are looking for" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { text } = await askAiText(
      `Today's date is ${today}.
User wants to find open-source GitHub repositories for: "${query}".
Generate 2 concise, accurate GitHub Search API queries.

CRITICAL RULES:
1. Every query MUST focus on the core software domain/topic (e.g. "point of sale", "pos", "crm", "ai agent").
2. NEVER put meta-words like "example", "picture", "screenshot", "image", "demo", "top 10", "best", "free" as literal search keywords unless the user literally wants a screenshot tool.
3. If the user asks for a timeframe (e.g. "6 months ago", "10 months ago", "this year"), calculate the exact date from ${today} and use "created:>YYYY-MM-DD".
4. Keep each query short (e.g. "point-of-sale created:>2026-01-16 stars:>10" or "pos stars:>50"). Do NOT over-constrain with too many required words.

Return JSON only:
{
  "queries": ["query 1", "query 2"],
  "strategyTh": "คำอธิบายสั้นๆ ภาษาไทยว่าค้นหาด้วยคำใดและเงื่อนไขวันที่ใด"
}`,
      {
        system: "You are a GitHub search expert. Output valid JSON only.",
        json: true,
        temperature: 0.15,
      },
    );

    const parsed = extractJson<{ queries: string[]; strategyTh?: string }>(text);
    const queries = Array.isArray(parsed.queries) ? parsed.queries.slice(0, 2) : [query];

    const seen = new Set<string>();
    const combined: HotRepoItem[] = [];
    for (const q of queries) {
      const results = await searchRepositories(q, 10).catch(() => []);
      for (const r of results) {
        if (!seen.has(r.fullName.toLowerCase())) {
          seen.add(r.fullName.toLowerCase());
          combined.push(r);
        }
      }
    }

    combined.sort((a, b) => b.stars - a.stars);
    const topItems = combined.slice(0, 18);
    const statuses = await getRepoStatuses(topItems.map((r) => r.fullName));

    return NextResponse.json({
      queries,
      strategyTh: parsed.strategyTh ?? "",
      items: topItems.map((r) => {
        const st = statuses[r.fullName.toLowerCase()];
        return {
          ...r,
          saved: st?.saved ?? false,
          installed: st?.installed ?? false,
        };
      }),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI search failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

