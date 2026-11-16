import { NextResponse } from "next/server";
import { createAccessToken, getPasscode, PASSCODE_COOKIE } from "@/lib/passcode";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(req: Request) {
  try {
    const expected = getPasscode();
    if (!expected) {
      return NextResponse.json({ ok: true });
    }

    const body = await req.json().catch(() => ({}));
    const submitted = typeof body.passcode === "string" ? body.passcode.trim() : "";

    if (!submitted || !constantTimeEqual(submitted, expected)) {
      return NextResponse.json({ ok: false, error: "Invalid passcode" }, { status: 401 });
    }

    const token = await createAccessToken(expected);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PASSCODE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 500 });
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
