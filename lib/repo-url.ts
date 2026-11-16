export type RepoRef = { owner: string; repo: string; ref?: string };

// Accepts "owner/repo", "github.com/owner/repo", full URLs, .git suffixes and /tree/<branch> paths.
export function parseRepoUrl(input: string): RepoRef | null {
  let s = input.trim();
  s = s.replace(/^git@github\.com:/, "github.com/");
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (s.startsWith("github.com/")) s = s.slice("github.com/".length);
  const parts = s.split(/[/?#]/).filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
  const ref = parts[2] === "tree" && parts[3] ? parts[3] : undefined;
  return { owner, repo, ref };
}

