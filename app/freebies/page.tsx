import type { Metadata } from "next";
import { isDbAvailable, listFreebies } from "@/lib/db";
import { FreebiesClient } from "./freebies-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Freebies: AI, VPS, Open Source & Deals Radar",
  description: "AI-curated free software, AI credits, VPS free tiers, open-source tools, and giveaways.",
};

export default async function FreebiesPage() {
  const dbAvailable = await isDbAvailable();
  const initialItems = dbAvailable ? await listFreebies(undefined, 60) : [];

  return <FreebiesClient initialItems={initialItems} dbAvailable={dbAvailable} />;
}
