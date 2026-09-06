import { json, normalizeEmail, verifyPassword, sessionCookie, sha256 } from "../../../lib/auth.js";

export async function onRequestPost(context) {
  if (!context.env?.DB) return json({ message: "D1 belum terhubung." }, 503);
  let body;
  try { body = await context.request.json(); } catch { return json({ message: "Data JSON tidak valid." }, 400); }
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const user = await context.env.DB.prepare("SELECT id,name,email,password_hash,referral_code,referral_balance FROM users WHERE email=?").bind(email).first();
  if (!user || !(await verifyPassword(password, user.password_hash))) return json({ message: "Email atau password salah." }, 401);

  const token = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = await sha256(token);
  await context.env.DB.prepare("DELETE FROM sessions WHERE user_id=? OR expires_at <= CURRENT_TIMESTAMP").bind(user.id).run();
  await context.env.DB.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at) VALUES (?,?,?,datetime('now','+30 days'))").bind(`ses_${crypto.randomUUID()}`, user.id, tokenHash).run();

  return new Response(JSON.stringify({ ok: true, user: { id: user.id, name: user.name, email: user.email, referralCode: user.referral_code, referralBalance: Number(user.referral_balance || 0) } }), {
    headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": sessionCookie(token) }
  });
}
