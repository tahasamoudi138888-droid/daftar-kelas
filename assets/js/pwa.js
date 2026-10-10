let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', event=>{
  event.preventDefault();
  deferredInstallPrompt = event;
});
window.addEventListener('appinstalled',()=>{ deferredInstallPrompt=null; });
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').then((reg) => {
      const announceUpdate = worker => {
        if (!worker || document.getElementById('updateBanner')) return;
        const label=typeof tr==='function'?tr('update_ready'):'A new version is ready; saved data will be preserved.';
        const button=typeof tr==='function'?tr('update_button'):'Update';
        const banner = document.createElement('div');
        banner.id='updateBanner'; banner.className='update-banner';
        const text=document.createElement('span');text.textContent=label;
        const action=document.createElement('button');action.type='button';action.textContent=button;
        banner.append(text,action);
        banner.querySelector('button').addEventListener('click',async()=>{try{if(typeof saveData==='function')await saveData({throwOnError:true});worker.postMessage({type:'SKIP_WAITING'})}catch(error){recordLocalError('pwa_update_save',error)}});
        document.body.appendChild(banner);
      };
      if (reg.waiting && navigator.serviceWorker.controller) announceUpdate(reg.waiting);
      reg.addEventListener('updatefound',()=>{
        const worker=reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange',()=>{
          if (worker.state==='installed' && navigator.serviceWorker.controller) announceUpdate(worker);
        });
      });
      if (navigator.onLine) reg.update().catch(()=>{});
      setInterval(()=>{ if(navigator.onLine) reg.update().catch(()=>{}); },60*60*1000);
    }).catch(() => {});

    let alreadyReloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (alreadyReloaded) return;
      alreadyReloaded = true;
      const active=document.activeElement,editing=active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)&&String(active.value||'').trim();
      if(editing||(typeof heavyOperationActive!=='undefined'&&heavyOperationActive)){
        const banner=document.getElementById('updateBanner')||document.createElement('div');banner.id='updateBanner';banner.className='update-banner';banner.replaceChildren();const text=document.createElement('span');text.textContent=typeof tr==='function'?tr('update_reload_safe'):'Update installed. Reload when your current edit is finished.';const action=document.createElement('button');action.type='button';action.textContent=typeof tr==='function'?tr('update_button'):'Reload';action.addEventListener('click',()=>{if(typeof heavyOperationActive!=='undefined'&&heavyOperationActive)return;window.location.reload()});banner.append(text,action);if(!banner.isConnected)document.body.appendChild(banner);return;
      }
      window.location.reload();
    });
  });

  // هر بار که اتصال اینترنت وصل شد (مثلاً بعد از قطعی)، دوباره چک کن آپدیت هست یا نه
  window.addEventListener('online', () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) reg.update().catch(() => {});
    });
  });
}
