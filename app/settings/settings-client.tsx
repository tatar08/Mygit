"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { SecretKey, SecretStatus } from "@/lib/secrets";

export function SettingsClient({
  initialStatuses,
  dbAvailable,
}: {
  initialStatuses: Record<SecretKey, SecretStatus>;
  dbAvailable: boolean;
}) {
  const { locale } = useI18n();
  const th = locale === "th";

  const [statuses, setStatuses] = useState(initialStatuses);
  const [values, setValues] = useState<Partial<Record<SecretKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [testingNotify, setTestingNotify] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setField = (key: SecretKey, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);

    try {
      // Only send fields the user explicitly typed
      const payload: Partial<Record<SecretKey, string>> = {};
      for (const [k, v] of Object.entries(values) as [SecretKey, string | undefined][]) {
        if (typeof v === "string" && v.trim() !== "") {
          payload[k] = v.trim();
        }
      }

      if (Object.keys(payload).length === 0) {
        setMsg(th ? "ไม่มีข้อมูลใหม่ที่แก้ไข" : "No changes to save.");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      setStatuses(data.statuses);
      setValues({});
      setMsg(
        th
          ? "บันทึกและเข้ารหัส AES-256-GCM เรียบร้อยแล้ว! (คีย์ไม่ถูกเก็บใน localStorage)"
          : "Saved & encrypted with AES-256-GCM!",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        th
          ? "ต้องการล้าง API Keys ที่บันทึกไว้ทั้งหมดหรือไม่? (ค่าใน Vercel Env ยังคงอยู่)"
          : "Clear all saved API keys?",
      )
    ) {
      return;
    }
    setClearing(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/settings", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear");
      setStatuses(data.statuses);
      setValues({});
      setMsg(th ? "ล้างคีย์ที่บันทึกไว้ทั้งหมดแล้ว" : "All saved keys cleared.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear");
    } finally {
      setClearing(false);
    }
  };

  const handleTestNotify = async () => {
    setTestingNotify(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/freebies/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test: true,
          ...(values.line_channel_token ? { lineToken: values.line_channel_token } : {}),
          ...(values.line_target_id ? { lineTargetId: values.line_target_id } : {}),
          ...(values.webhook_url ? { webhookUrl: values.webhook_url } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      setMsg(th ? "ส่งข้อความทดสอบ LINE / Webhook สำเร็จ!" : "Test notification sent!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTestingNotify(false);
    }
  };

  const renderBadge = (key: SecretKey) => {
    const st = statuses[key];
    if (!st?.configured) {
      return <span className="settings-badge missing">{th ? "ยังไม่ตั้งค่า" : "Not set"}</span>;
    }
    const srcLabel =
      st.source === "env"
        ? "Vercel/Env"
        : st.source === "db"
          ? "Encrypted DB"
          : "Encrypted Cookie";
    return (
      <span className="settings-badge ok">
        ✓ {st.masked} ({srcLabel})
      </span>
    );
  };

  return (
    <div className="wrap shelf-page" style={{ maxWidth: 860 }}>
      <header className="hot-page-head" style={{ marginBottom: 20 }}>
        <div>
          <p className="eyebrow">⚙️ {th ? "ตั้งค่าระบบและความปลอดภัย" : "SETTINGS & SECURITY"}</p>
          <h1 className="display-md">{th ? "ตั้งค่า API Keys & การแจ้งเตือน" : "API Keys & Integrations"}</h1>
          <p className="lead">
            {th
              ? "กรอกคีย์ที่ต้องใช้ทั้งหมดได้ที่นี่ ระบบเข้ารหัสด้วย AES-256-GCM ฝั่งเซิร์ฟเวอร์ ไม่เก็บคีย์ดิบในเบราว์เซอร์"
              : "Configure your AI, GitHub, and LINE keys securely. Secrets are encrypted with AES-256-GCM and never exposed to client JS."}
          </p>
        </div>
      </header>

      <div className="panel settings-security-banner">
        <strong>🛡️ {th ? "ระบบป้องกัน API Key หลุดทำงานอยู่:" : "API Key Leak Protection Active:"}</strong>
        <ul>
          <li>
            {th
              ? "คีย์ทั้งหมดถูกเข้ารหัส AES-256-GCM และเก็บใน HTTP-only Cookie / ฐานข้อมูลที่เข้ารหัส (JavaScript ฝั่งหน้าเว็บอ่านไม่ได้)"
              : "Keys are encrypted with AES-256-GCM in HTTP-only cookies / encrypted DB (unreadable by client JS/XSS)."}
          </li>
          <li>
            {th
              ? "API ไม่เคยส่งคีย์จริงกลับไปที่หน้าเว็บ (แสดงเฉพาะเลขท้าย ••••) และซ่อนค่าจาก Error Log อัตโนมัติ"
              : "Server APIs never return raw secrets (masked preview only) and redact keys from error messages."}
          </li>
          <li>
            {th
              ? `สถานะที่เก็บ: ${dbAvailable ? "SQLite / Turso (ถาวรทุกเครื่อง)" : "Encrypted HTTP-only Cookie (เฉพาะเบราว์เซอร์นี้)"}`
              : `Storage: ${dbAvailable ? "Encrypted DB" : "Encrypted HTTP-only Cookie"}`}
          </li>
        </ul>
      </div>

      {msg && <p className="passcode-success" style={{ marginBottom: 16 }}>{msg}</p>}
      {error && (
        <div className="unlock-error" style={{ marginBottom: 16 }}>
          <span className="unlock-error-tag">ERROR</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="settings-stack">
        {/* 1. AI Provider */}
        <section className="panel settings-card">
          <div className="settings-card-head">
            <h2>🤖 {th ? "1. ตั้งค่า AI (Gemini API / Ollama)" : "1. AI Provider (Gemini / Ollama)"}</h2>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="hot-open-link">
              {th ? "รับ Gemini Key ฟรี ↗" : "Get free Gemini Key ↗"}
            </a>
          </div>

          <div className="settings-field">
            <div className="settings-field-label">
              <label htmlFor="gemini_api_key">Gemini API Key (GEMINI_API_KEY)</label>
              {renderBadge("gemini_api_key")}
            </div>
            <input
              id="gemini_api_key"
              type="password"
              autoComplete="off"
              value={values.gemini_api_key ?? ""}
              onChange={(e) => setField("gemini_api_key", e.target.value)}
              placeholder={statuses.gemini_api_key?.configured ? th ? "กรอกใหม่เพื่อเปลี่ยนคีย์..." : "Enter new key to replace..." : "AIzaSy..."}
              className="add-modal-input"
            />
          </div>

          <div className="settings-row-2">
            <div className="settings-field">
              <div className="settings-field-label">
                <label htmlFor="gemini_model">Gemini Model</label>
                {renderBadge("gemini_model")}
              </div>
              <input
                id="gemini_model"
                type="text"
                value={values.gemini_model ?? ""}
                onChange={(e) => setField("gemini_model", e.target.value)}
                placeholder="gemini-2.5-flash"
                className="add-modal-input"
              />
            </div>

            <div className="settings-field">
              <div className="settings-field-label">
                <label htmlFor="ollama_url">{th ? "Ollama URL (สำหรับรัน Local)" : "Ollama URL (Local AI)"}</label>
                {renderBadge("ollama_url")}
              </div>
              <input
                id="ollama_url"
                type="url"
                value={values.ollama_url ?? ""}
                onChange={(e) => setField("ollama_url", e.target.value)}
                placeholder="http://localhost:11434"
                className="add-modal-input"
              />
            </div>
          </div>
        </section>

        {/* 2. GitHub Token */}
        <section className="panel settings-card">
          <div className="settings-card-head">
            <h2>🐙 {th ? "2. GitHub Personal Access Token" : "2. GitHub Token"}</h2>
            <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="hot-open-link">
              {th ? "สร้าง Token ↗" : "Create Token ↗"}
            </a>
          </div>
          <p className="note" style={{ margin: "0 0 12px" }}>
            {th
              ? "ช่วยเพิ่มโควต้าดึงข้อมูลหน้า Hot Repo และวิเคราะห์โปรเจกต์จาก 60 เป็น 5,000 ครั้ง/ชั่วโมง"
              : "Raises GitHub API limit from 60 to 5,000 requests/hour."}
          </p>
          <div className="settings-field">
            <div className="settings-field-label">
              <label htmlFor="github_token">GitHub Token (GITHUB_TOKEN)</label>
              {renderBadge("github_token")}
            </div>
            <input
              id="github_token"
              type="password"
              autoComplete="off"
              value={values.github_token ?? ""}
              onChange={(e) => setField("github_token", e.target.value)}
              placeholder={statuses.github_token?.configured ? th ? "กรอกใหม่เพื่อเปลี่ยน Token..." : "Enter new token to replace..." : "ghp_... หรือ github_pat_..."}
              className="add-modal-input"
            />
          </div>
        </section>

        {/* 3. LINE & Webhook */}
        <section className="panel settings-card">
          <div className="settings-card-head">
            <h2>📲 {th ? "3. แจ้งเตือน LINE Messaging API & Webhook" : "3. LINE Messaging API & Webhook"}</h2>
            <a href="https://developers.line.biz/console/" target="_blank" rel="noreferrer" className="hot-open-link">
              LINE Developers ↗
            </a>
          </div>
          <div className="settings-field">
            <div className="settings-field-label">
              <label htmlFor="line_channel_token">LINE Channel Access Token</label>
              {renderBadge("line_channel_token")}
            </div>
            <input
              id="line_channel_token"
              type="password"
              autoComplete="off"
              value={values.line_channel_token ?? ""}
              onChange={(e) => setField("line_channel_token", e.target.value)}
              placeholder={statuses.line_channel_token?.configured ? th ? "กรอกใหม่เพื่อเปลี่ยน Token..." : "Enter new token to replace..." : "Channel Access Token (Messaging API)"}
              className="add-modal-input"
            />
          </div>

          <div className="settings-row-2">
            <div className="settings-field">
              <div className="settings-field-label">
                <label htmlFor="line_target_id">{th ? "LINE User / Group ID (ไม่บังคับ)" : "LINE User / Group ID (optional)"}</label>
                {renderBadge("line_target_id")}
              </div>
              <input
                id="line_target_id"
                type="text"
                value={values.line_target_id ?? ""}
                onChange={(e) => setField("line_target_id", e.target.value)}
                placeholder={th ? "เว้นว่างเพื่อ Broadcast" : "Blank = Broadcast"}
                className="add-modal-input"
              />
            </div>

            <div className="settings-field">
              <div className="settings-field-label">
                <label htmlFor="webhook_url">Webhook URL (Discord / Slack)</label>
                {renderBadge("webhook_url")}
              </div>
              <input
                id="webhook_url"
                type="password"
                autoComplete="off"
                value={values.webhook_url ?? ""}
                onChange={(e) => setField("webhook_url", e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="add-modal-input"
              />
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleTestNotify}
              disabled={testingNotify}
            >
              {testingNotify ? "..." : th ? "🧪 ทดสอบส่งแจ้งเตือน LINE / Webhook" : "🧪 Test LINE / Webhook"}
            </button>
          </div>
        </section>

        <div className="settings-actions">
          <button
            type="button"
            className="btn btn-sm passcode-lock-btn"
            onClick={handleClearAll}
            disabled={clearing}
          >
            {clearing ? "..." : th ? "🗑️ ล้างคีย์ที่บันทึกไว้ทั้งหมด" : "🗑️ Clear All Saved Keys"}
          </button>
          <button type="submit" className="btn btn-go" disabled={saving}>
            {saving ? (th ? "กำลังเข้ารหัส & บันทึก..." : "Encrypting & Saving...") : th ? "💾 บันทึกการตั้งค่าทั้งหมด" : "💾 Save All Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
