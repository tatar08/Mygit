"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Locale = "en" | "th";

export const translations = {
  en: {
    // Navigation
    hotRepo: "🔥 Hot Repo",
    hotRepoEyebrow: "Trending on GitHub",
    hotRepoTitle: "Hot Repositories",
    hotRepoDesc: "Fresh open-source projects gaining stars fast on GitHub right now. Open a manual or save straight to your shelf.",
    hotPeriodDay: "Today",
    hotPeriodWeek: "This Week",
    hotPeriodMonth: "This Month",
    hotPeriodYear: "This Year",
    hotPeriodTopStar: "Top Star",
    hotPeriodTopFork: "Top Fork",
    hotCatAll: "All",
    hotCatAi: "AI / Agents",
    hotCatSelfHosted: "Self-hosted",
    hotRefresh: "Refresh",
    hotRefreshing: "Refreshing...",
    hotEmpty: "No trending repositories found for this filter.",
    hotOpenManual: "Open manual →",
    hotSaveBtn: "+ Shelf",
    shelf: "The shelf",
    private: "Private repos",
    privateShort: "Private",
    api: "API & MCP",
    apiShort: "API",
    how: "How it works",
    star: "Star",
    searchPlaceholder: "owner/repo or paste link...",
    addProject: "+ Add Project",
    addProjectModalTitle: "Add Project to Shelf",
    addProjectModalDesc: "Enter any GitHub repository link or owner/repo to generate its manual and save it to your local shelf.",
    addProjectInputPlaceholder: "e.g. owner/repo or https://github.com/...",
    addProjectSubmit: "+ Add & View Manual",
    cancel: "Cancel",
    addToShelf: "+ Add to Shelf",
    addingToShelf: "Saving to Shelf...",
    savedToShelf: "✓ In Shelf",
    viewInShelf: "View in Shelf →",
    removeFromShelf: "Remove",
    removingFromShelf: "Removing...",
    confirmRemove: "Remove this project from shelf?",
    installed: "Installed",
    notInstalled: "Not installed",
    markInstalled: "Installed",
    markUninstalled: "Not installed",
    installedSuccess: "Marked as installed",
    uninstalledSuccess: "Marked as not installed",
    
    // Hero
    eyebrow: "Setup manuals for open source",
    titleFound: "Found it on GitHub?",
    titleRunning: "Get it running.",
    lead: "Paste any GitHub link. We'll check it works on your device, list the parts you need and write the steps for Mac, Windows or Linux.",
    placeholder: "owner/repo",
    getManual: "Get the manual",
    opening: "Opening…",
    try: "Try:",
    shortcutPrefix: "Shortcut: in any GitHub URL, change ",
    shortcutTo: " to ",
    orAddExtension: ", or add the ",
    chromeExtension: "Chrome extension",
    steps: "steps",
    openManual: "Open the manual →",
    fitsYour: "Fits your",
    probablyFits: "Probably fits your",
    doesntFit: "Doesn't fit your",

    // Three parts section
    threePartsTitle: "Every manual comes in three parts",
    part1Title: "Will it work on my device?",
    part1Desc: "A yes, maybe or no for your system and chip, plus the supported-devices list from the README.",
    part2Title: "Parts list",
    part2Desc: "Every runtime, tool, database and setting the project expects, read from its real files.",
    part3Title: "Assembly steps",
    part3Desc: "Copy-paste commands for macOS, Windows or Linux, with the common pitfalls already solved.",

    // Shelf & sections
    shelfSectionTitle: "The shelf",
    shelfSectionDesc: "Open-source repos people have set up with gitmanual.",
    popular: "Popular",
    recent: "Recent",
    rising: "Trending",

    // Manual view
    startHere: "Start here",
    willItWorkOn: "Will it work on {os}?",
    partsList: "Parts list",
    assemblySteps: "Assembly steps",
    setupScript: "Setup script",
    installIt: "Install it",
    stillStuck: "Still stuck? Ask an AI",
    askAiDesc: "Opens a chat with this manual already filled in, for {os}. It uses your own account; gitmanual sends nothing.",
    askClaude: "Ask Claude",
    askChatGpt: "Ask ChatGPT",
    copyPrompt: "Copy the prompt",
    didYouGetRunning: "Did you get it running?",
    worked: "Worked for me",
    stuck: "I'm stuck",
    copy: "Copy",
    copied: "Copied ✓",
    runAll: "Run all at once",
    downloadScript: "Download script",
    reRead: "Re-read the repo",
    viewGithub: "View on GitHub",
    share: "Share",
    timeEstimate: "About {time}",
    badge: "Setup manual badge",

    // Footer
    tagline: "Setup manuals for open source. In any GitHub link, swap hub for manual.",
    skip: "Skip to content",
    reportWrong: "Report a wrong setup ↗",
    hostYourOwn: "Host your own ↗",
    readmeBadge: "Badge for your README ↗",
    about: "About",
    terms: "Terms",
    privacy: "Privacy",
    contact: "Contact",
    disclaimer: "Reads public data from GitHub. Always read commands before you run them.",

    // Language switch
    langName: "English",
    switchTo: "ภาษาไทย",
    toggleLabel: "เปลี่ยนเป็นภาษาไทย (Switch to Thai)",
  },
  th: {
    // Navigation
    hotRepo: "🔥 Hot Repo",
    hotRepoEyebrow: "กำลังมาแรงบน GitHub",
    hotRepoTitle: "Hot Repo โปรเจกต์มาแรง",
    hotRepoDesc: "รวมโปรเจกต์โอเพนซอร์สใหม่ๆ ที่ยอดดาวกำลังพุ่งบน GitHub กดเปิดดูวิธีติดตั้งหรือเก็บเข้าคลังได้ทันที",
    hotPeriodDay: "วันนี้",
    hotPeriodWeek: "สัปดาห์นี้",
    hotPeriodMonth: "เดือนนี้",
    hotPeriodYear: "ปีนี้",
    hotPeriodTopStar: "Top Star",
    hotPeriodTopFork: "Top Fork",
    hotCatAll: "ทั้งหมด",
    hotCatAi: "AI / Agents",
    hotCatSelfHosted: "Self-hosted",
    hotRefresh: "อัปเดตล่าสุด",
    hotRefreshing: "กำลังอัปเดต...",
    hotEmpty: "ไม่พบโปรเจกต์มาแรงในหมวดนี้",
    hotOpenManual: "เปิดคู่มือ →",
    hotSaveBtn: "+ เก็บเข้าคลัง",
    shelf: "คลังโปรเจกต์",
    private: "โปรเจกต์ส่วนตัว",
    privateShort: "ส่วนตัว",
    api: "API & MCP",
    apiShort: "API",
    how: "วิธีการทำงาน",
    star: "ให้ดาว",
    searchPlaceholder: "owner/repo หรือวางลิงก์...",
    addProject: "+ เพิ่มโปรเจกต์",
    addProjectModalTitle: "เพิ่มโปรเจกต์เข้าสู่คลัง",
    addProjectModalDesc: "กรอกลิงก์ GitHub หรือ owner/repo เพื่อสร้างคู่มือและบันทึกลงในคลัง SQLite ของคุณ",
    addProjectInputPlaceholder: "เช่น owner/repo หรือ https://github.com/...",
    addProjectSubmit: "+ เพิ่มและเปิดคู่มือ",
    cancel: "ยกเลิก",
    addToShelf: "+ เพิ่มเข้าคลังโปรเจกต์",
    addingToShelf: "กำลังบันทึกเข้าคลัง...",
    savedToShelf: "✓ บันทึกในคลังแล้ว",
    viewInShelf: "ดูในคลังโปรเจกต์ →",
    removeFromShelf: "เอาออก",
    removingFromShelf: "กำลังเอาออก...",
    confirmRemove: "ต้องการเอาโปรเจกต์นี้ออกจากคลังหรือไม่?",
    installed: "ติดตั้งแล้ว",
    notInstalled: "ยังไม่ได้ติดตั้ง",
    markInstalled: "ติดตั้งแล้ว",
    markUninstalled: "ยังไม่ได้ติดตั้ง",
    installedSuccess: "บันทึกว่าติดตั้งแล้ว",
    uninstalledSuccess: "บันทึกว่ายังไม่ได้ติดตั้ง",

    // Hero
    eyebrow: "คู่มือการติดตั้งสำหรับโอเพนซอร์ส",
    titleFound: "เจอโปรเจกต์บน GitHub?",
    titleRunning: "มารันให้ใช้งานได้จริง",
    lead: "วางลิงก์ GitHub ใดก็ได้ เราจะตรวจว่าเครื่องของคุณรันได้ไหม สรุปสิ่งที่ต้องใช้ และสร้างขั้นตอนการติดตั้งสำหรับ Mac, Windows หรือ Linux ให้ทันที",
    placeholder: "owner/repo (เช่น ollama/ollama)",
    getManual: "ดูคู่มือการติดตั้ง",
    opening: "กำลังเปิด…",
    try: "ลองดู:",
    shortcutPrefix: "ทางลัด: ในลิงก์ GitHub ใดๆ ให้เปลี่ยน ",
    shortcutTo: " เป็น ",
    orAddExtension: " หรือติดตั้ง ",
    chromeExtension: "ส่วนขยาย Chrome",
    steps: "ขั้นตอน",
    openManual: "เปิดดูคู่มือการติดตั้ง →",
    fitsYour: "รองรับบน",
    probablyFits: "น่าจะรองรับบน",
    doesntFit: "ไม่รองรับบน",

    // Three parts section
    threePartsTitle: "คู่มือทุกชุดประกอบด้วย 3 ส่วนหลัก",
    part1Title: "ใช้งานบนอุปกรณ์ของฉันได้ไหม?",
    part1Desc: "คำตอบชัดเจนว่า รันได้, อาจจะได้ หรือ รันไม่ได้ สำหรับระบบปฏิบัติการและชิปของคุณ พร้อมรายการอุปกรณ์ที่รองรับจาก README",
    part2Title: "รายการสิ่งที่ต้องเตรียม",
    part2Desc: "ทุกรันไทม์ เครื่องมือ ฐานข้อมูล และการตั้งค่าที่โปรเจกต์ต้องการ วิเคราะห์โดยตรงจากไฟล์โปรเจกต์จริง",
    part3Title: "ขั้นตอนการติดตั้งทีละสเต็ป",
    part3Desc: "คำสั่งคัดลอก-วางสำหรับ macOS, Windows หรือ Linux พร้อมวิธีแก้ปัญหาและข้อผิดพลาดที่พบบ่อย",

    // Shelf & sections
    shelfSectionTitle: "คลังโปรเจกต์",
    shelfSectionDesc: "โปรเจกต์โอเพนซอร์สที่ผู้ใช้เข้ามาดูคู่มือการติดตั้ง",
    popular: "ยอดนิยม",
    recent: "ดูล่าสุด",
    rising: "กำลังมาแรง",

    // Manual view
    startHere: "เริ่มต้นที่นี่",
    willItWorkOn: "ใช้งานบน {os} ได้ไหม?",
    partsList: "รายการสิ่งที่ต้องเตรียม",
    assemblySteps: "ขั้นตอนการติดตั้ง",
    setupScript: "สคริปต์ติดตั้งอัตโนมัติ",
    installIt: "ติดตั้งโดยตรง",
    stillStuck: "ยังติดปัญหาอยู่? ถาม AI",
    askAiDesc: "เปิดแชทโดยใส่คู่มือนี้สำหรับ {os} ให้พร้อมถามทันที ใช้บัญชีของคุณเอง และ gitmanual ไม่ส่งข้อมูลใดๆ",
    askClaude: "ถาม Claude",
    askChatGpt: "ถาม ChatGPT",
    copyPrompt: "คัดลอกพรอมต์",
    didYouGetRunning: "คุณรันสำเร็จไหม?",
    worked: "ใช้งานได้สำเร็จ",
    stuck: "ติดปัญหา",
    copy: "คัดลอก",
    copied: "คัดลอกแล้ว ✓",
    runAll: "รันทุกขั้นตอนรวดเดียว",
    downloadScript: "ดาวน์โหลดสคริปต์",
    reRead: "วิเคราะห์โปรเจกต์ใหม่",
    viewGithub: "ดูบน GitHub",
    share: "แชร์",
    timeEstimate: "ใช้เวลาประมาณ {time}",
    badge: "ป้ายคู่มือติดตั้ง",

    // Footer
    tagline: "คู่มือการติดตั้งสำหรับโอเพนซอร์ส ในลิงก์ GitHub ใดๆ เปลี่ยน hub เป็น manual",
    skip: "ข้ามไปที่เนื้อหา",
    reportWrong: "รายงานการตั้งค่าที่ผิด ↗",
    hostYourOwn: "โฮสต์ระบบด้วยตัวเอง ↗",
    readmeBadge: "ป้าย Badge สำหรับ README ↗",
    about: "เกี่ยวกับเรา",
    terms: "ข้อกำหนด",
    privacy: "ความเป็นส่วนตัว",
    contact: "ติดต่อเรา",
    disclaimer: "อ่านข้อมูลสาธารณะจาก GitHub โปรดตรวจสอบคำสั่งทุกครั้งก่อนรันในเครื่อง",

    // Language switch
    langName: "ภาษาไทย",
    switchTo: "English",
    toggleLabel: "Switch to English (เปลี่ยนเป็นภาษาอังกฤษ)",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

type I18nContextType = {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "gitmanual_locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "en" || saved === "th") {
        setLocaleState(saved);
        document.documentElement.lang = saved;
      } else {
        // Detect browser language
        const navLang = navigator.language.toLowerCase();
        if (navLang.startsWith("th")) {
          setLocaleState("th");
          document.documentElement.lang = "th";
        }
      }
    } catch {}
  }, []);

  const setLocale = (loc: Locale) => {
    setLocaleState(loc);
    try {
      localStorage.setItem(STORAGE_KEY, loc);
      document.documentElement.lang = loc;
    } catch {}
  };

  const toggleLocale = () => {
    setLocale(locale === "en" ? "th" : "en");
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = translations[locale] || translations.en;
    let text: string = dict[key] ?? translations.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      locale: "en" as Locale,
      setLocale: () => {},
      toggleLocale: () => {},
      t: (key: TranslationKey, params?: Record<string, string | number>) => {
        let text: string = translations.en[key] ?? key;
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            text = text.replaceAll(`{${k}}`, String(v));
          }
        }
        return text;
      },
    };
  }
  return ctx;
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, toggleLocale, t } = useI18n();

  return (
    <button
      type="button"
      className={`nav-lang-btn ${className}`}
      onClick={toggleLocale}
      aria-label={t("toggleLabel")}
      title={t("toggleLabel")}
    >
      <span className="lang-icon" aria-hidden="true">🌐</span>
      <span className="lang-current">{locale === "en" ? "EN" : "TH"}</span>
      <span className="lang-divider" aria-hidden="true">|</span>
      <span className="lang-alt">{locale === "en" ? "ไทย" : "EN"}</span>
    </button>
  );
}

