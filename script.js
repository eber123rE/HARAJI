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
  const price = parseFloat(document.getElementById('price').value || 0);
  const priceCurrency = document.getElementById('priceCurrency') ? document.getElementById('priceCurrency').value : 'YER';
  const governorate = document.getElementById('governorate').value || '';
      const phone = document.getElementById('phone').value.trim();
      const address = document.getElementById('address').value.trim();
      if(!description){ error.textContent = 'الرجاء كتابة وصف للمنتج.'; return }
      if(!phone){ error.textContent = 'الرجاء إدخال رقم البائع.'; return }
      if(!address){ error.textContent = 'الرجاء إدخال عنوان البائع.'; return }

      // Build FormData and POST to API
      const fd = new FormData();
  fd.append('description', description);
  fd.append('price', price);
  fd.append('currency', priceCurrency);
  fd.append('governorate', governorate);
      fd.append('phone', phone);
      fd.append('address', address);
      files.slice(0,20).forEach(f => fd.append('images', f));

      try{
        const resp = await fetch('/api/products', { method: 'POST', body: fd });
        if(!resp.ok){ const err = await resp.json().catch(()=>({error:'failed'})); throw new Error(err.error||'upload failed') }
        // success - go view
        // also save to local fallback
        try{
          const list = JSON.parse(localStorage.getItem('haraji_products')||'[]');
          const created = { id: Math.random().toString(36).slice(2,9), created: new Date().toISOString(), description, phone, address, governorate, price, currency: priceCurrency, images: [] };
          // try to read files as dataURLs
          const filesArr = files.slice(0,20);
          await Promise.all(filesArr.map((f,i)=> new Promise((res)=>{ const r=new FileReader(); r.onload=()=>{ created.images.push(r.result); res(); }; r.readAsDataURL(f); })));
          list.unshift(created);
          localStorage.setItem('haraji_products', JSON.stringify(list));
        }catch(e){}
        window.location.href = 'browse.html';
      }catch(e){
        console.error(e); error.textContent = 'فشل حفظ المنتج: '+(e.message||e);
      }
    });
  }

  // Page: browse.html
  if(document.getElementById('products')){
    const container = document.getElementById('products');
    const currencySelect = document.getElementById('currencySelect');
    const prevBtn = document.getElementById('prevProductBtn');
    const nextBtn = document.getElementById('nextProductBtn');
  // default exchange rate (static) 1 SAR = 187.5 YER (example rate) - allow conversion both ways
  let rate = 187.5;
  let showCurrency = 'YER';
    let productsCache = [];
    let currentIndex = 0;

    // ensure there are some sample products in localStorage for demo
    function ensureSampleProducts(){
      try{
        const existing = JSON.parse(localStorage.getItem('haraji_products')||'[]');
        if(existing && existing.length>0) { productsCache = existing; return }
        const sampleImg = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#f3c6b8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="36" fill="#7b3b22">صورة تجريبية</text></svg>');
        const now = new Date().toISOString();
        const samples = [
          { id:'p1', created: now, description:'طقم كراسي قديم بحالة جيدة', phone:'00967123456789', address:'عدن — الحي التجاري', governorate:'عدن', price:15000, images:[sampleImg] },
          { id:'p2', created: now, description:'مكيف شباك 18000 وحدة', phone:'00967111222333', address:'تعز — حي السلام', governorate:'تعز', price:35000, images:[sampleImg] },
          { id:'p3', created: now, description:'هاتف ذكي مستعمل نظيف', phone:'00967999888777', address:'المكلا — شارع الوحدة', governorate:'حضرموت', price:8000, images:[sampleImg] },
          { id:'p4', created: now, description:'طاولة خشبية قديمة', phone:'009676543210', address:'صنعاء — شارع الزبيري', governorate:'صنعاء', price:5000, images:[sampleImg] }
        ];
        localStorage.setItem('haraji_products', JSON.stringify(samples));
        productsCache = samples;
      }catch(e){ console.error('sample products error', e); }
    }
    currencySelect && currencySelect.addEventListener('change', (e)=>{ showCurrency = e.target.value; render(); });
    async function render(){
      // refresh list
      const products = await getProducts();
      // if empty, seed sample products
      if(!products || products.length===0){ ensureSampleProducts(); }
      const list = await getProducts();
      productsCache = list || [];
      container.innerHTML='';
      if(!products || !products.length) {
        container.appendChild(el('div', {className:'note card'}, 'لا توجد منتجات حالياً.')); return
      }
      products.forEach((prod, idx)=>{
        const p = el('div',{className:'card product'});
        p.dataset.index = idx;
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
        p.appendChild(el('div',null, el('strong',null,'المُعلِن: '), el('span',null, prod.phone+' — '+(prod.address||prod.governorate||''))));

        // price display and currency conversion
        const priceVal = prod.price || 0;
        const prodCurrency = prod.currency || 'YER';
        let displayPrice = priceVal + ' ' + prodCurrency;
        if(showCurrency !== prodCurrency){
          if(prodCurrency === 'YER' && showCurrency === 'SAR'){
            displayPrice = (priceVal / rate).toFixed(2) + ' SAR';
          }else if(prodCurrency === 'SAR' && showCurrency === 'YER'){
            displayPrice = (priceVal * rate).toFixed(0) + ' YER';
          }
        }
        p.appendChild(el('div',null, el('strong',null,'السعر: '), el('span',null, displayPrice)));

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
      // after render, ensure currentIndex is visible
      const target = container.querySelector('[data-index="'+currentIndex+'"]');
      if(target){ try{ target.scrollIntoView({behavior:'smooth', block:'center'}); target.style.boxShadow='0 0 0 3px rgba(211,39,20,0.12)'; setTimeout(()=>{ target.style.boxShadow=''; },900); }catch(e){} }
    }

    // wire prev/next
    prevBtn && prevBtn.addEventListener('click', ()=>{ if(productsCache.length===0) return; currentIndex = (currentIndex-1+productsCache.length)%productsCache.length; render(); });
    nextBtn && nextBtn.addEventListener('click', ()=>{ if(productsCache.length===0) return; currentIndex = (currentIndex+1)%productsCache.length; render(); });

    render();
  }

})();
