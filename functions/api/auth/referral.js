const json=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
const clean=v=>String(v||"").trim().slice(0,80);

export async function onRequestGet(context){
  if(!context.env?.DB)return json({message:"D1 belum terhubung."},503);
  const cookie=context.request.headers.get("cookie")||"";
  const match=cookie.match(/(?:^|;\s*)webumkm_session=([^;]+)/);
  if(!match)return json({message:"Belum login."},401);
  const session=await context.env.DB.prepare("SELECT s.user_id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1").bind(match[1],new Date().toISOString()).first();
  if(!session)return json({message:"Sesi tidak valid atau sudah berakhir."},401);
  let code=await context.env.DB.prepare("SELECT code,balance FROM referral_codes WHERE owner_user_id=?").bind(session.user_id).first();
  if(!code){
    const generated="REF-"+crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase();
    await context.env.DB.prepare("INSERT OR IGNORE INTO referral_codes(code,owner_user_id) VALUES(?,?)").bind(generated,session.user_id).run();
    code=await context.env.DB.prepare("SELECT code,balance FROM referral_codes WHERE owner_user_id=?").bind(session.user_id).first();
  }
  const referrals=await context.env.DB.prepare("SELECT r.id,r.reward,r.status,r.created_at,o.status AS order_status FROM referrals r LEFT JOIN orders o ON o.id=r.order_id WHERE r.referral_code=? ORDER BY r.created_at DESC").bind(code.code).all();
  const rows=referrals.results||[];
  return json({user:{id:session.user_id,name:session.name,email:session.email},referralCode:code.code,balance:Number(code.balance||0),total:rows.length,pending:rows.filter(r=>r.status==='pending').length,earned:rows.filter(r=>r.status==='earned'||r.status==='paid').length,referrals:rows});
}
