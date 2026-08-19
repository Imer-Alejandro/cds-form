const SECRET = process.env.AUTH_SECRET || "replace_this_with_strong_secret";

function toBase64UrlFromBytes(bytes: Uint8Array) {
  // base64
  let base64 = "";
  if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(bytes).toString("base64");
  } else {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    base64 = typeof btoa !== "undefined" ? btoa(binary) : "";
  }
  return base64.replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64UrlToBytes(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(str, "base64"));
  }
  const binary = typeof atob !== "undefined" ? atob(str) : "";
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSha256(key: string, data: string): Promise<Uint8Array> {
  if (typeof globalThis?.crypto?.subtle !== "undefined") {
    const enc = new TextEncoder();
    const keyData = enc.encode(key);
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
    return new Uint8Array(sig);
  }

  throw new Error("Web Crypto API is required for HMAC-SHA256 signing.");
}

function constantTimeCompare(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

export async function hashPassword(password: string) {
  const crypto = await import("crypto");
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return `${salt}:${derived}`;
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;
  const [salt, expectedHash] = storedHash.split(":");
  if (!salt || !expectedHash) return false;

  const crypto = await import("crypto");
  const derived = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(derived));
}

export async function signJWT(payload: Record<string, any>, expiresInSec = 60 * 60 * 24 * 7) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };

  const headerB = toBase64UrlFromBytes(new TextEncoder().encode(JSON.stringify(header)));
  const bodyB = toBase64UrlFromBytes(new TextEncoder().encode(JSON.stringify(body)));
  const sigBytes = await hmacSha256(SECRET, `${headerB}.${bodyB}`);
  const sigB = toBase64UrlFromBytes(sigBytes);

  return `${headerB}.${bodyB}.${sigB}`;
}

export async function verifyJWT(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB, bodyB, sigB] = parts;
    const expectedBytes = await hmacSha256(SECRET, `${headerB}.${bodyB}`);

    const sigBytes = fromBase64UrlToBytes(sigB);
    if (!constantTimeCompare(sigBytes, expectedBytes)) return null;

    const bodyBytes = fromBase64UrlToBytes(bodyB);
    const bodyStr = new TextDecoder().decode(bodyBytes);
    const body = JSON.parse(bodyStr);
    const now = Math.floor(Date.now() / 1000);
    if (body.exp && now > body.exp) return null;
    return body;
  } catch (e) {
    return null;
  }
}

export async function getSessionFromToken(token?: string) {
  if (!token) return null;
  return verifyJWT(token);
}

export function buildSurveyAccessFilter(session: Record<string, any> | null) {
  if (!session) {
    return { id: "__no_access__" };
  }

  // Each user only sees the surveys they created
  return { createdBy: session.userId };
}

export function canViewSurvey(session: Record<string, any> | null, survey: any) {
  if (!survey) return false;
  if (survey.isPublished) return true;
  if (!session) return false;
  return survey.createdBy === session.userId;
}

export function canManageSurvey(session: Record<string, any> | null, survey: any) {
  if (!survey || !session) return false;
  return survey.createdBy === session.userId;
}

// Magic link helpers (short-lived tokens)
export async function generateMagicToken(payload: Record<string, any>, ttlSec = 60 * 15) {
  return signJWT(payload, ttlSec);
}

export async function verifyMagicToken(token: string) {
  return verifyJWT(token);
}
