/** Preserve the original HashRouter destination beneath the repository Pages base. */
export function originalRoute(route: string): string {
  return /^\/(?!\/)[^\u0000-\u001f\u007f-\u009f\\]*$/.test(route)
    ? `../#${route}`
    : "../#/investigate";
}

/** Validate a source link without normalizing, upgrading or rewriting its citation.
 * This guards the URL scheme/shape only; it makes no claim about the destination.
 */
export function safeSourceUrl(url: string): string | null {
  // URL() repairs some malformed inputs (missing slashes, backslashes and
  // whitespace). Reject those spellings instead of silently changing evidence.
  if (!/^https?:\/\/[^/?#]/iu.test(url)
    || /[\u0000-\u0020\u007f-\u009f\\]/u.test(url)
    || /%(?![\da-f]{2})/iu.test(url)) return null;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.hostname
      ? url
      : null;
  } catch {
    return null;
  }
}
