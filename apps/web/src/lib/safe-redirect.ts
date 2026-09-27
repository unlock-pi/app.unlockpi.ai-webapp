/**
 * Validates a `redirectTo`-style query param before it's used as a
 * navigation target. Only an internal, single-segment-rooted path
 * ("/dashboard/canvas?tab=notes") is accepted — anything else (a full URL,
 * a protocol-relative "//evil.com", or an empty/missing value) falls back
 * to `fallback`. This is what stops the redirect param from being turned
 * into an open redirect (e.g. `/auth/login?redirectTo=https://evil.com`).
 */
export function getSafeRedirectTarget(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value) return fallback;
  // Must start with exactly one "/" — rejects "//host/path" (protocol-
  // relative, browser treats it as an absolute URL to another origin) and
  // anything with a scheme ("https:/evil.com" without "//" still can't
  // start with a single unescaped "/" followed by another "/").
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
