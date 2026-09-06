const json=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
async function sha512(text){const bytes=new TextEncoder().encode(text);const digest=await crypto.subtle.digest("SHA-512",bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");}
export async function onRequestPost(context){
  if(!context.env?.DB)return json({message:"D1 belum terhubung."},503);
  let body;try{body=await context.request.json()}catch{return json({message:"JSON tidak valid."},400)}
  const orderId=String(body.order_id||"").trim();
  if(!orderId)return json({message:"order_id wajib."},400);
  if(context.env.MIDTRANS_SERVER_KEY){
    const expected=await sha512(`${orderId}${body.status_code||""}${body.gross_amount||""}${context.env.MIDTRANS_SERVER_KEY}`);
    if(String(body.signature_key||"").toLowerCase()!==expected)return json({message:"Signature tidak valid."},401);
  }else{return json({message:"MIDTRANS_SERVER_KEY belum dikonfigurasi."},503)}
  const order=await context.env.DB.prepare("SELECT id,site_id,amount,status,referral_code FROM orders WHERE id=? LIMIT 1").bind(orderId).first();
  if(!order)return json({message:"Order tidak ditemukan."},404);
  const gross=Math.round(Number(body.gross_amount||0));
  if(gross!==Number(order.amount))return json({message:"Nominal pembayaran tidak sesuai."},400);
  const status=String(body.transaction_status||"").toLowerCase();
  const success=(status==="settlement"||status==="capture")&&(status!=="capture"||String(body.fraud_status||"accept").toLowerCase()==="accept");
  const failed=["deny","cancel","expire","failure"].includes(status);
  const nextStatus=success?"paid":failed?"failed":"pending";
  const now=new Date().toISOString();
  await context.env.DB.prepare(`UPDATE orders SET status=?,payment_reference=?,paid_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(nextStatus,String(body.transaction_id||orderId),success?now:null,orderId).run();
  if(success){
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
