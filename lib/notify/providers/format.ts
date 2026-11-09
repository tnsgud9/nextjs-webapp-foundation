import "server-only";

/** Shortens text to at most `limit` characters, ending in an ellipsis when it was cut. */
export function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

/**
 * Escapes text, then shortens it to at most `limit` characters, ending in an ellipsis when it was
 * cut. `escape` works character by character, so the text is cut between characters and an escape
 * sequence is never split.
 */
export function escapeWithin(text: string, limit: number, escape: (raw: string) => string): string {
  const escaped = escape(text);
  if (escaped.length <= limit) return escaped;
  let kept = "";
  for (const char of text) {
    const next = escape(char);
    if (kept.length + next.length > limit - 1) break;
    kept += next;
  }
  return `${kept}…`;
}

/** The URL when it is an absolute `http(s)` URL, otherwise undefined. */
export function webUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}
