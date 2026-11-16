import type { Metadata } from "next";
import { getAllSecretStatuses } from "@/lib/secrets";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings & Security",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const { dbAvailable, statuses } = await getAllSecretStatuses();
  return <SettingsClient initialStatuses={statuses} dbAvailable={dbAvailable} />;
}

