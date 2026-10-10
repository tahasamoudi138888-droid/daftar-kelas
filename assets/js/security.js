async function pinDigest(pin,salt){
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:180000},material,256);
  return DKCrypto.bytesToBase64(new Uint8Array(bits));
}
function appLockEnabled(){ return !!((encryptionMeta&&encryptionMeta.enabled)||(data.settings&&data.settings.security&&data.settings.security.pinHash)); }
function lockMinutes(){ return Number((encryptionMeta&&encryptionMeta.autoLockMinutes)||(data.settings&&data.settings.security&&data.settings.security.autoLockMinutes)||5); }
function openSecurityModal(){
  if(!appLockEnabled()){
    openModal(`
      <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
      <h3>${tr('security_enable_title')}</h3>
      <p class="appearance-note">${tr('security_enable_hint')}</p>
      <div class="field"><label>${tr('security_new_pin')}</label><input id="newPin" type="password" minlength="4" maxlength="128" autocomplete="new-password"></div>
      <div class="field"><label>${tr('security_repeat_pin')}</label><input id="newPin2" type="password" minlength="4" maxlength="128" autocomplete="new-password"></div>
      <button class="btn btn-gold" data-style="width:100%" data-action="enablePinLock()">${tr('security_enable_button')}</button>
    `); return;
  }
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <h3>${tr('security_title')}</h3>
    <div class="smart-reminder"><div class="sicon">${ICON.lock}</div><div class="stext"><b>${tr('security_active')}</b><span>${tr('security_active_hint')}</span></div></div>
    <div class="backup-row" data-action="lockApp()"><div class="theme-icon">${ICON.lock}</div><div class="theme-texts"><b>${tr('security_lock_now')}</b><span>${tr('security_lock_now_hint')}</span></div><div class="chev">${ICON.chev}</div></div>
    <h2 class="section-title" data-style="color:var(--ink);opacity:.7;">${tr('security_auto_lock')}</h2>
    <div class="seg" data-style="grid-template-columns:repeat(4,1fr)">${[1,5,15,30].map(m=>`<button type="button" class="${lockMinutes()===m?'sel':''}" data-action="setAutoLockMinutes(${m})">${m} ${tr('minutes')}</button>`).join('')}</div>
    ${encryptionMeta&&encryptionMeta.biometric?`<div class="backup-row" data-action="disableBiometricUnlock()"><div class="theme-icon">${ICON.user}</div><div class="theme-texts"><b>${tr('security_biometric_on')}</b><span>${tr('security_biometric_disable_hint')}</span></div><div class="chev">${ICON.chev}</div></div>`:`<div class="backup-row" data-action="openBiometricSetup()"><div class="theme-icon">${ICON.user}</div><div class="theme-texts"><b>${tr('security_biometric_enable')}</b><span>${tr('security_biometric_hint')}</span></div><div class="chev">${ICON.chev}</div></div>`}
    <p class="appearance-note">${tr('security_biometric_support')}</p>
    <button class="btn btn-danger" data-style="width:100%" data-action="disablePinLock()">${tr('security_disable')}</button>
  `);
}

function biometricApiAvailable(){return !!(window.PublicKeyCredential&&navigator.credentials&&window.crypto&&crypto.subtle&&window.isSecureContext);}
async function biometricWrapKey(secret){const digest=await crypto.subtle.digest('SHA-256',secret instanceof ArrayBuffer?secret:secret.buffer);return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt']);}
function openBiometricSetup(){
  if(!biometricApiAvailable()){toast(tr('security_biometric_unavailable'));return;}
  openModal(`<button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${tr('security_biometric_enable')}</h3><p class="appearance-note">${tr('security_biometric_setup_hint')}</p><div class="field"><label>${tr('security_current_pin')}</label><input id="biometricPin" type="password" minlength="4" maxlength="128" autocomplete="current-password"></div><button class="btn btn-gold" data-style="width:100%" data-action="enableBiometricUnlock()">${tr('security_biometric_enable')}</button>`);
}
async function enableBiometricUnlock(){
  if(!encryptionMeta||!encryptionMeta.enabled||!biometricApiAvailable()){toast(tr('security_biometric_unavailable'));return;}
  const pin=normalizeDigits(document.getElementById('biometricPin')?.value||'').trim();if(!validUnlockSecret(pin)){toast(tr('security_pin_invalid'));return;}
  try{
    const checkKey=await DKCrypto.deriveKey(pin,DKCrypto.base64ToBytes(encryptionMeta.salt),encryptionMeta.iterations||ENCRYPTION_ITERATIONS);
    await decodeStoredSnapshot(await storageGet(STORE_KEY),checkKey,true);
    const prfSalt=crypto.getRandomValues(new Uint8Array(32)),challenge=crypto.getRandomValues(new Uint8Array(32)),userId=crypto.getRandomValues(new Uint8Array(16));
    const credential=await navigator.credentials.create({publicKey:{challenge,rp:{name:tr('title_app')},user:{id:userId,name:'local-teacher',displayName:(data.profile&&data.profile.name)||tr('title_profile')},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged'},timeout:60000,attestation:'none',extensions:{prf:{eval:{first:prfSalt}}}}});
    if(!credential)throw new Error('no credential');
    const assertion=await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:credential.rawId}],userVerification:'required',timeout:60000,extensions:{prf:{eval:{first:prfSalt}}}}});
    const prf=assertion&&assertion.getClientExtensionResults&&assertion.getClientExtensionResults().prf;
    const secret=prf&&prf.results&&prf.results.first;if(!secret)throw new Error('prf unsupported');
    const wrapKey=await biometricWrapKey(secret),wrapped=await DKCrypto.encryptBytes(new TextEncoder().encode(pin),wrapKey);
    encryptionMeta.biometric={credentialId:DKCrypto.bytesToBase64(new Uint8Array(credential.rawId)),prfSalt:DKCrypto.bytesToBase64(prfSalt),wrappedPin:DKCrypto.bytesToBase64(wrapped)};
    await persistEncryptionMeta();closeModal();toast(tr('security_biometric_enabled'));
  }catch(error){console.error(error);toast(tr('security_biometric_failed'));}
}
function disableBiometricUnlock(){
  if(encryptionMeta&&encryptionMeta.biometric){delete encryptionMeta.biometric;persistEncryptionMeta().catch(()=>{});}openSecurityModal();toast(tr('security_biometric_disabled'));
}
async function unlockWithBiometric(){
  const err=document.getElementById('lockError'),bio=encryptionMeta&&encryptionMeta.biometric;if(!bio||!biometricApiAvailable()){if(err)err.textContent=tr('security_biometric_unavailable');return;}
  try{
    const assertion=await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:DKCrypto.base64ToBytes(bio.credentialId)}],userVerification:'required',timeout:60000,extensions:{prf:{eval:{first:DKCrypto.base64ToBytes(bio.prfSalt)}}}}});
    const prf=assertion&&assertion.getClientExtensionResults&&assertion.getClientExtensionResults().prf,secret=prf&&prf.results&&prf.results.first;if(!secret)throw new Error('prf unavailable');
    const wrapKey=await biometricWrapKey(secret),pin=new TextDecoder().decode(await DKCrypto.decryptBytes(DKCrypto.base64ToBytes(bio.wrappedPin),wrapKey));
    const key=await DKCrypto.deriveKey(pin,DKCrypto.base64ToBytes(encryptionMeta.salt),encryptionMeta.iterations||ENCRYPTION_ITERATIONS);
    const decoded=await decodeStoredSnapshot(pendingEncryptedStore||await storageGet(STORE_KEY),key,true);
    data=Object.assign(defaultData(),assertBackupShape(JSON.parse(decoded)));migrateData();sessionEncryptionKey=key;pendingEncryptedStore=null;encryptionMeta.failCount=0;encryptionMeta.blockedUntil=0;await persistEncryptionMeta();await runScheduledAutoBackup();unlockSuccess();render();
  }catch(error){console.error(error);if(err)err.textContent=tr('lock_biometric_failed');}
}
async function enablePinLock(){
  const pin=normalizeDigits(document.getElementById('newPin').value).trim();
  const pin2=normalizeDigits(document.getElementById('newPin2').value).trim();
  if(!validNewLocalSecret(pin)){ toast(tr('security_pin_invalid')); return; }
  if(pin!==pin2){ toast(tr('security_pin_mismatch')); return; }
  if(!window.crypto||!window.crypto.subtle){ toast(tr('security_crypto_unsupported')); return; }
  let key=null,booksMigrated=false,listeningsMigrated=false,backupsMigrated=false,mainEncrypted=false,bookChanges=[],audioChanges=[];
  try{
    await saveQueue;
    toast(tr('security_encrypting'));
    purgePlaintextDrafts();
    await beginSecurityMigration(true);
  navigator.serviceWorker?.controller?.postMessage({type:'CLEAR_LOCAL_MEDIA'});
    const salt=crypto.getRandomValues(new Uint8Array(16));
    key=await DKCrypto.deriveKey(pin,salt,ENCRYPTION_ITERATIONS);
    bookChanges=await migrateTextbookEncryption(true,key);booksMigrated=true;
    audioChanges=await migrateListeningEncryption(true,key);listeningsMigrated=true;
    await migrateAutoBackupEncryption(true,key);backupsMigrated=true;
    data.settings.security={pinHash:'',pinSalt:'',autoLockMinutes:5};
    encryptionMeta={enabled:true,secretStrength:validNewLocalSecret(pin)?'strong':'legacy',salt:DKCrypto.bytesToBase64(salt),iterations:ENCRYPTION_ITERATIONS,autoLockMinutes:5,failCount:0,blockedUntil:0,lang:data.settings.lang||'fa',createdAt:new Date().toISOString()};
    sessionEncryptionKey=key;
    await storageSet(STORE_KEY,await encodeStoredSnapshot(JSON.stringify(data)));mainEncrypted=true;
    await persistEncryptionMeta();await finishSecurityMigration();closeModal();resetAutoLockTimer();toast(tr('security_enabled'));
  }catch(e){
    console.error(e);
    if(mainEncrypted){await persistEncryptionMeta().catch(()=>{});await finishSecurityMigration().catch(()=>{});closeModal();toast(tr('security_enabled'));return}
    if(backupsMigrated&&key)await migrateAutoBackupEncryption(false,key).catch(()=>{});
    if(listeningsMigrated&&key)await rollbackMediaMigration(audioChanges).catch(()=>{});
    if(booksMigrated&&key)await rollbackMediaMigration(bookChanges).catch(()=>{});
    await abortSecurityMigration().catch(()=>{});
    encryptionMeta=null;sessionEncryptionKey=null;await persistEncryptionMeta().catch(()=>{});
    toast(tr('security_enable_failed'));
  }
}
function disablePinLock(){
  confirmModal(tr('security_disable_title'),tr('security_disable_confirm'),async()=>{
    const previousMeta=encryptionMeta,key=sessionEncryptionKey;
    let booksMigrated=false,listeningsMigrated=false,backupsMigrated=false,bookChanges=[],audioChanges=[];
    try{
      if(!key)throw new Error('locked');
      await saveQueue;
      await beginSecurityMigration(false);
      bookChanges=await migrateTextbookEncryption(false,key);booksMigrated=true;
      audioChanges=await migrateListeningEncryption(false,key);listeningsMigrated=true;
      await migrateAutoBackupEncryption(false,key);backupsMigrated=true;
      encryptionMeta=null;sessionEncryptionKey=null;await persistEncryptionMeta();
      data.settings.security={pinHash:'',pinSalt:'',autoLockMinutes:5};
      await storageSet(STORE_KEY,JSON.stringify(data));await finishSecurityMigration();clearTimeout(inactivityLockTimer);toast(tr('security_disabled'));
    }catch(error){
      console.error(error);encryptionMeta=previousMeta;sessionEncryptionKey=key;
      if(backupsMigrated&&key)await migrateAutoBackupEncryption(true,key).catch(()=>{});
      if(listeningsMigrated&&key)await rollbackMediaMigration(audioChanges).catch(()=>{});
      if(booksMigrated&&key)await rollbackMediaMigration(bookChanges).catch(()=>{});
      await abortSecurityMigration().catch(()=>{});
      await persistEncryptionMeta().catch(()=>{});
      if(key&&previousMeta)await storageSet(STORE_KEY,await encodeStoredSnapshot(JSON.stringify(data))).catch(()=>{});
      toast(tr('security_disable_failed'));
    }
  });
}
async function setAutoLockMinutes(minutes){
  data.settings.security.autoLockMinutes=minutes;
  if(encryptionMeta){ encryptionMeta.autoLockMinutes=minutes;await persistEncryptionMeta(); }
  await saveData({throwOnError:true});resetAutoLockTimer();openSecurityModal();
}
let lockFailures=0, lockBlockedUntil=0, hiddenAt=0, inactivityLockTimer=null;
function resetAutoLockTimer(){
  clearTimeout(inactivityLockTimer);
  if(appLockEnabled()&&sessionEncryptionKey&&!document.hidden)inactivityLockTimer=setTimeout(()=>lockApp(),lockMinutes()*60000);
}
['pointerdown','keydown','touchstart'].forEach(type=>document.addEventListener(type,resetAutoLockTimer,{capture:true,passive:true}));
document.addEventListener('keydown',event=>{
  const root=document.getElementById('appLock');if(event.key!=='Tab'||!root||root.hidden)return;
  const focusable=[...root.querySelectorAll('input,button,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled);
  if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
});
async function lockApp(){
  if(!appLockEnabled()) return;
  clearTimeout(inactivityLockTimer);
  purgePlaintextDrafts();
  navigator.serviceWorker?.controller?.postMessage({type:'CLEAR_LOCAL_MEDIA'});
  const lockLang=(data.settings&&data.settings.lang)||(encryptionMeta&&encryptionMeta.lang)||'fa';
  if(encryptionMeta&&sessionEncryptionKey){
    await saveData({throwOnError:true});pendingEncryptedStore=await storageGet(STORE_KEY);sessionEncryptionKey=null;data=defaultData();data.settings.lang=lockLang;
  }
  closeModal();
  const shell=document.getElementById('shell');if(shell){shell.inert=true;shell.setAttribute('aria-hidden','true')}
  const root=document.getElementById('appLock');root.hidden=false;
  root.innerHTML=`<div class="lock-card"><div class="lock-mark">${ICON.lock}</div><h2>${tr('lock_title')}</h2><p>${tr('lock_hint')}</p><input class="lock-pin" id="unlockPin" type="password" minlength="4" maxlength="128" autocomplete="current-password" aria-label="PIN"><div class="lock-error" id="lockError"></div><div class="lock-actions"><button class="btn btn-gold" data-action="unlockWithPin()">${tr('lock_unlock')}</button>${encryptionMeta&&encryptionMeta.biometric?`<button class="btn btn-outline-dark" data-action="unlockWithBiometric()">${tr('lock_biometric')}</button>`:''}</div></div>`;
  const input=document.getElementById('unlockPin');input.onkeydown=e=>{if(e.key==='Enter')unlockWithPin()};setTimeout(()=>input.focus(),60);
}
function unlockSuccess(){const root=document.getElementById('appLock');root.hidden=true;root.innerHTML='';const shell=document.getElementById('shell');if(shell){shell.inert=false;shell.removeAttribute('aria-hidden')}lockFailures=0;lockBlockedUntil=0;resetAutoLockTimer()}
async function unlockWithPin(){
  const err=document.getElementById('lockError');
  const blocked=Math.max(lockBlockedUntil,Number(encryptionMeta&&encryptionMeta.blockedUntil)||0);
  if(Date.now()<blocked){err.textContent=tr('lock_wait').replace('{seconds}',Math.ceil((blocked-Date.now())/1000));return}
  const input=document.getElementById('unlockPin'),pin=normalizeDigits(input.value).trim();
  try{
    if(encryptionMeta&&encryptionMeta.enabled){
      const key=await DKCrypto.deriveKey(pin,DKCrypto.base64ToBytes(encryptionMeta.salt),encryptionMeta.iterations||ENCRYPTION_ITERATIONS);
      const decoded=await decodeStoredSnapshot(pendingEncryptedStore||await storageGet(STORE_KEY),key,true);
      data=Object.assign(defaultData(),assertBackupShape(JSON.parse(decoded)));migrateData();sessionEncryptionKey=key;pendingEncryptedStore=null;
      encryptionMeta.failCount=0;encryptionMeta.blockedUntil=0;await persistEncryptionMeta();await runScheduledAutoBackup();unlockSuccess();render();return;
    }
    const hash=await pinDigest(pin,DKCrypto.base64ToBytes(data.settings.security.pinSalt));
    if(hash===data.settings.security.pinHash){
      const salt=crypto.getRandomValues(new Uint8Array(16)),key=await DKCrypto.deriveKey(pin,salt,ENCRYPTION_ITERATIONS);
      await migrateTextbookEncryption(true,key);await migrateListeningEncryption(true,key);await migrateAutoBackupEncryption(true,key);data.settings.security={pinHash:'',pinSalt:'',autoLockMinutes:data.settings.security.autoLockMinutes||5};
      encryptionMeta={enabled:true,secretStrength:validNewLocalSecret(pin)?'strong':'legacy',salt:DKCrypto.bytesToBase64(salt),iterations:ENCRYPTION_ITERATIONS,autoLockMinutes:data.settings.security.autoLockMinutes,failCount:0,blockedUntil:0,lang:data.settings.lang||'fa',createdAt:new Date().toISOString()};
      sessionEncryptionKey=key;await storageSet(STORE_KEY,await encodeStoredSnapshot(JSON.stringify(data)));await persistEncryptionMeta();unlockSuccess();render();return;
    }
  }catch(_){ }
  lockFailures++;input.value='';
  if(encryptionMeta){encryptionMeta.failCount=(encryptionMeta.failCount||0)+1;if(encryptionMeta.failCount>=5){encryptionMeta.blockedUntil=Date.now()+60000;encryptionMeta.failCount=0}await persistEncryptionMeta()}
  if(lockFailures>=5){lockBlockedUntil=Date.now()+60000;lockFailures=0;err.textContent=tr('lock_too_many')}
  else err.textContent=tr('lock_wrong_pin');
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)hiddenAt=Date.now();
  else if(appLockEnabled()&&hiddenAt&&Date.now()-hiddenAt>=lockMinutes()*60000)lockApp();
  else resetAutoLockTimer();
});
