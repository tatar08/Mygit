export const PASSCODE_COOKIE = "gm_access";

export function getPasscode(): string | null {
  const code = process.env.SITE_PASSCODE?.trim();
  return code ? code : null;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAccessToken(passcode: string): Promise<string> {
  const salt = process.env.PASSCODE_SECRET?.trim() || "gitmanual-flatpack-lock-v1";
  return hmacSha256Hex(`${passcode}:${salt}`, "unlocked");
}

export async function verifyAccessToken(token: string | undefined | null): Promise<boolean> {
  const passcode = getPasscode();
  if (!passcode) return true;
  if (!token) return false;
  const expected = await createAccessToken(passcode);
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
