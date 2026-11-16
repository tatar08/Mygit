const PREFIX = "enc:v1:";

function getMasterSecret(): string {
  return (
    process.env.PASSCODE_SECRET?.trim() ||
    process.env.SITE_PASSCODE?.trim() ||
    "gitmanual-aes-gcm-master-secret-v1"
  );
}

async function deriveAesKey(): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(getMasterSecret());
  const hash = await crypto.subtle.digest("SHA-256", raw);
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toB64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromB64(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, "base64"));
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await deriveAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return `${PREFIX}${toB64(iv)}.${toB64(new Uint8Array(cipher))}`;
}

export async function decryptSecret(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) {
    // Legacy unencrypted value
    return stored;
  }
  try {
    const rest = stored.slice(PREFIX.length);
    const [ivB64, cipherB64] = rest.split(".");
    if (!ivB64 || !cipherB64) return null;

    const key = await deriveAesKey();
    const iv = fromB64(ivB64);
    const cipher = fromB64(cipherB64);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      cipher.buffer as ArrayBuffer,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

export function maskSecret(secret: string | null | undefined): string {
  if (!secret) return "";
  const s = secret.trim();
  if (s.length <= 6) return "••••••";
  return `••••••••${s.slice(-4)}`;
}

