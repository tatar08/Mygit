export const PASSCODE_COOKIE = "gm_access";
export const PASSCODE_OVERRIDE_COOKIE = "gm_passcode_override";
export const DEFAULT_PASSCODE = "123456";

export function getEnvPasscode(): string {
  return process.env.SITE_PASSCODE?.trim() || DEFAULT_PASSCODE;
}

function getJwtSecret(): string {
  return (
    process.env.PASSCODE_SECRET?.trim() ||
    process.env.SITE_PASSCODE?.trim() ||
    "gitmanual-flatpack-jwt-secret-v1"
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function passcodeVersion(code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest))
    .slice(0, 6)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
  pv?: string;
  code?: string;
};

export async function signJwt(payload: JwtPayload): Promise<string> {
  const header = toBase64Url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const key = await importHmacKey(getJwtSecret());
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifyJwt(token: string | undefined | null): Promise<JwtPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const [header, body, sigB64] = parts;
    const data = `${header}.${body}`;
    const key = await importHmacKey(getJwtSecret());
    const sigBytes = fromBase64Url(sigB64);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(data),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function createAccessJwt(passcode: string, ttlSeconds = 60 * 60 * 24 * 30): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const pv = await passcodeVersion(passcode);
  return signJwt({
    sub: "workspace",
    iat: now,
    exp: now + ttlSeconds,
    pv,
  });
}

export async function verifyAccessJwt(
  token: string | undefined | null,
  expectedPasscode?: string,
): Promise<boolean> {
  const payload = await verifyJwt(token);
  if (!payload || payload.sub !== "workspace") return false;
  if (expectedPasscode) {
    const expectedPv = await passcodeVersion(expectedPasscode);
    if (payload.pv !== expectedPv) return false;
  }
  return true;
}

export async function createOverrideJwt(newPasscode: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return signJwt({
    sub: "passcode-override",
    iat: now,
    exp: now + 60 * 60 * 24 * 365,
    code: newPasscode,
  });
}

export async function readOverridePasscode(token: string | undefined | null): Promise<string | null> {
  const payload = await verifyJwt(token);
  if (!payload || payload.sub !== "passcode-override" || typeof payload.code !== "string") {
    return null;
  }
  return payload.code;
}
