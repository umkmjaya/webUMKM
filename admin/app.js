const $=s=>document.querySelector(s);
const fields=['businessName','tagline','description'];
function slugify(value){return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'website-umkm';}
function sync(){ $('#pName').textContent=$('#businessName').value; $('#pTagline').textContent=$('#tagline').value; $('#pDescription').textContent=$('#description').value; }
fields.forEach(id=>$('#'+id).addEventListener('input',sync));
$('#saveBtn').addEventListener('click',()=>{localStorage.setItem('webumkm_data',JSON.stringify({name:$('#businessName').value,tagline:$('#tagline').value,description:$('#description').value,whatsapp:$('#whatsapp').value,city:$('#city').value,address:$('#address').value}));$('#saveStatus').textContent='✓ Data berhasil disimpan di browser.';sync()});
$('#previewBtn').addEventListener('click',()=>{const slug=slugify($('#businessName').value);window.open(`../sites/${slug}`,'_blank')});
$('#publishBtn').addEventListener('click',async()=>{
  const slug=slugify($('#businessName').value);
  $('#saveStatus').textContent='⏳ Membuat website...';
  const payload={businessName:$('#businessName').value,tagline:$('#tagline').value,description:$('#description').value,whatsapp:$('#whatsapp').value,city:$('#city').value,address:$('#address').value,slug,templateId:'tpl_umkm_modern',packageCode:'business'};
  try{
    const response=await fetch('../api/sites',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok) throw new Error(data.message||'Gagal membuat website');
    localStorage.setItem('webumkm_site_slug',data.slug);
    $('#saveStatus').textContent=`✓ Website aktif: ${data.url}`;
    window.open(data.url,'_blank');
  }catch(error){
    localStorage.setItem('webumkm_site_slug',slug);
    $('#saveStatus').textContent=`⚠ ${error.message}. Pastikan D1 sudah terhubung.`;
  }
});
const saved=localStorage.getItem('webumkm_data');if(saved){try{const d=JSON.parse(saved);$('#businessName').value=d.name||'';$('#tagline').value=d.tagline||'';$('#description').value=d.description||'';$('#whatsapp').value=d.whatsapp||'';$('#city').value=d.city||'';$('#address').value=d.address||''}catch(e){}}sync();
