import { getSecret } from "./secrets";

export type AiResult = {
  text: string;
  provider: "gemini" | "ollama";
};

export async function hasAiConfigured(): Promise<boolean> {
  const [gemini, ollama] = await Promise.all([
    getSecret("gemini_api_key"),
    getSecret("ollama_url"),
  ]);
  return Boolean(gemini || ollama);
}

function sanitizeError(msg: string): string {
  return msg.replace(/([?&]key=)[^&\s]+/gi, "$1[REDACTED]");
}

export async function askAiText(
  prompt: string,
  opts: { system?: string; json?: boolean; temperature?: number } = {},
): Promise<AiResult> {
  const [geminiKey, geminiModel, ollamaUrl] = await Promise.all([
    getSecret("gemini_api_key"),
    getSecret("gemini_model"),
    getSecret("ollama_url"),
  ]);

  if (geminiKey) {
    const model = geminiModel || "gemini-2.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`;

    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.3,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    };
    if (opts.system) {
      body.systemInstruction = { parts: [{ text: opts.system }] };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || `Gemini API error (${res.status})`;
      throw new Error(sanitizeError(msg));
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim() || "";
    if (!text) throw new Error("Empty response from Gemini API");
    return { text, provider: "gemini" };
  }

  if (ollamaUrl) {
    const model = process.env.OLLAMA_MODEL?.trim() || "qwen2.5:7b";
    const res = await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        ...(opts.json ? { format: "json" } : {}),
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(sanitizeError(data?.error || `Ollama error (${res.status})`));
    }
    const text = data?.message?.content?.trim() || "";
    if (!text) throw new Error("Empty response from Ollama");
    return { text, provider: "ollama" };
  }

  throw new Error(
    "ยังไม่ได้ตั้งค่า AI API Key — กรุณาไปที่เมนู ⚙️ ตั้งค่า เพื่อใส่ GEMINI_API_KEY (ฟรีที่ aistudio.google.com)",
  );
}

export function extractJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
