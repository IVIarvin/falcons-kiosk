export function canonicalUrl(env: Record<string, string | undefined> = process.env): string {
  const value =
    env.PUBLIC_APP_URL?.trim() ||
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
      return '';
    return url.href;
  } catch {
    return '';
  }
}
