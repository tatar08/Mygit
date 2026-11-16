"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function AiRepoAssistant({
  fullName,
  description,
  language,
  stacks,
  os,
  arch,
  parts,
  steps,
}: {
  fullName: string;
  description: string | null;
  language: string | null;
  stacks: string[];
  os: string;
  arch: string | null;
  parts: string[];
  steps: string[];
}) {
  const { locale } = useI18n();
  const th = locale === "th";

  const [tab, setTab] = useState<"summary" | "security" | "error">("summary");
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [results, setResults] = useState<Partial<Record<"summary" | "security" | "error", string>>>({});

  const runAssist = async (mode: "summary" | "security" | "error") => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          fullName,
          description,
          language,
          stacks,
          os,
          arch,
          parts,
          steps,
          errorText,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI assist failed");
      setResults((prev) => ({ ...prev, [mode]: data.answer }));
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "AI assist failed");
    } finally {
      setLoading(false);
    }
  };

  const currentAnswer = results[tab];

  return (
    <section className="panel ai-repo-panel" aria-label="AI Workshop Assistant">
      <div className="ai-repo-head">
        <div>
          <h3 style={{ margin: 0 }}>✨ {th ? "ผู้ช่วย AI ประจำโปรเจกต์" : "AI Project Assistant"}</h3>
          <p className="note" style={{ margin: "4px 0 0" }}>
            {th
              ? "สรุปภาษาไทย เช็กสเปก/ความปลอดภัยก่อนรัน หรือวาง Error เพื่อรับคำสั่งแก้ไข"
              : "Get a Thai/English overview, safety & spec check, or paste terminal errors to fix."}
          </p>
        </div>
      </div>

      <div className="hot-filter-group" style={{ marginTop: 14, marginBottom: 14 }}>
        <button
          type="button"
          className={`hot-pill ${tab === "summary" ? "active" : ""}`}
          onClick={() => setTab("summary")}
        >
          {th ? "✨ สรุปไทย & งานที่เหมาะ" : "✨ Overview & Use Cases"}
        </button>
        <button
          type="button"
          className={`hot-pill ${tab === "security" ? "active" : ""}`}
          onClick={() => setTab("security")}
        >
          {th ? "🛡️ เช็กความปลอดภัย & สเปก" : "🛡️ Safety & Specs"}
        </button>
        <button
          type="button"
          className={`hot-pill ${tab === "error" ? "active" : ""}`}
          onClick={() => setTab("error")}
        >
          {th ? "🩹 วาง Error แก้ปัญหา" : "🩹 Paste Error & Fix"}
        </button>
      </div>

      {tab === "error" ? (
        <div className="ai-error-form">
          <textarea
            value={errorText}
            onChange={(e) => setErrorText(e.target.value)}
            placeholder={
              th
                ? "วางข้อความ Error จาก Terminal ที่นี่ (เช่น command not found, EACCES, ModuleNotFoundError...)"
                : "Paste your terminal error message here..."
            }
            rows={4}
            className="ai-error-textarea"
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-go btn-sm"
              onClick={() => runAssist("error")}
              disabled={loading || !errorText.trim()}
            >
              {loading ? (th ? "กำลังวิเคราะห์..." : "Analyzing...") : th ? "✨ วิเคราะห์และแก้ Error" : "✨ Diagnose & Fix"}
            </button>
          </div>
        </div>
      ) : (
        !currentAnswer && (
          <button
            type="button"
            className="btn btn-go btn-sm"
            onClick={() => runAssist(tab)}
            disabled={loading}
          >
            {loading
              ? th
                ? "✨ กำลังวิเคราะห์..."
                : "✨ Analyzing..."
              : tab === "summary"
                ? th
                  ? "✨ ให้ AI สรุปโปรเจกต์นี้ (ภาษาไทย)"
                  : "✨ Generate Overview"
                : th
                  ? "🛡️ ให้ AI เช็กสเปก & ความปลอดภัย"
                  : "🛡️ Run Safety & Spec Check"}
          </button>
        )
      )}

      {apiError && <p className="add-modal-error" style={{ marginTop: 10 }}>{apiError}</p>}
      {currentAnswer && (
        <div className="ai-answer-box" style={{ marginTop: 12 }}>
          {currentAnswer}
        </div>
      )}
    </section>
  );
}

