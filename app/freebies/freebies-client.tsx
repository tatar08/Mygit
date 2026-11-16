"use client";

import { useEffect, useMemo, useState } from "react";
import type { FreebieRecord } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

const CATEGORIES: Array<{ id: "All" | FreebieRecord["category"]; labelTh: string; labelEn: string }> = [
  { id: "All", labelTh: "ทั้งหมด", labelEn: "All" },
  { id: "AI", labelTh: "🤖 AI", labelEn: "🤖 AI" },
  { id: "VPS", labelTh: "☁️ VPS / Cloud", labelEn: "☁️ VPS / Cloud" },
  { id: "Open Source", labelTh: "📦 Open Source", labelEn: "📦 Open Source" },
  { id: "Games", labelTh: "🎮 Games", labelEn: "🎮 Games" },
  { id: "Deals", labelTh: "🏷️ Deals", labelEn: "🏷️ Deals" },
];

const LOCAL_FREEBIES_KEY = "gitmanual-local-freebies";

export function FreebiesClient({
  initialItems,
  dbAvailable,
}: {
  initialItems: FreebieRecord[];
  dbAvailable: boolean;
}) {
  const { locale } = useI18n();
  const th = locale === "th";

  const [items, setItems] = useState<FreebieRecord[]>(initialItems);
  const [category, setCategory] = useState<"All" | FreebieRecord["category"]>("All");
  const [collecting, setCollecting] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Notification settings
  const [lineToken, setLineToken] = useState("");
  const [lineTargetId, setLineTargetId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    // Load localStorage fallback items if DB unavailable or empty
    if (!dbAvailable) {
      try {
        const raw = localStorage.getItem(LOCAL_FREEBIES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) setItems(parsed);
        }
      } catch {}
    }
    try {
      localStorage.removeItem("gitmanual-local-notify");
    } catch {}
  }, [dbAvailable]);

  const filteredItems = useMemo(() => {
    if (category === "All") return items;
    return items.filter((i) => i.category === category);
  }, [items, category]);

  const handleCollect = async () => {
    setCollecting(true);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/freebies", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to collect freebies");

      const nextItems: FreebieRecord[] = data.items ?? [];
      setItems(nextItems);
      try {
        localStorage.setItem(LOCAL_FREEBIES_KEY, JSON.stringify(nextItems));
      } catch {}

      setStatusMsg(
        th
          ? `ดึงข้อมูลสำเร็จ ${nextItems.length} รายการ${data.aiFiltered ? " (คัดกรองและสรุปไทยด้วย AI แล้ว)" : ""}`
          : `Collected ${nextItems.length} items${data.aiFiltered ? " (AI-filtered)" : ""}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to collect freebies");
    } finally {
      setCollecting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/freebies/notify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineToken, lineTargetId, webhookUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save settings");
      }
      setStatusMsg(th ? "บันทึกการตั้งค่า LINE / Webhook เรียบร้อยแล้ว" : "Notification settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendNotify = async (testOnly = false, singleItem?: FreebieRecord) => {
    setNotifying(true);
    setError(null);
    setStatusMsg(null);
    try {
      const targetItems = singleItem ? [singleItem] : filteredItems.slice(0, 5);
      const res = await fetch("/api/freebies/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test: testOnly,
          items: testOnly ? [] : targetItems,
          lineToken,
          lineTargetId,
          webhookUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send notification");

      setStatusMsg(
        testOnly
          ? th
            ? "ส่งข้อความทดสอบสำเร็จ!"
            : "Test notification sent!"
          : th
            ? `ส่งแจ้งเตือน ${targetItems.length} รายการเข้า LINE / Webhook เรียบร้อยแล้ว`
            : `Sent ${targetItems.length} items!`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="wrap shelf-page hot-page">
      <header className="hot-page-head">
        <div>
          <p className="eyebrow">🎁 {th ? "เรดาร์ของฟรี & โปรโมชั่น" : "FREEBIE RADAR"}</p>
          <h1 className="display-md">{th ? "Freebies ของฟรีน่าใช้" : "Freebies & Tech Deals"}</h1>
          <p className="lead">
            {th
              ? "รวบรวม AI Tools, Free Tier VPS, Open Source, เกมแจกฟรี พร้อม AI คัดกรองและส่งแจ้งเตือนเข้า LINE"
              : "Curated free AI tools, VPS free tiers, open-source releases, and giveaways with AI filtering and LINE alerts."}
          </p>
        </div>

        <div className="hot-head-actions" style={{ flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-go btn-sm"
            onClick={handleCollect}
            disabled={collecting}
          >
            {collecting
              ? th
                ? "↻ กำลังดึง & ให้ AI กรอง..."
                : "↻ Collecting..."
              : th
                ? "↻ ดึงข้อมูล & AI กรองล่าสุด"
                : "↻ Collect & AI Filter"}
          </button>
          <button
            type="button"
            className="btn btn-sm hot-refresh-btn"
            onClick={() => handleSendNotify(false)}
            disabled={notifying || filteredItems.length === 0}
          >
            {notifying ? "..." : th ? "📲 ส่งเข้า LINE (Top 5)" : "📲 Send to LINE"}
          </button>
          <button
            type="button"
            className="btn btn-sm hot-refresh-btn"
            onClick={() => setShowSettings((s) => !s)}
          >
            ⚙️ {th ? "ตั้งค่า LINE / Webhook" : "LINE / Webhook Settings"}
          </button>
        </div>
      </header>

      {showSettings && (
        <section className="panel freebie-settings-panel">
          <h2 style={{ margin: "0 0 8px", fontSize: "var(--fs-h3)" }}>
            ⚙️ {th ? "ตั้งค่าแจ้งเตือน LINE Messaging API / Webhook" : "LINE Messaging API & Webhook Settings"}
          </h2>
          <p className="note" style={{ marginBottom: 14 }}>
            {th
              ? "ใส่ Channel Access Token จาก LINE Developers (เว้น Target ID ว่างไว้เพื่อใช้ Broadcast หรือใส่ User/Group ID เพื่อส่งเฉพาะกลุ่ม) หรือใส่ Discord/Slack Webhook URL"
              : "Enter your LINE Messaging API Channel Access Token (leave Target ID blank for Broadcast) or a Discord/Slack Webhook URL."}
          </p>
          <form onSubmit={handleSaveSettings} className="freebie-settings-form">
            <input
              type="password"
              value={lineToken}
              onChange={(e) => setLineToken(e.target.value)}
              placeholder="LINE Channel Access Token (Messaging API)"
              className="add-modal-input"
            />
            <input
              type="text"
              value={lineTargetId}
              onChange={(e) => setLineTargetId(e.target.value)}
              placeholder={th ? "LINE User ID / Group ID (ไม่บังคับ)" : "LINE User ID / Group ID (optional)"}
              className="add-modal-input"
            />
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="Webhook URL (Discord / Slack / Custom, optional)"
              className="add-modal-input"
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-go btn-sm" disabled={savingSettings}>
                {savingSettings ? "..." : th ? "💾 บันทึกการตั้งค่า" : "💾 Save Settings"}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleSendNotify(true)}
                disabled={notifying}
              >
                {th ? "🧪 ทดสอบส่งแจ้งเตือน" : "🧪 Test Notification"}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="hot-filters-bar">
        <div className="hot-filter-group" role="group" aria-label="Freebie Category">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`hot-pill ${category === c.id ? "active" : ""}`}
              onClick={() => setCategory(c.id)}
            >
              {th ? c.labelTh : c.labelEn}
            </button>
          ))}
        </div>
        <span className="num" style={{ fontSize: "var(--fs-meta)", color: "var(--pencil)" }}>
          {filteredItems.length} {th ? "รายการ" : "items"}
        </span>
      </div>

      {statusMsg && <p className="passcode-success" style={{ marginBottom: 16 }}>{statusMsg}</p>}
      {error && (
        <div className="unlock-error" style={{ marginBottom: 16 }}>
          <span className="unlock-error-tag">ERROR</span>
          <span>{error}</span>
        </div>
      )}

      {filteredItems.length ? (
        <ul className="shelf-grid">
          {filteredItems.map((it) => (
            <li key={it.id}>
              <div className="shelf-card">
                <a className="shelf-card-link" href={it.url} target="_blank" rel="noreferrer">
                  <span className="shelf-top">
                    <span className="installed-tag">{it.category}</span>
                    <span className="shelf-owner">{it.source}</span>
                  </span>
                  <span className="shelf-name" style={{ fontSize: "20px", marginTop: 8 }}>
                    {it.title}
                  </span>
                  {it.summaryTh && it.summaryTh !== it.title && (
                    <span className="shelf-desc" style={{ color: "var(--ink)" }}>
                      ✨ {it.summaryTh}
                    </span>
                  )}
                </a>

                <div className="shelf-foot">
                  <button
                    type="button"
                    className="shelf-btn-installed"
                    onClick={() => handleSendNotify(false, it)}
                    disabled={notifying}
                  >
                    📲 {th ? "ส่งเข้า LINE" : "Send LINE"}
                  </button>
                  <a className="hot-open-link" href={it.url} target="_blank" rel="noreferrer">
                    {th ? "เปิดลิงก์ ↗" : "Open ↗"}
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel shelf-empty">
          <h2>{th ? "ยังไม่มีรายการของฟรีที่ดึงไว้" : "No freebies collected yet"}</h2>
          <p className="note">
            {th
              ? "กดปุ่ม '↻ ดึงข้อมูล & AI กรองล่าสุด' ด้านบนเพื่อดึงรายการสดจาก GitHub, Reddit และ Hacker News"
              : "Click 'Collect & AI Filter' above to fetch live deals from GitHub, Reddit, and Hacker News."}
          </p>
          <button type="button" className="btn btn-go btn-sm" onClick={handleCollect} disabled={collecting}>
            {collecting ? "..." : th ? "↻ ดึงข้อมูลเลย" : "↻ Collect Now"}
          </button>
        </div>
      )}
    </div>
  );
}

