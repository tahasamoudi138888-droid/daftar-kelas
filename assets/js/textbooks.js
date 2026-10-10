/* ============ CLASS TEXTBOOK (offline, per class) ============ */
const TEXTBOOK_PREFIX='teacher-app-textbook-v1:';
const TEXTBOOK_MAX_BYTES=1024*1024*1024; // 1 GiB hard cap; actual availability still depends on browser/device quota
const MEDIA_CRYPTO_CHUNK_BYTES=8*1024*1024;
function textbookStorageKey(cid){ return TEXTBOOK_PREFIX+cid; }
function formatBytes(bytes){
  const n=Number(bytes)||0;
  if(n<1024) return `${n} B`;
  if(n<1024*1024) return `${(n/1024).toFixed(n<10*1024?1:0)} KB`;
  if(n<1024*1024*1024) return `${(n/(1024*1024)).toFixed(n<10*1024*1024?1:0)} MB`;
  return `${(n/(1024*1024*1024)).toFixed(n<10*1024*1024*1024?2:1)} GB`;
}
function openTextbookModal(cid){
  const c=getClass(cid); if(!c) return;
  const book=c.textbook;
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <h3>${tr('textbook_manage')}</h3>
    ${book?`<div class="textbook-file-meta"><div class="textbook-icon">${ICON.book}</div><div data-style="min-width:0;flex:1"><div class="textbook-file-name">${escapeHtml(book.name)}</div><div class="textbook-file-size">${formatBytes(book.size)} · ${tr('textbook_ready')}</div></div></div>`:`<div class="textbook-drop"><div class="textbook-icon">${ICON.book}</div><b>${tr('textbook_empty')}</b><p>${tr('textbook_help')}</p></div>`}
    <input id="textbookFileInput" type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" hidden data-change="uploadTextbook('${cid}',this)">
    ${book?`<div class="modal-actions"><button type="button" class="btn btn-gold" data-action="openTextbookFile('${cid}')">${ICON.book} ${tr('textbook_open')}</button><button type="button" class="btn btn-outline-dark" data-action="downloadTextbook('${cid}')">${ICON.download} ${tr('textbook_download')}</button></div>`:''}
    <button type="button" class="btn ${book?'btn-outline-dark':'btn-gold'}" data-style="margin-top:${book?'10':'0'}px" data-action="triggerFileInput('textbookFileInput')">${ICON.upload} ${book?tr('textbook_replace'):tr('textbook_upload')}</button>
    ${book?`<button type="button" class="btn btn-danger" data-style="margin-top:10px" data-action="confirmDeleteTextbook('${cid}')">${ICON.trash} ${tr('textbook_delete')}</button>`:''}
    <p class="appearance-note">${tr('textbook_help')}</p>
  `);
}
async function validateTextbookFile(file){
  if(!file||file.size<=0||file.size>TEXTBOOK_MAX_BYTES) return file&&file.size>TEXTBOOK_MAX_BYTES?'large':'invalid';
  const name=String(file.name||'').toLowerCase();
  const ext=name.endsWith('.pdf')?'pdf':name.endsWith('.epub')?'epub':'';
  if(!ext) return 'invalid';
  const bytes=new Uint8Array(await file.slice(0,5).arrayBuffer());
  const pdf=bytes.length>=5&&bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46&&bytes[4]===0x2d;
  const zip=bytes.length>=4&&bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===0x03&&bytes[3]===0x04;
  return (ext==='pdf'&&pdf)||(ext==='epub'&&zip)?ext:'invalid';
}

const LARGE_MEDIA_WARNING_BYTES=500*1024*1024;
async function confirmLargeMedia(file){
  if(!file||file.size<LARGE_MEDIA_WARNING_BYTES)return true;
  return confirmModalAsync(tr('media_large_warning').replace('{size}',formatBytes(file.size)));
}
async function ensureStorageCapacity(size){
  if(!navigator.storage||!navigator.storage.estimate)return true;
  try{const e=await navigator.storage.estimate(),free=Math.max(0,Number(e.quota||0)-Number(e.usage||0));return !e.quota||free>=Number(size||0)*1.12}catch(_){return true}
}

async function uploadTextbook(cid,input){
  const c=getClass(cid),file=input&&input.files&&input.files[0]; if(!c||!file) return;
  const previousMeta=c.textbook?{...c.textbook}:null;let mediaChange=null;
  input.disabled=true; toast(tr('textbook_saving'));
  try{
    const kind=await validateTextbookFile(file);
    if(kind==='large'){ toast(tr('textbook_too_large')); input.disabled=false; return; }
    if(kind==='invalid'){ toast(tr('textbook_invalid')); input.disabled=false; return; }
    if(!await confirmLargeMedia(file)){ input.disabled=false; input.value=''; return; }
    if(!await ensureStorageCapacity(file.size)){toast(tr('storage_not_enough'));input.disabled=false;return}
    showOperationProgress(tr('progress_saving'),0,formatBytes(file.size));beginCancellableOperation();
    const safeName=String(file.name||`textbook.${kind}`).replace(/[\\/\u0000-\u001f\u007f]+/g,'-').slice(0,180);
    const type=kind==='pdf'?'application/pdf':'application/epub+zip';
    const record={name:safeName,type,size:file.size,updatedAt:new Date().toISOString()};
    mediaChange=await storeTextbookRecord(cid,file.slice(0,file.size,type),record,p=>showOperationProgress(tr(encryptionMeta&&encryptionMeta.enabled?'progress_encrypting':'progress_saving'),Math.round(p*95),formatBytes(file.size)));
    c.textbook={name:safeName,type,size:file.size,updatedAt:record.updatedAt};
    if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{});
    showOperationProgress(tr('progress_saving'),94);await saveData({throwOnError:true});await finalizeStoredMediaReplacement(mediaChange);mediaChange=null;hideOperationProgress();render();openTextbookModal(cid);toast(tr('textbook_saved'));
  }catch(error){if(mediaChange){c.textbook=previousMeta;await rollbackStoredMediaReplacement(mediaChange).catch(()=>{});mediaChange=null}hideOperationProgress();recordLocalError('textbook_upload',error);toast(tr('textbook_save_failed'));input.disabled=false;}
}
async function getStoredTextbook(cid){
  try{
    const stored=await idbGet(textbookStorageKey(cid));
    if(!stored)return null;
    if(stored.encrypted){
      if(!sessionEncryptionKey)return null;
      const blob=await decryptStoredMedia(stored,sessionEncryptionKey);
      return Object.assign({},stored,{blob});
    }
    if(stored.chunkKeys)return Object.assign({},stored,{blob:await plainChunkBlob(stored)});return stored.blob instanceof Blob?stored:null;
  }catch(_){ return null; }
}
async function decryptStoredMedia(stored,key){
  if(stored.chunkKeys)return materializeMediaRecord(stored,key);
  if(Array.isArray(stored.payloadChunks)){
    const parts=[];
    for(const chunk of stored.payloadChunks)parts.push(await DKCrypto.decryptBytes(chunk,key));
    return new Blob(parts,{type:stored.type||'application/octet-stream'});
  }
  const bytes=await DKCrypto.decryptBytes(stored.payload,key);
  return new Blob([bytes],{type:stored.type||'application/octet-stream'});
}
async function storeTextbookRecord(cid,blob,meta,onProgress){
  const record=await prepareMediaRecord(blob,meta,onProgress);
  return replaceStoredMedia(textbookStorageKey(cid),record)
}

async function migrateTextbookEncryption(encrypt,key){
  const staged=[], committed=[];
  try{
    for(const c of data.classes){
      const originalKey=textbookStorageKey(c.id);
      const stored=await idbGet(originalKey).catch(()=>null);if(!stored)continue;
      let next=null;
      if(encrypt&&!stored.encrypted&&(stored.blob instanceof Blob||stored.chunkKeys)){
        next=stored.chunkKeys?await encryptedRecordForMigration(stored,key):await prepareMediaRecord(stored.blob,stored,undefined,key,true);delete next.blob;
      }else if(!encrypt&&stored.encrypted){
        next=await plainRecordForMigration(stored,key);
      }
      if(!next)continue;
      const stageKey=`teacher-app-textbook-stage-v1:${c.id}`;
      await idbSet(stageKey,next);
      staged.push({originalKey,stageKey,original:stored,next});
    }
    await recordSecurityMigrationChanges(staged);await idbAtomicCommit(staged.map(item=>[item.originalKey,item.next]));committed.push(...staged);
  }catch(error){
    for(const item of committed.reverse()) await idbSet(item.originalKey,item.original).catch(()=>{});
    for(const item of staged)await discardPreparedMedia(item.next);
    throw error;
  }finally{
    for(const item of staged) await idbDelete(item.stageKey).catch(()=>{});
  }
  return staged;
}
function saveBlobToDevice(blob,name,openInNewTab){
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.rel='noopener';
  if(openInNewTab) a.target='_blank'; else a.download=name||'textbook';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function openTextbookFile(cid){
  const raw=await idbGet(textbookStorageKey(cid));if(raw?.chunkKeys&&raw.size>MEDIA_MATERIALIZE_MAX_BYTES&&(raw.encrypted||navigator.serviceWorker?.controller))return openMediaStream(textbookStorageKey(cid));
  const stored=await getStoredTextbook(cid);
  if(!stored){ toast(tr('textbook_missing')); return; }
  const isPdf=stored.type==='application/pdf'||String(stored.name).toLowerCase().endsWith('.pdf');
  saveBlobToDevice(stored.blob,stored.name,isPdf);
}
async function downloadTextbook(cid){
  const raw=await idbGet(textbookStorageKey(cid));if(raw?.chunkKeys&&raw.size>MEDIA_MATERIALIZE_MAX_BYTES&&(raw.encrypted||navigator.serviceWorker?.controller))return openMediaStream(textbookStorageKey(cid),true);
  const stored=await getStoredTextbook(cid);
  if(!stored){ toast(tr('textbook_missing')); return; }
  saveBlobToDevice(stored.blob,stored.name,false);
}
function confirmDeleteTextbook(cid){
  confirmModal(tr('textbook_delete'),tr('textbook_delete_confirm'),async()=>{
    const c=getClass(cid); if(!c) return;
    try{await removeStoredMedia(textbookStorageKey(cid))}catch(error){toast(tr('textbook_missing'));return}
    c.textbook=null; await saveData({throwOnError:true}); render(); toast(tr('textbook_removed'));
  });
}
