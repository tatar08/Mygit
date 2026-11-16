import { NextResponse } from "next/server";
import { isDbAvailable, markFreebiesNotified, type FreebieRecord } from "@/lib/db";
import { sendLineMessage, sendWebhookMessage } from "@/lib/line";
import { getSecret, saveSecrets, SECRETS_COOKIE } from "@/lib/secrets";

async function getConfig() {
  const [lineToken, lineTargetId, webhookUrl] = await Promise.all([
    getSecret("line_channel_token"),
    getSecret("line_target_id"),
    getSecret("webhook_url"),
  ]);
  return {
    lineToken: lineToken || "",
    lineTargetId: lineTargetId || "",
    webhookUrl: webhookUrl || "",
  };
}

export async function GET() {
  const [dbAvailable, cfg] = await Promise.all([isDbAvailable(), getConfig()]);
  return NextResponse.json({
    dbAvailable,
    hasLineToken: Boolean(cfg.lineToken),
    lineTargetId: cfg.lineTargetId,
    hasWebhook: Boolean(cfg.webhookUrl),
  });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { dbAvailable, encryptedCookieValue } = await saveSecrets({
      ...(typeof body.lineToken === "string" ? { line_channel_token: body.lineToken } : {}),
      ...(typeof body.lineTargetId === "string" ? { line_target_id: body.lineTargetId } : {}),
      ...(typeof body.webhookUrl === "string" ? { webhook_url: body.webhookUrl } : {}),
    });
    const res = NextResponse.json({ ok: true, persistedToDb: dbAvailable });
    res.cookies.set(SECRETS_COOKIE, encryptedCookieValue, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save notification settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const savedCfg = await getConfig();

    const lineToken =
      typeof body.lineToken === "string" && body.lineToken.trim()
        ? body.lineToken.trim()
        : savedCfg.lineToken;
    const lineTargetId =
      typeof body.lineTargetId === "string" && body.lineTargetId.trim()
        ? body.lineTargetId.trim()
        : savedCfg.lineTargetId;
    const webhookUrl =
      typeof body.webhookUrl === "string" && body.webhookUrl.trim()
        ? body.webhookUrl.trim()
        : savedCfg.webhookUrl;

    if (!lineToken && !webhookUrl) {
      return NextResponse.json(
        { error: "กรุณาตั้งค่า LINE Channel Access Token หรือ Webhook URL ก่อนส่งแจ้งเตือน" },
        { status: 400 },
      );
    }

    let message = "";
    const items: FreebieRecord[] = Array.isArray(body.items) ? body.items.slice(0, 8) : [];

    if (body.test) {
      message = "🎁 Mygit Freebie Radar: ทดสอบการเชื่อมต่อแจ้งเตือนสำเร็จ!";
    } else if (items.length) {
      const lines = items.map(
        (it, idx) =>
          `${idx + 1}. [${it.category}] ${it.summaryTh || it.title}\n🔗 ${it.url}`,
      );
      message = `🎁 Mygit Freebie Radar (${items.length} รายการใหม่)\n\n${lines.join("\n\n")}`;
    } else {
      return NextResponse.json({ error: "ไม่มีรายการสำหรับส่งแจ้งเตือน" }, { status: 400 });
    }

    const results: { line?: string; webhook?: string } = {};
    if (lineToken) {
      const res = await sendLineMessage(message, { lineToken, lineTargetId });
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
      results.line = "sent";
    }
    if (webhookUrl) {
      const res = await sendWebhookMessage(message, webhookUrl);
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
      results.webhook = "sent";
    }

    if (items.length) {
      await markFreebiesNotified(items.map((i) => i.id));
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send notification";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

