import type { Metadata } from "next";
import { getRepoStatuses } from "@/lib/db";
import { fetchHotRepos } from "@/lib/github";
import { HotClient, type HotRepoWithStatus } from "./hot-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hot Repo: trending open-source projects",
  description: "Discover trending GitHub repositories gaining stars fast and open their setup manuals.",
};

export default async function HotPage() {
  let initialItems: HotRepoWithStatus[] = [];
  let initialFetchedAt = 0;
  let initialError: string | null = null;

  try {
    const { items, fetchedAt } = await fetchHotRepos({ period: "week", category: "all", limit: 24 });
    const statuses = await getRepoStatuses(items.map((r) => r.fullName));
    initialItems = items.map((r) => {
      const st = statuses[r.fullName.toLowerCase()];
      return {
        ...r,
        saved: st?.saved ?? false,
        installed: st?.installed ?? false,
      };
    });
    initialFetchedAt = fetchedAt;
  } catch (err: unknown) {
    initialError = err instanceof Error ? err.message : "Failed to load hot repositories";
  }

  return <HotClient initialItems={initialItems} initialFetchedAt={initialFetchedAt} initialError={initialError} />;
}

