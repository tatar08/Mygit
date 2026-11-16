import { NextResponse } from "next/server";
import { getSecret } from "@/lib/secrets";

function sanitizeErr(msg: string): string {
  return msg.replace(/([?&]key=)[^&\s]+/gi, "$1[REDACTED]");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const target = body.target as "ai" | "github" | undefined;

    if (target === "github") {
      const token =
        (typeof body.github_token === "string" && body.github_token.trim()) ||
        (await getSecret("github_token")) ||
        "";

      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "Mygit",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch("https://api.github.com/rate_limit", { headers, cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: data?.message || `GitHub API error (${res.status})` },
          { status: 400 },
        );
      }

      const core = data?.resources?.core ?? {};
      return NextResponse.json({
        ok: true,
        authenticated: Boolean(token),
        limit: core.limit ?? 60,
        remaining: core.remaining ?? 0,
      });
    }

    if (target === "ai") {
      const typedGemini = typeof body.gemini_api_key === "string" ? body.gemini_api_key.trim() : "";
      const typedOllama = typeof body.ollama_url === "string" ? body.ollama_url.trim() : "";

      // If user explicitly typed Ollama URL without typing a new Gemini key, test Ollama first if no Gemini key is saved
      const savedGemini = await getSecret("gemini_api_key");
      const savedOllama = await getSecret("ollama_url");

      const geminiKey = typedGemini || (!typedOllama ? savedGemini : "");
      const ollamaUrl = typedOllama || savedOllama || "";

      if (geminiKey) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiKey)}`,
          { cache: "no-store" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const errMsg = data?.error?.message || `Gemini API error (${res.status})`;
          return NextResponse.json({ ok: false, error: sanitizeErr(errMsg) }, { status: 400 });
        }

        const rawModels: Array<{
          name: string;
          displayName?: string;
          supportedGenerationMethods?: string[];
        }> = data?.models ?? [];

        const models = rawModels
          .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m) => m.name.replace(/^models\//, ""))
          .filter((name) => /^gemini-/i.test(name))
          .sort((a, b) => {
            // Put newest/flash/pro models at the top
            const score = (s: string) =>
              (s.includes("2.5") ? 30 : s.includes("3") ? 40 : s.includes("2.0") ? 20 : 10) +
              (s.includes("flash") ? 5 : s.includes("pro") ? 3 : 0) -
              (s.includes("exp") || s.includes("preview") ? 1 : 0);
            return score(b) - score(a) || a.localeCompare(b);
          });

        return NextResponse.json({
          ok: true,
          provider: "gemini",
          models,
        });
      }

      if (ollamaUrl) {
        const base = ollamaUrl.replace(/\/$/, "");
        const res = await fetch(`${base}/api/tags`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return NextResponse.json(
            { ok: false, error: data?.error || `Ollama error (${res.status})` },
            { status: 400 },
          );
        }
        const models: string[] = (data?.models ?? [])
          .map((m: { name: string }) => m.name)
          .filter((n: string) => !/embed/i.test(n));

        return NextResponse.json({
          ok: true,
          provider: "ollama",
          models,
        });
      }

      return NextResponse.json(
        { ok: false, error: "กรุณากรอก Gemini API Key หรือ Ollama URL ก่อนกดทดสอบ" },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: false, error: "Invalid test target" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Connection test failed";
    return NextResponse.json({ ok: false, error: sanitizeErr(msg) }, { status: 500 });
  }
}
