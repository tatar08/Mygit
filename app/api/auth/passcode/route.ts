import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSetting, isDbAvailable, setSetting } from "@/lib/db";
import {
  createAccessJwt,
  createOverrideJwt,
  getEnvPasscode,
  PASSCODE_COOKIE,
  PASSCODE_OVERRIDE_COOKIE,
  readOverridePasscode,
  verifyAccessJwt,
} from "@/lib/passcode";

const SETTING_KEY = "site_passcode";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function resolveActivePasscode(): Promise<{ passcode: string; source: "db" | "override" | "env" }> {
  const dbCode = await getSetting(SETTING_KEY);
  if (dbCode) return { passcode: dbCode, source: "db" };

  const store = await cookies();
  const overrideCode = await readOverridePasscode(store.get(PASSCODE_OVERRIDE_COOKIE)?.value);
  if (overrideCode) return { passcode: overrideCode, source: "override" };

  return { passcode: getEnvPasscode(), source: "env" };
}

export async function GET() {
  const dbAvailable = await isDbAvailable();
  return NextResponse.json({ dbAvailable });
}

export async function POST(req: Request) {
  try {
    const { passcode: expected } = await resolveActivePasscode();
    const body = await req.json().catch(() => ({}));
    const submitted = typeof body.passcode === "string" ? body.passcode.trim() : "";

    if (!submitted || !constantTimeEqual(submitted, expected)) {
      return NextResponse.json({ ok: false, error: "Invalid passcode" }, { status: 401 });
    }

    const jwt = await createAccessJwt(expected);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PASSCODE_COOKIE, jwt, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(PASSCODE_COOKIE)?.value;
    const { passcode: expected } = await resolveActivePasscode();

    if (!(await verifyAccessJwt(token, expected))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const currentPasscode = typeof body.currentPasscode === "string" ? body.currentPasscode.trim() : "";
    const newPasscode = typeof body.newPasscode === "string" ? body.newPasscode.trim() : "";

    if (!constantTimeEqual(currentPasscode, expected)) {
      return NextResponse.json({ ok: false, error: "Current passcode is incorrect" }, { status: 400 });
    }

    if (newPasscode.length < 4 || newPasscode.length > 32) {
      return NextResponse.json(
        { ok: false, error: "New passcode must be 4–32 characters" },
        { status: 400 },
      );
    }

    const dbAvailable = await isDbAvailable();
    if (dbAvailable) {
      await setSetting(SETTING_KEY, newPasscode);
    }

    const newAccessJwt = await createAccessJwt(newPasscode);
    const newOverrideJwt = await createOverrideJwt(newPasscode);

    const res = NextResponse.json({ ok: true, persistedToDb: dbAvailable });
    res.cookies.set(PASSCODE_COOKIE, newAccessJwt, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
    res.cookies.set(PASSCODE_OVERRIDE_COOKIE, newOverrideJwt, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to change passcode" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PASSCODE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
