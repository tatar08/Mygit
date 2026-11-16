import { NextResponse } from "next/server";
import { getRepoStatuses } from "@/lib/db";
import { fetchHotRepos, type HotCategory, type HotPeriod } from "@/lib/github";

const PERIODS = new Set<HotPeriod>(["day", "week", "month", "year", "top-star", "top-fork"]);
const CATEGORIES = new Set<HotCategory>(["all", "ai", "python", "typescript", "rust", "go", "self-hosted"]);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const p = url.searchParams.get("period") as HotPeriod | null;
    const c = url.searchParams.get("category") as HotCategory | null;
    const refresh = url.searchParams.get("refresh") === "1";

    const period: HotPeriod = p && PERIODS.has(p) ? p : "week";
    const category: HotCategory = c && CATEGORIES.has(c) ? c : "all";

    const { items, fetchedAt } = await fetchHotRepos({ period, category, refresh, limit: 24 });
    const statuses = await getRepoStatuses(items.map((r) => r.fullName));

    return NextResponse.json({
      items: items.map((r) => {
        const st = statuses[r.fullName.toLowerCase()];
        return {
          ...r,
          saved: st?.saved ?? false,
          installed: st?.installed ?? false,
        };
      }),
      fetchedAt,
      period,
      category,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load hot repos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

