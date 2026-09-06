import { json, getSessionUser } from "../../../lib/auth.js";

export async function onRequestGet(context) {
  if (!context.env?.DB) return json({ message: "D1 belum terhubung." }, 503);
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ authenticated: false }, 401);
  return json({ authenticated: true, user: { id: user.id, name: user.name, email: user.email, referralCode: user.referral_code, referralBalance: Number(user.referral_balance || 0) } });
}
