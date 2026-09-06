const PACKAGES={starter:15000,growth:25000,business:45000,pro:85000};
const json=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
const clean=(v,max=160)=>String(v||"").trim().slice(0,max);
export async function onRequestPost(context){
  if(!context.env?.DB)return json({message:"D1 belum terhubung."},503);
  let body;try{body=await context.request.json()}catch{return json({message:"JSON tidak valid."},400)}
  const slug=clean(body.slug,80).toLowerCase().replace(/[^a-z0-9-]/g,"");
  const packageCode=clean(body.packageCode,20).toLowerCase();
  if(!slug||!PACKAGES[packageCode])return json({message:"Website dan paket wajib dipilih."},400);
  const site=await context.env.DB.prepare("SELECT id,business_name FROM sites WHERE slug=? LIMIT 1").bind(slug).first();
  if(!site)return json({message:"Website belum ditemukan."},404);
  const id=`order_${crypto.randomUUID()}`;
  const referralCode=clean(body.referralCode,80);
  const customerName=clean(body.customerName,120),customerPhone=clean(body.customerPhone,30);
  await context.env.DB.prepare(`INSERT INTO orders (id,site_id,package_code,amount,customer_name,customer_phone,referral_code,status) VALUES (?,?,?,?,?,?,?,'pending')`).bind(id,site.id,packageCode,PACKAGES[packageCode],customerName,customerPhone,referralCode||null).run();
  if(referralCode){
    await context.env.DB.prepare(`INSERT INTO referrals (id,referral_code,referred_site_id,order_id,reward,status) VALUES (?,?,?,?,25000,'pending')`).bind(`ref_${crypto.randomUUID()}`,referralCode,site.id,id).run();
  }
  return json({ok:true,orderId:id,amount:PACKAGES[packageCode],status:"pending",message:"Order berhasil dibuat. Menunggu pembayaran."},201);
}

export async function onRequestGet(context){
  if(!context.env?.DB)return json({orders:[],message:"D1 belum terhubung."},503);
  const slug=clean(new URL(context.request.url).searchParams.get("slug"),80);
  if(!slug)return json({orders:[]});
  const rows=await context.env.DB.prepare(`SELECT o.id,o.package_code,o.amount,o.customer_name,o.customer_phone,o.referral_code,o.status,o.created_at FROM orders o JOIN sites s ON s.id=o.site_id WHERE s.slug=? ORDER BY o.created_at DESC`).bind(slug).all();
  return json({orders:rows.results||[]});
}
