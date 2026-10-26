/** Only allow same-site relative redirects into the app (no "//evil.com", no schemes). */
export function safeNext(value: string | null | undefined, fallback = "/app"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (!/^\/(app|onboarding)(\/|\?|$)/.test(value)) return fallback;
  return value;
}
