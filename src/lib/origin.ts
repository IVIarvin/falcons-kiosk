export function sameOrigin(origin: string | null, requestUrl: string, host: string | null) {
  if (!origin) return false;
  try {
    const url = new URL(requestUrl);
    const expected = new URL(`${url.protocol}//${host ?? url.host}`).origin;
    return new URL(origin).origin === expected && origin === expected;
  } catch {
    return false;
  }
}
