import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { ContactButton, LaunchBanner, Logo, NavLinks, SiteFooter } from "./ui";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3035";
const DESCRIPTION =
  "Paste any GitHub link and get its setup manual: will it work on your device, what you need, and the exact steps for macOS, Windows or Linux.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "gitmanual: setup manuals for open source",
    template: "%s · gitmanual",
  },
  description: DESCRIPTION,
  applicationName: "gitmanual",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "gitmanual",
    title: "gitmanual: setup manuals for open source",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "gitmanual: setup manuals for open source",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = { themeColor: "#f2f3f5" };

// gitmanual's own open-source repo, e.g. https://github.com/you/gitmanual. The menu's GitHub link appears once it's set.
const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || null;
// Optional: the browser extension's store page, linked from the footer and the home page.
const EXTENSION_URL = process.env.NEXT_CHROME_EXTENSION_URL || null;
const PRO =
  process.env.PRO_ENABLED === "on" && Boolean(process.env.STRIPE_SECRET_KEY);
// Optional: a ShareText form for "Contact" in the footer (only https links are used).
// Optional: the Product Hunt launch page, shown in a strip above the menu while it's set (only producthunt.com links).
const LAUNCH_URL = /^https:\/\/(www\.)?producthunt\.com\/[^\s"]+$/.test(
  process.env.PRODUCT_HUNT_URL ?? "",
)
  ? process.env.PRODUCT_HUNT_URL!
  : null;
const CONTACT_FORM = /^https:\/\/[^\s"]+$/.test(
  process.env.CONTACT_FORM_URL ?? "",
)
  ? process.env.CONTACT_FORM_URL!
  : null;

async function repoStars(): Promise<number | null> {
  const m = REPO_URL?.match(/github\.com\/([\w.-]+\/[\w.-]+)/);
  if (!m) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${m[1]}`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
      next: { revalidate: 3600 },
    });
    return res.ok ? ((await res.json()).stargazers_count as number) : null;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const repo = REPO_URL?.replace(/\/$/, "") ?? null;
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <LanguageProvider>
          <a className="skip" href="#main">
            Skip to content
          </a>
          {LAUNCH_URL && <LaunchBanner url={LAUNCH_URL} />}
          <header className="nav">
            <div className="wrap nav-inner">
              <Link className="wordmark" href="/">
                <Logo />
                gitmanual
              </Link>
              <NavLinks
                repo={REPO_URL}
                stars={await repoStars()}
                extension={EXTENSION_URL}
              />
            </div>
          </header>
          <main id="main">{children}</main>
          <SiteFooter
            repo={repo}
            contactForm={CONTACT_FORM}
            pro={PRO}
            extension={EXTENSION_URL}
          />
        </LanguageProvider>
        {/* Cookie-free page views, sent only from a Vercel deployment with Analytics turned on. */}
        <Analytics />
      </body>
    </html>
  );
}
