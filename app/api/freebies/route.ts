import { NextResponse } from "next/server";
import { isDbAvailable, listFreebies, saveFreebies } from "@/lib/db";
import { collectAndFilterFreebies } from "@/lib/freebies";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") ?? undefined;
    const dbAvailable = await isDbAvailable();
    const items = dbAvailable ? await listFreebies(category, 60) : [];
    return NextResponse.json({ items, dbAvailable });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load freebies";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { items, aiFiltered } = await collectAndFilterFreebies();
    const dbAvailable = await isDbAvailable();
    if (dbAvailable && items.length) {
      await saveFreebies(items);
    }
    return NextResponse.json({
      items,
      aiFiltered,
      dbAvailable,
      collectedAt: Date.now(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to collect freebies";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
