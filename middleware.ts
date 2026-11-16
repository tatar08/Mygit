import { NextResponse, type NextRequest } from "next/server";
import {
  PASSCODE_COOKIE,
  PASSCODE_OVERRIDE_COOKIE,
  readOverridePasscode,
  verifyAccessJwt,
} from "./lib/passcode";

const PUBLIC_PATHS = [
  "/unlock",
  "/api/auth/passcode",
  "/icon.svg",
  "/apple-icon.png",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(PASSCODE_COOKIE)?.value;
  const overrideCode = await readOverridePasscode(
    req.cookies.get(PASSCODE_OVERRIDE_COOKIE)?.value,
  );

  // Verify JWT signature & expiration (and match override passcode if user changed it in browser)
  const ok = await verifyAccessJwt(token, overrideCode ?? undefined);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Passcode required" }, { status: 401 });
  }

  const unlockUrl = new URL("/unlock", req.url);
  const nextPath = `${pathname}${search}`;
  if (nextPath && nextPath !== "/") {
    unlockUrl.searchParams.set("next", nextPath);
  }
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
