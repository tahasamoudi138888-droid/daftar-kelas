/* ============ toast ============ */
let pendingUndo=null;
function toast(msg, action){
  const t = document.getElementById('toast');
  t.innerHTML='';
  const label=document.createElement('span'); label.textContent=msg; t.appendChild(label);
  t.classList.toggle('has-action',!!(action&&typeof action.run==='function'));
  if(action && typeof action.run==='function'){
    pendingUndo=action.run;
    const btn=document.createElement('button'); btn.type='button'; btn.className='toast-undo'; btn.textContent=action.label||tr('undo');
    btn.onclick=()=>{ const fn=pendingUndo; pendingUndo=null; clearTimeout(t._timer); t.classList.remove('show'); if(fn) fn(); };
    t.appendChild(btn);
  } else pendingUndo=null;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>{ t.classList.remove('show'); t.classList.remove('has-action'); pendingUndo=null; }, action?5000:1800);
}
function runFeedbackMotion(kind){
  const cls=`feedback-${kind}`;document.body.classList.remove(cls);void document.body.offsetWidth;document.body.classList.add(cls);setTimeout(()=>document.body.classList.remove(cls),650);
}
function undoToast(message, restore){ toast(message,{label:tr('undo'),run:async()=>{await restore();runFeedbackMotion('restore')}}); }
function showOperationProgress(title,percent=0,detail=''){
  const root=document.getElementById('operationProgress');if(!root)return;
  const p=Math.max(0,Math.min(100,Math.round(Number(percent)||0)));root.hidden=false;
  document.getElementById('progressRing').style.setProperty('--progress',p);document.getElementById('progressPercent').textContent=`${p}%`;
  document.getElementById('progressTitle').textContent=title||tr('progress_preparing');document.getElementById('progressDetail').textContent=detail||'';
}
function hideOperationProgress(){const root=document.getElementById('operationProgress');if(root)root.hidden=true;heavyOperationActive=false;operationCancelled=false;const cancel=document.getElementById('cancelHeavyOperation');if(cancel){cancel.hidden=true;cancel.disabled=false;cancel.textContent=tr('btn_cancel')}}

/* ============ modal helpers ============ */
function openModal(html){
  const root = document.getElementById('modalRoot');
  root._returnFocus = document.activeElement;
  root.innerHTML = `<div class="modal-overlay" id="modalOverlay" role="presentation"><div class="modal-sheet" role="dialog" aria-modal="true" tabindex="-1">${html}</div></div>`;
  const shell=document.getElementById('shell');if(shell){shell.inert=true;shell.setAttribute('aria-hidden','true')}
  document.getElementById('modalOverlay').addEventListener('click', (e)=>{ if(e.target.id==='modalOverlay') closeModal(); });
  const sheet=root.querySelector('.modal-sheet');
  const title=sheet&&sheet.querySelector('h1,h2,h3');
  if(title){title.id=title.id||`modal-title-${Date.now()}`;sheet.setAttribute('aria-labelledby',title.id)}
  else if(sheet)sheet.setAttribute('aria-label',tr('title_app'));
  root.querySelectorAll('.modal-close-x').forEach(button=>button.setAttribute('aria-label',tr('settings_close')));
  enhanceAccessibility(root);
  if(sheet) setTimeout(()=>sheet.focus(),0);
}
function closeModal(){
  const root=document.getElementById('modalRoot');
  const back=root._returnFocus;
  const onClose=root._onClose;
  root._onClose=null;
  root.innerHTML='';
  const shell=document.getElementById('shell');if(shell){shell.inert=false;shell.removeAttribute('aria-hidden')}
  if(back&&typeof back.focus==='function') back.focus();
  if(typeof onClose==='function') onClose();
}
document.addEventListener('keydown',e=>{
  const overlay=document.getElementById('modalOverlay');
  if(e.key==='Escape'&&overlay){closeModal();return}
  if(e.key==='Tab'&&overlay){
    const focusable=[...overlay.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled&&!el.hidden);
    if(!focusable.length){e.preventDefault();overlay.querySelector('.modal-sheet')?.focus();return}
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
});

function confirmModal(title, msg, onYes){
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <h3>${title}</h3>
    <p data-style="font-size:13.5px;color:var(--ink-soft);line-height:1.9;margin:0 0 20px;">${msg}</p>
    <div class="modal-actions">
      <button class="btn btn-outline-dark" data-action="closeModal()">${tr('btn_cancel')}</button>
      <button class="btn btn-danger" id="confirmYesBtn">${tr('btn_delete_confirm')}</button>
    </div>
  `);
  document.getElementById('confirmYesBtn').onclick = ()=>{ closeModal(); onYes(); };
}
function confirmModalAsync(message,title=tr('confirm_action_title')){
  return new Promise(resolve=>{
    openModal(`<button type="button" class="modal-close-x" id="confirmAsyncClose" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${escapeHtml(title)}</h3><p data-style="font-size:13.5px;color:var(--ink-soft);line-height:1.9;margin:0 0 20px;">${escapeHtml(message)}</p><div class="modal-actions"><button class="btn btn-outline-dark" id="confirmAsyncCancel">${tr('btn_cancel')}</button><button class="btn btn-danger" id="confirmAsyncYes">${tr('btn_delete_confirm')}</button></div>`);
    let settled=false;const finish=value=>{if(settled)return;settled=true;closeModal();resolve(value)};
    document.getElementById('confirmAsyncYes').onclick=()=>finish(true);
    document.getElementById('confirmAsyncCancel').onclick=()=>finish(false);
    document.getElementById('confirmAsyncClose').onclick=()=>finish(false);
    document.getElementById('modalRoot')._onClose=()=>{if(!settled){settled=true;resolve(false)}};
  });
}

/* ============ getters ============ */
function getClass(id){ return data.classes.find(c=>c.id===id); }
function getStudent(cls, id){ return cls.students.find(s=>s.id===id); }
function studentTotal(student){
  let t=0;
  (student.grades||[]).forEach(g=>{
    if(g.value==='plus') t+=1;
    else if(g.value==='minus') t-=1;
    else if(g.value==='custom') t += (parseFloat(g.amount)||0);
  });
  return t;
}

/* ============ navigation ============ */
function goHome(dir){ state.screen='home'; state.screenAnimDir = dir || null; render(); }
function openClass(id){ state.classId=id; state.classTab='students'; state.studentSearch=''; state.screen='class'; render(); }
function openStudent(cid, sid){ state.classId=cid; state.studentId=sid; state.screen='student'; render(); }
function openAttHistory(){ state.screen='attendanceHistory'; state.attHistDate=null; render(); }
function goSpin(dir){ state.screen='spin'; state.screenAnimDir=dir||null; render(); }
function goProfile(dir){ state.screen='profile'; state.screenAnimDir=dir||null; render(); }
function goReminders(dir){ state.screen='reminders'; state.reminderClassId=null; state.screenAnimDir = dir || null; render(); }

/* ============ RENDER: master ============ */
function render(){
  if(!data.settings.appRole){renderRoleGateway();return}
  if(data.settings.appRole==='manager'){renderManagerPortal();return}
  setTeacherChrome(true);
  if(typeof ensureDefaultPersonalBackupReminder==='function'&&ensureDefaultPersonalBackupReminder())saveData().catch(error=>recordLocalError('default_backup_reminder',error));
  document.title = tr('title_app');
  applyLocale();
  applyTheme();
  renderTopbar();
  renderBottomnav();
  renderFab();
  const app = document.getElementById('app');
  let html='';
  if (state.screen==='home') html = renderHome();
  else if (state.screen==='class') html = renderClassScreen();
  else if (state.screen==='student') html = renderStudentScreen();
  else if (state.screen==='attendanceHistory') html = renderAttendanceHistoryScreen();
  else if (state.screen==='spin') html = renderSpinScreen();
  else if (state.screen==='profile') html = renderProfileScreen();
  else if (state.screen==='reminders') html = renderRemindersScreen();
  else if (state.screen==='calendar') html = renderCalendarScreen();
  const screenAnimCls = state.screenAnimDir ? ` swipe-enter-${state.screenAnimDir}` : '';
  state.screenAnimDir = null;
  app.innerHTML = `<div class="screen-fade${screenAnimCls}">${html}</div>`;
  enhanceAccessibility(app);
  restoreDrafts(app);
  window.scrollTo(0,0);
  renderClassAlert();
  if(typeof checkPersonalReminderNotifications==='function')setTimeout(checkPersonalReminderNotifications,0);
}
function enhanceAccessibility(root){
  root.querySelectorAll('[data-action]:not(button):not(a):not(input)').forEach(el=>{
    if(!el.hasAttribute('tabindex')) el.tabIndex=0;
    if(!el.hasAttribute('role')) el.setAttribute('role','button');
    if(!el.dataset.keyboardReady){
      el.dataset.keyboardReady='1';
      el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();} });
    }
  });
}

/* ============ class-approaching alert (top-left badge) ============ */
const CLASS_ALERT_LEAD_MIN = 30;   // چند دقیقه قبل از شروع کلاس، یادآوری نشون داده بشه (زنگوله‌ی پایین)
const CLASS_ALERT_GRACE_MIN = 10;  // چند دقیقه بعد از شروع هم، یادآوری بمونه (زنگوله‌ی پایین)
const PILL_LEAD_MIN = 60;   // چند دقیقه قبل از شروع کلاس، پیل «کلاس بعدی» نشون داده بشه
const PILL_GRACE_MIN = 5;   // چند دقیقه بعد از شروع هم، پیل بمونه
const BADGE_LEAD_MIN = 60;  // چند دقیقه قبل از شروع کلاس، زنگوله‌ی بالا سمت چپ نشون داده بشه
const BADGE_GRACE_MIN = 15; // چند دقیقه بعد از شروع هم، زنگوله بمونه (مگراینکه معلم زودتر روش بزنه)
function renderClassAlert(){
  const badge = document.getElementById('classAlertBadge');
  if (!badge) return;
  if(data.settings.appRole!=='teacher'){badge.style.display='none';badge.onclick=null;return}
  const c = nearbyClassWithReminder(BADGE_LEAD_MIN, BADGE_GRACE_MIN);
  if(c) maybeSendClassNotification(c);
  const dismissed = c && dismissedReminderAlert && dismissedReminderAlert.classId===c.id && dismissedReminderAlert.count===c.reminders.length;
  if (!c || dismissed){ badge.style.display='none'; badge.onclick=null; applyBellRingState(); return; }
  const label = tr('reminder_for_class').replace('{class}',c.name);
  badge.style.display='flex';
  badge.title = label;
  badge.innerHTML = `${ICON.bell}`;
  badge.onclick = ()=>{ dismissReminderAlert(BADGE_LEAD_MIN, BADGE_GRACE_MIN); state.screen='reminders'; state.reminderClassId=c.id; render(); };
  applyBellRingState();
}
function maybeSendClassNotification(c){
  if(!data.settings.notifications || !('Notification' in window) || Notification.permission!=='granted' || !navigator.serviceWorker) return;
  const tag=`${tehranNow().iso}:${c.id}:${c.info&&c.info.startTime||''}`;
  try{
    if(sessionStorage.getItem('dk_last_notification')===tag) return;
    sessionStorage.setItem('dk_last_notification',tag);
  }catch(_){ }
  navigator.serviceWorker.ready.then(reg=>{
    if(reg.active) reg.active.postMessage({type:'SHOW_CLASS_NOTIFICATION',payload:{
      title:tr('class_notification_title').replace('{class}',c.name),
      body:tr(c.reminders&&c.reminders.length?'class_notification_body_reminders':'class_notification_body').replace('{time}',c.info.startTime).replace('{count}',c.reminders&&c.reminders.length||0),
      tag
    }});
  }).catch(()=>{});
}
setInterval(()=>{ try{ renderClassAlert(); renderTopbar(); }catch(e){} }, 20000);

let dismissedReminderAlert = null; // {classId, count} — یادآوری‌ای که کاربر دیده و تا یادآوری بعدی خاموش شده
let dismissedSmartSignature = '';
function nearbyClassWithReminder(leadMin, graceMin){
  leadMin = leadMin==null ? CLASS_ALERT_LEAD_MIN : leadMin;
  graceMin = graceMin==null ? CLASS_ALERT_GRACE_MIN : graceMin;
  const t = tehranNowFull();
  const nowMinutes = t.hour*60 + t.minute;
  const candidates = data.classes
    .filter(c => c.info && c.info.startTime && classActiveToday(c, t.weekday) && c.reminders && c.reminders.length)
    .map(c => ({c, m: parseTimeToMinutes(c.info.startTime)}))
    .filter(x => x.m!=null)
    .map(x => Object.assign({}, x, {nowMinutes}));
  const soon = candidates.filter(x => (x.m - nowMinutes) <= leadMin && (x.m - nowMinutes) >= -graceMin);
  soon.sort((a,b)=> Math.abs(a.m-nowMinutes) - Math.abs(b.m-nowMinutes));
  return soon.length ? soon[0].c : null;
}
function reminderAlertActive(){
  if (typeof getSmartReminders==='function'){
    const smart=getSmartReminders();
    const signature=smart.map(x=>`${x.type}:${x.classId||''}:${x.studentId||''}:${x.detail}`).join('|');
    if (smart.length && signature!==dismissedSmartSignature) return true;
  }
  const c = nearbyClassWithReminder(CLASS_ALERT_LEAD_MIN, CLASS_ALERT_GRACE_MIN);
  if (!c) return false;
  if (dismissedReminderAlert && dismissedReminderAlert.classId===c.id && dismissedReminderAlert.count===c.reminders.length) return false;
  return true;
}
function dismissReminderAlert(leadMin, graceMin){
  if(typeof getSmartReminders==='function') dismissedSmartSignature=getSmartReminders().map(x=>`${x.type}:${x.classId||''}:${x.studentId||''}:${x.detail}`).join('|');
  const c = nearbyClassWithReminder(leadMin, graceMin);
  if (c) dismissedReminderAlert = {classId:c.id, count:c.reminders.length};
}

function renderTopbar(){
  if(data.settings.appRole!=='teacher'){setTeacherChrome(false);return}
  const tb = document.getElementById('topbar');
  let title='', sub='', showBack=false, showAction=false, actionIcon='', actionFn='', extra='';
  if (state.screen==='home'){
    const tf = tehranNowFull();
    title=tr('title_app'); sub = `${tf.jalali} — ${tf.time}`;
    if (data.classes.length){
      const nx = nextClassPillInfo();
      if (nx){
        const nowMin = tf.hour*60 + tf.minute;
        const urgent = (nx.m - nowMin) <= 15;
        extra = `<button type="button" class="next-class-pill${urgent?' urgent':''}" data-action="openClass('${nx.c.id}')">${ICON.bell} ${tr('home_next_class')} ${escapeHtml(nx.c.name)} — ${escapeHtml(nx.c.info.startTime)}</button>`;
      }
    }
  }
  else if (state.screen==='class'){
    const c = getClass(state.classId);
    title = c ? c.name : ''; showBack=true; showAction=true; actionIcon=ICON.dots; actionFn="openClassMenu()";
    if(c){
      const hasBook=!!c.textbook;
      const listeningCount=Array.isArray(c.listenings)?c.listenings.length:0;
      extra = `<div class="class-media-actions" aria-label="${escapeAttr(tr('textbook_manage'))} / ${escapeAttr(tr('listening_manage'))}">
        <button type="button" class="class-media-btn${hasBook?' has-media':''}" data-action="openTextbookModal('${c.id}')" aria-label="${escapeAttr(tr('textbook_manage'))}" title="${escapeAttr(tr('textbook_manage'))}">${ICON.book}</button>
        <button type="button" class="class-media-btn${listeningCount?' has-media':''}" data-action="openListeningModal('${c.id}')" aria-label="${escapeAttr(tr('listening_manage'))}" title="${escapeAttr(tr('listening_manage'))}">${ICON.audio}${listeningCount?`<span class="media-count">${listeningCount>9?'9+':listeningCount}</span>`:''}</button>
      </div>`;
    }
  }
  else if (state.screen==='student'){
    const c = getClass(state.classId); const s = c && getStudent(c, state.studentId);
    title = s ? s.name : ''; sub = c ? c.name : ''; showBack=true; showAction=true; actionIcon=ICON.gear; actionFn="openStudentSettingsModal()";
  }
  else if (state.screen==='attendanceHistory'){ title=tr('title_att_history'); showBack=true; }
  else if (state.screen==='spin'){ title=tr('title_spin'); sub=tr('sub_spin'); }
  else if (state.screen==='profile'){ title=tr('title_profile'); showAction=true; actionIcon=ICON.gear; actionFn="openSettingsModal()"; }
  else if (state.screen==='reminders'){
    if (state.reminderClassId){ const c=getClass(state.reminderClassId); title = c?c.name:tr('title_reminders'); showBack=true; }
    else { title=tr('title_reminders'); }
  }
  else if (state.screen==='calendar'){ title=tr('title_calendar'); showBack=true; }

  tb.innerHTML = `
    ${showBack ? `<button type="button" class="back-btn" data-action="handleBack()" aria-label="${escapeAttr(tr('aria_back'))}">${ICON.back}</button>` : ''}
    <div class="topbar-title">
      <h1>${escapeHtml(title)}</h1>
      ${sub ? `<span class="sub">${escapeHtml(sub)}</span>` : ''}
      ${state.screen==='home' ? extra : ''}
    </div>
    ${showAction ? `<button type="button" class="action-btn" data-action="${actionFn}" aria-label="${escapeAttr(tr(state.screen==='student'?'student_settings':'aria_more_actions'))}">${actionIcon}</button>` : ''}
    ${state.screen==='class' ? extra : ''}
  `;
}
function handleBack(){
  if (state.screen==='student'){ state.screen='class'; render(); }
  else if (state.screen==='class'){ goHome(); }
  else if (state.screen==='attendanceHistory'){ state.screen='class'; state.classTab='attendance'; render(); }
  else if (state.screen==='reminders' && state.reminderClassId){ state.reminderClassId=null; render(); }
  else if (state.screen==='calendar'){ state.screen='profile'; render(); }
  else { goHome(); }
}

function renderBottomnav(){
  const nav = document.getElementById('bottomnav');
  const items = [
    {key:'home', icon:ICON.home, label:tr('nav_classes'), on:()=>goHome(), active: state.screen==='home'||state.screen==='class'||state.screen==='student'||state.screen==='attendanceHistory'},
    {key:'reminders', icon:ICON.bell, label:tr('nav_reminders'), on:()=>goReminders(), active: state.screen==='reminders'},
    {key:'spin', icon:ICON.dice, label:tr('nav_spin'), on:()=>goSpin(), active: state.screen==='spin'},
    {key:'profile', icon:ICON.user, label:tr('nav_profile'), on:()=>goProfile(), active: state.screen==='profile'},
  ];
  nav.setAttribute('aria-label',tr('title_app'));
  nav.innerHTML = items.map((it,i)=>`<button type="button" data-key="${it.key}" class="${it.active?'active':''}" aria-current="${it.active?'page':'false'}" data-action="navClick(${i})">${it.icon}<span>${it.label}</span></button>`).join('');
  nav._items = items;
  applyBellRingState();
}
function navClick(i){
  const items=document.getElementById('bottomnav')._items||[];
  const item=typeof i==='string'?items.find(entry=>entry.key===i):items[Number(i)];
  if(!item)return;
  if (item.key==='reminders'){ dismissReminderAlert(); animateBellIcon(); }
  item.on();
  if (item.key==='spin') animateDiceIcon();
}
function animateBellIcon(){
  const btn = document.querySelector('#bottomnav button[data-key="reminders"]');
  if (!btn) return;
  const svgEl = btn.querySelector('svg');
  if (!svgEl) return;
  svgEl.classList.remove('bell-tap-shake');
  void svgEl.offsetWidth; // force reflow so the animation can retrigger on repeated taps
  svgEl.classList.add('bell-tap-shake');
  setTimeout(()=>{ svgEl.classList.remove('bell-tap-shake'); }, 600);
}
function diceFaceSVG(n){
  const pips = {
    1:[[12,12]], 2:[[7,7],[17,17]], 3:[[7,7],[12,12],[17,17]],
    4:[[7,7],[17,7],[7,17],[17,17]], 5:[[7,7],[17,7],[12,12],[7,17],[17,17]],
    6:[[7,7],[17,7],[7,12],[17,12],[7,17],[17,17]]
  }[n] || [[12,12]];
  const circles = pips.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.6" fill="currentColor"/>`).join('');
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/>${circles}</svg>`;
}
function animateDiceIcon(){
  const btn = document.querySelector('#bottomnav button[data-key="spin"]');
  if (!btn) return;
  let count = 0;
  const iv = setInterval(()=>{
    count++;
    const svgEl = btn.querySelector('svg');
    if (!svgEl){ clearInterval(iv); return; }
    svgEl.outerHTML = diceFaceSVG(Math.floor(Math.random()*6)+1);
    const fresh = btn.querySelector('svg');
    fresh.style.transition = 'transform .1s ease';
    fresh.style.transform = `rotate(${count*70}deg) scale(1.15)`;
    if (count>=5){
      clearInterval(iv);
      const last = btn.querySelector('svg');
      if (last) last.outerHTML = ICON.dice;
    }
  }, 90);
}
function applyBellRingState(){
  const btn = document.querySelector('#bottomnav button[data-key="reminders"]');
  if (!btn) return;
  const svgEl = btn.querySelector('svg');
  if (!svgEl) return;
  if (reminderAlertActive()) svgEl.classList.add('nav-bell-ring');
  else svgEl.classList.remove('nav-bell-ring');
}

function renderFab(){
  const fab = document.getElementById('fabBtn');
  if (state.screen==='home'){ fab.style.display='flex'; fab.innerHTML=ICON.plus; fab.onclick=()=>openClassFormModal(null); }
  else if (state.screen==='class' && state.classTab==='students'){ fab.style.display='flex'; fab.innerHTML=ICON.plus; fab.onclick=()=>openStudentFormModal(null); }
  else { fab.style.display='none'; }
}
