import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSetting } from "@/lib/db";
import {
  getEnvPasscode,
  PASSCODE_COOKIE,
  PASSCODE_OVERRIDE_COOKIE,
  readOverridePasscode,
  verifyAccessJwt,
} from "@/lib/passcode";
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

  const store = await cookies();
  const dbCode = await getSetting("site_passcode");
  const overrideCode = await readOverridePasscode(store.get(PASSCODE_OVERRIDE_COOKIE)?.value);
  const passcode = dbCode || overrideCode || getEnvPasscode();

  const token = store.get(PASSCODE_COOKIE)?.value;
  if (await verifyAccessJwt(token, passcode)) {
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
