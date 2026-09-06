import { getSessionUser } from "../../lib/auth.js";

const json=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
const TYPES={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"};
const MAX=5*1024*1024;

export async function onRequestPost(context){
  if(!context.env?.DB)return json({message:"D1 belum terhubung."},503);
  if(!context.env?.BUCKET)return json({message:"R2 belum terhubung. Tambahkan binding BUCKET terlebih dahulu."},503);
  const user=await getSessionUser(context.request,context.env);
  if(!user)return json({message:"Silakan login terlebih dahulu."},401);
  const form=await context.request.formData().catch(()=>null);
  const file=form?.get("file");
  const siteId=String(form?.get("siteId")||"").trim();
  if(!file||typeof file.arrayBuffer!=="function")return json({message:"File gambar wajib dipilih."},400);
  if(!siteId)return json({message:"siteId wajib diisi."},400);
  const site=await context.env.DB.prepare("SELECT id FROM sites WHERE id=? AND owner_id=? LIMIT 1").bind(siteId,user.id).first();
  if(!site)return json({message:"Website tidak ditemukan atau bukan milik akun ini."},404);
  const ext=TYPES[file.type];
  if(!ext)return json({message:"Format hanya JPG, PNG, WEBP, atau GIF."},415);
  if(file.size>MAX)return json({message:"Ukuran maksimal gambar adalah 5 MB."},413);
  const key=`sites/${siteId}/media/${crypto.randomUUID()}.${ext}`;
  await context.env.BUCKET.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type,cacheControl:"public, max-age=31536000, immutable"},customMetadata:{ownerId:user.id,siteId}});
  return json({ok:true,key,url:`/media/${key}`},201);
}
