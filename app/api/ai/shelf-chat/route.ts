import { NextResponse } from "next/server";
import { askAiText } from "@/lib/ai";
import { browseRepos, isDbAvailable } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const locale = body.locale === "en" ? "en" : "th";

    if (!question) {
      return NextResponse.json({ error: "Please enter a question" }, { status: 400 });
    }

    let repos: Array<{
      fullName: string;
      description?: string | null;
      language?: string | null;
      difficulty?: string;
      installed?: boolean;
      stars?: number;
    }> = Array.isArray(body.repos) ? body.repos : [];

    // If DB is available and client didn't pass full list, load from DB
    if (!repos.length && (await isDbAvailable())) {
      const res = await browseRepos({ perPage: 100 });
      repos = res.repos;
    }

    if (!repos.length) {
      return NextResponse.json(
        { error: locale === "th" ? "ยังไม่มีโปรเจกต์ในคลังของคุณ" : "Your shelf is empty." },
        { status: 400 },
      );
    }

    const catalog = repos
      .slice(0, 80)
      .map(
        (r, i) =>
          `${i + 1}. ${r.fullName} [${r.language ?? "Unknown"}, ${r.difficulty ?? "Moderate"}, ★${r.stars ?? 0}${r.installed ? ", INSTALLED" : ""}] — ${r.description ?? "No description"}`,
      )
      .join("\n");

    const replyLang = locale === "en" ? "English" : "Thai";
    const prompt = `User question about their saved repository shelf:
"${question}"

Saved repositories in user's shelf:
${catalog}

Answer the question based strictly on the repositories in their shelf above. Compare options if asked, mention exact \`owner/repo\` names, and indicate which ones are already marked INSTALLED.`;

    const { text } = await askAiText(prompt, {
      system: `You are a helpful software advisor analyzing the user's personal GitHub shelf. Respond clearly in ${replyLang}.`,
      temperature: 0.3,
    });

    return NextResponse.json({ answer: text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to query shelf with AI";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

