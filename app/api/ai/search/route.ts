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

    const { text } = await askAiText(
      `User wants to find open-source GitHub repositories for: "${query}".
Generate 2 concise, effective GitHub Search API queries (using keywords, topics, or language qualifiers like "topic:pos", "language:python", "stars:>50") and a 1-sentence Thai explanation of the search strategy.
Return JSON only:
{
  "queries": ["query 1", "query 2"],
  "strategyTh": "คำอธิบายสั้นๆ ภาษาไทย"
}`,
      {
        system: "You are a GitHub search expert. Output valid JSON only.",
        json: true,
        temperature: 0.2,
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

