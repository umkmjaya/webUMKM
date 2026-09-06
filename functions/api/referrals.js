const json=(d,s=200)=>Response.json(d,{status:s,headers:{"cache-control":"no-store"}});
const clean=v=>String(v||"").trim().slice(0,80);

export async function onRequestGet(context){
  if(!context.env?.DB)return json({referrals:[],message:"D1 belum terhubung."},503);
  const code=clean(new URL(context.request.url).searchParams.get('code'));
  if(!code)return json({message:'Kode referral wajib.'},400);
  const rows=await context.env.DB.prepare(`SELECT r.id,r.referral_code,r.reward,r.status,r.created_at,o.status AS order_status,o.amount FROM referrals r LEFT JOIN orders o ON o.id=r.order_id WHERE r.referral_code=? ORDER BY r.created_at DESC`).bind(code).all();
  const referrals=rows.results||[];
  const earned=referrals.filter(x=>x.status==='earned'||x.status==='paid');
  return json({referralCode:code,total:referrals.length,pending:referrals.filter(x=>x.status==='pending').length,earned:earned.length,reward:earned.reduce((n,x)=>n+Number(x.reward||0),0),referrals});
}
