const $=s=>document.querySelector(s);
const fields=['businessName','tagline','description'];
function sync(){ $('#pName').textContent=$('#businessName').value; $('#pTagline').textContent=$('#tagline').value; $('#pDescription').textContent=$('#description').value; }
fields.forEach(id=>$('#'+id).addEventListener('input',sync));
$('#saveBtn').addEventListener('click',()=>{localStorage.setItem('webumkm_data',JSON.stringify({name:$('#businessName').value,tagline:$('#tagline').value,description:$('#description').value,whatsapp:$('#whatsapp').value,city:$('#city').value,address:$('#address').value}));$('#saveStatus').textContent='✓ Data berhasil disimpan di browser.';sync()});
$('#previewBtn').addEventListener('click',()=>{window.open('../templates/umkm-modern/index.html','_blank')});
$('#publishBtn').addEventListener('click',()=>{alert('MVP: tombol publish siap. Tahap berikutnya kita hubungkan dengan Cloudflare agar website pelanggan benar-benar dibuat otomatis.')});
const saved=localStorage.getItem('webumkm_data');if(saved){try{const d=JSON.parse(saved);$('#businessName').value=d.name||'';$('#tagline').value=d.tagline||'';$('#description').value=d.description||'';$('#whatsapp').value=d.whatsapp||'';$('#city').value=d.city||'';$('#address').value=d.address||''}catch(e){}}sync();