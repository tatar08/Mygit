import { NextResponse } from "next/server";
import { askAiText, extractJson } from "@/lib/ai";

type SummarizeInput = {
  fullName: string;
  description?: string | null;
  language?: string | null;
  topics?: string[];
};

type RepoSummary = {
  summary: string;
  whatItDoes: string;
  bestFor: string;
  tech: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const items: SummarizeInput[] = Array.isArray(body.items) ? body.items.slice(0, 12) : [];

    if (!items.length) {
      return NextResponse.json({ error: "Missing items to summarize" }, { status: 400 });
    }

    const listText = items
      .map(
        (r, i) =>
          `${i + 1}. ${r.fullName}\n   Language: ${r.language ?? "Unknown"}\n   Topics: ${(r.topics ?? []).join(", ")}\n   Description: ${r.description ?? "(none)"}`,
      )
      .join("\n\n");

    const prompt = `Analyze these GitHub repositories and return a JSON object mapping each exact "fullName" to a concise Thai explanation:
{
  "<owner/repo>": {
    "summary": "สรุปสั้นๆ 1-2 ประโยคภาษาไทยเข้าใจง่าย",
    "whatItDoes": "เอาไว้ทำอะไร (สั้น กระชับ)",
    "bestFor": "เหมาะสำหรับงานอะไร / ใครควรใช้",
    "tech": "เทคโนโลยีหลักที่ใช้"
  }
}

Repositories:
${listText}`;

    const { text } = await askAiText(prompt, {
      system:
        "You are a senior developer assistant helping Thai users quickly understand GitHub repositories. Always respond with valid JSON only, in natural Thai.",
      json: true,
      temperature: 0.2,
    });

    const summaries = extractJson<Record<string, RepoSummary>>(text);
    return NextResponse.json({ summaries });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to summarize repositories";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
