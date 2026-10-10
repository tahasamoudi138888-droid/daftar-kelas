/* ============ complete ZIP backup + legacy JSON ============ */
function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function backupDataWithoutBooks(source){
  const copy=JSON.parse(JSON.stringify(source));
  if(Array.isArray(copy.classes)) copy.classes.forEach(c=>{ if(c&&typeof c==='object'){ c.textbook=null; c.listenings=[]; } });
  return copy;
}
async function exportBackup(classId){return exportReliableArchive(false,classId)}

async function requestBackupPin(strong=false){
  return new Promise(resolve=>{
    let settled=false;
    const finish=value=>{if(settled)return;settled=true;const root=document.getElementById('modalRoot');root._onClose=null;closeModal();resolve(value)};
    openModal(`<button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${tr('backup_pin_title')}</h3><p class="appearance-note">${tr(strong?'strong_archive_secret':'backup_pin_hint')}</p><div class="field"><label>PIN</label><input id="backupPin" type="password" minlength="4" maxlength="128" autocomplete="off"></div>${strong?`<div class="field"><label>${tr('security_repeat_pin')}</label><input id="backupPinRepeat" type="password" maxlength="128" autocomplete="new-password"></div>`:''}<button id="backupPinSubmit" class="btn btn-gold">${tr('backup_pin_open')}</button>`);
    document.getElementById('modalRoot')._onClose=()=>{if(!settled){settled=true;resolve('')}};
    const btn=document.getElementById('backupPinSubmit'),input=document.getElementById('backupPin');
    const submit=()=>{const value=normalizeDigits(input.value).trim();if(strong){if(!validNewLocalSecret(value)){toast(tr('strong_secret_required'));return}if(value!==normalizeDigits(document.getElementById('backupPinRepeat').value).trim()){toast(tr('security_pin_mismatch'));return}}finish(value)};btn.onclick=submit;
    input.onkeydown=e=>{if(e.key==='Enter')submit()};
    setTimeout(()=>input.focus(),50);
  });
}
async function exportFullZip(){return exportReliableArchive(false)}

function safeArchiveName(value,fallback){return String(value||fallback).replace(/[^\p{L}\p{N}._-]+/gu,'-').replace(/^\.+/,'').slice(0,160)||fallback}
async function exportMediaArchive(){if(await confirmModalAsync(tr('archive_warning')))return exportReliableArchive(true)}

async function mergeImportedData(parsed,bookFiles,bookManifest,listeningManifest=[]){
  if(!Array.isArray(bookManifest)||!Array.isArray(listeningManifest)||bookManifest.length+listeningManifest.length>10000)throw new Error('invalid manifest');
  await saveQueue;const expectedSnapshot=(await idbGet(STORE_KEY))??null;const before=data,candidate=mergedRestoreCandidate(before,parsed),staged=[],entries=[],deletes=[];let committed=false;
  const mediaItems=[...bookManifest,...listeningManifest], paths=new Set();
  for(const item of mediaItems){if(!item||paths.has(item.path))throw new Error('invalid manifest');paths.add(item.path)}
  if(parsed.backupMeta?.includesBooks)for(const cls of parsed.classes){if(cls.textbook&&!bookManifest.some(x=>x.classId===cls.id))throw new Error('missing_media');for(const audio of cls.listenings||[])if(!listeningManifest.some(x=>x.classId===cls.id&&x.audioId===audio.id))throw new Error('missing_media')}
  const total=mediaItems.reduce((sum,item)=>sum+Number(bookFiles.get(item.path)?.size??bookFiles.get(item.path)?.byteLength??0),0);
  if(!await ensureStorageCapacity(total+JSON.stringify(candidate).length*3))throw new Error('storage_not_enough');
  await createAutoBackup(await encodeStoredSnapshot(JSON.stringify(before)));let processed=0;showOperationProgress(tr('progress_saving'),0,formatBytes(total));
  try{
    for(const item of [...bookManifest,...listeningManifest]){
      assertOperationActive();const cls=candidate.classes.find(c=>c.id===item.classId),audio=!!item.audioId;
      if(!cls||!validId(item.classId)||(audio&&!validId(item.audioId))||typeof item.path!=='string'||typeof item.name!=='string'||item.name.length>180)throw new Error('invalid manifest');
      const source=bookFiles.get(item.path);if(!source)throw new Error('missing_media');const size=source.size??source.byteLength;
      if(!Number.isSafeInteger(size)||size<1||size>(audio?LISTENING_MAX_BYTES:TEXTBOOK_MAX_BYTES)||(item.size&&item.size!==size))throw new Error('entry_too_large');
      const head=await readRestoreHead(source);let type;
      if(audio){if(validateListeningFile({name:item.name,type:item.type,size})!=='audio'||!String(item.type||'').startsWith('audio/'))throw new Error('invalid media');type=item.type}
      else{const pdf=head[0]===37&&head[1]===80&&head[2]===68&&head[3]===70&&head[4]===45,epub=head[0]===80&&head[1]===75&&head[2]===3&&head[3]===4;if(!pdf&&!epub)throw new Error('invalid media');type=pdf?'application/pdf':'application/epub+zip'}
      const meta={name:safeArchiveName(item.name,'media'),size,type,updatedAt:new Date().toISOString()};
      const record=await prepareRestoreRecord(source,meta,bytes=>{processed+=bytes;showOperationProgress(tr('progress_saving'),Math.floor(processed/Math.max(1,total)*95),`${formatBytes(processed)} / ${formatBytes(total)}`)});staged.push(record);
      const storageKey=audio?listeningStorageKey(item.classId,item.audioId):textbookStorageKey(item.classId),previous=await idbGet(storageKey);deletes.push(...(previous?.chunkKeys||[]));entries.push([storageKey,record]);
      if(audio){const index=(cls.listenings||[]).findIndex(x=>x.id===item.audioId);if(index<0)throw new Error('invalid manifest');cls.listenings[index]=Object.assign({},cls.listenings[index],meta)}else cls.textbook=meta;
    }
    assertOperationActive();const old=data;try{data=candidate;migrateData()}finally{data=old}
    entries.push([STORE_KEY,await encodeStoredSnapshot(JSON.stringify(candidate))]);
    // All media pointers and the data snapshot become visible in one IndexedDB transaction.
    await idbAtomicCommit(entries,deletes,{key:STORE_KEY,value:expectedSnapshot});committed=true;data=candidate;closeModal();render();toast(tr('toast_import_done'));
  }finally{if(!committed)for(const record of staged)await discardPreparedMedia(record);hideOperationProgress()}
}

async function zipEntryBytes(files,name,maxBytes){const value=files.get(name);if(!value)throw new Error(`missing_${name}`);if(value?.chunks){if(value.size>maxBytes)throw new Error('entry_too_large');const pieces=[];for await(const bytes of value.chunks())pieces.push(bytes);return new Uint8Array(await new Blob(pieces).arrayBuffer())}const blob=value instanceof Blob?value:new Blob([value]);if(blob.size>maxBytes)throw new Error('entry_too_large');return new Uint8Array(await blob.arrayBuffer())}
function backupImportMessage(error){const msg=String(error&&error.message||'');if(msg==='restore_conflict')return tr('restore_conflict');if(msg==='operation_cancelled')return tr('operation_cancelled');if(msg==='storage_not_enough')return tr('storage_not_enough');if(/checksum/i.test(msg))return tr('import_checksum_failed');if(/PIN|required|OperationError|decrypt/i.test(msg))return tr('import_wrong_pin');if(/too large|exceeds 4 GiB|entry_too_large|archive_too_large/i.test(msg))return tr('import_too_large');if(/missing_data\.json/.test(msg))return tr('import_missing_data');if(/backup-v(?![567])|unsupported/i.test(msg))return tr('import_version_unsupported');if(/ZIP|zip|directory|truncated|unsafe path|manifest/.test(msg))return tr('import_invalid_zip');return tr('toast_import_error')}
async function importBackup(inputEl){
  const file = inputEl.files && inputEl.files[0];
  inputEl.value = '';
  if (!file) return;
  if (file.size > BACKUP_ARCHIVE_MAX_BYTES){ toast(tr('import_too_large')); return; }
  if (!await confirmModalAsync(tr('backup_import_confirm'))) return;
  beginCancellableOperation();
  try{
    if(file.name.toLowerCase().endsWith('.zip')){
      let files=await DKZip.parseZipBlob(file);
      let manifest=JSON.parse(DKCrypto.decodeText(await zipEntryBytes(files,'manifest.json',2*1024*1024)));
      if(!['daftar-kelas-backup-v5','daftar-kelas-backup-v6','daftar-kelas-backup-v7'].includes(manifest.format))throw new Error('unsupported backup version');
      if(manifest.encrypted){
        const pin=await requestBackupPin();if(!validUnlockSecret(pin))throw new Error('PIN required');
        const iterations=Number(manifest.iterations||ENCRYPTION_ITERATIONS),salt=DKCrypto.base64ToBytes(manifest.salt);
        if(!Number.isInteger(iterations)||iterations<100000||iterations>2000000||salt.length!==16)throw new Error('invalid KDF parameters');
        const key=await DKCrypto.deriveKey(pin,salt,iterations);
        if(manifest.format==='daftar-kelas-backup-v7'){const decoded=await parseV7Archive(files,manifest,key);files=decoded.files;manifest=decoded.manifest}
        else{files=DKZip.parseZip(await DKCrypto.decryptBytes(await zipEntryBytes(files,'payload.enc',LEGACY_ENCRYPTED_MAX_BYTES),key));manifest=JSON.parse(DKCrypto.decodeText(files.get('manifest.json')));}
      }
      const parsed=assertBackupShape(JSON.parse(DKCrypto.decodeText(await zipEntryBytes(files,'data.json',20*1024*1024))));
      await mergeImportedData(parsed,files,manifest.books||[],manifest.listenings||[]);
    }else{
      if(file.size>10*1024*1024)throw new Error('JSON too large');
      await mergeImportedData(assertBackupShape(JSON.parse(await file.text())),new Map(),[]);
    }
  }catch(e){console.error(e);recordLocalError('backup_import',e);toast(backupImportMessage(e));}finally{hideOperationProgress()}
}
