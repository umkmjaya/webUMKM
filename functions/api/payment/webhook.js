const json=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});

export async function onRequestGet(){
  return json({ok:true,service:"louvin-webhook",test:true});
}

export async function onRequestPost(){
  // Temporary validation endpoint: accept any POST with HTTP 200.
  // This isolates Louvin dashboard URL validation from payment logic.
  return json({ok:true,service:"louvin-webhook",test:true});
}
