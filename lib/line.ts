export type NotifyConfig = {
  lineToken?: string;
  lineTargetId?: string; // User ID or Group ID; if blank, uses Broadcast API
  webhookUrl?: string;
};

export async function sendLineMessage(
  text: string,
  config: { lineToken: string; lineTargetId?: string },
): Promise<{ ok: boolean; error?: string }> {
  const token = config.lineToken.trim();
  const target = config.lineTargetId?.trim();

  const url = target
    ? "https://api.line.me/v2/bot/message/push"
    : "https://api.line.me/v2/bot/message/broadcast";

  const payload = target
    ? { to: target, messages: [{ type: "text", text: text.slice(0, 4900) }] }
    : { messages: [{ type: "text", text: text.slice(0, 4900) }] };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data?.message || `LINE API error (${res.status})` };
  }
  return { ok: true };
}

export async function sendWebhookMessage(
  text: string,
  webhookUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const url = webhookUrl.trim();
  // Works with Discord (content), Slack (text), and generic JSON webhooks
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text, text }),
  });
  if (!res.ok) {
    return { ok: false, error: `Webhook error (${res.status})` };
  }
  return { ok: true };
}

