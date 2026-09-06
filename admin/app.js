const $=s=>document.querySelector(s);
const fields=['businessName','tagline','description'];
let selectedPackage=localStorage.getItem('webumkm_package')||'starter';
let selectedTemplate=localStorage.getItem('webumkm_template')||'tpl_umkm_modern';
function slugify(value){return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'website-umkm';}
function sync(){ $('#pName').textContent=$('#businessName').value; $('#pTagline').textContent=$('#tagline').value; $('#pDescription').textContent=$('#description').value; $('#selectedTemplateLabel').textContent=selectedTemplate==='tpl_umkm_modern'?'UMKM Modern':selectedTemplate; }
function selectPackage(code){selectedPackage=code;localStorage.setItem('webumkm_package',code);document.querySelectorAll('.package').forEach(el=>el.classList.toggle('active',el.dataset.package===code));}
function selectTemplate(id){selectedTemplate=id;localStorage.setItem('webumkm_template',id);document.querySelectorAll('.template-card').forEach(el=>el.classList.toggle('selected',el.dataset.template===id));sync();}
fields.forEach(id=>$('#'+id).addEventListener('input',sync));
document.querySelectorAll('.package').forEach(el=>el.addEventListener('click',()=>selectPackage(el.dataset.package)));
document.querySelectorAll('.template-card').forEach(el=>el.addEventListener('click',()=>selectTemplate(el.dataset.template)));
$('#saveBtn').addEventListener('click',()=>{localStorage.setItem('webumkm_data',JSON.stringify({name:$('#businessName').value,tagline:$('#tagline').value,description:$('#description').value,whatsapp:$('#whatsapp').value,city:$('#city').value,address:$('#address').value}));$('#saveStatus').textContent='✓ Data berhasil disimpan di browser.';sync()});
$('#previewBtn').addEventListener('click',()=>{const slug=slugify($('#businessName').value);window.open(`../sites/${slug}`,'_blank')});
$('#publishBtn').addEventListener('click',async()=>{
  const slug=slugify($('#businessName').value);
  if(!$('#businessName').value.trim()){ $('#saveStatus').textContent='⚠ Nama usaha wajib diisi.'; return; }
  $('#saveStatus').textContent='⏳ Membuat website...';
  const payload={businessName:$('#businessName').value,tagline:$('#tagline').value,description:$('#description').value,whatsapp:$('#whatsapp').value,city:$('#city').value,address:$('#address').value,slug,templateId:selectedTemplate,packageCode:selectedPackage};
  try{
    const response=await fetch('../api/sites',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok) throw new Error(data.message||'Gagal membuat website');
    localStorage.setItem('webumkm_site_slug',data.slug);
    $('#saveStatus').textContent=`✓ Website aktif: ${data.url}`;
    await loadSites();
    window.open(data.url,'_blank');
  }catch(error){
    localStorage.setItem('webumkm_site_slug',slug);
    $('#saveStatus').textContent=`⚠ ${error.message}. Pastikan D1 sudah terhubung.`;
  }
});
async function loadSites(){try{const r=await fetch('../api/sites');const d=await r.json();const sites=d.sites||[];$('#siteCount').textContent=sites.length;$('#sitesList').innerHTML=sites.length?sites.map(s=>`<div class="site-row"><div><strong>${s.business_name}</strong><small>${s.slug} · ${s.package_code}</small></div><a href="../sites/${encodeURIComponent(s.slug)}" target="_blank">Buka →</a></div>`).join(''):'<div class="empty">Belum ada website dari database.</div>';}catch(e){$('#siteCount').textContent='0';}}
const saved=localStorage.getItem('webumkm_data');if(saved){try{const d=JSON.parse(saved);$('#businessName').value=d.name||'';$('#tagline').value=d.tagline||'';$('#description').value=d.description||'';$('#whatsapp').value=d.whatsapp||'';$('#city').value=d.city||'';$('#address').value=d.address||''}catch(e){}}
selectPackage(selectedPackage);selectTemplate(selectedTemplate);sync();loadSites();
