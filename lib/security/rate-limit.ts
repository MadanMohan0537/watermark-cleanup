type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_TOKENS = 20;

export function getClientKey(headers: Headers) {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "local"
  );
}

export function consumeRateLimit(key: string, cost = 1) {
  const now = Date.now();
  const current = buckets.get(key) ?? { tokens: MAX_TOKENS, updatedAt: now };
  const elapsed = now - current.updatedAt;
  const refill = (elapsed / WINDOW_MS) * MAX_TOKENS;
  const tokens = Math.min(MAX_TOKENS, current.tokens + refill);
  if (tokens < cost) {
    buckets.set(key, { tokens, updatedAt: now });
    return false;
  }
  buckets.set(key, { tokens: tokens - cost, updatedAt: now });
  return true;
}
