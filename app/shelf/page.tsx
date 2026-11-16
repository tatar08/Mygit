import type { Metadata } from "next";
import Link from "next/link";
import { browseRepos, isDbAvailable, SHELF_PAGE, type ShelfQuery } from "@/lib/db";
import { CarbonAd } from "../carbon";
import { ShelfFilters } from "./filters";
import { ShelfHeader, ShelfList } from "./shelf-list";

const DESCRIPTION = "Browse the open-source repos people have set up with gitmanual, by stars, language and difficulty.";

// Filtered and sorted views are variants of the shelf: only the plain pages are indexed.
export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const p = await searchParams;
  const page = Math.max(1, Number(p.page) || 1);
  const filtered = Boolean(p.q || p.lang || p.level || p.min || p.rising || (p.sort && p.sort !== "stars"));
  return {
    title: page > 1 ? `The shelf, page ${page}` : "The shelf: open-source repos people set up",
    description: DESCRIPTION,
    alternates: { canonical: page > 1 && !filtered ? `/shelf?page=${page}` : "/shelf" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

type Params = Record<string, string | undefined>;

const SORTS = ["stars", "recent", "popular", "worked"] as const;

function parse(p: Params): ShelfQuery {
  const minStars = Number(p.min);
  const installed = p.installed === "1" ? true : p.installed === "0" ? false : undefined;
  return {
    q: p.q?.trim().slice(0, 80) || undefined,
    language: p.lang || undefined,
    difficulty: ["Easy", "Moderate", "Involved"].includes(p.level ?? "") ? p.level : undefined,
    minStars: Number.isFinite(minStars) && minStars > 0 ? minStars : undefined,
    sort: SORTS.includes(p.sort as (typeof SORTS)[number]) ? (p.sort as ShelfQuery["sort"]) : "stars",
    // ?sort=rising was the old way to ask for it.
    rising: p.rising === "1" || p.sort === "rising" || undefined,
    installed,
    page: Math.max(1, Number(p.page) || 1),
  };
}

export default async function ShelfPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const query = parse(params);
  const [dbAvailable, { repos, total, languages, all, rising }] = await Promise.all([
    isDbAvailable(),
    browseRepos(query),
  ]);
  const pages = Math.max(1, Math.ceil(total / SHELF_PAGE));
  const pageHref = (n: number) => {
    const next = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
    next.set("page", String(n));
    return `/shelf?${next}`;
  };
  const filtered = Boolean(
    query.q || query.language || query.difficulty || query.minStars || query.rising || query.installed !== undefined,
  );
  // The All / Rising switch keeps the other filters and starts again at page 1.
  const viewHref = (risingOnly: boolean) => {
    const next = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
    next.delete("page");
    next.delete("rising");
    if (next.get("sort") === "rising") next.delete("sort"); // the old way to ask for it
    if (risingOnly) next.set("rising", "1");
    return `/shelf${next.size ? `?${next}` : ""}`;
  };

  return (
    <div className="wrap shelf-page">
      <header className="shelf-page-head">
        <ShelfHeader
          rising={rising}
          all={all}
          isRisingView={Boolean(query.rising)}
          allHref={viewHref(false)}
          risingHref={viewHref(true)}
        />
        <CarbonAd />
      </header>

      <ShelfFilters query={query} languages={languages} />

      <ShelfList
        dbAvailable={dbAvailable}
        serverRepos={repos}
        total={total}
        query={query}
        filtered={filtered}
      />

      {pages > 1 && (
        <nav className="pager" aria-label="Pages">
          {query.page! > 1 ? (
            <Link className="btn" href={pageHref(query.page! - 1)} rel="prev">
              ← Previous
            </Link>
          ) : (
            <span className="btn" aria-disabled="true">
              ← Previous
            </span>
          )}
          <span className="num">
            Page {query.page} of {pages}
          </span>
          {query.page! < pages ? (
            <Link className="btn btn-go" href={pageHref(query.page! + 1)} rel="next">
              Next →
            </Link>
          ) : (
            <span className="btn" aria-disabled="true">
              Next →
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
