export function isProductAnalyticsEnabled(): boolean {
  const v = process.env.PRODUCT_ANALYTICS_ENABLED?.trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') {
    return false;
  }
  return true;
}
