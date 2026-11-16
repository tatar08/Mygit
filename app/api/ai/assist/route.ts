import { NextResponse } from "next/server";
import { askAiText } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      mode,
      fullName,
      os,
      arch,
      description,
      language,
      stacks = [],
      parts = [],
      steps = [],
      errorText = "",
      locale = "th",
    } = body as {
      mode?: "summary" | "security" | "error";
      fullName?: string;
      os?: string;
      arch?: string | null;
      description?: string | null;
      language?: string | null;
      stacks?: string[];
      parts?: string[];
      steps?: string[];
      errorText?: string;
      locale?: "th" | "en";
    };

    if (!fullName || !mode) {
      return NextResponse.json({ error: "Missing fullName or mode" }, { status: 400 });
    }

    const replyLang = locale === "en" ? "English" : "Thai";
    const context = `Repo: ${fullName}
Description: ${description ?? "N/A"}
Language: ${language ?? "Unknown"}
Stacks: ${stacks.join(", ") || "N/A"}
Target OS: ${os ?? "linux"} (${arch ?? "unknown arch"})
Required parts/tools: ${parts.slice(0, 15).join(", ") || "N/A"}
Setup commands:
${steps.slice(0, 10).join("\n") || "N/A"}`;

    let prompt = "";
    if (mode === "summary") {
      prompt = `Explain this GitHub project clearly in ${replyLang}:
1. **โปรเจกต์นี้คืออะไร / เอาไว้ทำอะไร**
2. **เหมาะสำหรับงานอะไร / ใครควรใช้**
3. **จุดเด่นและข้อจำกัดที่ควรรู้**

${context}`;
    } else if (mode === "security") {
      prompt = `Evaluate this GitHub project's **system requirements** and **safety/risks** before installing on ${os ?? "linux"} (${replyLang}):
1. **สเปกเครื่องที่แนะนำ**: RAM, CPU/GPU (ต้องใช้ GPU ไหม), พื้นที่ดิสก์ และ API Keys ที่อาจต้องเสียเงินเพิ่ม
2. **ความปลอดภัย (Safety Check)**: วิเคราะห์คำสั่งติดตั้งและ Dependencies ว่ามีคำสั่งเสี่ยง (เช่น curl | bash, root/sudo, network exposure) หรือข้อควรระวังอะไรบ้าง
3. **สรุปความคุ้มค่าในการติดตั้ง**: ระดับความยากและความพร้อม

${context}`;
    } else {
      if (!errorText.trim()) {
        return NextResponse.json({ error: "Please paste the error message first." }, { status: 400 });
      }
      prompt = `The user tried to install/run ${fullName} on ${os ?? "linux"} (${arch ?? "x64"}) and got this error.
Diagnose the root cause and provide exact copy-paste terminal commands to fix it in ${replyLang}.

Error output:
\`\`\`
${errorText.slice(0, 4000)}
\`\`\`

Project context:
${context}`;
    }

    const { text, provider } = await askAiText(prompt, {
      system: `You are an expert DevOps & open-source setup assistant. Be concise, practical, and accurate. Use markdown code blocks for terminal commands. Respond in ${replyLang}.`,
      temperature: 0.25,
    });

    return NextResponse.json({ answer: text, provider });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI assist failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

