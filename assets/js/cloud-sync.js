/* Optional end-to-end encrypted cloud sync. Textbooks, listening audio and profile photos stay on-device. */
const CLOUD_CONFIG_KEY='teacher-app-cloud-config-v1';
const CLOUD_KDF_ITERATIONS=310000;
const PUSH_SCHEDULE_DAYS=370;
let cloudConfig={apiUrl:'',email:'',version:0,lastHash:'',lastSyncAt:null,lastError:null,lastSyncBytes:0,deviceId:'',enabled:false,pushEnabled:false,managerSharing:false,managerMembership:null,managerLastSharedAt:null,pushScheduleHash:''};
let cloudToken='',cloudKey=null,cloudSyncTimer=null,cloudSyncBusy=false,cloudSuppressDirty=false,cloudPendingRemote=null;

function cloudStatus(){
  if(!cloudConfig.enabled)return 'off';
  if(!cloudToken||!cloudKey)return 'signed-out';
  return navigator.onLine?'ready':'offline';
}
async function persistCloudConfig(){
  const safe={apiUrl:cloudConfig.apiUrl,email:cloudConfig.email,version:cloudConfig.version,lastHash:cloudConfig.lastHash,lastSyncAt:cloudConfig.lastSyncAt,lastError:cloudConfig.lastError,lastSyncBytes:cloudConfig.lastSyncBytes,deviceId:cloudConfig.deviceId,enabled:cloudConfig.enabled,pushEnabled:cloudConfig.pushEnabled,managerSharing:Boolean(cloudConfig.managerSharing),managerMembership:cloudConfig.managerMembership||null,managerLastSharedAt:cloudConfig.managerLastSharedAt||null,pushScheduleHash:cloudConfig.pushScheduleHash||''};
  await storageSet(CLOUD_CONFIG_KEY,JSON.stringify(safe));
}
async function initCloudSync(){
  try{const saved=JSON.parse((await storageGet(CLOUD_CONFIG_KEY))||'null');if(saved&&typeof saved==='object')cloudConfig=Object.assign(cloudConfig,saved)}catch(_){ }
  if(!/^[a-zA-Z0-9_-]{8,100}$/.test(cloudConfig.deviceId||'')){cloudConfig.deviceId=crypto.randomUUID?crypto.randomUUID():uid();await persistCloudConfig()}
  window.addEventListener('online',()=>{if(cloudToken&&cloudConfig.enabled)scheduleCloudSync(800)});
}
function normalizedCloudUrl(raw){
  const value=String(raw||'').trim().replace(/\/+$/,'');
  if(!value)return '';
  const url=new URL(value,location.href);
  const local=['localhost','127.0.0.1','::1'].includes(url.hostname);
  if(url.protocol!=='https:'&&!local)throw new Error('https_required');
  if(url.username||url.password||url.hash||url.search)throw new Error('invalid_url');
  return url.origin+(url.pathname==='/'?'':url.pathname);
}
async function cloudRequest(path,options={}){
  if(!cloudConfig.apiUrl)throw new Error('cloud_url_missing');
  const headers=Object.assign({'Content-Type':'application/json'},options.headers||{});
  if(cloudToken)headers.Authorization=`Bearer ${cloudToken}`;
  return apiJsonRequest(`${cloudConfig.apiUrl}${path}`,{...options,headers});
}
function cloudPortableData(){
  const copy=JSON.parse(JSON.stringify(data));
  if(copy.profile)copy.profile.photo='';
  (copy.classes||[]).forEach(c=>{delete c.textbook;delete c.listenings});
  if(copy.settings){
    delete copy.settings.security;
    delete copy.settings.notifications;
    delete copy.settings.lastExportAt;
  }
  delete copy.backupMeta;
  return {schemaVersion:1,data:copy};
}
function cloudHasLocalContent(){return Boolean((data.classes&&data.classes.length)||(data.profile&&(data.profile.name||data.profile.phone||data.profile.subject||data.profile.workplace||(data.profile.notes&&data.profile.notes.length)||(data.profile.personalReminders&&data.profile.personalReminders.length))))}
async function cloudHash(value){
  const bytes=await crypto.subtle.digest('SHA-256',DKCrypto.encodeText(typeof value==='string'?value:JSON.stringify(value)));
  return DKCrypto.bytesToBase64(new Uint8Array(bytes));
}
async function encryptedCloudPayload(){
  if(!cloudKey)throw new Error('cloud_locked');
  const json=JSON.stringify(cloudPortableData());
  return {format:'dk-cloud-v1',ciphertext:await DKCrypto.encryptText(json,cloudKey)};
}
async function decodeCloudPayload(payload){
  if(!cloudKey||!payload||payload.format!=='dk-cloud-v1'||typeof payload.ciphertext!=='string')throw new Error('invalid_cloud_payload');
  const parsed=JSON.parse(await DKCrypto.decryptText(payload.ciphertext,cloudKey));
  if(!parsed||parsed.schemaVersion!==1||!parsed.data)throw new Error('invalid_cloud_payload');
  return assertBackupShape(parsed.data);
}
async function applyCloudData(remote){
  const localPhoto=data.profile&&data.profile.photo||'';
  const localBooks=new Map((data.classes||[]).filter(c=>c.textbook).map(c=>[c.id,c.textbook]));
  const localListenings=new Map((data.classes||[]).filter(c=>Array.isArray(c.listenings)&&c.listenings.length).map(c=>[c.id,c.listenings]));
  const localSettings=data.settings||defaultData().settings;
  const next=Object.assign(defaultData(),remote);
  next.profile=Object.assign(defaultData().profile,next.profile||{},{photo:localPhoto});
  next.settings=Object.assign({},localSettings,next.settings||{},{security:localSettings.security,notifications:localSettings.notifications,lastExportAt:localSettings.lastExportAt});
  (next.classes||[]).forEach(c=>{if(localBooks.has(c.id))c.textbook=localBooks.get(c.id);if(localListenings.has(c.id))c.listenings=localListenings.get(c.id);else c.listenings=[]});
  data=next;migrateData();cloudSuppressDirty=true;
  try{await saveData({throwOnError:true})}finally{cloudSuppressDirty=false}
  render();
}
function markCloudDirty(){
  if(cloudSuppressDirty||!cloudConfig.enabled||!cloudToken||!cloudKey)return;
  scheduleCloudSync(3500);
}
function scheduleCloudSync(delay=2500){clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>cloudSyncNow(false),delay)}

async function cloudSyncNow(showResult=true){
  if(cloudSyncBusy||!cloudToken||!cloudKey||!cloudConfig.enabled||!navigator.onLine){if(showResult)toast(tr('cloud_not_ready'));return}
  cloudSyncBusy=true;
  try{
    const portable=cloudPortableData(),localHash=await cloudHash(portable),remote=await cloudRequest('/api/v1/sync');
    if(Number(remote.version)>Number(cloudConfig.version)){
      if((cloudConfig.lastHash&&localHash!==cloudConfig.lastHash)||(!cloudConfig.lastHash&&cloudHasLocalContent())){cloudPendingRemote=remote;openCloudConflictModal();return}
      const decoded=await decodeCloudPayload(remote.payload);await applyCloudData(decoded);
      cloudConfig.version=Number(remote.version);cloudConfig.lastHash=await cloudHash(cloudPortableData());cloudConfig.lastSyncAt=new Date().toISOString();cloudConfig.lastSyncBytes=new TextEncoder().encode(JSON.stringify(remote.payload||{})).byteLength;cloudConfig.lastError=null;await persistCloudConfig();
      if(showResult)toast(tr('cloud_pulled'));
    }else if(localHash!==cloudConfig.lastHash||Number(remote.version)===0){
      const payload=await encryptedCloudPayload();
      try{
        const saved=await cloudRequest('/api/v1/sync',{method:'PUT',body:JSON.stringify({baseVersion:Number(remote.version)||0,payload})});
        cloudConfig.version=Number(saved.version);cloudConfig.lastHash=localHash;cloudConfig.lastSyncAt=new Date().toISOString();cloudConfig.lastSyncBytes=new TextEncoder().encode(JSON.stringify(payload)).byteLength;cloudConfig.lastError=null;await persistCloudConfig();
        if(showResult)toast(tr('cloud_synced'));
      }catch(error){if(error.status===409){cloudPendingRemote=await cloudRequest('/api/v1/sync');openCloudConflictModal()}else throw error}
    }else{cloudConfig.lastError=null;await persistCloudConfig();if(showResult)toast(tr('cloud_up_to_date'))}
    if(cloudConfig.managerSharing&&cloudConfig.managerMembership&&typeof publishManagerSnapshot==='function')await publishManagerSnapshot(false).catch(()=>{});
  }catch(error){console.warn('Cloud sync failed',error);cloudConfig.lastError={code:String(error.message||'cloud_failed').slice(0,80),at:new Date().toISOString()};await persistCloudConfig().catch(()=>{});if(showResult)toast(error.message==='OperationError'?tr('cloud_wrong_password'):tr('cloud_failed'))}
  finally{cloudSyncBusy=false}
}
function openCloudConflictModal(){
  openModal(`<button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${tr('cloud_conflict_title')}</h3><p class="appearance-note">${tr('cloud_conflict_hint')}</p><button class="btn btn-gold" data-action="resolveCloudConflict('remote')">${tr('cloud_use_remote')}</button><button class="btn btn-outline-dark" data-style="margin-top:9px" data-action="resolveCloudConflict('local')">${tr('cloud_use_local')}</button>`);
}
async function resolveCloudConflict(choice){
  const remote=cloudPendingRemote;cloudPendingRemote=null;if(!remote)return;
  try{
    if(choice==='remote'){
      const decoded=await decodeCloudPayload(remote.payload);await applyCloudData(decoded);cloudConfig.version=Number(remote.version);cloudConfig.lastHash=await cloudHash(cloudPortableData());
    }else{
      const payload=await encryptedCloudPayload();const saved=await cloudRequest('/api/v1/sync',{method:'PUT',body:JSON.stringify({baseVersion:Number(remote.version),payload})});cloudConfig.version=Number(saved.version);cloudConfig.lastHash=await cloudHash(cloudPortableData());
    }
    cloudConfig.lastSyncAt=new Date().toISOString();await persistCloudConfig();closeModal();toast(tr('cloud_synced'));
  }catch(error){toast(tr('cloud_failed'))}
}

function openCloudSyncModal(){
  const signed=Boolean(cloudToken&&cloudKey),status=cloudStatus();
  openModal(`<button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${tr('cloud_title')}</h3><p class="appearance-note">${tr('cloud_privacy_hint')}</p>
    <div class="cloud-status cloud-${status}"><span></span><b>${tr(`cloud_status_${status.replace('-','_')}`)}</b></div>
    ${signed?`<div class="cloud-account"><b>${escapeHtml(cloudConfig.email)}</b><small>${cloudConfig.lastSyncAt?tr('cloud_last_sync').replace('{date}',new Date(cloudConfig.lastSyncAt).toLocaleString()):tr('cloud_never_synced')}</small></div><div class="cloud-health"><b>${tr('cloud_sync_health')}</b><span>${cloudConfig.lastError?tr('cloud_last_error').replace('{error}',escapeHtml(cloudConfig.lastError.code)):tr('cloud_no_error')}</span><span>${tr('cloud_last_size').replace('{size}',formatBytes(cloudConfig.lastSyncBytes||0))}</span><span>${tr('cloud_device_id').replace('{id}',escapeHtml((cloudConfig.deviceId||'').slice(0,12)))}</span></div>${typeof renderTeacherManagerSharing==='function'?renderTeacherManagerSharing():''}<button class="btn btn-gold" data-action="cloudSyncNow()">${tr('cloud_sync_now')}</button><button class="btn btn-outline-dark" data-style="margin-top:9px" data-action="${cloudConfig.pushEnabled?'disableCloudPush()':'enableCloudPush()'}">${cloudConfig.pushEnabled?tr('cloud_push_disable'):tr('cloud_push_enable')}</button><button class="btn btn-outline-dark" data-style="margin-top:9px" data-action="openCloudSessions()">${tr('cloud_sessions')}</button><button class="btn btn-outline-dark" data-style="margin-top:9px" data-action="cloudLogout()">${tr('cloud_logout')}</button><button class="btn btn-danger" data-style="margin-top:9px" data-action="openCloudDeleteAccountModal()">${tr('cloud_delete_account')}</button>`:
    `<div class="field"><label>${tr('cloud_api_url')}</label><input id="cloudApiUrl" type="url" dir="ltr" inputmode="url" autocomplete="url" value="${escapeAttr(cloudConfig.apiUrl)}" placeholder="https://api.example.com"></div><div class="field"><label>${tr('cloud_email')}</label><input id="cloudEmail" type="email" dir="ltr" autocomplete="username" value="${escapeAttr(cloudConfig.email)}"></div><div class="field"><label>${tr('cloud_password')}</label><input id="cloudPassword" type="password" dir="ltr" autocomplete="current-password" minlength="10"></div><div class="field"><label>${tr('cloud_sync_passphrase')}</label><input id="cloudSyncPassphrase" type="password" dir="ltr" autocomplete="off" minlength="12"><small>${tr('cloud_sync_passphrase_hint')}</small></div><button class="btn btn-gold" data-action="cloudAuthenticate('login')">${tr('cloud_login')}</button><button class="btn btn-outline-dark" data-style="margin-top:9px" data-action="cloudAuthenticate('register')">${tr('cloud_register')}</button>`}
    <p class="appearance-note cloud-exclusion">${tr('cloud_exclusion')}</p>`);
}
async function cloudAuthenticate(mode){
  try{
    cloudConfig.apiUrl=normalizedCloudUrl(document.getElementById('cloudApiUrl').value);
    const email=String(document.getElementById('cloudEmail').value||'').trim().toLowerCase(),password=document.getElementById('cloudPassword').value,syncPassphrase=String(document.getElementById('cloudSyncPassphrase')?.value||'');
    if(!email||password.length<10||syncPassphrase.length<12){toast(tr('cloud_credentials_invalid'));return}
    if(syncPassphrase===password){toast(tr('cloud_sync_passphrase_separate'));return}
    const result=await cloudRequest(`/api/v1/auth/${mode}`,{method:'POST',body:JSON.stringify({email,password,deviceId:cloudConfig.deviceId,deviceName:(navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||'Web app'})});
    cloudToken=result.token;cloudKey=await DKCrypto.deriveKey(syncPassphrase,DKCrypto.base64ToBytes(result.kdfSalt),CLOUD_KDF_ITERATIONS);
    cloudConfig.email=email;cloudConfig.enabled=true;cloudConfig.version=0;cloudConfig.lastHash='';await refreshTeacherOrganization(false).catch(()=>{});await persistCloudConfig();
    openCloudSyncModal();await cloudSyncNow(true);
  }catch(error){console.warn(error);toast(error.message==='account_exists'?tr('cloud_account_exists'):tr('cloud_auth_failed'))}
}
async function openCloudSessions(){
  try{
    const result=await cloudRequest('/api/v1/sessions');
    const rows=(result.sessions||[]).map(s=>`<div class="cloud-session"><div><b>${escapeHtml(s.device_name||'Web app')}${s.current?` · ${tr('cloud_session_current')}`:''}</b><span>${tr('cloud_session_last_seen').replace('{date}',new Date(s.last_seen_at).toLocaleString())}</span></div><button type="button" class="icon-action danger" data-action="revokeCloudSession('${s.id}',${s.current?'true':'false'})" aria-label="${escapeAttr(tr('cloud_session_revoke'))}">${ICON.x}</button></div>`).join('');
    openModal(`<button type="button" class="modal-close-x" data-action="openCloudSyncModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${tr('cloud_sessions')}</h3><p class="appearance-note">${tr('cloud_sessions_hint')}</p><div class="cloud-session-list">${rows}</div><button type="button" class="btn btn-danger" data-style="margin-top:14px" data-action="confirmCloudLogoutAll()">${tr('cloud_logout_all')}</button>`);
  }catch(error){toast(tr('cloud_sessions_failed'))}
}
async function revokeCloudSession(id,current){
  try{await cloudRequest(`/api/v1/sessions/${encodeURIComponent(id)}`,{method:'DELETE'});if(current){cloudToken='';cloudKey=null;cloudConfig.enabled=false;await persistCloudConfig();closeModal()}else await openCloudSessions();toast(tr('cloud_session_revoked'))}catch(_){toast(tr('cloud_sessions_failed'))}
}
function confirmCloudLogoutAll(){confirmModal(tr('cloud_logout_all'),tr('cloud_logout_all_confirm'),cloudLogoutAll)}
async function cloudLogoutAll(){
  try{await cloudRequest('/api/v1/auth/logout-all',{method:'POST',body:'{}'})}catch(_){ }
  cloudToken='';cloudKey=null;cloudConfig.enabled=false;cloudConfig.pushEnabled=false;cloudConfig.managerSharing=false;await persistCloudConfig();closeModal();toast(tr('cloud_logged_out'));
}
async function cloudLogout(){
  try{
    if(cloudToken&&cloudConfig.pushEnabled&&'serviceWorker'in navigator){const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub)await cloudRequest('/api/v1/push/subscriptions',{method:'DELETE',body:JSON.stringify({endpoint:sub.endpoint})})}
    if(cloudToken)await cloudRequest('/api/v1/auth/logout',{method:'POST',body:'{}'});
  }catch(_){ }
  cloudToken='';cloudKey=null;cloudConfig.enabled=false;cloudConfig.pushEnabled=false;cloudConfig.managerSharing=false;await persistCloudConfig();openCloudSyncModal();toast(tr('cloud_logged_out'));
}
function openCloudDeleteAccountModal(){
  openModal(`<button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${tr('cloud_delete_account')}</h3><p class="danger-note">${tr('cloud_delete_hint')}</p><div class="field"><label for="cloudDeletePassword">${tr('cloud_password')}</label><input id="cloudDeletePassword" type="password" dir="ltr" autocomplete="current-password" minlength="10"></div><div class="modal-actions"><button class="btn btn-outline-dark" data-action="openCloudSyncModal()">${tr('btn_cancel')}</button><button class="btn btn-danger" data-action="cloudDeleteAccount()">${tr('cloud_delete_confirm')}</button></div>`);
}
async function cloudDeleteAccount(){
  const input=document.getElementById('cloudDeletePassword'),password=input&&input.value||'';
  if(password.length<10){toast(tr('cloud_credentials_invalid'));return}
  try{
    await cloudRequest('/api/v1/account',{method:'DELETE',body:JSON.stringify({password})});
    cloudToken='';cloudKey=null;cloudConfig={apiUrl:cloudConfig.apiUrl,email:'',version:0,lastHash:'',lastSyncAt:null,enabled:false,pushEnabled:false,managerSharing:false,managerMembership:null,managerLastSharedAt:null,pushScheduleHash:''};
    await persistCloudConfig();closeModal();toast(tr('cloud_account_deleted'));
  }catch(error){console.warn(error);toast(error.status===401?tr('cloud_wrong_password'):tr('cloud_delete_failed'))}
}
function urlBase64Bytes(value){const pad='='.repeat((4-value.length%4)%4);return DKCrypto.base64ToBytes((value+pad).replace(/-/g,'+').replace(/_/g,'/'))}
async function enableCloudPush(){
  try{
    if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw new Error('unsupported');
    const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('denied');
    const config=await cloudRequest('/api/v1/config'),reg=await navigator.serviceWorker.ready;
    if(!config.vapidPublicKey)throw new Error('not_configured');
    let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64Bytes(config.vapidPublicKey)});
    await cloudRequest('/api/v1/push/subscriptions',{method:'POST',body:JSON.stringify({subscription:sub.toJSON(),locale:data.settings.lang||'fa'})});
    cloudConfig.pushEnabled=true;await persistCloudConfig();await scheduleNextCloudPush();openCloudSyncModal();toast(tr('cloud_push_on'));
  }catch(error){console.warn(error);toast(tr('cloud_push_failed'))}
}
async function disableCloudPush(){
  try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub){await cloudRequest('/api/v1/push/subscriptions',{method:'DELETE',body:JSON.stringify({endpoint:sub.endpoint})});await sub.unsubscribe()}}catch(_){ }
  cloudConfig.pushEnabled=false;await persistCloudConfig();openCloudSyncModal();toast(tr('cloud_push_off'));
}
async function scheduleNextCloudPush(){
  if(!cloudConfig.pushEnabled||!cloudToken)return;
  const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(!sub)return;
  const now=tehranNowFull(),nowMinutes=now.hour*60+now.minute,jobs=[];
  for(let day=0;day<=PUSH_SCHEDULE_DAYS;day++){
    const date=new Date(Date.now()+day*86400_000),weekday=weekdayNameForDate(date);
    for(const c of data.classes||[]){
      const start=parseTimeToMinutes(c.info&&c.info.startTime);if(start==null||!classActiveToday(c,weekday))continue;
      const minutes=day*1440+start-nowMinutes-15;if(minutes>0)jobs.push({at:new Date(Date.now()+minutes*60000).toISOString(),kind:'class'});
    }
  }
  const horizon=Date.now()+PUSH_SCHEDULE_DAYS*86400_000;
  for(const reminder of data.profile.personalReminders||[]){
    let at=new Date(`${reminder.dueIso}T09:00:00+03:30`).getTime(),guard=0;
    while(at<Date.now()-60000&&reminder.repeatDays>0&&guard++<400)at+=reminder.repeatDays*86400_000;
    while(at<=horizon&&guard++<400){if(at>=Date.now()-60000)jobs.push({at:new Date(at).toISOString(),kind:reminder.kind==='backup'?'backup':'personal'});if(!reminder.repeatDays)break;at+=reminder.repeatDays*86400_000}
  }
  const unique=[...new Map(jobs.sort((a,b)=>a.at.localeCompare(b.at)).map(job=>[`${job.at}|${job.kind}`,job])).values()].slice(0,1200);
  const signature=await cloudHash({endpoint:sub.endpoint,jobs:unique,locale:data.settings.lang||'fa'});
  if(signature===cloudConfig.pushScheduleHash)return;
  await cloudRequest('/api/v1/push/schedule',{method:'PUT',body:JSON.stringify({endpoint:sub.endpoint,jobs:unique,locale:data.settings.lang||'fa'})});
  cloudConfig.pushScheduleHash=signature;await persistCloudConfig();
}
