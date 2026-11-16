"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useI18n } from "@/lib/i18n";

type ChatMsg = { role: "user" | "assistant"; content: string };

const OS_NAMES: Record<string, string> = {
  mac: "macOS",
  windows: "Windows",
  linux: "Linux",
};

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
  const osLabel = OS_NAMES[os] ?? os;

  const [tab, setTab] = useState<"chat" | "summary" | "security" | "error">("chat");
  const [errorText, setErrorText] = useState("");
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [results, setResults] = useState<Partial<Record<"summary" | "security" | "error", string>>>({});

  const starterQuestions = th
    ? [
        `ติดตั้ง ${fullName.split("/")[1]} บน ${osLabel} ยังไง?`,
        "ต้องเตรียมเครื่องมือหรือโปรแกรมอะไรก่อนบ้าง?",
        "มีคำสั่งไหนที่ต้องระวังหรือเสี่ยงไหม?",
        "ถ้า Port ชนหรือรันไม่ขึ้นต้องแก้ยังไง?",
      ]
    : [
        `How do I install it on ${osLabel}?`,
        "What do I need installed first?",
        "Are any setup commands risky?",
        "How do I update to a new version?",
      ];

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

  const sendChat = async (qText?: string) => {
    const q = (qText ?? question).trim();
    if (!q || loading) return;

    const nextHistory: ChatMsg[] = [...chatHistory, { role: "user", content: q }];
    setChatHistory(nextHistory);
    if (!qText) setQuestion("");
    setLoading(true);
    setApiError(null);

    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          fullName,
          description,
          language,
          stacks,
          os,
          arch,
          parts,
          steps,
          question: q,
          history: chatHistory,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI chat failed");
      setChatHistory([...nextHistory, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "AI chat failed");
    } finally {
      setLoading(false);
    }
  };

  const currentAnswer = tab !== "chat" ? results[tab] : undefined;

  return (
    <section className="panel ai-repo-panel" aria-label="AI Workshop Assistant">
      <div className="ai-repo-head">
        <div>
          <h3 style={{ margin: 0 }}>✨ {th ? "ผู้ช่วย AI ประจำโปรเจกต์" : "Ask about this repo"}</h3>
          <p className="note" style={{ margin: "4px 0 0" }}>
            {th
              ? `ถาม-ตอบอิสระ สรุปภาษาไทย เช็กความปลอดภัย หรือวาง Error สำหรับ ${osLabel} (ใช้ Gemini / Ollama)`
              : `Ask anything, get a safety & spec check, or paste errors for ${osLabel} (powered by Gemini / Ollama).`}
          </p>
        </div>
      </div>

      <div className="hot-filter-group" style={{ marginTop: 14, marginBottom: 16 }}>
        <button
          type="button"
          className={`hot-pill ${tab === "chat" ? "active" : ""}`}
          onClick={() => setTab("chat")}
        >
          {th ? "💬 ถาม-ตอบ Repo นี้" : "💬 Ask AI"}
        </button>
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

      {tab === "chat" && (
        <div className="ai-chat-wrap">
          {chatHistory.length === 0 ? (
            <div className="ai-chat-starters">
              <span className="ai-starters-label">{th ? "ลองถามสักข้อ" : "TRY ONE"}</span>
              <div className="ai-starters-list">
                {starterQuestions.map((sq) => (
                  <button
                    key={sq}
                    type="button"
                    className="ai-starter-pill"
                    onClick={() => sendChat(sq)}
                    disabled={loading}
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="ai-chat-thread">
              {chatHistory.map((m, idx) => (
                <div key={idx} className={`ai-chat-bubble ${m.role}`}>
                  <div className="ai-chat-role">{m.role === "user" ? (th ? "คุณ" : "You") : "✨ AI"}</div>
                  <div className="ai-chat-md prose">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="ai-chat-bubble assistant">
                  <div className="ai-chat-role">✨ AI</div>
                  <div className="note">{th ? "กำลังคิดคำตอบ..." : "Thinking..."}</div>
                </div>
              )}
            </div>
          )}

          <div className="ai-chat-composer">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              placeholder={
                th
                  ? `ถามอะไรก็ได้เกี่ยวกับ ${fullName}...`
                  : `Ask anything about ${fullName}...`
              }
              rows={2}
              className="ai-chat-input"
              disabled={loading}
            />
            <div className="ai-chat-composer-foot">
              <span className="note" style={{ fontSize: 12 }}>
                {th ? "กด Enter เพื่อส่ง · Shift+Enter ขึ้นบรรทัดใหม่" : "Enter to send"}
              </span>
              <button
                type="button"
                className="btn btn-go btn-sm"
                onClick={() => sendChat()}
                disabled={loading || !question.trim()}
              >
                {loading ? "..." : th ? "ถาม AI →" : "Ask →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "error" && (
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
      )}

      {(tab === "summary" || tab === "security") && !currentAnswer && (
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
      )}

      {apiError && <p className="add-modal-error" style={{ marginTop: 10 }}>{apiError}</p>}
      {currentAnswer && (
        <div className="ai-answer-box prose" style={{ marginTop: 12 }}>
          <ReactMarkdown>{currentAnswer}</ReactMarkdown>
        </div>
      )}
    </section>
  );
}
