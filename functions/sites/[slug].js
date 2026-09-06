const FALLBACK = {
  "kedai-nusantara": {
    slug: "kedai-nusantara",
    template: "umkm-modern",
    status: "active",
    site: {
      name: "Kedai Nusantara",
      tagline: "Rasa Lokal, Kualitas Maksimal",
      description: "Tempat menikmati makanan dan minuman khas Nusantara dengan bahan pilihan dan rasa yang dibuat sepenuh hati.",
      whatsapp: "6281234567890",
      city: "Gombong",
      address: "Jl. Raya Gombong No. 10, Kebumen",
      hours: "Setiap hari, 08.00 - 21.00"
    }
  }
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getSite(context) {
  const slug = context.params.slug;
  if (context.env?.DB) {
    const row = await context.env.DB.prepare(`
      SELECT slug, business_name, tagline, description, whatsapp, city, address, status
      FROM sites WHERE slug = ? LIMIT 1
    `).bind(slug).first();
    if (row) {
      return {
        slug: row.slug,
        status: row.status,
        site: {
          name: row.business_name,
          tagline: row.tagline || "",
          description: row.description || "",
          whatsapp: row.whatsapp || "",
          city: row.city || "",
          address: row.address || "",
          hours: "Hubungi kami untuk jam operasional terbaru."
        }
      };
    }
  }
  return FALLBACK[slug] || null;
}

export async function onRequestGet(context) {
  let site;
  try {
    site = await getSite(context);
  } catch (error) {
    site = FALLBACK[context.params.slug] || null;
  }

  if (!site || site.status !== "active") {
    return new Response("Website tidak ditemukan", { status: 404 });
  }

  const data = site.site;
  const wa = `https://wa.me/${encodeURIComponent(data.whatsapp)}`;
  const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(data.name)} — ${escapeHtml(data.tagline)}</title>
  <meta name="description" content="${escapeHtml(data.description)}">
  <style>
    :root{--primary:#171717;--accent:#d97706;--bg:#f7f5f1;--card:#fff;--muted:#6b6b6b;--line:#e7e2da}
    *{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:var(--bg);color:var(--primary);line-height:1.6}
    .wrap{max-width:1080px;margin:auto;padding:0 24px}.nav{display:flex;justify-content:space-between;align-items:center;padding:24px 0;border-bottom:1px solid var(--line)}
    .logo{font-weight:800;font-size:20px}.btn{display:inline-block;padding:13px 20px;border-radius:10px;background:var(--primary);color:#fff;text-decoration:none;font-weight:700}
    .hero{padding:90px 0 70px;display:grid;grid-template-columns:1.2fr .8fr;gap:50px;align-items:center}.eyebrow{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:13px}
    h1{font-size:clamp(44px,7vw,78px);line-height:1.02;margin:14px 0}.lead{font-size:20px;color:var(--muted);max-width:650px}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.secondary{background:#fff;color:var(--primary);border:1px solid var(--line)}
    .visual{min-height:360px;border-radius:28px;background:linear-gradient(135deg,#ead8bd,#f6eee2);display:flex;align-items:center;justify-content:center;font-size:80px}
    section{padding:65px 0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card{background:var(--card);padding:25px;border:1px solid var(--line);border-radius:18px}.card h3{margin-top:0}.contact{background:var(--primary);color:#fff;border-radius:26px;padding:45px}.muted{color:var(--muted)}footer{padding:35px 0;color:var(--muted);border-top:1px solid var(--line)}
    @media(max-width:800px){.hero{grid-template-columns:1fr;padding-top:55px}.grid{grid-template-columns:1fr}.visual{min-height:250px}}
  </style>
</head>
<body><div class="wrap">
<nav class="nav"><div class="logo">${escapeHtml(data.name)}</div><a class="btn" href="${wa}" target="_blank" rel="noopener">WhatsApp</a></nav>
<main>
<section class="hero"><div><div class="eyebrow">${escapeHtml(data.city)}</div><h1>${escapeHtml(data.tagline)}</h1><p class="lead">${escapeHtml(data.description)}</p><div class="actions"><a class="btn" href="${wa}" target="_blank" rel="noopener">Pesan Sekarang</a><a class="btn secondary" href="#tentang">Tentang Kami</a></div></div><div class="visual">🍜</div></section>
<section id="tentang"><div class="eyebrow">Tentang Kami</div><h2>${escapeHtml(data.name)}</h2><p class="lead">${escapeHtml(data.description)}</p></section>
<section><div class="eyebrow">Informasi</div><div class="grid"><div class="card"><h3>📍 Alamat</h3><p>${escapeHtml(data.address)}</p></div><div class="card"><h3>🕐 Jam Buka</h3><p>${escapeHtml(data.hours)}</p></div><div class="card"><h3>💬 WhatsApp</h3><p>Hubungi kami untuk pemesanan dan informasi.</p><a class="btn" href="${wa}" target="_blank" rel="noopener">Chat Sekarang</a></div></div></section>
<section><div class="contact"><div class="eyebrow">Siap melayani</div><h2>Butuh informasi atau ingin pesan?</h2><p>Hubungi ${escapeHtml(data.name)} melalui WhatsApp.</p><a class="btn" href="${wa}" target="_blank" rel="noopener">Hubungi via WhatsApp</a></div></section>
</main><footer>© ${new Date().getFullYear()} ${escapeHtml(data.name)}. Dibuat dengan webUMKM.</footer>
</div></body></html>`;
  return new Response(html,{headers:{"content-type":"text/html; charset=UTF-8"}});
}
