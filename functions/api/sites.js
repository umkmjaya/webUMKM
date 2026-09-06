function slugify(value = "") { return String(value).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "website-umkm"; }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=UTF-8" } }); }
export async function onRequestGet(context) { if (!context.env?.DB) return json({ sites: [], message: "D1 belum terhubung." }); const { results } = await context.env.DB.prepare(`SELECT id, slug, business_name, tagline, template_id, package_code, status, custom_domain, created_at FROM sites ORDER BY created_at DESC`).all(); return json({ sites: results || [] }); }
export async function onRequestPost(context) {
  if (!context.env?.DB) return json({ ok: false, message: "D1 belum terhubung. Hubungkan database webumkm di Cloudflare terlebih dahulu." }, 503);
  let body; try { body = await context.request.json(); } catch { return json({ ok: false, message: "Data JSON tidak valid." }, 400); }
  const businessName = String(body.businessName || "").trim(); if (!businessName) return json({ ok: false, message: "Nama usaha wajib diisi." }, 400);
  const slug = slugify(body.slug || businessName); const id = `site_${crypto.randomUUID()}`; const templateId = body.templateId || "tpl_umkm_modern"; const packageCode = body.packageCode || "business";
  try { await context.env.DB.prepare(`INSERT INTO sites (id, slug, business_name, tagline, description, whatsapp, city, address, template_id, package_code, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`).bind(id, slug, businessName, body.tagline || "", body.description || "", body.whatsapp || "", body.city || "", body.address || "", templateId, packageCode).run(); return json({ ok: true, id, slug, url: `/sites/${slug}` }, 201); }
  catch (error) { return json({ ok: false, message: error?.message || "Gagal membuat website." }, 500); }
}
