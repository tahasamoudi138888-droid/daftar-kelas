/* ============ storage ============
   priority: claude artifact storage (window.storage) > IndexedDB > localStorage.
   IndexedDB has a much higher capacity than localStorage (hundreds of MB vs ~5-10MB),
   so it's used as the main store when running standalone in a browser.
   Any data previously saved in localStorage is migrated into IndexedDB automatically. */
const STORE_KEY = 'teacher-app-data-v1';
const AUTO_BACKUP_KEY = 'teacher-app-auto-backups-v2';
const AUTO_BACKUP_INTERVAL_MS = 9 * 24 * 60 * 60 * 1000;
const AUTO_BACKUP_MAX_SNAPSHOTS = 7;
const ENCRYPTION_META_KEY = 'teacher-app-encryption-meta-v1';
const DIAGNOSTICS_KEY = 'teacher-app-local-diagnostics-v1';
const IDB_NAME = 'teacher-app-db';
const IDB_STORE = 'kv';
const ENCRYPTION_ITERATIONS = 600000;
let encryptionMeta=null;
let sessionEncryptionKey=null;
let pendingEncryptedStore=null;
let idbOpenPromise = null;
function idbOpen(){
  if (idbOpenPromise) return idbOpenPromise;
  idbOpenPromise = new Promise((resolve, reject)=>{
    try{
      if (!window.indexedDB) { reject(new Error('no indexedDB')); return; }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = ()=>{ if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE); };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    }catch(e){ reject(e); }
  });
  return idbOpenPromise;
}
async function idbGet(key){
  const db = await idbOpen();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = ()=> resolve(req.result===undefined ? null : req.result);
    req.onerror = ()=> reject(req.error);
  });
}
async function idbSet(key, val){
  const db = await idbOpen();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(val, key);
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}
async function idbDelete(key){
  const db = await idbOpen();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}
async function storageGet(key){
  if(key===STORE_KEY){try{const current=await idbGet(key);if(current!=null)return current}catch(_){}}
  try{
    if (window.storage && typeof window.storage.get === 'function'){
      const r = await window.storage.get(key);
      return r ? r.value : null;
    }
  }catch(e){ /* key may not exist */ }
  try{
    const v = await idbGet(key);
    if (v!=null) return v;
  }catch(e){ /* IndexedDB unavailable, fall through */ }
  try{
    const old = localStorage.getItem(key);
    if (old!=null){
      // one-time migration of older data saved before the IndexedDB switch
      try{await idbSet(key, old);localStorage.removeItem(key)}catch(_){ }
      return old;
    }
  }catch(e){}
  return null;
}
async function storageSet(key, val){
  if(key===STORE_KEY){await idbSet(key,val);try{localStorage.removeItem(key)}catch(_){};return}
  let lastError = null;
  try{
    if (window.storage && typeof window.storage.set === 'function'){
      await window.storage.set(key, val, false);
      try{localStorage.removeItem(key)}catch(_){}
      return;
    }
  }catch(e){ lastError=e; }
  try{
    await idbSet(key, val);
    try{localStorage.removeItem(key)}catch(_){}
    return;
  }catch(e){ lastError=e; }
  try{ localStorage.setItem(key, val); return; }catch(e){ lastError=e; }
  throw lastError || new Error('storage unavailable');
}
async function storageDelete(key){
  try{ if(window.storage&&typeof window.storage.delete==='function')await window.storage.delete(key); else if(window.storage&&typeof window.storage.set==='function')await window.storage.set(key,'',false); }catch(_){}
  try{ await idbDelete(key); }catch(_){}
  try{ localStorage.removeItem(key); }catch(_){}
}
async function recordLocalError(code,error){
  try{
    const safeCode=String(code||'unknown').replace(/[^a-z0-9_-]/gi,'').slice(0,48),name=String(error&&error.name||'Error').slice(0,40);
    let list=[];try{list=JSON.parse((await storageGet(DIAGNOSTICS_KEY))||'[]')}catch(_){list=[]}
    if(!Array.isArray(list))list=[];list.unshift({at:new Date().toISOString(),code:safeCode,name,version:'21.1.0'});
    await storageSet(DIAGNOSTICS_KEY,JSON.stringify(list.slice(0,40)));
  }catch(_){ }
}

/* ============ date helpers (Tehran time, Jalali calendar) ============ */
function tehranNow(){
  const now = new Date();
  const iso = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Tehran', year:'numeric', month:'2-digit', day:'2-digit'}).format(now);
  const time = new Intl.DateTimeFormat('fa-IR', {timeZone:'Asia/Tehran', hour:'2-digit', minute:'2-digit', hour12:false}).format(now);
  const jalali = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {timeZone:'Asia/Tehran', year:'numeric', month:'long', day:'numeric', weekday:'long'}).format(now);
  const jalaliShort = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {timeZone:'Asia/Tehran', year:'numeric', month:'long', day:'numeric'}).format(now);
  return {iso, time, jalali, jalaliShort};
}
function isoToJalali(iso, withWeekday){
  const d = new Date(iso + 'T12:00:00');
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {timeZone:'Asia/Tehran', year:'numeric', month:'long', day:'numeric', weekday: withWeekday ? 'long' : undefined}).format(d);
}
function normalizeDigits(str){
  const fa='۰۱۲۳۴۵۶۷۸۹', ar='٠١٢٣٤٥٦٧٨٩';
  return String(str==null?'':str).replace(/[۰-۹٠-٩]/g, d=>{
    let i = fa.indexOf(d); if (i>-1) return String(i);
    i = ar.indexOf(d); if (i>-1) return String(i);
    return d;
  });
}
function parseTimeToMinutes(str){
  const norm = normalizeDigits(str);
  const m = norm.match(/(\d{1,2})\s*[:.]\s*(\d{1,2})/);
  if (!m) return null;
  return parseInt(m[1],10)*60 + parseInt(m[2],10);
}
const WEEKDAYS = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
const WEEKDAY_SHORT = {'شنبه':'ش','یکشنبه':'ی','دوشنبه':'د','سه‌شنبه':'س','چهارشنبه':'چ','پنجشنبه':'پ','جمعه':'ج'};
function tehranWeekdayName(){
  return new Intl.DateTimeFormat('fa-IR', {timeZone:'Asia/Tehran', weekday:'long'}).format(new Date());
}
function tehranNowFull(){
  const now = new Date();
  const base = tehranNow();
  const hour = parseInt(new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Tehran', hour:'2-digit', hour12:false}).format(now), 10) % 24;
  const minute = parseInt(new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Tehran', minute:'2-digit'}).format(now), 10);
  const weekday = tehranWeekdayName();
  return Object.assign({}, base, {hour, minute, weekday});
}
function classActiveToday(c, weekday){
  const days = c.info && c.info.days;
  if (!days || !days.length) return true; // legacy classes without a weekday list: assume every day
  return days.indexOf(weekday) > -1;
}
function weekdayNameForDate(date){
  return new Intl.DateTimeFormat('fa-IR', {timeZone:'Asia/Tehran', weekday:'long'}).format(date);
}
function isoForDate(date){
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Tehran', year:'numeric', month:'2-digit', day:'2-digit'}).format(date);
}
const JALALI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
function isJalaliLeapYear(jy){
  const r = ((jy % 33) + 33) % 33;
  return [1,5,9,13,17,22,26,30].indexOf(r) > -1;
}
function jalaliDaysInMonth(jm, jy){ return jm<=6 ? 31 : (jm<=11 ? 30 : ((jy!=null && isJalaliLeapYear(jy)) ? 30 : 29)); }
function currentJalaliYMD(){
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {timeZone:'Asia/Tehran', year:'numeric', month:'numeric', day:'numeric'}).formatToParts(new Date());
  const get = t => parseInt(parts.find(p=>p.type===t).value, 10);
  return { jy:get('year'), jm:get('month'), jd:get('day') };
}
function jalaliToGregorianIso(jy, jm, jd){
  jy += 1595;
  let days = -355668 + (365*jy) + (Math.floor(jy/33)*8) + (Math.floor(((jy%33)+3)/4)) + jd + ((jm<7) ? (jm-1)*31 : ((jm-7)*30)+186);
  let gy = 400 * Math.floor(days/146097);
  days %= 146097;
  if (days > 36524){
    gy += 100 * Math.floor(--days/36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days/1461);
  days %= 1461;
  if (days > 365){
    gy += Math.floor((days-1)/365);
    days = (days-1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0,31,((gy%4===0 && gy%100!==0)||(gy%400===0))?29:28,31,30,31,30,31,31,30,31,30,31];
  let gm;
  for (gm=1; gm<13; gm++){
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  const pad = n => String(n).padStart(2,'0');
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}
const GREGORIAN_MONTHS = ['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'];
function calendarMonthName(kind,year,month){
  const locales={fa:'fa-IR',en:'en-US',fr:'fr-FR',tr:'tr-TR',it:'it-IT',zh:'zh-CN'},locale=locales[data?.settings?.lang]||'fa-IR';
  try{
    const iso=kind==='jalali'?jalaliToGregorianIso(year,month,15):`${year}-${String(month).padStart(2,'0')}-15`;
    return new Intl.DateTimeFormat(locale,{calendar:kind==='jalali'?'persian':'gregory',month:'long',timeZone:'UTC'}).format(new Date(`${iso}T12:00:00Z`));
  }catch(_){return kind==='jalali'?JALALI_MONTHS[month-1]:GREGORIAN_MONTHS[month-1]}
}
function isGregorianLeapYear(gy){ return (gy%4===0 && gy%100!==0) || gy%400===0; }
function gregorianDaysInMonth(gm, gy){
  const days = [31, isGregorianLeapYear(gy)?29:28, 31,30,31,30,31,31,30,31,30,31];
  return days[gm-1];
}
function currentGregorianYMD(){
  const [gy,gm,gd] = tehranNow().iso.split('-').map(Number);
  return {gy, gm, gd};
}
function gregorianWeekdayIndex(gy, gm, gd){
  const pad = n => String(n).padStart(2,'0');
  const iso = `${gy}-${pad(gm)}-${pad(gd)}`;
  const dow = new Date(iso + 'T12:00:00Z').getUTCDay(); // 0=Sun..6=Sat
  return (dow + 1) % 7; // همان قالب شنبه=0 ... جمعه=6
}

/* ============ Iran calendar: weekday index + holidays ============ */
// شنبه=0، یکشنبه=1، دوشنبه=2، سه‌شنبه=3، چهارشنبه=4، پنجشنبه=5، جمعه=6
function jalaliWeekdayIndex(jy, jm, jd){
  const iso = jalaliToGregorianIso(jy, jm, jd);
  const dow = new Date(iso + 'T12:00:00Z').getUTCDay(); // 0=Sun..6=Sat
  return (dow + 1) % 7;
}
// تعطیلات ثابت شمسی (هر سال در همین روز از ماه شمسی رخ می‌دهند)
const FIXED_JALALI_HOLIDAYS = [
  {jm:1, jd:1,  title:'جشن نوروز'},
  {jm:1, jd:2,  title:'عید نوروز'},
  {jm:1, jd:3,  title:'عید نوروز'},
  {jm:1, jd:4,  title:'عید نوروز'},
  {jm:1, jd:12, title:'روز جمهوری اسلامی'},
  {jm:1, jd:13, title:'روز طبیعت (سیزده به‌در)'},
  {jm:3, jd:14, title:'رحلت امام خمینی (ره)'},
  {jm:3, jd:15, title:'قیام ۱۵ خرداد'},
  {jm:11, jd:22, title:'پیروزی انقلاب اسلامی'},
  {jm:12, jd:29, title:'روز ملی شدن صنعت نفت'}
];
// تعطیلات قمری/متغیر — به‌جای ثبت دستی تاریخ هر سال (که هرچند سال نیاز به آپدیت داشت)،
// این مناسبت‌ها بر اساس روز ثابتشان در تقویم قمری (هجری) تعریف شده‌اند و تاریخ شمسی
// معادلشان برای هر سالی که کاربر مرور کند، به‌صورت خودکار محاسبه می‌شود — پس هیچ‌وقت
// نیاز به به‌روزرسانی دستی نخواهد داشت.
const LUNAR_HIJRI_HOLIDAYS = [
  {hm:1,  hd:9,  title:'تاسوعای حسینی'},
  {hm:1,  hd:10, title:'عاشورای حسینی'},
  {hm:2,  hd:20, title:'اربعین حسینی'},
  {hm:2,  hd:28, title:'رحلت رسول اکرم (ص) و شهادت امام حسن (ع)'},
  {hm:2,  hd:29, title:'شهادت امام رضا (ع)'},
  {hm:3,  hd:8,  title:'شهادت امام حسن عسکری (ع)'},
  {hm:3,  hd:17, title:'ولادت پیامبر اکرم (ص) و امام جعفر صادق (ع)'},
  {hm:6,  hd:3,  title:'شهادت حضرت فاطمه زهرا (س)'},
  {hm:7,  hd:13, title:'ولادت امام علی (ع) — روز پدر'},
  {hm:7,  hd:27, title:'مبعث حضرت رسول اکرم (ص)'},
  {hm:8,  hd:15, title:'ولادت امام زمان (عج) — نیمه شعبان'},
  {hm:9,  hd:21, title:'شهادت امام علی (ع)'},
  {hm:10, hd:1,  title:'عید سعید فطر'},
  {hm:10, hd:2,  title:'تعطیل به مناسبت عید سعید فطر'},
  {hm:10, hd:25, title:'شهادت امام صادق (ع)'},
  {hm:12, hd:10, title:'عید سعید قربان'},
  {hm:12, hd:18, title:'عید سعید غدیر خم'}
];
// تاریخ‌های قمری واقعی (رصدی) که تقویم رسمی کشور اعلام می‌کند، گاهی یک روز با محاسبه
// جدولی/ریاضی بالا تفاوت دارد. برای سال‌هایی که این تفاوت بررسی و با تقویم رسمی
// (منتشرشده توسط مؤسسه ژئوفیزیک دانشگاه تهران و بازتاب‌یافته در چند منبع معتبر) تطبیق
// داده شده، تاریخ دقیق همینجا ثبت می‌شود و به‌جای محاسبه‌ی تخمینی استفاده می‌گردد.
const VERIFIED_LUNAR_HOLIDAYS_BY_YEAR = {
  1405: [
    {jm:1,  jd:1,  title:'عید سعید فطر'},
    {jm:1,  jd:2,  title:'تعطیل به مناسبت عید سعید فطر'},
    {jm:1,  jd:25, title:'شهادت امام جعفر صادق (ع)'},
    {jm:3,  jd:6,  title:'عید سعید قربان'},
    {jm:3,  jd:14, title:'عید سعید غدیر خم'},
    {jm:4,  jd:3,  title:'تاسوعای حسینی'},
    {jm:4,  jd:4,  title:'عاشورای حسینی'},
    {jm:5,  jd:13, title:'اربعین حسینی'},
    {jm:5,  jd:21, title:'رحلت رسول اکرم (ص) و شهادت امام حسن (ع)'},
    {jm:5,  jd:22, title:'شهادت امام رضا (ع)'},
    {jm:5,  jd:30, title:'شهادت امام حسن عسکری (ع)'},
    {jm:6,  jd:8,  title:'ولادت پیامبر اکرم (ص) و امام جعفر صادق (ع)'},
    {jm:8,  jd:22, title:'شهادت حضرت فاطمه زهرا (س)'},
    {jm:10, jd:2,  title:'ولادت امام علی (ع) — روز پدر'},
    {jm:10, jd:16, title:'مبعث حضرت رسول اکرم (ص)'},
    {jm:11, jd:4,  title:'ولادت امام زمان (عج) — نیمه شعبان'},
    {jm:12, jd:9,  title:'شهادت امام علی (ع)'},
    {jm:12, jd:19, title:'عید سعید فطر'},
    {jm:12, jd:20, title:'تعطیل به مناسبت عید سعید فطر'}
  ],
  1406: [
    {jm:1,  jd:14, title:'شهادت امام صادق (ع)'},
    {jm:2,  jd:27, title:'عید سعید قربان'},
    {jm:3,  jd:4,  title:'عید سعید غدیر خم'},
    {jm:3,  jd:24, title:'تاسوعای حسینی'},
    {jm:3,  jd:25, title:'عاشورای حسینی'},
    {jm:5,  jd:3,  title:'اربعین حسینی'},
    {jm:5,  jd:11, title:'رحلت رسول اکرم (ص) و شهادت امام حسن (ع)'},
    {jm:5,  jd:12, title:'شهادت امام رضا (ع)'},
    {jm:5,  jd:20, title:'شهادت امام حسن عسکری (ع)'},
    {jm:5,  jd:29, title:'ولادت پیامبر اکرم (ص) و امام جعفر صادق (ع)'},
    {jm:8,  jd:11, title:'شهادت حضرت فاطمه زهرا (س)'},
    {jm:9,  jd:21, title:'ولادت امام علی (ع) — روز پدر'},
    {jm:10, jd:5,  title:'مبعث حضرت رسول اکرم (ص)'},
    {jm:10, jd:22, title:'ولادت امام زمان (عج) — نیمه شعبان'},
    {jm:11, jd:28, title:'شهادت امام علی (ع)'},
    {jm:12, jd:8,  title:'عید سعید فطر'},
    {jm:12, jd:9,  title:'تعطیل به مناسبت عید سعید فطر'}
  ],
  1407: [
    {jm:1,  jd:2,  title:'شهادت امام صادق (ع)'},
    {jm:2,  jd:16, title:'عید سعید قربان'},
    {jm:2,  jd:24, title:'عید سعید غدیر خم'},
    {jm:3,  jd:14, title:'تاسوعای حسینی'},
    {jm:3,  jd:15, title:'عاشورای حسینی'},
    {jm:4,  jd:23, title:'اربعین حسینی'},
    {jm:4,  jd:31, title:'رحلت رسول اکرم (ص) و شهادت امام حسن (ع)'},
    {jm:5,  jd:1,  title:'شهادت امام رضا (ع)'},
    {jm:5,  jd:9,  title:'شهادت امام حسن عسکری (ع)'},
    {jm:5,  jd:18, title:'ولادت پیامبر اکرم (ص) و امام جعفر صادق (ع)'},
    {jm:7,  jd:30, title:'شهادت حضرت فاطمه زهرا (س)'},
    {jm:9,  jd:10, title:'ولادت امام علی (ع) — روز پدر'},
    {jm:9,  jd:24, title:'مبعث حضرت رسول اکرم (ص)'},
    {jm:10, jd:11, title:'ولادت امام زمان (عج) — نیمه شعبان'},
    {jm:11, jd:17, title:'شهادت امام علی (ع)'},
    {jm:11, jd:27, title:'عید سعید فطر'},
    {jm:11, jd:28, title:'تعطیل به مناسبت عید سعید فطر'},
    {jm:12, jd:21, title:'شهادت امام صادق (ع)'}
  ]
};
/* --- گاه‌شماری قمری (تقویم هجری جدولی/مدنی) و تبدیل تاریخ --- */
function gregorianToJD(year, month, day){
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153*m+2)/5) + 365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) - 32045;
}
function jdToGregorian(jdIn){
  const jd = Math.floor(jdIn);
  const a = jd + 32044;
  const b = Math.floor((4*a+3)/146097);
  const c = a - Math.floor((146097*b)/4);
  const d = Math.floor((4*c+3)/1461);
  const e = c - Math.floor((1461*d)/4);
  const m = Math.floor((5*e+2)/153);
  const day = e - Math.floor((153*m+2)/5) + 1;
  const month = m + 3 - 12*Math.floor(m/10);
  const year = 100*b + d - 4800 + Math.floor(m/10);
  return [year, month, day];
}
const ISLAMIC_EPOCH = 1948439;
function islamicToJD(year, month, day){
  return day + Math.ceil(29.5*(month-1)) + (year-1)*354 + Math.floor((3+11*year)/30) + ISLAMIC_EPOCH - 1;
}
function jdToIslamic(jdIn){
  const jd = Math.floor(jdIn);
  const year = Math.floor((30*(jd-ISLAMIC_EPOCH)+10646)/10631);
  const month = Math.min(12, Math.ceil((jd-(29+islamicToJD(year,1,1)))/29.5) + 1);
  const day = jd - islamicToJD(year, month, 1) + 1;
  return [year, month, day];
}
function gregorianIsoToJalali(targetIso){
  const gy = parseInt(targetIso.slice(0,4),10);
  let jy = gy - 622;
  while (jalaliToGregorianIso(jy+1,1,1) <= targetIso) jy++;
  while (jalaliToGregorianIso(jy,1,1) > targetIso) jy--;
  let jm = 12;
  for (let m=1; m<=12; m++){
    const nextIso = (m<12) ? jalaliToGregorianIso(jy, m+1, 1) : jalaliToGregorianIso(jy+1, 1, 1);
    if (targetIso < nextIso){ jm = m; break; }
  }
  const startOfMonthIso = jalaliToGregorianIso(jy, jm, 1);
  const d1 = new Date(startOfMonthIso+'T00:00:00Z').getTime();
  const d2 = new Date(targetIso+'T00:00:00Z').getTime();
  const jd = Math.round((d2-d1)/86400000) + 1;
  return {jy, jm, jd};
}
function hijriToJalali(hy, hm, hd){
  const jdn = islamicToJD(hy, hm, hd);
  const [gy,gm,gd] = jdToGregorian(jdn);
  const pad = n => String(n).padStart(2,'0');
  return gregorianIsoToJalali(`${gy}-${pad(gm)}-${pad(gd)}`);
}
const _lunarHolidayCache = {};
function lunarHolidaysForJalaliYear(jy){
  if (_lunarHolidayCache[jy]) return _lunarHolidayCache[jy];
  if (VERIFIED_LUNAR_HOLIDAYS_BY_YEAR[jy]){
    const verified = VERIFIED_LUNAR_HOLIDAYS_BY_YEAR[jy].slice().sort((a,b)=> a.jm-b.jm || a.jd-b.jd);
    _lunarHolidayCache[jy] = verified;
    return verified;
  }
  const midIso = jalaliToGregorianIso(jy, 7, 1);
  const [gy,gm,gd] = midIso.split('-').map(Number);
  const [hyMid] = jdToIslamic(gregorianToJD(gy,gm,gd));
  const out = [];
  LUNAR_HIJRI_HOLIDAYS.forEach(h=>{
    for (let dh=-1; dh<=1; dh++){
      const r = hijriToJalali(hyMid+dh, h.hm, h.hd);
      if (r.jy===jy) out.push({jm:r.jm, jd:r.jd, title:h.title});
    }
  });
  out.sort((a,b)=> a.jm-b.jm || a.jd-b.jd);
  _lunarHolidayCache[jy] = out;
  return out;
}
function holidaysForJalaliDate(jy, jm, jd){
  const list = [];
  FIXED_JALALI_HOLIDAYS.forEach(h=>{ if (h.jm===jm && h.jd===jd) list.push(h.title); });
  lunarHolidaysForJalaliYear(jy).forEach(h=>{ if (h.jm===jm && h.jd===jd) list.push(h.title); });
  return list;
}

function nextClassPillInfo(){
  const t = tehranNowFull();
  const nowMinutes = t.hour*60 + t.minute;
  const candidates = data.classes
    .filter(c => c.info && c.info.startTime && classActiveToday(c, t.weekday))
    .map(c => ({c, m: parseTimeToMinutes(c.info.startTime)}))
    .filter(x => x.m!=null);
  const inWindow = candidates.filter(x => (x.m - nowMinutes) <= PILL_LEAD_MIN && (x.m - nowMinutes) >= -PILL_GRACE_MIN);
  inWindow.sort((a,b)=> Math.abs(a.m-nowMinutes) - Math.abs(b.m-nowMinutes));
  return inWindow.length ? inWindow[0] : null;
}
function minutesUntilNextClass(c){
  if (!c.info || !c.info.startTime) return Infinity;
  const startMin = parseTimeToMinutes(c.info.startTime);
  if (startMin==null) return Infinity;
  const t = tehranNowFull();
  const nowMinutes = t.hour*60 + t.minute;
  for (let i=0;i<=7;i++){
    const d = new Date(Date.now() + i*24*60*60*1000);
    const wd = weekdayNameForDate(d);
    if (!classActiveToday(c, wd)) continue;
    if (i===0 && startMin < nowMinutes - PILL_GRACE_MIN) continue; // already passed today (beyond grace window)
    return i*1440 + (startMin - nowMinutes);
  }
  return Infinity;
}
function validateStartTime(raw){
  const norm = normalizeDigits(String(raw||'')).trim();
  const m = norm.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return null;
  const h = parseInt(m[1],10), mm = parseInt(m[2],10);
  if (h<0 || h>23 || mm<0 || mm>59) return null;
  return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function scoreColor(value, max){
  if (value==null || value==='') return null;
  const ratio = clamp(value/max, 0, 1);
  const low = {r:196,g:64,b:53}, high = {r:56,g:142,b:96};
  const r = Math.round(low.r + (high.r-low.r)*ratio);
  const g = Math.round(low.g + (high.g-low.g)*ratio);
  const b = Math.round(low.b + (high.b-low.b)*ratio);
  return `rgb(${r},${g},${b})`;
}
const EXAM_LIMITS = { midterm:20, oral:10, final:30 };

/* ============ data model ============ */
function uid(){ return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

function defaultData(){
  return {
    schemaVersion: 2,
    classes: [],
    profile: { name:'', phone:'', subject:'', workplace:'', photo:'', notes:[], personalReminders:[] },
    settings: { lang:'fa', langHintSeen:false, appRole:'', theme:'light', palette:'classic', buttonTone:'auto', fontScale:'standard', photoCompression:true, customColors:{enabled:false,light:{},dark:{}}, notifications:false, showConnectionStatus:true, lastExportAt:null, autoBackup9Days:false, autoBackupLastAt:null, personalBackupReminderInitialized:false, security:{pinHash:'',pinSalt:'',autoLockMinutes:5} }
  };
}
let data = defaultData();

async function loadData(){
  try{ encryptionMeta=JSON.parse((await storageGet(ENCRYPTION_META_KEY))||'null'); }catch(_){ encryptionMeta=null; }
  const raw = await storageGet(STORE_KEY);
  if(!encryptionMeta&&raw){
    try{const envelope=JSON.parse(raw);if(envelope&&envelope.format==='dk-encrypted-v1'&&envelope.salt){encryptionMeta={enabled:true,salt:envelope.salt,iterations:envelope.iterations||ENCRYPTION_ITERATIONS,autoLockMinutes:5,failCount:0,blockedUntil:0,lang:'fa',recovered:true};await persistEncryptionMeta();}}catch(_){}
  }
  if(encryptionMeta&&encryptionMeta.enabled){
    if(sessionEncryptionKey&&raw){
      try{data=Object.assign(defaultData(),JSON.parse(await decodeStoredSnapshot(raw,sessionEncryptionKey,true)));pendingEncryptedStore=null;migrateData();}
      catch(_){pendingEncryptedStore=raw;data=defaultData();sessionEncryptionKey=null;}
    }else{pendingEncryptedStore=raw;data=defaultData();data.settings.lang=encryptionMeta.lang||'fa';}
    return;
  }
  if (raw){
    try{ data = Object.assign(defaultData(), JSON.parse(raw)); }
    catch(e){ data = defaultData(); }
  }
  migrateData();
}
function migrateData(){
  data.schemaVersion=2;
  if(!Array.isArray(data.classes))data.classes=[];
  if (!data.profile || typeof data.profile!=='object') data.profile=defaultData().profile;
  data.profile=Object.assign(defaultData().profile,data.profile);
  if(!Array.isArray(data.profile.personalReminders))data.profile.personalReminders=[];
  data.profile.personalReminders=data.profile.personalReminders.filter(r=>r&&validId(r.id)&&typeof r.text==='string'&&r.text.trim()&&r.text.length<=1000&&/^\d{4}-\d{2}-\d{2}$/.test(String(r.dueIso||''))&&!Number.isNaN(new Date(`${r.dueIso}T12:00:00Z`).getTime())).slice(0,200).map(r=>({
    id:r.id,text:r.text.trim(),dueIso:r.dueIso,repeatDays:Math.max(0,Math.min(365,Number.isInteger(Number(r.repeatDays))?Number(r.repeatDays):0)),kind:r.kind==='backup'?'backup':'personal',createdAt:typeof r.createdAt==='string'?r.createdAt:new Date().toISOString(),lastNotifiedFor:typeof r.lastNotifiedFor==='string'?r.lastNotifiedFor:''
  }));
  if (typeof data.profile.photo!=='string' || (data.profile.photo && (!/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=\r\n]+$/i.test(data.profile.photo) || data.profile.photo.length>3*1024*1024))) data.profile.photo='';
  if (!data.settings) data.settings = { lang:'fa', langHintSeen:false, theme:'light' };
  if(!['','teacher','manager'].includes(data.settings.appRole))data.settings.appRole='';
  if(!data.settings.appRole&&(data.classes.length||data.profile.name||data.profile.phone||data.profile.subject||data.profile.workplace))data.settings.appRole='teacher';
  if(typeof data.settings.showConnectionStatus!=='boolean')data.settings.showConnectionStatus=true;
  if (typeof data.settings.langHintSeen !== 'boolean') data.settings.langHintSeen = false;
  if (data.settings.theme !== 'light' && data.settings.theme !== 'dark') data.settings.theme = 'light';
  const legacyPalettes={amber:'classic',emerald:'sage',ocean:'sky',violet:'lavender',rose:'rose'};
  if (!data.settings.palette && data.settings.accent) data.settings.palette=legacyPalettes[data.settings.accent]||'classic';
  if (!['classic','lavender','peach','sky','rose','sage','butter'].includes(data.settings.palette)) data.settings.palette='classic';
  if (!['auto','amber','coral','mint','blue','violet','navy'].includes(data.settings.buttonTone)) data.settings.buttonTone='auto';
  if(!['small','standard','large'].includes(data.settings.fontScale))data.settings.fontScale='standard';
  if(typeof data.settings.photoCompression!=='boolean')data.settings.photoCompression=true;
  if (!data.settings.customColors || typeof data.settings.customColors!=='object') data.settings.customColors={enabled:false,light:{},dark:{}};
  data.settings.customColors=Object.assign({enabled:false,light:{},dark:{}},data.settings.customColors);
  if (!data.settings.customColors.light || typeof data.settings.customColors.light!=='object') data.settings.customColors.light={};
  if (!data.settings.customColors.dark || typeof data.settings.customColors.dark!=='object') data.settings.customColors.dark={};
  delete data.settings.accent;
  if (typeof data.settings.notifications !== 'boolean') data.settings.notifications = false;
  if (!data.settings.security || typeof data.settings.security!=='object') data.settings.security={pinHash:'',pinSalt:'',autoLockMinutes:5};
  data.settings.security=Object.assign({pinHash:'',pinSalt:'',autoLockMinutes:5},data.settings.security);
  delete data.settings.security.credentialId;
  if (![1,5,15,30].includes(Number(data.settings.security.autoLockMinutes))) data.settings.security.autoLockMinutes=5;
  if (data.settings.lastExportAt && isNaN(new Date(data.settings.lastExportAt).getTime())) data.settings.lastExportAt=null;
  if(typeof data.settings.autoBackup9Days!=='boolean')data.settings.autoBackup9Days=false;
  if(data.settings.autoBackupLastAt&&Number.isNaN(new Date(data.settings.autoBackupLastAt).getTime()))data.settings.autoBackupLastAt=null;
  if(typeof data.settings.personalBackupReminderInitialized!=='boolean')data.settings.personalBackupReminderInitialized=false;
  (data.classes||[]).forEach(c=>{
    if (!c.info) c.info = {};
    if(!Number.isInteger(c.info.durationMinutes)||c.info.durationMinutes<15||c.info.durationMinutes>480)c.info.durationMinutes=90;
    if (!c.info.days){
      // کلاس‌های قدیمی که با سیستم زوج/فرد ذخیره شده بودن؛ چون اون سیستم دیگه استفاده نمی‌شه،
      // برای اینکه هیچ کلاسی گم نشه، پیش‌فرض روی همه‌ی روزهای هفته می‌ذاریم تا خود معلم ویرایشش کنه.
      c.info.days = WEEKDAYS.slice();
      delete c.info.parity;
    }
    if (!c.gender) c.gender = c.gender || '';
    if (!c.reminders) c.reminders = [];
    if (!c.homeworkLog) c.homeworkLog = [];
    if(c.textbook){
      const ok=typeof c.textbook==='object'&&typeof c.textbook.name==='string'&&c.textbook.name.length<=180&&Number.isFinite(Number(c.textbook.size))&&Number(c.textbook.size)>=0&&Number(c.textbook.size)<=TEXTBOOK_MAX_BYTES;
      if(!ok) c.textbook=null;
    }
    if(!Array.isArray(c.listenings)) c.listenings=[];
    c.listenings=c.listenings.filter(a=>a&&validId(a.id)&&typeof a.name==='string'&&a.name.length<=180&&Number.isFinite(Number(a.size))&&Number(a.size)>0&&Number(a.size)<=LISTENING_MAX_BYTES).slice(0,200);
    (c.students||[]).forEach(s=>{
      if(!Array.isArray(s.timelineNotes))s.timelineNotes=[];
      s.timelineNotes=s.timelineNotes.filter(n=>n&&validId(n.id)&&typeof n.text==='string'&&n.text.trim()&&n.text.length<=2000).slice(0,300).map(n=>({id:n.id,text:n.text.trim(),iso:/^\d{4}-\d{2}-\d{2}$/.test(n.iso||'')?n.iso:tehranNow().iso,time:typeof n.time==='string'?n.time:'',createdAt:typeof n.createdAt==='string'?n.createdAt:new Date().toISOString()}));
      if(!Array.isArray(s.examHistory))s.examHistory=[];
      s.examHistory=s.examHistory.filter(x=>x&&validId(x.id)&&Object.prototype.hasOwnProperty.call(EXAM_LIMITS,x.key)&&Number.isFinite(Number(x.value))).slice(0,300).map(x=>({id:x.id,key:x.key,value:Number(x.value),iso:/^\d{4}-\d{2}-\d{2}$/.test(x.iso||'')?x.iso:tehranNow().iso,time:typeof x.time==='string'?x.time:'',createdAt:typeof x.createdAt==='string'?x.createdAt:new Date().toISOString()}));
    });
  });
}
function addDaysIso(iso,days){
  const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+Number(days||0));return d.toISOString().slice(0,10);
}
function ensureDefaultPersonalBackupReminder(anchorAt){
  if(!data.classes.length||data.settings.personalBackupReminderInitialized)return false;
  const created=(data.classes||[]).map(c=>new Date(c.createdAt||'').getTime()).filter(Number.isFinite).sort((a,b)=>a-b)[0];
  const anchor=new Date(Number.isFinite(created)?created:(anchorAt||Date.now()));
  const startIso=isoForDate(Number.isNaN(anchor.getTime())?new Date():anchor);
  data.profile.personalReminders.push({id:uid(),kind:'backup',text:tr('personal_backup_default_text'),dueIso:addDaysIso(startIso,30),repeatDays:30,createdAt:new Date().toISOString(),lastNotifiedFor:''});
  data.settings.personalBackupReminderInitialized=true;
  return true;
}
let saveQueue = Promise.resolve();
let lastSaveFailed = false;
let lastAutoBackupFailed = false;
const TAB_ID = uid();
const dataChannel = 'BroadcastChannel' in window ? new BroadcastChannel('daftar-kelas-sync-v2') : null;
function nineDayAutoBackupDue(){
  if(!data.settings.autoBackup9Days)return false;
  const last=new Date(data.settings.autoBackupLastAt||0).getTime();
  return !Number.isFinite(last)||Date.now()-last>=AUTO_BACKUP_INTERVAL_MS;
}
async function createAutoBackup(snapshot,createdAt){
  const today=tehranNow().iso;
  let backups=[];
  try{ backups=JSON.parse((await storageGet(AUTO_BACKUP_KEY))||'[]'); }catch(_){ backups=[]; }
  if(!Array.isArray(backups)) backups=[];
  backups.unshift({date:today,createdAt:createdAt||new Date().toISOString(),intervalDays:9,data:snapshot});
  await storageSet(AUTO_BACKUP_KEY,JSON.stringify(backups.slice(0,AUTO_BACKUP_MAX_SNAPSHOTS)));
}
async function migrateAutoBackupEncryption(encrypt,key){
  let backups=[];try{backups=JSON.parse((await storageGet(AUTO_BACKUP_KEY))||'[]')}catch(_){return}
  if(!Array.isArray(backups))return;
  for(const item of backups){
    if(!item||typeof item.data!=='string')continue;
    let parsed=null;try{parsed=JSON.parse(item.data)}catch(_){}
    const already=parsed&&parsed.format==='dk-encrypted-v1';
    if(encrypt&&!already)item.data=JSON.stringify({format:'dk-encrypted-v1',payload:await DKCrypto.encryptText(item.data,key)});
    else if(!encrypt&&already)item.data=await DKCrypto.decryptText(parsed.payload,key);
  }
  await storageSet(AUTO_BACKUP_KEY,JSON.stringify(backups));
}
async function encodeStoredSnapshot(snapshot){
  if(!encryptionMeta||!encryptionMeta.enabled) return snapshot;
  if(!sessionEncryptionKey) throw new Error('app is locked');
  const payload=await DKCrypto.encryptText(snapshot,sessionEncryptionKey);
  return JSON.stringify({format:'dk-encrypted-v1',salt:encryptionMeta.salt,iterations:encryptionMeta.iterations||ENCRYPTION_ITERATIONS,payload});
}
async function decodeStoredSnapshot(stored,key=sessionEncryptionKey,requireEncrypted=false){
  const parsed=JSON.parse(stored);
  if(parsed&&parsed.format==='dk-encrypted-v1'){
    if(!key) throw new Error('PIN required');
    return DKCrypto.decryptText(parsed.payload,key);
  }
  if(requireEncrypted)throw new Error('encrypted payload required');
  return stored;
}
async function persistEncryptionMeta(){
  if(encryptionMeta) await storageSet(ENCRYPTION_META_KEY,JSON.stringify(encryptionMeta));
  else await storageDelete(ENCRYPTION_META_KEY);
}
function saveData(options={}){
  const throwOnError=options&&options.throwOnError===true;
  const makeAutoBackup=nineDayAutoBackupDue();
  const previousAutoBackupAt=data.settings.autoBackupLastAt||null;
  const autoBackupAt=makeAutoBackup?new Date().toISOString():null;
  let fallbackSnapshot='';
  if(autoBackupAt){
    data.settings.autoBackupLastAt=previousAutoBackupAt;
    fallbackSnapshot=JSON.stringify(data);
  }
  if(autoBackupAt)data.settings.autoBackupLastAt=autoBackupAt;
  const snapshot = JSON.stringify(data);
  const operation = saveQueue.then(async()=>{
    lastAutoBackupFailed=false;
    let stored=await encodeStoredSnapshot(snapshot);
    if(makeAutoBackup){
      try{await createAutoBackup(stored,autoBackupAt)}
      catch(error){
        lastAutoBackupFailed=true;
        if(data.settings.autoBackupLastAt===autoBackupAt)data.settings.autoBackupLastAt=previousAutoBackupAt;
        stored=await encodeStoredSnapshot(fallbackSnapshot);
        recordLocalError('auto_backup_failed',error);
      }
    }
    await storageSet(STORE_KEY, stored);
  }).then(()=>{
    lastSaveFailed = false;
    if(dataChannel) dataChannel.postMessage({type:'data-changed',source:TAB_ID,at:Date.now()});
    if(typeof markCloudDirty==='function') markCloudDirty();
  });
  saveQueue = operation.catch(error=>{
    if(autoBackupAt&&data.settings.autoBackupLastAt===autoBackupAt)data.settings.autoBackupLastAt=previousAutoBackupAt;
    lastSaveFailed = true;
    recordLocalError('data_save_failed',error);
    setTimeout(()=>{ if (typeof toast==='function') toast(tr('save_failed')); },0);
  });
  return throwOnError?operation:saveQueue;
}
async function runScheduledAutoBackup(){
  if(!nineDayAutoBackupDue())return false;
  await saveData({throwOnError:true});
  return !lastSaveFailed;
}

if(dataChannel){
  dataChannel.addEventListener('message',event=>{
    if(!event.data||event.data.source===TAB_ID||event.data.type!=='data-changed') return;
    const active=document.activeElement;
    const editing=active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) && String(active.value||'').trim();
    if(editing){ toast(tr('tab_change_editing')); return; }
    if(encryptionMeta&&!sessionEncryptionKey) return;
    loadData().then(()=>{ if(encryptionMeta&&!sessionEncryptionKey){lockApp();return} render(); toast(tr('tab_changes_synced')); });
  });
}

async function restoreLatestAutoBackup(){
  try{
    const backups=JSON.parse((await storageGet(AUTO_BACKUP_KEY))||'[]');
    if(!Array.isArray(backups)||!backups.length){ toast(tr('auto_backup_empty')); return; }
    if(!await confirmModalAsync(tr('auto_backup_confirm').replace('{date}',backups[0].date))) return;
    const decoded=await decodeStoredSnapshot(backups[0].data);
    const restored=assertBackupShape(JSON.parse(decoded));
    data=Object.assign(defaultData(),restored);
    migrateData();
    await saveData({throwOnError:true});
    closeModal(); render(); toast(tr('auto_backup_restored'));
  }catch(_){ toast(tr('auto_backup_restore_failed')); }
}

function validId(value){ return typeof value==='string' && /^id[a-z0-9]{6,64}$/i.test(value); }
function assertBackupShape(parsed){
  if (!parsed || typeof parsed!=='object' || !Array.isArray(parsed.classes)) throw new Error('invalid backup');
  let visited=0;
  (function inspect(value,depth){
    if(depth>25 || ++visited>150000) throw new Error('backup too complex');
    if(typeof value==='string' && value.length>2*1024*1024) throw new Error('value too large');
    if(!value || typeof value!=='object') return;
    if(Array.isArray(value) && value.length>10000) throw new Error('array too large');
    Object.keys(value).forEach(key=>{
      if(key==='__proto__'||key==='prototype'||key==='constructor') throw new Error('unsafe key');
      if(key.length>200||/[<>"'`;\\\u0000-\u001f]/.test(key)) throw new Error('unsafe key');
      inspect(value[key],depth+1);
    });
    if(Object.prototype.hasOwnProperty.call(value,'id') && !validId(value.id)) throw new Error('invalid id');
  })(parsed,0);
  if (parsed.classes.length>500) throw new Error('too many classes');
  const ids = new Set();
  parsed.classes.forEach(c=>{
    if (!c || !validId(c.id) || ids.has(c.id) || typeof c.name!=='string' || c.name.length>150) throw new Error('invalid class');
    ids.add(c.id);
    if (!Array.isArray(c.students) || c.students.length>5000) throw new Error('invalid students');
    c.students.forEach(s=>{
      if (!s || !validId(s.id) || typeof s.name!=='string' || s.name.length>150 || !Array.isArray(s.grades||[])) throw new Error('invalid student');
    });
    if (c.color && !/^#[0-9a-f]{6}$/i.test(c.color)) delete c.color;
    if (c.info && typeof c.info.note==='string') c.info.note=c.info.note.slice(0,5000);
  });
  if (parsed.profile && typeof parsed.profile.photo==='string' && parsed.profile.photo && !/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=\r\n]+$/i.test(parsed.profile.photo)) parsed.profile.photo='';
  return parsed;
}
