const json=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});

export async function onRequestGet(){
  return json({ok:true,service:"louvin-webhook"});
}

export async function onRequestPost(context){
  if(!context.env?.DB)return json({message:"D1 belum terhubung."},503);
  let body={};
  try{body=await context.request.json()}catch{return json({message:"Data webhook Louvin tidak valid."},400)}

  const event=String(body.event||"").trim();
  const data=body.data||{};
  const transactionId=String(data.transaction_id||"").trim();
  const orderId=String(data.order_id||data.reference||"").trim();
  if(!event||!orderId)return json({message:"Webhook Louvin tidak lengkap."},400);

  const order=await context.env.DB.prepare("SELECT id,site_id,amount,status,referral_code FROM orders WHERE id=? LIMIT 1").bind(orderId).first();
  if(!order)return json({message:"Order tidak ditemukan."},404);

  const netAmount=Number(data.net_amount||0);
  if(event==="payment.settled" && netAmount && netAmount!==Number(order.amount))return json({message:"Nominal pembayaran tidak sesuai."},400);

  const success=event==="payment.settled"||String(data.status||"").toLowerCase()==="settled";
  const failed=event==="payment.failed"||String(data.status||"").toLowerCase()==="failed";
  const nextStatus=success?"paid":failed?"failed":"pending";
  const now=new Date().toISOString();

  if(order.status!=="paid"){
    await context.env.DB.prepare(`UPDATE orders SET status=?,payment_reference=?,paid_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(nextStatus,transactionId||orderId,success?now:null,orderId).run();
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
