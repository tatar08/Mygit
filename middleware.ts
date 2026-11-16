import { NextResponse, type NextRequest } from "next/server";
import { getPasscode, PASSCODE_COOKIE, verifyAccessToken } from "./lib/passcode";

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
  const passcode = getPasscode();
  if (!passcode) return NextResponse.next();

  const { pathname, search } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(PASSCODE_COOKIE)?.value;
  const ok = await verifyAccessToken(token);
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
