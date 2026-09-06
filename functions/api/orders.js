import { getSessionUser } from "../../lib/auth.js";

const PACKAGES={starter:15000,growth:25000,business:45000,pro:85000};
const json=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
const clean=(v,max=160)=>String(v||"").trim().slice(0,max);

async function hmacSha256(text,key){
  const cryptoKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=await crypto.subtle.sign("HMAC",cryptoKey,new TextEncoder().encode(text));
  return [...new Uint8Array(signature)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

async function createDuitkuPayment(env,order,site,user,request){
  if(!env.DUITKU_MERCHANT_CODE||!env.DUITKU_API_KEY)return null;
  const merchantCode=env.DUITKU_MERCHANT_CODE;
  const apiKey=env.DUITKU_API_KEY;
  const timestamp=Date.now().toString();
  const signature=await hmacSha256(`${merchantCode}${timestamp}`,apiKey);
  const origin=new URL(request.url).origin;
  const callbackUrl=env.DUITKU_CALLBACK_URL||`${origin}/api/payment/webhook`;
  const returnUrl=env.PAYMENT_FINISH_URL||`${origin}/admin/dashboard.html?payment=duitku`;
  const customerName=clean(order.customerName||site.business_name,120);
  const parts=customerName.split(/\s+/);
  const firstName=parts.shift()||"Pelanggan";
  const lastName=parts.join(" ")||"UMKM";
  const payload={
    paymentAmount:order.amount,
    merchantOrderId:order.id,
    productDetails:`Website UMKM ${order.packageCode}`,
    additionalParam:"",
    merchantUserInfo:user.email,
    paymentMethod:"",
    customerVaName:customerName.slice(0,20),
    email:user.email,
    phoneNumber:order.customerPhone||"",
    itemDetails:[{name:`Website UMKM ${order.packageCode}`,price:order.amount,quantity:1}],
    customerDetail:{
      firstName,
      lastName,
      email:user.email,
      phoneNumber:order.customerPhone||"",
      merchantCustomerId:user.id
    },
    callbackUrl,
    returnUrl,
    expiryPeriod:60
  };
  const base=env.DUITKU_IS_PRODUCTION==="true"?"https://api-prod.duitku.com":"https://api-sandbox.duitku.com";
  const r=await fetch(`${base}/api/merchant/createInvoice`,{method:"POST",headers:{"content-type":"application/json","x-duitku-signature":signature,"x-duitku-timestamp":timestamp,"x-duitku-merchantcode":merchantCode},body:JSON.stringify(payload)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||String(data.statusCode||"")!=="00")throw new Error(data.statusMessage||"Gagal membuat pembayaran Duitku");
  return data;
}

export async function onRequestPost(context){
  if(!context.env?.DB)return json({message:"D1 belum terhubung."},503);
  const user=await getSessionUser(context.request,context.env);
  if(!user)return json({message:"Silakan login terlebih dahulu."},401);
  let body;try{body=await context.request.json()}catch{return json({message:"JSON tidak valid."},400)}
  const slug=clean(body.slug,80).toLowerCase().replace(/[^a-z0-9-]/g,"");
  const packageCode=clean(body.packageCode,20).toLowerCase();
  if(!slug||!PACKAGES[packageCode])return json({message:"Website dan paket wajib dipilih."},400);
  const site=await context.env.DB.prepare("SELECT id,business_name,owner_id FROM sites WHERE slug=? AND owner_id=? LIMIT 1").bind(slug,user.id).first();
  if(!site)return json({message:"Website tidak ditemukan atau bukan milik akun ini."},404);
  const id=`order_${crypto.randomUUID()}`;
  const referralCode=clean(body.referralCode,80).toUpperCase();
  if(referralCode){
    const ref=await context.env.DB.prepare("SELECT code,owner_user_id FROM referral_codes WHERE code=? LIMIT 1").bind(referralCode).first();
    if(!ref)return json({message:"Kode referral tidak ditemukan."},400);
    if(ref.owner_user_id===user.id)return json({message:"Kode referral milik sendiri tidak dapat digunakan."},400);
  }
  const customerName=clean(body.customerName,120),customerPhone=clean(body.customerPhone,30);
  const amount=PACKAGES[packageCode];
  await context.env.DB.prepare(`INSERT INTO orders (id,site_id,package_code,amount,customer_name,customer_phone,referral_code,status) VALUES (?,?,?,?,?,?,?,'pending')`).bind(id,site.id,packageCode,amount,customerName,customerPhone,referralCode||null).run();
  if(referralCode){await context.env.DB.prepare(`INSERT INTO referrals (id,referral_code,referred_site_id,order_id,reward,status) VALUES (?,?,?,?,25000,'pending')`).bind(`ref_${crypto.randomUUID()}`,referralCode,site.id,id).run();}
  try{
    const payment=await createDuitkuPayment(context.env,{id,amount,customerName,customerPhone,packageCode},site,user,context.request);
    if(payment){
      await context.env.DB.prepare(`UPDATE orders SET payment_provider='duitku',payment_reference=?,payment_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(payment.reference||null,payment.paymentUrl||null,id).run();
      return json({ok:true,orderId:id,amount,status:"pending",paymentProvider:"duitku",paymentReference:payment.reference||null,paymentUrl:payment.paymentUrl||null,message:"Order berhasil dibuat. Lanjutkan pembayaran di Duitku."},201);
    }
  }catch(error){await context.env.DB.prepare(`UPDATE orders SET status='payment_error',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(id).run();return json({message:error.message,orderId:id},502)}
  return json({ok:true,orderId:id,amount,status:"pending",paymentProvider:null,message:"Order tersimpan. Tambahkan DUITKU_MERCHANT_CODE dan DUITKU_API_KEY untuk pembayaran otomatis."},201);
}

export async function onRequestGet(context){
  if(!context.env?.DB)return json({orders:[],message:"D1 belum terhubung."},503);
  const user=await getSessionUser(context.request,context.env);if(!user)return json({orders:[],message:"Belum login."},401);
  const slug=clean(new URL(context.request.url).searchParams.get("slug"),80);if(!slug)return json({orders:[]});
  const rows=await context.env.DB.prepare(`SELECT o.id,o.package_code,o.amount,o.customer_name,o.customer_phone,o.referral_code,o.payment_provider,o.payment_url,o.status,o.paid_at,o.created_at FROM orders o JOIN sites s ON s.id=o.site_id WHERE s.slug=? AND s.owner_id=? ORDER BY o.created_at DESC`).bind(slug,user.id).all();
  return json({orders:rows.results||[]});
}
