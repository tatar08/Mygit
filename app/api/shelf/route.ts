import { NextResponse } from "next/server";
import { hasRepo, repoKey, removeRepo, saveShelfBookmark, setInShelf, setInstalled, getRepoStatus } from "@/lib/db";
import { loadRepo } from "@/lib/pipeline";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const owner = url.searchParams.get("owner");
    const repo = url.searchParams.get("repo");
    const fullName = url.searchParams.get("fullName") || (owner && repo ? `${owner}/${repo}` : null);

    if (!fullName) {
      return NextResponse.json({ error: "Missing repo parameter" }, { status: 400 });
    }

    const status = await getRepoStatus(fullName);
    return NextResponse.json(status);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to get shelf status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { owner, repo, installed, fullName, description, stars, language } = await req.json();
    if (!owner || !repo) {
      return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
    }

    const key = repoKey(owner, repo);
    let resolvedFullName = fullName || `${owner}/${repo}`;

    if (await hasRepo(key)) {
      await setInShelf(key, true);
    } else {
      try {
        const loaded = await loadRepo({ owner, repo });
        resolvedFullName = loaded.data.meta.fullName;
        await setInShelf(key, true);
      } catch (err) {
        // If GitHub API fails (e.g. rate limit), still save bookmark to SQLite shelf
        await saveShelfBookmark(key, {
          fullName: resolvedFullName,
          description: typeof description === "string" ? description : null,
          stars: typeof stars === "number" ? stars : 0,
          language: typeof language === "string" ? language : null,
        });
      }
    }

    if (typeof installed === "boolean") {
      await setInstalled(key, installed);
    }

    return NextResponse.json({
      success: true,
      saved: true,
      fullName: resolvedFullName,
      shelfUrl: "/shelf",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save to shelf";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    let owner: string | null = null;
    let repo: string | null = null;

    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json();
      owner = body.owner;
      repo = body.repo;
      if (!owner && body.fullName) {
        [owner, repo] = body.fullName.split("/");
      }
    } else {
      const url = new URL(req.url);
      owner = url.searchParams.get("owner");
      repo = url.searchParams.get("repo");
      const fullName = url.searchParams.get("fullName");
      if (fullName && !owner) {
        [owner, repo] = fullName.split("/");
      }
    }

    if (!owner || !repo) {
      return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
    }

    const key = repoKey(owner, repo);
    const success = await removeRepo(key);
    return NextResponse.json({ success, removed: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove from shelf";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { owner, repo, fullName, installed } = await req.json();
    let o = owner;
    let r = repo;
    if (!o && fullName) {
      [o, r] = fullName.split("/");
    }

    if (!o || !r || typeof installed !== "boolean") {
      return NextResponse.json({ error: "Missing parameters (owner, repo, installed)" }, { status: 400 });
    }

    const key = repoKey(o, r);
    const success = await setInstalled(key, installed);
    return NextResponse.json({ success, installed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update installed status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
