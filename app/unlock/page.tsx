import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPasscode, PASSCODE_COOKIE, verifyAccessToken } from "@/lib/passcode";
import { UnlockClient } from "./unlock-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enter Passcode",
  robots: { index: false, follow: false },
};

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const passcode = getPasscode();
  if (!passcode) {
    redirect(safeNext);
  }

  const store = await cookies();
  const token = store.get(PASSCODE_COOKIE)?.value;
  if (await verifyAccessToken(token)) {
    redirect(safeNext);
  }

  const isNumeric = /^\d+$/.test(passcode);
  return (
    <UnlockClient
      pinLength={passcode.length}
      isNumeric={isNumeric}
      nextPath={safeNext}
    />
  );
}
