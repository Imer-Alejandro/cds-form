type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

const CHECK_INTERVAL = 60 * 1000; // 1 minute

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

setInterval(cleanup, CHECK_INTERVAL).unref?.();

/**
 * Simple in-memory rate limiter (single-instance friendly).
 * Returns true when the request is allowed, false when it exceeds the limit.
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= max) {
    return false;
  }

  existing.count += 1;
  return true;
}

/**
 * Builds a rate-limit key from an IP address (or a custom segment).
 */
export function ipKey(ip: string, action: string) {
  return `${action}:${ip}`;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}