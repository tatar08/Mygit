"use client";

import { useState } from "react";
import type { ShowcaseItem } from "@/lib/showcase";
import { useI18n } from "@/lib/i18n";

export function ShowcaseSection({ items }: { items: ShowcaseItem[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const { t, locale } = useI18n();

  if (!items || items.length === 0) return null;

  const current = items[activeIdx] || items[0];

  return (
    <section className="showcase-section" aria-labelledby="showcase-heading">
      <div className="showcase-card">
        <div className="showcase-header">
          <div className="showcase-titles">
            <span className="showcase-badge-count">
              <span className="dot on" />
              {items.length} {locale === "th" ? "สื่อตัวอย่าง" : "media"}
            </span>
            <h2 id="showcase-heading" className="showcase-title">
              {locale === "th" ? "ภาพตัวอย่างระบบ (Showcase & Demos)" : "Showcase & Demos"}
            </h2>
            <p className="showcase-sub">
              {locale === "th"
                ? "ภาพหน้าจอ ภาพเคลื่อนไหว GIF และวิดีโอตัวอย่างจาก README"
                : "Screenshots, GIFs, and previews discovered in the project's README."}
            </p>
          </div>

          {items.length > 1 && (
            <div className="showcase-nav-btns" aria-label="Media navigation">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setActiveIdx((i) => (i > 0 ? i - 1 : items.length - 1))}
                aria-label="Previous item"
              >
                ←
              </button>
              <span className="showcase-counter">
                {activeIdx + 1} / {items.length}
              </span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setActiveIdx((i) => (i < items.length - 1 ? i + 1 : 0))}
                aria-label="Next item"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* Main Display Stage */}
        <div className="showcase-stage-wrap">
          <div
            className="showcase-stage"
            onClick={() => setLightbox(true)}
            role="button"
            tabIndex={0}
            title={locale === "th" ? "คลิกเพื่อดูขนาดเต็ม" : "Click to view full size"}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setLightbox(true);
            }}
          >
            <span className={`showcase-type-tag ${current.type}`}>
              {current.type === "gif" ? "🎞️ GIF DEMO" : current.type === "video" ? "🎬 VIDEO" : "📸 SCREENSHOT"}
            </span>

            {current.type === "video" ? (
              <video
                src={current.src}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="showcase-media"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={current.src}
                alt={current.alt || "Showcase preview"}
                className="showcase-media"
                loading="lazy"
              />
            )}

            <div className="showcase-overlay-hint">
              <span>🔍 {locale === "th" ? "คลิกเพื่อดูภาพเต็ม" : "Click to expand"}</span>
            </div>
          </div>

          {current.alt && current.alt !== "Showcase preview" && (
            <p className="showcase-caption">
              <strong>{current.alt}</strong>
              {current.title && <span> — {current.title}</span>}
            </p>
          )}
        </div>

        {/* Thumbnail Selector Strip if > 1 items */}
        {items.length > 1 && (
          <div className="showcase-thumbs" role="tablist" aria-label="Media thumbnails">
            {items.map((item, idx) => (
              <button
                key={item.src}
                type="button"
                role="tab"
                aria-selected={idx === activeIdx}
                className={`showcase-thumb-btn ${idx === activeIdx ? "active" : ""}`}
                onClick={() => setActiveIdx(idx)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt={item.alt} className="showcase-thumb-img" loading="lazy" />
                <span className="showcase-thumb-type">{item.type.toUpperCase()}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightbox && (
        <div
          className="showcase-modal"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="showcase-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="showcase-modal-close"
              onClick={() => setLightbox(false)}
              aria-label="Close"
            >
              ✕
            </button>
            {current.type === "video" ? (
              <video src={current.src} controls autoPlay className="showcase-modal-media" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={current.src} alt={current.alt} className="showcase-modal-media" />
            )}
            {current.alt && <p className="showcase-modal-caption">{current.alt}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

