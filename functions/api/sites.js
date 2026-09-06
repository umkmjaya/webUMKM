import { json, getSessionUser } from "../../lib/auth.js";

function slugify(value = "") {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "website-umkm";
}

export async function onRequestGet(context) {
  if (!context.env?.DB) return json({ sites: [], message: "D1 belum terhubung." }, 503);
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ sites: [], message: "Belum login." }, 401);
  const { results } = await context.env.DB.prepare(`
    SELECT id, slug, business_name, tagline, template_id, package_code, status, custom_domain, created_at
    FROM sites WHERE owner_id=? ORDER BY created_at DESC
  `).bind(user.id).all();
  return json({ sites: results || [] });
}

export async function onRequestPost(context) {
  if (!context.env?.DB) return json({ ok: false, message: "D1 belum terhubung. Hubungkan database webumkm di Cloudflare terlebih dahulu." }, 503);
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ ok: false, message: "Silakan login terlebih dahulu." }, 401);

  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Data JSON tidak valid." }, 400); }
  const businessName = String(body.businessName || "").trim();
  if (!businessName) return json({ ok: false, message: "Nama usaha wajib diisi." }, 400);

  const slug = slugify(body.slug || businessName);
  const id = `site_${crypto.randomUUID()}`;
  const templateId = body.templateId || "tpl_umkm_modern";
  const packageCode = body.packageCode || "business";
  const content = body.content && typeof body.content === "object" ? JSON.stringify(body.content) : "{}";

  try {
    await context.env.DB.prepare(`
      INSERT INTO sites (id, slug, business_name, tagline, description, whatsapp, city, address, content_json, template_id, package_code, status, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).bind(id, slug, businessName, body.tagline || "", body.description || "", body.whatsapp || "", body.city || "", body.address || "", content, templateId, packageCode, user.id).run();
    return json({ ok: true, id, slug, url: `/sites/${slug}` }, 201);
  } catch (error) {
    return json({ ok: false, message: error?.message || "Gagal membuat website." }, 500);
  }
}

export async function onRequestPatch(context) {
  if (!context.env?.DB) return json({ ok: false, message: "D1 belum terhubung." }, 503);
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ ok: false, message: "Silakan login terlebih dahulu." }, 401);

  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false, message: "Data JSON tidak valid." }, 400); }
  const siteId = String(body.siteId || "").trim();
  if (!siteId) return json({ ok: false, message: "siteId wajib diisi." }, 400);
  const site = await context.env.DB.prepare("SELECT id FROM sites WHERE id=? AND owner_id=? LIMIT 1").bind(siteId, user.id).first();
  if (!site) return json({ ok: false, message: "Website tidak ditemukan atau bukan milik akun ini." }, 404);

  const allowed = ["aboutTitle","aboutText","ctaTitle","brandColor","logo","heroImage","products","productImages"];
  const current = await context.env.DB.prepare("SELECT content_json FROM sites WHERE id=? LIMIT 1").bind(siteId).first();
  let content = {};
  try { content = JSON.parse(current?.content_json || "{}"); } catch {}
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(body, key)) content[key] = body[key];

  await context.env.DB.prepare("UPDATE sites SET content_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_id=?").bind(JSON.stringify(content), siteId, user.id).run();
  return json({ ok: true, siteId, content });
}
