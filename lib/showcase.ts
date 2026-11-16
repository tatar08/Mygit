export type ShowcaseItem = {
  type: "image" | "gif" | "video";
  src: string;
  alt: string;
  title?: string;
};

// Check if a URL or alt text indicates a status badge, button, or tiny icon
function isBadge(src: string, alt: string): boolean {
  const combined = `${src} ${alt}`.toLowerCase();
  
  if (
    /shields\.io|badgen\.net|codecov\.io|badge\.svg|\/actions\/workflows\/|sonarcloud|snyk\.io|producthunt\.com|vercel\.com\/button|travis-ci|circleci|opencollective\.com\/.*\/badge|gitter\.im|img\.shields/i.test(
      src,
    )
  ) {
    return true;
  }

  if (
    /\b(badge|coverage|build status|npm version|npm package|license|workflow status|github tag|release status|discord|twitter|sponsor)\b/i.test(
      alt,
    ) &&
    !/\b(demo|manual|screen|preview|ui|showcase|app|workflow)\b/i.test(alt)
  ) {
    return true;
  }

  // Tiny logos or icons
  if (/\b(logo\.svg|icon\.svg|favicon|avatar)\b/i.test(src) && !/demo|showcase/i.test(combined)) {
    return true;
  }

  return false;
}

// Convert relative path into raw.githubusercontent.com URL
export function resolveGitHubMediaUrl(
  url: string,
  htmlUrl: string,
  branch: string,
): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (/^\/\//.test(url)) return `https:${url}`;

  const cleanPath = url.replace(/^\.?\//, "");
  const rawBase = htmlUrl.replace("github.com", "raw.githubusercontent.com");
  return `${rawBase}/${branch}/${cleanPath}`;
}

export function extractShowcase(
  readme: string | undefined,
  htmlUrl: string,
  branch: string,
): ShowcaseItem[] {
  if (!readme) return [];

  const items: ShowcaseItem[] = [];
  const seenUrls = new Set<string>();

  const add = (rawSrc: string, alt: string, title?: string) => {
    if (!rawSrc) return;
    const cleanSrc = rawSrc.trim().replace(/^<|>$/g, "").split(/\s+/)[0];
    if (isBadge(cleanSrc, alt)) return;

    const resolved = resolveGitHubMediaUrl(cleanSrc, htmlUrl, branch);
    if (seenUrls.has(resolved)) return;
    seenUrls.add(resolved);

    const isGif = /\.gif(\?.*)?$/i.test(resolved);
    const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(resolved);

    items.push({
      type: isVideo ? "video" : isGif ? "gif" : "image",
      src: resolved,
      alt: alt.trim() || (isVideo ? "Video Demo" : isGif ? "GIF Demo" : "Screenshot"),
      title: title?.trim(),
    });
  };

  // 1. Match Markdown images: ![alt](url "title")
  const mdImgRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["']([^"']*)["'])?\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdImgRegex.exec(readme)) !== null) {
    add(match[2], match[1], match[3]);
  }

  // 2. Match HTML <img> tags
  const htmlImgRegex = /<img\b([^>]+)>/gi;
  while ((match = htmlImgRegex.exec(readme)) !== null) {
    const attrs = match[1];
    const srcMatch = /\bsrc=["']([^"']+)["']/i.exec(attrs);
    const altMatch = /\balt=["']([^"']*)["']/i.exec(attrs);
    const titleMatch = /\btitle=["']([^"']*)["']/i.exec(attrs);
    if (srcMatch) {
      add(srcMatch[1], altMatch ? altMatch[1] : "", titleMatch ? titleMatch[1] : undefined);
    }
  }

  // 3. Match HTML <video> or <source> tags
  const videoRegex = /<(?:video|source)\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  while ((match = videoRegex.exec(readme)) !== null) {
    add(match[1], "Video Demonstration");
  }

  // Cap at 10 items to prevent overwhelming page size
  return items.slice(0, 10);
}

