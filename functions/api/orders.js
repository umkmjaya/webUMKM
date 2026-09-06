import { getSessionUser } from "../../lib/auth.js";

const PACKAGES={starter:15000,growth:25000,business:45000,pro:85000};
const json=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
const clean=(v,max=160)=>String(v||"").trim().slice(0,max);

async function createLouvinPayment(env,order,site,user,request){
  if(!env.LOUVIN_API_KEY)return null;
  const origin=new URL(request.url).origin;
  const payload={amount:order.amount,payment_type:"qris",customer_name:clean(order.customerName||site.business_name,120),customer_email:user.email,description:`Website UMKM ${order.packageCode}`,reference:order.id,source_url:origin};
  const r=await fetch("https://api.louvin.dev/create-transaction",{method:"POST",headers:{"content-type":"application/json","x-api-key":env.LOUVIN_API_KEY},body:JSON.stringify(payload)});
  const data=await r.json().catch(()=>({}));if(!r.ok||!data.success)throw new Error(data.error||data.message||"Gagal membuat pembayaran Louvin");return data;
}

export async function onRequestPost(context){
  if(!context.env?.DB)return json({message:"D1 belum terhubung."},503);const user=await getSessionUser(context.request,context.env);if(!user)return json({message:"Silakan login terlebih dahulu."},401);
  let body;try{body=await context.request.json()}catch{return json({message:"JSON tidak valid."},400)}
  const slug=clean(body.slug,80).toLowerCase().replace(/[^a-z0-9-]/g,"");const packageCode=clean(body.packageCode,20).toLowerCase();if(!slug||!PACKAGES[packageCode])return json({message:"Website dan paket wajib dipilih."},400);
  const site=await context.env.DB.prepare("SELECT id,business_name,owner_id FROM sites WHERE slug=? AND owner_id=? LIMIT 1").bind(slug,user.id).first();if(!site)return json({message:"Website tidak ditemukan atau bukan milik akun ini."},404);
  const id=`order_${crypto.randomUUID()}`;const referralCode=clean(body.referralCode,80).toUpperCase();
  if(referralCode){const ref=await context.env.DB.prepare("SELECT code,owner_user_id FROM referral_codes WHERE code=? LIMIT 1").bind(referralCode).first();if(!ref)return json({message:"Kode referral tidak ditemukan."},400);if(ref.owner_user_id===user.id)return json({message:"Kode referral milik sendiri tidak dapat digunakan."},400)}
  const customerName=clean(body.customerName,120),customerPhone=clean(body.customerPhone,30),amount=PACKAGES[packageCode];
  await context.env.DB.prepare(`INSERT INTO orders (id,site_id,package_code,amount,customer_name,customer_phone,referral_code,status) VALUES (?,?,?,?,?,?,?,'pending')`).bind(id,site.id,packageCode,amount,customerName,customerPhone,referralCode||null).run();
  if(referralCode)await context.env.DB.prepare(`INSERT INTO referrals (id,referral_code,referred_site_id,order_id,reward,status) VALUES (?,?,?,?,25000,'pending')`).bind(`ref_${crypto.randomUUID()}`,referralCode,site.id,id).run();
  try{
    const payment=await createLouvinPayment(context.env,{id,amount,customerName,customerPhone,packageCode},site,user,context.request);
    if(payment){const transaction=payment.transaction||{},pay=payment.payment||{};const paymentPage=`/admin/payment.html?slug=${encodeURIComponent(slug)}&order=${encodeURIComponent(id)}`;await context.env.DB.prepare(`UPDATE orders SET payment_provider='louvin',payment_reference=?,payment_url=?,payment_qr=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(transaction.id||null,paymentPage,pay.qr_string||pay.payment_number||null,id).run();return json({ok:true,orderId:id,amount,status:"pending",paymentProvider:"louvin",paymentReference:transaction.id||null,paymentUrl:paymentPage,paymentQrString:pay.qr_string||null,paymentNumber:pay.payment_number||null,totalPayment:pay.total_payment||transaction.amount||amount,expiredAt:pay.expired_at||null,message:"Order berhasil dibuat. Silakan bayar menggunakan QRIS."},201)}
  }catch(error){await context.env.DB.prepare(`UPDATE orders SET status='payment_error',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(id).run();return json({message:error.message,orderId:id},502)}
  return json({ok:true,orderId:id,amount,status:"pending",paymentProvider:null,message:"Order tersimpan. Tambahkan LOUVIN_API_KEY di Cloudflare untuk mengaktifkan pembayaran."},201);
}

export async function onRequestGet(context){
  if(!context.env?.DB)return json({orders:[],message:"D1 belum terhubung."},503);const user=await getSessionUser(context.request,context.env);if(!user)return json({orders:[],message:"Belum login."},401);const slug=clean(new URL(context.request.url).searchParams.get("slug"),80);if(!slug)return json({orders:[]});
  const rows=await context.env.DB.prepare(`SELECT o.id,o.package_code,o.amount,o.customer_name,o.customer_phone,o.referral_code,o.payment_provider,o.payment_reference,o.payment_url,o.payment_qr,o.status,o.paid_at,o.created_at FROM orders o JOIN sites s ON s.id=o.site_id WHERE s.slug=? AND s.owner_id=? ORDER BY o.created_at DESC`).bind(slug,user.id).all();return json({orders:rows.results||[]});
}
