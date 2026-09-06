export async function onRequestGet(context){
  if(!context.env?.BUCKET)return new Response("R2 belum terhubung.",{status:503});
  const path=decodeURIComponent(new URL(context.request.url).pathname.replace(/^\/media\//,""));
  if(!path||path.includes(".."))return new Response(null,{status:400});
  const object=await context.env.BUCKET.get(path);
  if(!object)return new Response(null,{status:404});
  const headers=new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag",object.httpEtag);
  headers.set("cache-control","public, max-age=31536000, immutable");
  return new Response(object.body,{headers});
}
