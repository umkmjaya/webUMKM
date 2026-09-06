import { getSessionUser } from "../../lib/auth.js";

const json=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
const TYPES={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"};
const MAX=5*1024*1024;

export async function onRequestPost(context){
  if(!context.env?.DB)return json({message:"D1 belum terhubung."},503);
  if(!context.env?.CLOUDINARY_CLOUD_NAME || !context.env?.CLOUDINARY_UPLOAD_PRESET){
    return json({message:"Cloudinary belum dikonfigurasi. Tambahkan CLOUDINARY_CLOUD_NAME dan CLOUDINARY_UPLOAD_PRESET di Pages Settings > Environment variables."},503);
  }

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

  const uploadForm=new FormData();
  uploadForm.append("file",file);
  uploadForm.append("upload_preset",context.env.CLOUDINARY_UPLOAD_PRESET);
  uploadForm.append("folder",`webumkm/sites/${siteId}`);
  uploadForm.append("context",`siteId=${siteId}|ownerId=${user.id}`);

  const response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(context.env.CLOUDINARY_CLOUD_NAME)}/image/upload`,{
    method:"POST",
    body:uploadForm
  });

  const result=await response.json().catch(()=>null);
  if(!response.ok || !result?.secure_url){
    return json({message:"Upload ke Cloudinary gagal.",detail:result?.error?.message||"Unknown Cloudinary error."},502);
  }

  return json({ok:true,url:result.secure_url,publicId:result.public_id,format:result.format},201);
}
