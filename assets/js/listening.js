/* ============ CLASS LISTENING AUDIO (offline, per class) ============ */
const LISTENING_PREFIX='teacher-app-listening-v1:';
const LISTENING_MAX_BYTES=1024*1024*1024; // 1 GiB per audio file
function listeningStorageKey(cid,audioId){ return `${LISTENING_PREFIX}${cid}:${audioId}`; }
function listeningLabel(a){
  if(a&&String(a.title||'').trim())return String(a.title).trim();
  const structured=[a&&a.unit,a&&a.lesson,a&&a.track].filter(Boolean).map(String);
  if(structured.length)return structured.join(' · ');
  return String(a&&a.name||tr('listening_title'));
}
function openListeningModal(cid){
  const c=getClass(cid);if(!c)return;
  const items=(Array.isArray(c.listenings)?c.listenings:[]).slice().sort((a,b)=>(Number(!!b.favorite)-Number(!!a.favorite))||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  const rows=items.map(a=>`<div class="textbook-file-meta listening-file-row"><button class="listen-fav ${a.favorite?'on':''}" aria-pressed="${!!a.favorite}" data-action="toggleListeningFavorite('${cid}','${a.id}')" aria-label="${escapeAttr(tr('listening_favorite'))}">${a.favorite?ICON.starFilled:ICON.star}</button><div data-style="min-width:0;flex:1"><div class="textbook-file-name">${escapeHtml(listeningLabel(a))}</div><div class="textbook-file-size">${formatBytes(a.size)}${a.lastPosition?` · ${tr('listening_resume_saved')}`:''}</div></div><button class="hist-del" data-action="openListeningNameModal('${cid}','${a.id}')" aria-label="${escapeAttr(tr('listening_rename'))}">${ICON.gear}</button><button class="hist-del" data-action="openListeningPlayer('${cid}','${a.id}')" aria-label="${escapeAttr(tr('listening_play'))}">${ICON.audio}</button><button class="hist-del" data-action="downloadListeningAudio('${cid}','${a.id}')" aria-label="${escapeAttr(tr('listening_download'))}">${ICON.download}</button><button class="hist-del" data-action="confirmDeleteListening('${cid}','${a.id}')" aria-label="${escapeAttr(tr('listening_delete'))}">${ICON.trash}</button></div>`).join('');
  openModal(`<button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${tr('listening_manage')}</h3>${rows||`<div class="textbook-drop"><div class="textbook-icon">${ICON.audio}</div><b>${tr('listening_empty')}</b><p>${tr('listening_help')}</p></div>`}<input id="listeningFileInput" type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.webm" hidden data-change="uploadListeningAudio('${cid}',this)"><button type="button" class="btn btn-gold" data-style="margin-top:10px" data-action="triggerFileInput('listeningFileInput')">${ICON.upload} ${tr('listening_upload')}</button><p class="appearance-note">${tr('listening_help')}</p>`);
}
function validateListeningFile(file){
  if(!file||file.size<=0)return 'invalid';
  if(file.size>LISTENING_MAX_BYTES)return 'large';
  const name=String(file.name||'').toLowerCase();
  const allowedExt=['.mp3','.m4a','.aac','.wav','.ogg','.oga','.opus','.webm'];
  const goodExt=allowedExt.some(ext=>name.endsWith(ext));
  const goodMime=/^audio\/(mpeg|mp4|x-m4a|aac|wav|x-wav|ogg|opus|webm)$/i.test(String(file.type||''));
  return (goodExt||goodMime)?'audio':'invalid';
}
async function uploadListeningAudio(cid,input){
  const c=getClass(cid),file=input&&input.files&&input.files[0];if(!c||!file)return;
  let mediaChange=null,addedId='';
  input.disabled=true;toast(tr('textbook_saving'));
  try{
    const kind=validateListeningFile(file);
    if(kind==='large'){toast(tr('listening_too_large'));input.disabled=false;return;}
    if(kind==='invalid'){toast(tr('listening_invalid'));input.disabled=false;return;}
    if(!await confirmLargeMedia(file)){input.disabled=false;input.value='';return;}
    if(!await ensureStorageCapacity(file.size)){toast(tr('storage_not_enough'));input.disabled=false;return}
    showOperationProgress(tr('progress_saving'),0,formatBytes(file.size));beginCancellableOperation();
    const id=uid(),safeName=String(file.name||'lesson-audio').replace(/[\\/\u0000-\u001f\u007f]+/g,'-').slice(0,180);
    const baseTitle=safeName.replace(/\.[^.]+$/,'').slice(0,120);
    const type=String(file.type||'audio/mpeg').slice(0,100),updatedAt=new Date().toISOString();
    const meta={id,name:safeName,title:baseTitle,unit:'',lesson:'',track:'',favorite:false,lastPosition:0,type,size:file.size,updatedAt};
    mediaChange=await storeListeningRecord(cid,id,file.slice(0,file.size,type),meta,p=>showOperationProgress(tr(encryptionMeta&&encryptionMeta.enabled?'progress_encrypting':'progress_saving'),Math.round(p*95),formatBytes(file.size)));addedId=id;
    if(!Array.isArray(c.listenings))c.listenings=[];c.listenings.push(meta);
    if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
    showOperationProgress(tr('progress_saving'),94);await saveData({throwOnError:true});await finalizeStoredMediaReplacement(mediaChange);mediaChange=null;hideOperationProgress();render();toast(tr('listening_saved'));openListeningNameModal(cid,id);
  }catch(error){if(addedId)c.listenings=(c.listenings||[]).filter(a=>a.id!==addedId);if(mediaChange)await rollbackStoredMediaReplacement(mediaChange).catch(()=>{});hideOperationProgress();recordLocalError('listening_upload',error);toast(tr('textbook_save_failed'));input.disabled=false;}
}
async function getStoredListening(cid,audioId){
  try{const stored=await idbGet(listeningStorageKey(cid,audioId));if(!stored)return null;if(stored.encrypted){if(!sessionEncryptionKey)return null;const blob=await decryptStoredMedia(stored,sessionEncryptionKey);return Object.assign({},stored,{blob});}if(stored.chunkKeys)return Object.assign({},stored,{blob:await plainChunkBlob(stored)});return stored.blob instanceof Blob?stored:null;}catch(_){return null;}
}
async function storeListeningRecord(cid,audioId,blob,meta,onProgress){
  const record=await prepareMediaRecord(blob,meta,onProgress);
  return replaceStoredMedia(listeningStorageKey(cid,audioId),record)
}

async function migrateListeningEncryption(encrypt,key){
  const staged=[],committed=[];
  try{
    for(const c of data.classes){for(const a of (c.listenings||[])){
      const originalKey=listeningStorageKey(c.id,a.id),stored=await idbGet(originalKey).catch(()=>null);if(!stored)continue;let next=null;
      if(encrypt&&!stored.encrypted&&(stored.blob instanceof Blob||stored.chunkKeys)){next=stored.chunkKeys?await encryptedRecordForMigration(stored,key):await prepareMediaRecord(stored.blob,stored,undefined,key,true);delete next.blob;}
      else if(!encrypt&&stored.encrypted){next=await plainRecordForMigration(stored,key);}
      if(!next)continue;const stageKey=`teacher-app-listening-stage-v1:${c.id}:${a.id}`;await idbSet(stageKey,next);staged.push({originalKey,stageKey,original:stored,next});
    }}
    await recordSecurityMigrationChanges(staged);await idbAtomicCommit(staged.map(item=>[item.originalKey,item.next]));committed.push(...staged);
  }catch(error){for(const item of committed.reverse())await idbSet(item.originalKey,item.original).catch(()=>{});for(const item of staged)await discardPreparedMedia(item.next);throw error;}
  finally{for(const item of staged)await idbDelete(item.stageKey).catch(()=>{});}
  return staged;
}
function openListeningNameModal(cid,audioId){
  const c=getClass(cid),a=c&&(c.listenings||[]).find(x=>x.id===audioId);if(!a)return;
  openModal(`<button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${tr('listening_name_title')}</h3><div class="field"><label>${tr('listening_custom_title')}</label><input id="listenTitle" value="${escapeAttr(a.title||'')}" placeholder="Unit 1 - Lesson 3 - Track 05"></div><div class="listening-name-grid"><div class="field"><label>Unit</label><input id="listenUnit" value="${escapeAttr(a.unit||'')}" placeholder="Unit 1"></div><div class="field"><label>Lesson</label><input id="listenLesson" value="${escapeAttr(a.lesson||'')}" placeholder="Lesson 3"></div><div class="field"><label>Track</label><input id="listenTrack" value="${escapeAttr(a.track||'')}" placeholder="Track 05"></div></div><div class="modal-actions"><button class="btn btn-outline-dark" data-action="openListeningModal('${cid}')">${tr('btn_cancel')}</button><button class="btn btn-gold" data-action="saveListeningName('${cid}','${audioId}')">${tr('btn_save')}</button></div>`);
}
function saveListeningName(cid,audioId){
  const c=getClass(cid),a=c&&(c.listenings||[]).find(x=>x.id===audioId);if(!a)return;
  a.title=String(document.getElementById('listenTitle')?.value||'').trim().slice(0,120);
  a.unit=String(document.getElementById('listenUnit')?.value||'').trim().slice(0,40);
  a.lesson=String(document.getElementById('listenLesson')?.value||'').trim().slice(0,40);
  a.track=String(document.getElementById('listenTrack')?.value||'').trim().slice(0,40);
  a.updatedAt=new Date().toISOString();saveData();openListeningModal(cid);toast(tr('toast_saved'));
}
function toggleListeningFavorite(cid,audioId){
  const c=getClass(cid),a=c&&(c.listenings||[]).find(x=>x.id===audioId);if(!a)return;
  a.favorite=!a.favorite;a.updatedAt=new Date().toISOString();saveData();openListeningModal(cid);
}
function setListeningRate(rate){const a=document.getElementById('lessonAudioPlayer');if(a)a.playbackRate=Math.max(.5,Math.min(2,Number(rate)||1));document.querySelectorAll('.listen-speed').forEach(b=>b.classList.toggle('active',Number(b.dataset.rate)===Number(rate)));}
function skipListening(seconds){const a=document.getElementById('lessonAudioPlayer');if(a&&Number.isFinite(a.duration))a.currentTime=Math.max(0,Math.min(a.duration,a.currentTime+Number(seconds||0)));}
async function openListeningPlayer(cid,audioId){
  const c=getClass(cid),meta=c&&(c.listenings||[]).find(x=>x.id===audioId);
  const raw=await idbGet(listeningStorageKey(cid,audioId));
  const streamed=raw?.chunkKeys&&raw.size>MEDIA_MATERIALIZE_MAX_BYTES&&(raw.encrypted||navigator.serviceWorker?.controller);
  const stored=streamed?raw:await getStoredListening(cid,audioId);if(!stored||!meta){toast(tr('listening_missing'));return;}
  const url=streamed?await mediaStreamUrl(listeningStorageKey(cid,audioId)):URL.createObjectURL(stored.blob),label=listeningLabel(meta);
  openModal(`<button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${escapeHtml(label)}</h3><div class="audio-player-wrap"><div class="textbook-icon">${ICON.audio}</div><audio id="lessonAudioPlayer" controls autoplay preload="metadata" src="${escapeAttr(url)}"></audio></div><div class="listen-controls"><button class="btn btn-outline-dark btn-sm icon-text-btn" data-action="skipListening(-10)">${ICON.rewind}<span>10s</span></button><div class="listen-speeds">${[.75,1,1.25,1.5].map(r=>`<button class="listen-speed ${r===1?'active':''}" data-rate="${r}" data-action="setListeningRate(${r})">${r}×</button>`).join('')}</div><button class="btn btn-outline-dark btn-sm icon-text-btn" data-action="skipListening(10)">${ICON.forward}<span>10s</span></button></div><div class="modal-actions"><button class="btn btn-outline-dark" data-action="downloadListeningAudio('${cid}','${audioId}')">${ICON.download} ${tr('listening_download')}</button></div>`);
  const player=document.getElementById('lessonAudioPlayer');
  const restore=()=>{const pos=Number(meta.lastPosition||0);if(pos>2&&Number.isFinite(player.duration)&&pos<player.duration-3)player.currentTime=pos;};
  player.addEventListener('loadedmetadata',restore,{once:true});
  let lastSave=0;player.addEventListener('timeupdate',()=>{if(Date.now()-lastSave<30000)return;lastSave=Date.now();meta.lastPosition=Math.round(player.currentTime||0);saveData();});
  document.getElementById('modalRoot')._onClose=()=>{meta.lastPosition=Math.round(player.currentTime||0);saveData();URL.revokeObjectURL(url);};
}
async function downloadListeningAudio(cid,audioId){const raw=await idbGet(listeningStorageKey(cid,audioId));if(raw?.chunkKeys&&raw.size>MEDIA_MATERIALIZE_MAX_BYTES&&(raw.encrypted||navigator.serviceWorker?.controller))return openMediaStream(listeningStorageKey(cid,audioId),true);const stored=await getStoredListening(cid,audioId);if(!stored){toast(tr('listening_missing'));return;}saveBlobToDevice(stored.blob,stored.name,false);}
function confirmDeleteListening(cid,audioId){
  confirmModal(tr('listening_delete'),tr('listening_delete_confirm'),async()=>{const c=getClass(cid);if(!c)return;const index=(c.listenings||[]).findIndex(a=>a.id===audioId);const removed=index>-1?c.listenings[index]:null;const stored=await idbGet(listeningStorageKey(cid,audioId)).catch(()=>null);await idbDelete(listeningStorageKey(cid,audioId)).catch(()=>{});setTimeout(()=>{if(!getClass(cid)?.listenings?.some(a=>a.id===audioId))discardPreparedMedia(stored).catch(()=>{})},10000);c.listenings=(c.listenings||[]).filter(a=>a.id!==audioId);await saveData({throwOnError:true});render();openListeningModal(cid);undoToast(tr('listening_removed'),async()=>{if(removed&&!c.listenings.some(a=>a.id===audioId)){c.listenings.splice(Math.max(0,index),0,removed);if(stored)await idbSet(listeningStorageKey(cid,audioId),stored).catch(()=>{});await saveData({throwOnError:true});openListeningModal(cid);toast(tr('listening_restored'));}});});
}
