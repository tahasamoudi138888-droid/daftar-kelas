async function enableNotifications(){
  if(!('Notification' in window)){ toast(tr('notification_unsupported')); return; }
  const permission=await Notification.requestPermission();
  data.settings.notifications=permission==='granted';
  await saveData({throwOnError:true});
  refreshSettingsModal();
  if(permission==='granted')checkPersonalReminderNotifications();
  toast(tr(permission==='granted'?'notification_enabled':'notification_denied'));
}
function disableNotifications(){
  data.settings.notifications=false;
  saveData(); refreshSettingsModal(); toast(tr('notification_disabled'));
}
async function installClassApp(){
  if(window.matchMedia('(display-mode: standalone)').matches){ toast(tr('install_already')); return; }
  if(!deferredInstallPrompt){ toast(tr('install_browser_hint')); return; }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt=null;
}
async function protectStoredData(){
  if(!navigator.storage||!navigator.storage.persist){ toast(tr('storage_persist_unsupported')); return; }
  const granted=await navigator.storage.persist();
  toast(tr(granted?'storage_persist_enabled':'storage_persist_denied'));
}
async function openStorageManager(){
  let estimate={usage:0,quota:0};
  try{if(navigator.storage&&navigator.storage.estimate)estimate=await navigator.storage.estimate()}catch(_){ }
  const books=data.classes.filter(c=>c.textbook),bookTotal=books.reduce((n,c)=>n+Number(c.textbook.size||0),0);
  const listeningItems=[];data.classes.forEach(c=>(c.listenings||[]).forEach(a=>listeningItems.push({c,a})));
  const listeningTotal=listeningItems.reduce((n,x)=>n+Number(x.a.size||0),0);
  let dataBytes=0;try{dataBytes=new TextEncoder().encode(JSON.stringify(data)).byteLength}catch(_){ }
  const mediaTotal=bookTotal+listeningTotal,percent=estimate.quota?Math.min(100,Math.round((estimate.usage/estimate.quota)*100)):0;
  const remaining=estimate.quota?Math.max(0,estimate.quota-estimate.usage):0;
  openModal(`<button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${tr('storage_title')}</h3>
    <div class="storage-summary storage-summary-4">
      <div><b>${formatBytes(dataBytes)}</b><span>${tr('storage_data_size')}</span></div>
      <div><b>${formatBytes(bookTotal)}</b><span>${tr('storage_books_size')}</span></div>
      <div><b>${formatBytes(listeningTotal)}</b><span>${tr('storage_listening_size')}</span></div>
      <div><b>${estimate.quota?formatBytes(remaining):'—'}</b><span>${tr('storage_remaining')}</span></div>
    </div>
    ${estimate.quota?`<div class="storage-meter"><span data-style="width:${percent}%"></span></div><p class="storage-caption">${tr('storage_percent').replace('{percent}',percent)} · ${tr('storage_total_app').replace('{size}',formatBytes(estimate.usage))}</p>`:''}
    <div class="storage-total-line"><b>${formatBytes(mediaTotal)}</b><span>${tr('storage_media_total')}</span></div>
    <h2 class="section-title">${tr('storage_saved_books')}</h2>
    ${books.length?books.map(c=>`<div class="storage-book"><div class="textbook-icon">${ICON.book}</div><div><b>${escapeHtml(c.textbook.name)}</b><span>${escapeHtml(c.name)} · ${formatBytes(c.textbook.size)}</span></div><button class="hist-del" data-action="deleteStoredTextbook('${c.id}')" aria-label="${escapeAttr(tr('btn_delete'))}">${ICON.trash}</button></div>`).join(''):`<div class="empty-state"><p>${tr('storage_no_books')}</p></div>`}
    <h2 class="section-title">${tr('storage_saved_listening')}</h2>
    ${listeningItems.length?listeningItems.map(x=>`<div class="storage-book"><div class="textbook-icon">${ICON.audio}</div><div><b>${escapeHtml(listeningLabel(x.a))}</b><span>${escapeHtml(x.c.name)} · ${formatBytes(x.a.size)}</span></div><button class="hist-del" data-action="confirmDeleteListening('${x.c.id}','${x.a.id}')" aria-label="${escapeAttr(tr('btn_delete'))}">${ICON.trash}</button></div>`).join(''):`<div class="empty-state"><p>${tr('storage_no_listening')}</p></div>`}`);
}
function deleteStoredTextbook(cid){
  confirmModal(tr('textbook_delete'),tr('textbook_delete_confirm'),async()=>{const c=getClass(cid);if(!c)return;await idbDelete(textbookStorageKey(cid)).catch(()=>{});c.textbook=null;await saveData({throwOnError:true});toast(tr('textbook_removed'));openStorageManager()});
}
