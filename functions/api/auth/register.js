import { json, normalizeEmail, cleanName, makeReferralCode, hashPassword, sessionCookie, sha256 } from "../../../lib/auth.js";

export async function onRequestPost(context) {
  if (!context.env?.DB) return json({ message: "D1 belum terhubung." }, 503);
  let body;
  try { body = await context.request.json(); } catch { return json({ message: "Data JSON tidak valid." }, 400); }

  const name = cleanName(body.name);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  if (name.length < 2) return json({ message: "Nama minimal 2 karakter." }, 400);
  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ message: "Email tidak valid." }, 400);
  if (password.length < 8) return json({ message: "Password minimal 8 karakter." }, 400);

  const exists = await context.env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
  if (exists) return json({ message: "Email sudah terdaftar." }, 409);

  let referralCode = makeReferralCode(name);
  for (let i = 0; i < 5; i++) {
    const taken = await context.env.DB.prepare("SELECT id FROM users WHERE referral_code=?").bind(referralCode).first();
    if (!taken) break;
    referralCode = makeReferralCode(name);
  }

  const userId = `usr_${crypto.randomUUID()}`;
  const passwordHash = await hashPassword(password);
  await context.env.DB.prepare("INSERT INTO users (id,name,email,password_hash,referral_code) VALUES (?,?,?,?,?)").bind(userId, name, email, passwordHash, referralCode).run();

  const token = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = await sha256(token);
  await context.env.DB.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at) VALUES (?,?,?,datetime('now','+30 days'))").bind(`ses_${crypto.randomUUID()}`, userId, tokenHash).run();

  return new Response(JSON.stringify({ ok: true, user: { id: userId, name, email, referralCode } }), {
    status: 201,
    headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": sessionCookie(token) }
  });
}
