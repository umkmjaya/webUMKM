import { json, parseCookies, sha256, clearSessionCookie } from "../../../lib/auth.js";

export async function onRequestPost(context) {
  if (context.env?.DB) {
    const token = parseCookies(context.request).webumkm_session;
    if (token) await context.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": clearSessionCookie() } });
}
