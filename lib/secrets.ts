import { cookies } from "next/headers";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto";
import { getSetting, isDbAvailable, setSetting } from "./db";

export const SECRETS_COOKIE = "gm_keys";

export type SecretKey =
  | "gemini_api_key"
  | "gemini_model"
  | "ollama_url"
  | "ollama_model"
  | "github_token"
  | "line_channel_token"
  | "line_target_id"
  | "webhook_url";

const ENV_MAP: Record<SecretKey, string> = {
  gemini_api_key: "GEMINI_API_KEY",
  gemini_model: "GEMINI_MODEL",
  ollama_url: "OLLAMA_URL",
  ollama_model: "OLLAMA_MODEL",
  github_token: "GITHUB_TOKEN",
  line_channel_token: "LINE_CHANNEL_ACCESS_TOKEN",
  line_target_id: "LINE_TARGET_ID",
  webhook_url: "FREEBIE_WEBHOOK_URL",
};

const SENSITIVE_KEYS = new Set<SecretKey>([
  "gemini_api_key",
  "github_token",
  "line_channel_token",
  "webhook_url",
]);

async function readCookieSecrets(): Promise<Partial<Record<SecretKey, string>>> {
  try {
    const store = await cookies();
    const raw = store.get(SECRETS_COOKIE)?.value;
    if (!raw) return {};
    const plain = await decryptSecret(raw);
    if (!plain) return {};
    const parsed = JSON.parse(plain);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function getSecret(key: SecretKey): Promise<string | null> {
  // 1. Check encrypted DB setting
  const dbVal = await getSetting(`sec_${key}`);
  if (dbVal) {
    const plain = await decryptSecret(dbVal);
    if (plain?.trim()) return plain.trim();
  }

  // 2. Check encrypted HTTP-only cookie (for Vercel without DB)
  const cookieMap = await readCookieSecrets();
  const cVal = cookieMap[key]?.trim();
  if (cVal) return cVal;

  // 3. Fallback to environment variable
  const envVal = process.env[ENV_MAP[key]]?.trim();
  return envVal || null;
}

export type SecretStatus = {
  configured: boolean;
  masked: string;
  source: "db" | "cookie" | "env" | "none";
};

export async function getAllSecretStatuses(): Promise<{
  dbAvailable: boolean;
  statuses: Record<SecretKey, SecretStatus>;
}> {
  const dbAvailable = await isDbAvailable();
  const cookieMap = await readCookieSecrets();
  const keys = Object.keys(ENV_MAP) as SecretKey[];
  const statuses = {} as Record<SecretKey, SecretStatus>;

  for (const key of keys) {
    let val: string | null = null;
    let source: SecretStatus["source"] = "none";

    if (dbAvailable) {
      const dbRaw = await getSetting(`sec_${key}`);
      const dbPlain = await decryptSecret(dbRaw);
      if (dbPlain?.trim()) {
        val = dbPlain.trim();
        source = "db";
      }
    }
    if (!val && cookieMap[key]?.trim()) {
      val = cookieMap[key]!.trim();
      source = "cookie";
    }
    if (!val && process.env[ENV_MAP[key]]?.trim()) {
      val = process.env[ENV_MAP[key]]!.trim();
      source = "env";
    }

    statuses[key] = {
      configured: Boolean(val),
      masked: val ? (SENSITIVE_KEYS.has(key) ? maskSecret(val) : val) : "",
      source,
    };
  }

  return { dbAvailable, statuses };
}

export async function saveSecrets(
  updates: Partial<Record<SecretKey, string>>,
): Promise<{ dbAvailable: boolean; encryptedCookieValue: string }> {
  const dbAvailable = await isDbAvailable();
  const currentCookie = await readCookieSecrets();
  const nextCookie: Partial<Record<SecretKey, string>> = { ...currentCookie };

  for (const [k, v] of Object.entries(updates) as [SecretKey, string | undefined][]) {
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) {
      delete nextCookie[k];
      if (dbAvailable) {
        await setSetting(`sec_${k}`, "");
      }
    } else {
      nextCookie[k] = trimmed;
      if (dbAvailable) {
        const encrypted = await encryptSecret(trimmed);
        await setSetting(`sec_${k}`, encrypted);
      }
    }
  }

  const encryptedCookieValue = await encryptSecret(JSON.stringify(nextCookie));
  return { dbAvailable, encryptedCookieValue };
}

