"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

export function UnlockClient({
  pinLength,
  isNumeric,
  nextPath,
}: {
  pinLength: number;
  isNumeric: boolean;
  nextPath: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const useBoxes = isNumeric && pinLength >= 4 && pinLength <= 8;

  const [digits, setDigits] = useState<string[]>(() => Array(pinLength).fill(""));
  const [textCode, setTextCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);
  const textRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (useBoxes) boxRefs.current[0]?.focus();
    else textRef.current?.focus();
  }, [useBoxes]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const submitCode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: trimmed }),
      });

      if (res.ok) {
        const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
        router.replace(safeNext);
        router.refresh();
        return;
      }

      setError(t("unlockError"));
      triggerShake();
      if (useBoxes) {
        setDigits(Array(pinLength).fill(""));
        setTimeout(() => boxRefs.current[0]?.focus(), 20);
      } else {
        setTimeout(() => textRef.current?.select(), 20);
      }
    } catch {
      setError(t("unlockError"));
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleBoxChange = (idx: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[idx] = "";
      setDigits(next);
      return;
    }

    // Handle pasting or typing multiple characters
    if (cleaned.length > 1) {
      const next = [...digits];
      for (let i = 0; i < cleaned.length && idx + i < pinLength; i++) {
        next[idx + i] = cleaned[i];
      }
      setDigits(next);
      const focusIdx = Math.min(idx + cleaned.length, pinLength - 1);
      boxRefs.current[focusIdx]?.focus();
      if (next.every((d) => d.length === 1)) {
        submitCode(next.join(""));
      }
      return;
    }

    const next = [...digits];
    next[idx] = cleaned[0];
    setDigits(next);
    setError(null);

    if (idx < pinLength - 1) {
      boxRefs.current[idx + 1]?.focus();
    } else if (next.every((d) => d.length === 1)) {
      submitCode(next.join(""));
    }
  };

  const handleBoxKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      e.preventDefault();
      const next = [...digits];
      next[idx - 1] = "";
      setDigits(next);
      boxRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      boxRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < pinLength - 1) {
      e.preventDefault();
      boxRefs.current[idx + 1]?.focus();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = useBoxes ? digits.join("") : textCode;
    submitCode(code);
  };

  return (
    <div className="unlock-stage">
      <form
        className={`unlock-card ${shake ? "unlock-shake" : ""}`}
        onSubmit={handleFormSubmit}
      >
        <div className="unlock-card-top">
          <div className="unlock-brand">
            <svg width="24" height="24" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <path
                d="M13 2l10 5v12l-10 5-10-5V7z"
                fill="var(--wrench)"
                stroke="var(--ink)"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M3 7l10 5 10-5M13 12v12"
                stroke="var(--ink)"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <span className="unlock-brand-name">gitmanual</span>
          </div>
          <span className="unlock-badge">{t("unlockBadge")}</span>
        </div>

        <div className="unlock-body">
          <h1 className="display-md unlock-title">{t("unlockTitle")}</h1>
          <p className="unlock-desc">{t("unlockDesc")}</p>

          {useBoxes ? (
            <div className="unlock-pin-row" role="group" aria-label="Passcode">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    boxRefs.current[idx] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={pinLength}
                  value={digit}
                  onChange={(e) => handleBoxChange(idx, e.target.value)}
                  onKeyDown={(e) => handleBoxKeyDown(idx, e)}
                  className={`unlock-pin-box ${digit ? "filled" : ""}`}
                  aria-label={`Digit ${idx + 1}`}
                  disabled={loading}
                />
              ))}
            </div>
          ) : (
            <input
              ref={textRef}
              type="password"
              value={textCode}
              onChange={(e) => {
                setTextCode(e.target.value);
                setError(null);
              }}
              placeholder={t("unlockPlaceholder")}
              className="unlock-text-input"
              autoComplete="current-password"
              disabled={loading}
            />
          )}

          {error && (
            <div className="unlock-error" role="alert">
              <span className="unlock-error-tag">HEADS-UP</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-go unlock-submit"
            disabled={loading || (useBoxes ? digits.some((d) => !d) : !textCode.trim())}
          >
            {loading ? t("unlocking") : t("unlockButton")}
          </button>
        </div>

        <div className="unlock-foot">
          <span>🔒 {t("unlockHint")}</span>
        </div>
      </form>
    </div>
  );
}

