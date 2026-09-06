import { json, getSessionUser } from "../../../lib/auth.js";

export async function onRequestGet(context) {
  if (!context.env?.DB) return json({ message: "D1 belum terhubung." }, 503);
  const session = await getSessionUser(context.request, context.env);
  if (!session) return json({ message: "Belum login atau sesi sudah berakhir." }, 401);

  let code = await context.env.DB.prepare("SELECT code,balance FROM referral_codes WHERE owner_user_id=?").bind(session.id).first();
  if (!code) {
    const generated = "REF-" + crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
    await context.env.DB.prepare("INSERT OR IGNORE INTO referral_codes(code,owner_user_id) VALUES(?,?)").bind(generated, session.id).run();
    code = await context.env.DB.prepare("SELECT code,balance FROM referral_codes WHERE owner_user_id=?").bind(session.id).first();
  }

  const referrals = await context.env.DB.prepare(`
    SELECT r.id,r.reward,r.status,r.created_at,o.status AS order_status
    FROM referrals r
    LEFT JOIN orders o ON o.id=r.order_id
    WHERE r.referral_code=?
    ORDER BY r.created_at DESC
  `).bind(code.code).all();
  const rows = referrals.results || [];

  return json({
    user: { id: session.id, name: session.name, email: session.email },
    referralCode: code.code,
    balance: Number(code.balance || 0),
    total: rows.length,
    pending: rows.filter(r => r.status === "pending").length,
    earned: rows.filter(r => r.status === "earned" || r.status === "paid").length,
    referrals: rows
  });
}
