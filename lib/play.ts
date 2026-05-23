/**
 * Helpers for validating play_url + play_prefix together.
 * Both must describe the SAME slug; otherwise a malicious or buggy client
 * could point the play link at one slug while pinning the cleanup prefix
 * to another (we delete by prefix on DELETE — wrong slug = data loss).
 */

const PLAY_URL_RE = /^\/play\/([0-9a-f]{16})\/index\.html$/i;
const PLAY_PREFIX_RE = /^play\/([0-9a-f]{16})\/$/i;

export function playUrlSlug(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.match(PLAY_URL_RE);
  return m ? m[1].toLowerCase() : null;
}

export function playPrefixSlug(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.match(PLAY_PREFIX_RE);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Returns { playUrl, playPrefix } in canonical (lowercase slug) form if both
 * validate AND their slugs match. Returns null otherwise. Pass any pair of
 * values; this is the single source of truth for accepting them.
 */
export function validatePlayPair(
  playUrl: unknown,
  playPrefix: unknown,
): { playUrl: string; playPrefix: string; slug: string } | null {
  const a = playUrlSlug(playUrl);
  const b = playPrefixSlug(playPrefix);
  if (!a || !b || a !== b) return null;
  return {
    playUrl: `/play/${a}/index.html`,
    playPrefix: `play/${a}/`,
    slug: a,
  };
}
