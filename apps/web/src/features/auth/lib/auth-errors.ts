// Supabase throws an AuthApiError (extends Error) for every failed auth call.
// Newer supabase-js versions attach a stable `.code` (e.g. "invalid_credentials");
// older ones only set `.message` to the raw Postgres/GoTrue string. We match on
// both so the mapping keeps working across versions, and fall back to the raw
// message rather than swallowing information we don't have a mapping for.
type SupabaseAuthErrorLike = Error & {
  code?: string;
  status?: number;
};

const ERROR_CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: "That email or password doesn't match our records.",
  email_not_confirmed:
    "Please verify your email before signing in — check your inbox for the confirmation link.",
  user_not_found: "We couldn't find an account with that email.",
  user_already_exists:
    "An account with this email already exists. Try signing in instead.",
  user_banned: "This account has been suspended. Contact support for help.",
  weak_password: "Choose a stronger password (at least 6 characters).",
  email_address_invalid: "That doesn't look like a valid email address.",
  same_password:
    "Your new password must be different from your current password.",
  signup_disabled: "New sign-ups are currently disabled.",
  over_request_rate_limit: "Too many attempts. Wait a moment and try again.",
  over_email_send_rate_limit:
    "Too many attempts. Wait a moment and try again.",
  session_expired: "Your session has expired. Please sign in again.",
};

// Fallbacks for supabase-js versions that don't set `.code` for these — match
// on the substring GoTrue is known to send back.
const RAW_MESSAGE_PATTERNS: Array<{ pattern: RegExp; code: keyof typeof ERROR_CODE_MESSAGES }> = [
  { pattern: /invalid login credentials/i, code: "invalid_credentials" },
  { pattern: /email not confirmed/i, code: "email_not_confirmed" },
  { pattern: /user already registered/i, code: "user_already_exists" },
  { pattern: /email rate limit/i, code: "over_email_send_rate_limit" },
];

const TIMEOUT_PREFIX = "AUTH_TIMEOUT:";
const TIMEOUT_MESSAGE =
  "This is taking longer than expected. Check your connection and try again.";
const NETWORK_MESSAGE =
  "Can't reach the server right now. Check your connection and try again.";

/**
 * Turns a thrown auth error into copy a user can act on, instead of showing
 * raw GoTrue/Postgres text. Falls back to `error.message` (still better than
 * nothing) when the error is unrecognized, then to `fallback`.
 */
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message.startsWith(TIMEOUT_PREFIX)) {
    return TIMEOUT_MESSAGE;
  }

  // TypeError("Failed to fetch") / "Load failed" (Safari) never reach
  // Supabase at all — the request didn't go out.
  if (
    error instanceof TypeError ||
    /failed to fetch|load failed|network/i.test(error.message)
  ) {
    return NETWORK_MESSAGE;
  }

  const code = (error as SupabaseAuthErrorLike).code;
  if (code && ERROR_CODE_MESSAGES[code]) {
    return ERROR_CODE_MESSAGES[code];
  }

  const matched = RAW_MESSAGE_PATTERNS.find(({ pattern }) =>
    pattern.test(error.message),
  );
  if (matched) {
    return ERROR_CODE_MESSAGES[matched.code];
  }

  return error.message || fallback;
}

/**
 * Races a Supabase auth call against a timeout so a stalled network request
 * can't leave the form stuck on "Signing in..." forever — it surfaces as a
 * normal, retryable error instead.
 */
export function withAuthTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${TIMEOUT_PREFIX} timed out after ${ms}ms`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
