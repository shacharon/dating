/**
 * Auth test UI is available in local dev, or in any environment when explicitly enabled.
 */
export function isAuthTestPageEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_AUTH_TEST === "1"
  );
}
