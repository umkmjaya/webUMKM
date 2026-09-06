const json=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});

async function hmacSha256(text,key){
  const cryptoKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=await crypto.subtle.sign("HMAC",cryptoKey,new TextEncoder().encode(text));
  return [...new Uint8Array(signature)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

export async function onRequestPost(context){
  if(!context.env?.DB)return json({message:"D1 belum terhubung."},503);
  if(!context.env.DUITKU_API_KEY)return json({message:"DUITKU_API_KEY belum dikonfigurasi."},503);
  let body={};
  const contentType=context.request.headers.get("content-type")||"";
  try{
    if(contentType.includes("application/json"))body=await context.request.json();
    else{
      const form=await context.request.formData();
      for(const [key,value] of form.entries())body[key]=String(value);
    }
  }catch{return json({message:"Data callback tidak valid."},400)}

  const merchantCode=String(body.merchantCode||body.merchantcode||"").trim();
  const amount=String(body.amount||"").trim();
  const orderId=String(body.merchantOrderId||"").trim();
  const receivedSignature=String(body.signature||"").trim().toLowerCase();
  if(!merchantCode||!amount||!orderId||!receivedSignature)return json({message:"Callback Duitku tidak lengkap."},400);
  if(context.env.DUITKU_MERCHANT_CODE&&merchantCode!==context.env.DUITKU_MERCHANT_CODE)return json({message:"Merchant code tidak sesuai."},401);

  const expected=await hmacSha256(`${merchantCode}${amount}${orderId}`,context.env.DUITKU_API_KEY);
  if(receivedSignature!==expected)return json({message:"Signature Duitku tidak valid."},401);

  const order=await context.env.DB.prepare("SELECT id,site_id,amount,status,referral_code FROM orders WHERE id=? LIMIT 1").bind(orderId).first();
  if(!order)return json({message:"Order tidak ditemukan."},404);
  if(Math.round(Number(amount))!==Number(order.amount))return json({message:"Nominal pembayaran tidak sesuai."},400);

  const resultCode=String(body.resultCode||"").trim();
  const success=resultCode==="00";
  const failed=resultCode==="01";
  const nextStatus=success?"paid":failed?"failed":"pending";
  const now=new Date().toISOString();
  const reference=String(body.reference||body.publisherOrderId||orderId).trim();

  if(order.status!=="paid"){
    await context.env.DB.prepare(`UPDATE orders SET status=?,payment_reference=?,paid_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(nextStatus,reference,success?now:null,orderId).run();
  }

  if(success && order.status!=="paid"){
    await context.env.DB.prepare("UPDATE sites SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(order.site_id).run();
    if(order.referral_code){
      const changed=await context.env.DB.prepare("UPDATE referrals SET status='earned' WHERE order_id=? AND status='pending'").bind(orderId).run();
      if((changed.meta?.changes||0)>0){
        await context.env.DB.prepare("UPDATE referral_codes SET balance=balance+25000 WHERE code=?").bind(order.referral_code).run();
      }
    }
  }
  return json({ok:true,orderId,status:nextStatus});
}
