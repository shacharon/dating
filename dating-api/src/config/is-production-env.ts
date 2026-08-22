/**
 * Production boot / readiness gate. Only `NODE_ENV=production` (trimmed).
 */
export function isProductionEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV?.trim() === 'production';
}
