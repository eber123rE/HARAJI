// script.js - client-side logic for add & browse
(function(){
  'use strict';

  // helper: local product store (fallback) - now we use API
  async function getProducts(){
    try{
      const res = await fetch('/api/products');
      if(!res.ok) throw new Error('fetch failed');
      return await res.json();
    }catch(e){
      try{ return JSON.parse(localStorage.getItem('haraji_products')||'[]') }catch(err){ return [] }
    }
  }
  function saveProductsLocal(arr){ localStorage.setItem('haraji_products', JSON.stringify(arr)) }

  // common: create element helper
  function el(tag, props, ...children){ const e=document.createElement(tag); if(props) Object.assign(e,props); children.forEach(c=>{ if(typeof c==='string') e.appendChild(document.createTextNode(c)); else if(c) e.appendChild(c); }); return e }

  // Page: add.html
  if(document.getElementById('productForm')){
    const imagesInput = document.getElementById('imagesInput');
    const preview = document.getElementById('preview');
    const form = document.getElementById('productForm');
    const error = document.getElementById('error');

    let currentFiles = [];

    imagesInput.addEventListener('change', ()=>{
      preview.innerHTML='';
      currentFiles = Array.from(imagesInput.files || []);
      if(currentFiles.length===0) return;
      currentFiles.slice(0,20).forEach(file=>{
        const img = document.createElement('img');
        img.alt = file.name;
        const reader = new FileReader();
        reader.onload = ()=> img.src = reader.result;
        reader.readAsDataURL(file);
        preview.appendChild(img);
      });
      if(currentFiles.length>20){
        error.textContent = 'الحد الأقصى 20 صورة. سيتم استخدام أول 20 صورة فقط.';
      } else error.textContent='';
    });

    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault(); error.textContent='';
      const files = Array.from(imagesInput.files || []);
      if(files.length < 3) { error.textContent = 'يرجى رفع 3 صور على الأقل.'; return }
      if(files.length > 20) { error.textContent = 'لا يمكن رفع أكثر من 20 صورة.'; return }
      const description = document.getElementById('description').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const address = document.getElementById('address').value.trim();
      if(!description){ error.textContent = 'الرجاء كتابة وصف للمنتج.'; return }
      if(!phone){ error.textContent = 'الرجاء إدخال رقم البائع.'; return }
      if(!address){ error.textContent = 'الرجاء إدخال عنوان البائع.'; return }

      // Build FormData and POST to API
      const fd = new FormData();
      fd.append('description', description);
      fd.append('phone', phone);
      fd.append('address', address);
      files.slice(0,20).forEach(f => fd.append('images', f));

      try{
        const resp = await fetch('/api/products', { method: 'POST', body: fd });
        if(!resp.ok){ const err = await resp.json().catch(()=>({error:'failed'})); throw new Error(err.error||'upload failed') }
        // success - go view
        window.location.href = 'browse.html';
      }catch(e){
        console.error(e); error.textContent = 'فشل حفظ المنتج: '+(e.message||e);
      }
    });
  }

  // Page: browse.html
  if(document.getElementById('products')){
    const container = document.getElementById('products');
    async function render(){
      const products = await getProducts();
      container.innerHTML='';
      if(!products || !products.length) {
        container.appendChild(el('div', {className:'note card'}, 'لا توجد منتجات حالياً.')); return
      }
      products.forEach(prod=>{
        const p = el('div',{className:'card product'});
        // carousel
        const carousel = el('div',{className:'carousel'});
        const img = el('img',{src: prod.images && prod.images[0] ? prod.images[0] : '', alt:'صورة'});
        carousel.appendChild(img);
        // if multiple images, add controls
        if(prod.images && prod.images.length>1){
          const controls = el('div',{className:'controls'});
          const prev = el('button',{className:'btn secondary', type:'button'}, '◀');
          const next = el('button',{className:'btn secondary', type:'button'}, '▶');
          let idx = 0;
          prev.addEventListener('click', ()=>{ idx = (idx-1+prod.images.length)%prod.images.length; img.src = prod.images[idx]; });
          next.addEventListener('click', ()=>{ idx = (idx+1)%prod.images.length; img.src = prod.images[idx]; });
          controls.appendChild(prev); controls.appendChild(next);
          carousel.appendChild(controls);
        }

        p.appendChild(carousel);
        p.appendChild(el('div',null, el('div',{className:'chip'}, new Date(prod.created).toLocaleString('ar-EG'))));
        p.appendChild(el('div',null, el('strong',null,'الوصف: '), el('span',null, prod.description)));
        p.appendChild(el('div',null, el('strong',null,'المُعلِن: '), el('span',null, prod.phone+' — '+prod.address)));

        // delete (server-side: for now remove from products.json)
        const del = el('button',{className:'btn secondary', type:'button'}, 'حذف');
        del.addEventListener('click', async ()=>{
          if(!confirm('هل متأكد أنك تريد حذف هذا المنتج؟')) return;
          try{
            // optimistic: fetch current list and remove then save to local via API not implemented - fallback remove client-side via localStorage and refresh
            const list = await getProducts();
            const filtered = list.filter(x=>x.id!==prod.id);
            saveProductsLocal(filtered);
            // if server exists, we don't have delete endpoint; refresh UI using local fallback
            render();
          }catch(e){ console.error(e); }
        });
        p.appendChild(del);
        container.appendChild(p);
      });
    }
    render();
  }

})();
