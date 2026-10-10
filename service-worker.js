const VERSION = '21.1.1';
const CACHE_PREFIX = 'daftar-kelas-';
const STATIC_CACHE = `${CACHE_PREFIX}static-${VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${VERSION}`;
const APP_SHELL = [
  './','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png',
  './assets/css/app.css','./assets/css/guide.css','./assets/css/v18-polish.css','./assets/css/v19-experience.css','./assets/css/v19.2-coherence.css','./assets/css/v19.4-premium.css','./assets/fonts/Vazirmatn.woff2',
  './assets/js/pwa.js','./assets/js/crypto-core.js','./assets/js/zip.js','./assets/js/core.js','./assets/js/state.js','./assets/js/api-client.js',
  './assets/js/export-core.js',
  './assets/js/i18n.js','./assets/js/i18n-dictionaries.js','./assets/js/i18n-extensions.js','./assets/js/i18n-v138.js','./assets/js/i18n-v139.js','./assets/js/i18n-v140.js','./assets/js/i18n-v150.js','./assets/js/i18n-v151.js','./assets/js/i18n-v152.js','./assets/js/i18n-v153.js','./assets/js/i18n-v180.js','./assets/js/i18n-v190.js','./assets/js/i18n-v192.js','./assets/js/i18n-v194.js','./assets/js/ui.js','./assets/js/health-center.js','./assets/js/widgets.js','./assets/js/experience-v194.js','./assets/js/widgets-v18.js','./assets/js/experience-v19.js',
  './assets/js/class-management.js','./assets/js/reliability.js','./assets/js/media-crypto.worker.js','./assets/js/textbooks.js','./assets/js/listening.js','./assets/js/backup.js','./assets/js/students.js',
  './assets/js/homework.js','./assets/js/attendance.js','./assets/js/student-detail.js','./assets/js/spin.js',
  './assets/js/reminders.js','./assets/js/calendar.js','./assets/js/profile.js','./assets/js/device.js',
  './assets/js/security.js','./assets/js/settings.js','./assets/js/profile-edit.js',
  './assets/js/reports.js','./assets/js/cloud-sync.js','./assets/js/manager-sharing.js','./assets/js/role-gateway.js','./assets/js/contact-validation.js','./assets/js/manager-dashboard.js','./assets/js/account-security.js','./assets/js/manager-workbench.js','./assets/css/manager-report.css','./assets/js/manager-directory.js','./assets/js/manager-personal.js','./assets/js/app.js','./privacy.html','./changelog.html'
];
const MAX_RUNTIME_ENTRIES = 48;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('push', event => {
  let payload={};
  try{payload=event.data?event.data.json():{}}catch(_){payload={}}
  event.waitUntil(self.registration.showNotification(payload.title||'دفتر کلاس',{
    body:payload.body||'کلاس بعدی نزدیک است؛ برنامه را باز کنید.',
    icon:'./icon-192.png',badge:'./icon-192.png',tag:payload.tag||`cloud-${payload.kind||'class'}-${payload.id||'reminder'}`,renotify:false,
    data:{url:payload.url||'./',kind:payload.kind||'class',id:payload.id||''}
  }));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(request, {cache: 'no-store', signal:controller.signal});
    if (response.ok && response.type === 'basic') {
      await safeCachePut(STATIC_CACHE, request, response.clone());
    }
    return response;
  } catch (_) {
    return (await caches.match(request)) || (await caches.match('./index.html')) || Response.error();
  } finally {
    clearTimeout(timeout);
  }
}

async function safeCachePut(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch (_) {
    // A full or unavailable cache must never break a successful network response.
  }
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map(key => cache.delete(key)));
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const update = fetch(request).then(async response => {
    if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
      await safeCachePut(RUNTIME_CACHE, request, response.clone());
      await trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES).catch(()=>{});
    }
    return response;
  }).catch(() => null);
  return cached || (await update) || Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if(url.origin===self.location.origin&&url.pathname.includes('/__local_media/')){event.respondWith(swMediaResponse(request,url.pathname.split('/').pop()));return}
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  const isSameOrigin = url.origin === self.location.origin;
  const cacheableType = ['style', 'script', 'image', 'font'].includes(request.destination);
  if (isSameOrigin && cacheableType && !url.searchParams.has('no-cache')) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'GET_VERSION' && event.source) {
    event.source.postMessage({type:'SW_VERSION', version:VERSION});
  }
  if (event.data && event.data.type === 'SHOW_CLASS_NOTIFICATION') {
    const payload = event.data.payload || {};
    event.waitUntil(self.registration.showNotification(payload.title || 'دفتر کلاس', {
      body: payload.body || 'کلاس شما به‌زودی شروع می‌شود.',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: payload.tag || 'class-reminder',
      renotify: false,
      data: {url:payload.url||'./'}
    }));
  }
  if (event.data && event.data.type === 'SHOW_PERSONAL_NOTIFICATION') {
    const payload = event.data.payload || {};
    event.waitUntil(self.registration.showNotification(payload.title || 'دفتر کلاس', {
      body: payload.body || 'یک یادآوری شخصی دارید.',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: payload.tag || 'personal-reminder',
      renotify: false,
      data: {url:payload.url||'./?screen=profile'}
    }));
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async()=>{
    const windows = await clients.matchAll({type:'window', includeUncontrolled:true});
    for (const client of windows) {
      if ('navigate' in client) await client.navigate(event.notification.data?.url || './');
      if ('focus' in client) return client.focus();
    }
    return clients.openWindow(event.notification.data?.url || './');
  })());
});

// Ephemeral capabilities: never cache plaintext, never persist the key. Cleared on app lock.
const localMediaSessions=new Map();
self.addEventListener('message',event=>{
  if(event.data?.type==='CLEAR_LOCAL_MEDIA'){localMediaSessions.clear();return}
  if(event.data?.type==='OPEN_LOCAL_MEDIA'&&event.source?.url&&new URL(event.source.url).origin===self.location.origin){
    const {token,record,key}=event.data;if(!/^[a-f0-9-]{36}$/.test(token)||!record||!Number.isFinite(record.size)||record.size<1)return;
    for(const [id,session] of localMediaSessions)if(session.expires<Date.now())localMediaSessions.delete(id);
    if(localMediaSessions.size>=16)localMediaSessions.delete(localMediaSessions.keys().next().value);
    localMediaSessions.set(token,{record,key,expires:Date.now()+15*60_000});event.ports[0]?.postMessage({ok:true});
  }
});
async function swMediaRead(key){const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('teacher-app-db',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});try{return await new Promise((resolve,reject)=>{const req=db.transaction('kv','readonly').objectStore('kv').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}finally{db.close()}}
async function swMediaResponse(request,token){
  const session=localMediaSessions.get(token);if(!session||session.expires<Date.now()){localMediaSessions.delete(token);return new Response('Locked or expired',{status:403})}
  session.expires=Date.now()+15*60_000;const {record,key}=session,size=record.size;let start=0,end=size-1;
  const range=request.headers.get('Range');if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match)return new Response('',{status:416,headers:{'Content-Range':`bytes */${size}`}});if(!match[1]){start=Math.max(0,size-Number(match[2]))}else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]))}if(!Number.isSafeInteger(start)||start>end||start>=size)return new Response('',{status:416,headers:{'Content-Range':`bytes */${size}`}})}
  const headers={'Content-Type':/^audio\/[a-z0-9.+-]+$/i.test(record.type)||record.type==='application/pdf'?record.type:'application/octet-stream','Content-Length':String(end-start+1),'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"};if(range)headers['Content-Range']=`bytes ${start}-${end}/${size}`;
  const chunkSize=record.chunkBytes||8*1024*1024;let index=Math.floor(start/chunkSize),offset=index*chunkSize;
  const stream=new ReadableStream({async pull(controller){try{
    if(!localMediaSessions.has(token)){controller.error(new Error('locked'));return}
    if(offset>end){controller.close();return}
    let bytes;
    if(record.encrypted){const chunkKey=record.chunkKeys?.[index],packed=chunkKey?new Uint8Array(await (await swMediaRead(chunkKey)).arrayBuffer()):record.payloadChunks?new Uint8Array(record.payloadChunks[index]):new Uint8Array(record.payload);const params={name:'AES-GCM',iv:packed.subarray(0,12)};if(chunkKey)params.additionalData=new TextEncoder().encode(chunkKey);bytes=new Uint8Array(await crypto.subtle.decrypt(params,key,packed.subarray(12)))}else bytes=new Uint8Array(await (record.chunkKeys?await swMediaRead(record.chunkKeys[index]):record.blob.slice(offset,offset+chunkSize)).arrayBuffer());
    const first=Math.max(0,start-offset),last=Math.min(bytes.length,end-offset+1);controller.enqueue(bytes.subarray(first,last));offset+=bytes.length;index++;if(offset>end)controller.close();
  }catch(error){controller.error(error)}}});return new Response(stream,{status:range?206:200,headers});
}
