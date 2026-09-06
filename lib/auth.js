const enc = new TextEncoder();

export function json(data, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 160);
}

export function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 100);
}

export function makeReferralCode(name = "UMKM") {
  const base = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "UMKM";
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `${base}${random}`;
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function hashPassword(password, saltHex = null) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return `${bytesToHex(salt)}:${bytesToHex(bits)}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, expected] = String(stored || "").split(":");
  if (!saltHex || !expected) return false;
  const actual = await hashPassword(password, saltHex);
  return actual.split(":")[1] === expected;
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return bytesToHex(digest);
}

export function parseCookies(request) {
  const raw = request.headers.get("cookie") || "";
  const cookies = {};
  raw.split(";").forEach(part => {
    const i = part.indexOf("=");
    if (i > -1) cookies[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return cookies;
}

export async function getSessionUser(request, env) {
  if (!env?.DB) return null;
  const token = parseCookies(request).webumkm_session;
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`SELECT u.id,u.name,u.email,u.referral_code,u.referral_balance FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > CURRENT_TIMESTAMP`).bind(tokenHash).first();
  return row || null;
}

export function sessionCookie(token, maxAge = 60 * 60 * 24 * 30) {
  return `webumkm_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return "webumkm_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";
}
