import { NextResponse } from "next/server";
import {
  getAllSecretStatuses,
  saveSecrets,
  SECRETS_COOKIE,
  type SecretKey,
} from "@/lib/secrets";

const ALLOWED_KEYS: SecretKey[] = [
  "gemini_api_key",
  "gemini_model",
  "ollama_url",
  "github_token",
  "line_channel_token",
  "line_target_id",
  "webhook_url",
];

export async function GET() {
  try {
    const info = await getAllSecretStatuses();
    return NextResponse.json(info);
  } catch {
    return NextResponse.json({ error: "Failed to read settings status" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const updates: Partial<Record<SecretKey, string>> = {};

    for (const k of ALLOWED_KEYS) {
      if (typeof body[k] === "string") {
        updates[k] = body[k];
      }
    }

    const { dbAvailable, encryptedCookieValue } = await saveSecrets(updates);
    const info = await getAllSecretStatuses();

    const res = NextResponse.json({
      ok: true,
      dbAvailable,
      statuses: info.statuses,
    });
    res.cookies.set(SECRETS_COOKIE, encryptedCookieValue, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90, // 90 days
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const emptyUpdates: Partial<Record<SecretKey, string>> = {};
    for (const k of ALLOWED_KEYS) emptyUpdates[k] = "";
    await saveSecrets(emptyUpdates);

    const info = await getAllSecretStatuses();
    const res = NextResponse.json({ ok: true, statuses: info.statuses });
    res.cookies.set(SECRETS_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Failed to clear settings" }, { status: 500 });
  }
}
