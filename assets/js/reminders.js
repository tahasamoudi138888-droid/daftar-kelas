/* ============ REMINDERS ============ */
function getSmartReminders(){
  const items=[];
  data.classes.forEach(c=>{
    const pendingHomework=Object.entries(c.homework||{}).filter(([,rec])=>rec&&String(rec.text||'').trim()&&!rec.finalized);
    if(pendingHomework.length) items.push({type:'homework',classId:c.id,title:tr('smart_homework_title').replace('{class}',c.name),detail:tr('smart_homework_detail').replace('{count}',pendingHomework.length),icon:ICON.check});

    Object.keys(EXAM_LIMITS).forEach(key=>{
      const started=(c.students||[]).some(s=>s[key]!=null&&s[key]!=='');
      if(!started) return;
      const missing=(c.students||[]).filter(s=>s[key]==null||s[key]==='');
      if(missing.length) items.push({type:'exam',classId:c.id,title:tr('smart_exam_title').replace('{exam}',examLabel(key)),detail:tr('smart_exam_detail').replace('{count}',missing.length).replace('{class}',c.name),icon:ICON.dice});
    });

    const dates=Object.keys(c.attendance||{}).filter(iso=>c.attendance[iso]&&c.attendance[iso].finalized).sort().reverse();
    if(dates.length>=3){
      (c.students||[]).forEach(s=>{
        let streak=0;
        for(const iso of dates){ const val=c.attendance[iso].records&&c.attendance[iso].records[s.id]; if(val==='absent') streak++; else break; }
        if(streak>=3) items.push({type:'absence',classId:c.id,studentId:s.id,title:tr('smart_absence_title').replace('{student}',s.name),detail:tr('smart_absence_detail').replace('{count}',streak).replace('{class}',c.name),icon:ICON.user,urgent:true});
      });
    }
  });
  return items.slice(0,20);
}
function smartReminderAction(type,cid,sid){
  if(type==='absence'&&cid&&sid){ openStudent(cid,sid); return; }
  if(cid){ state.classId=cid; state.screen='class'; state.classTab=type==='homework'?'homework':'students'; render(); }
}
function renderSmartReminders(){
  const items=getSmartReminders();
  if(!items.length) return `<div class="smart-reminder"><div class="sicon">${ICON.check}</div><div class="stext"><b>${tr('smart_all_clear')}</b><span>${tr('smart_all_clear_hint')}</span></div></div>`;
  return items.map(x=>`<div class="smart-reminder${x.urgent?' urgent':''}" data-action="smartReminderAction('${x.type}','${x.classId||''}','${x.studentId||''}')"><div class="sicon">${x.icon}</div><div class="stext"><b>${escapeHtml(x.title)}</b><span>${escapeHtml(x.detail)}</span></div><div class="chev">${ICON.chev}</div></div>`).join('');
}
function reminderPickerDefault(){const now=currentJalaliYMD();let serial=now.jy*12+now.jm-1+(now.jd>=29?1:0);return {jy:Math.floor(serial/12),jm:serial%12+1}}
function renderRemindersScreen(){
  if (data.classes.length===0){
    return `<div class="empty-state">${ICON.bell}<p>${tr('reminders_empty')}</p></div>`;
  }
  if (!state.reminderClassId){
    const smart=`<h2 class="section-title">${tr('smart_title')}</h2><div class="smart-reminder-list">${renderSmartReminders()}</div>`;
    const chips = data.classes.map((c,i)=>{
      const color = GENDER_COLORS[c.gender] || c.color || colorForIndex(i);
      const count = (c.reminders||[]).length;
      return `
        <div class="reminder-chip" data-action="openReminderClass('${c.id}')">
          <div class="rdot" data-style="background:${color}"></div>
          ${escapeHtml(c.name)}
          ${count ? `<span class="rcount">${count}</span>` : ''}
        </div>`;
    }).join('');
    return `${smart}<h2 class="section-title">${tr('reminders_choose_class')}</h2><div class="reminder-chip-grid">${chips}</div>`;
  }
  const c = getClass(state.reminderClassId);
  const todayIso = tehranNow().iso;
  const dated = (c.reminders||[]).filter(n=>n.dueIso).sort((a,b)=> a.dueIso.localeCompare(b.dueIso));
  const undated = (c.reminders||[]).filter(n=>!n.dueIso).slice().reverse();
  const notes = dated.concat(undated).map(n=>{
    const overdue = n.dueIso && n.dueIso < todayIso;
    const dateLine = n.dueIso ? (overdue ? tr('reminder_overdue') : '') : `${n.jalaliShort} — ${n.time}`;
    let dayMonthBadge = '';
    if (n.dueIso){
      const jd = gregorianIsoToJalali(n.dueIso);
      dayMonthBadge = `<div class="rdate-badge">${jd.jd} ${JALALI_MONTHS[jd.jm-1]} ${jd.jy}</div>`;
    } else {
      dayMonthBadge = `<div class="rdate-badge">${tr('reminder_next_session')}</div>`;
    }
    return `
    <div class="note-card${overdue?' reminder-overdue':''}">
      <div data-style="display:flex;align-items:center;justify-content:flex-start;gap:8px;margin-bottom:8px;">
        <div class="hist-del-group" data-style="flex-direction:row;gap:10px;">
          <div class="hist-copy" data-style="width:34px;height:34px;" data-action="copyReminderText('${c.id}','${n.id}')">${ICON.copy}</div>
          <div class="hist-del" data-style="width:34px;height:34px;" data-action="confirmDeleteReminder('${c.id}','${n.id}')">${ICON.trash}</div>
        </div>
        ${dayMonthBadge}
      </div>
      <div class="ntxt">${escapeHtml(n.text)}</div>
      ${dateLine ? `<div class="nmeta" data-style="margin-top:4px;"><span>${dateLine}</span></div>` : ''}
    </div>`;
  }).join('');
  const pickerDefault=reminderPickerDefault();
  if (state.reminderPickMonth===null || state.reminderPickMonth===undefined){state.reminderPickMonth=pickerDefault.jm;state.reminderPickYear=pickerDefault.jy}
  const dateLabel = state.reminderPickDay ? `${formatLocaleNumber(state.reminderPickDay)} ${calendarMonthName('jalali',state.reminderPickYear,state.reminderPickMonth)} ${formatLocaleNumber(state.reminderPickYear)}` : tr('reminder_date_none_opt');
  return `
    <div class="field">
      <textarea id="reminder_text" placeholder="${tr('reminder_ph')}"></textarea>
      <div data-style="margin-top:8px;">
        <p data-style="font-size:11px;color:var(--ink-soft);opacity:.85;margin:0 0 8px;line-height:1.6;">${tr('reminder_date_hint')}</p>
        <span data-style="display:block;font-size:11.5px;color:var(--ink-soft);margin-bottom:4px;">${tr('reminder_date_label')}</span>
        <button type="button" class="dp-trigger${state.reminderPickDay?'':' dp-empty'}" data-style="width:100%;" data-action="openDayPickerModal('${c.id}')">
          <span>${dateLabel}</span>${ICON.chev}
        </button>
      </div>
      <button class="btn btn-gold btn-sm" data-style="width:100%;margin-top:8px;" data-action="addReminder('${c.id}')">${tr('btn_add_reminder')}</button>
    </div>
    ${notes || `<p data-style="font-size:12.5px;color:var(--ink-soft);padding:6px 4px;">${tr('reminder_none_yet')}</p>`}
  `;
}
function openReminderClass(cid){
  state.reminderClassId = cid;
  const next=reminderPickerDefault();
  state.reminderPickMonth=next.jm;state.reminderPickYear=next.jy;
  state.reminderPickDay = null;
  render();
}
function openDayPickerModal(cid){
  haptic(8);
  renderDayPickerModal(cid, null);
}
function renderDayPickerModal(cid, animDir){
  const curJ = currentJalaliYMD();
  const month = state.reminderPickMonth || curJ.jm;
  const year=state.reminderPickYear||curJ.jy;
  const serial=year*12+month-1,minSerial=curJ.jy*12+curJ.jm-1,maxSerial=minSerial+12;
  const maxDay = jalaliDaysInMonth(month,year);
  const isCurMonth = month === curJ.jm&&year===curJ.jy;
  const days = Array.from({length:maxDay}, (_,i)=>i+1).map(d=>{
    const sel = state.reminderPickDay===d;
    const today = isCurMonth && d===curJ.jd;
    const past=isCurMonth&&d<curJ.jd;
    return `<button type="button" class="dp-day-opt${sel?' sel':''}${today?' today':''}" ${past?'disabled aria-disabled="true"':''} data-action="selectReminderDay('${cid}',${d})">${formatLocaleNumber(d)}</button>`;
  }).join('');
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <h3 class="dp-sheet-title">${ICON.calendar}${tr('reminder_day_label')}</h3>
    <div class="dp-clear-row"><button type="button" class="dp-clear-btn" data-action="selectReminderDay('${cid}',null)">${tr('reminder_day_none_opt')}</button></div>
    <div class="dp-month-nav">
      <button type="button" class="cal-nav-btn prev" data-action="dpShiftMonth('${cid}',-1)" aria-label="${escapeAttr(tr('manager_prev'))}" ${serial<=minSerial?'disabled':''}>${ICON.chev}</button>
      <b>${calendarMonthName('jalali',year,month)} ${formatLocaleNumber(year)}</b>
      <button type="button" class="cal-nav-btn next" data-action="dpShiftMonth('${cid}',1)" aria-label="${escapeAttr(tr('manager_next'))}" ${serial>=maxSerial?'disabled':''}>${ICON.chev}</button>
    </div>
    <p class="calendar-swipe-hint compact">${ICON.chev}<span>${tr('calendar_swipe_hint')}</span>${ICON.chev}</p>
    <div class="dp-day-grid${animDir?` swipe-enter-${animDir}`:''}" data-dp-cid="${cid}">${days}</div>
  `);
}
function dpShiftMonth(cid, delta){
  const now=currentJalaliYMD(),min=now.jy*12+now.jm-1,max=min+12;
  let serial=(state.reminderPickYear||now.jy)*12+(state.reminderPickMonth||now.jm)-1+delta;serial=Math.max(min,Math.min(max,serial));
  state.reminderPickYear=Math.floor(serial/12);state.reminderPickMonth=serial%12+1;
  if (state.reminderPickDay){
    const maxDay = jalaliDaysInMonth(state.reminderPickMonth,state.reminderPickYear);
    if (state.reminderPickDay > maxDay) state.reminderPickDay = maxDay;
  }
  haptic(6);
  renderDayPickerModal(cid, delta > 0 ? 'next' : 'prev');
}
function haptic(ms){
  try{ if (navigator.vibrate) navigator.vibrate(ms||10); }catch(e){}
}

/* ============ swipe paging (like a phone home-screen) ============ */
/* برای تقویم (تعویض ماه) و برای انتخابگر روز در یادآوری‌ها (تعویض ماه) */
function initSwipePaging(rootEl,panelSelector,onSwipe,guard,canSwipe=()=>true){
  let sx=0,sy=0,lastX=0,startedAt=0,panel=null,locked=null,dragging=false,suppressClickUntil=0;
  const THRESHOLD = 44;   // حداقل جابه‌جایی افقی (px) برای ثبت سوایپ
  const ignoreTarget=target=>target.closest('input,textarea,select,audio,video,[data-no-swipe],.listening-player');
  function begin(target,x,y){
    if (guard && !guard()) return;
    if(ignoreTarget(target))return;const t=target.closest(panelSelector);if(!t)return;
    panel = t;
    sx=lastX=x;sy=y;startedAt=performance.now();dragging=true;locked=null;
    panel.style.transition = 'none';
  }
  function move(x,y,event){
    if(!dragging||!panel)return;lastX=x;const dx=x-sx,dy=y-sy;
    if (locked===null) locked = (Math.abs(dx) > Math.abs(dy)+4) ? 'x' : 'y';
    if (locked==='x'){
      if(event&&event.cancelable)event.preventDefault();
      panel.style.transform = `translateX(${dx}px)`;
      panel.style.opacity = String(Math.max(.4, 1 - Math.abs(dx)/260));
    }
  }
  function cancel(){if(panel){panel.style.transition='transform .2s ease, opacity .2s ease';panel.style.transform='';panel.style.opacity=''}dragging=false;panel=null;locked=null}
  function release(x){
    if (!dragging || !panel){ dragging=false; return; }
    dragging = false;
    const p = panel; panel = null;
    if (locked!=='x'){ p.style.transform=''; p.style.opacity=''; locked=null; return; }
    if (guard && !guard()){ p.style.transform=''; p.style.opacity=''; locked=null; return; }
    const dx=(Number.isFinite(x)?x:lastX)-sx,elapsed=Math.max(1,performance.now()-startedAt),fast=Math.abs(dx)/elapsed>.55;
    p.style.transition = 'transform .22s cubic-bezier(.22,.61,.36,1), opacity .22s ease';
    if ((Math.abs(dx)>THRESHOLD||(fast&&Math.abs(dx)>24))&&canSwipe(dx>0?1:-1)){
      // مدل فضایی RTL: کشیدن از چپ به راست، صفحه/ماه سمت چپ (بعدی) را باز می‌کند.
      const dir = dx > 0 ? 1 : -1;
      const exitX = dx > 0 ? window.innerWidth*0.5 : -window.innerWidth*0.5;
      p.style.transform = `translateX(${exitX}px)`;
      p.style.opacity = '0';
      suppressClickUntil=Date.now()+350;haptic(6);
      setTimeout(()=>{ onSwipe(dir); }, 120);
    } else {
      p.style.transform = 'translateX(0)';
      p.style.opacity = '1';
      if(Math.abs(dx)>THRESHOLD)haptic(3);
    }
    locked = null;
  }
  rootEl.addEventListener('click',event=>{if(Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation()}},{capture:true});
  if(window.PointerEvent){
    rootEl.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;begin(e.target,e.clientX,e.clientY)},{passive:true});
    rootEl.addEventListener('pointermove',e=>move(e.clientX,e.clientY,e),{passive:false});
    rootEl.addEventListener('pointerup',e=>release(e.clientX),{passive:true});rootEl.addEventListener('pointercancel',cancel,{passive:true});
  }else{
    rootEl.addEventListener('touchstart',e=>{const t=e.touches[0];if(t)begin(e.target,t.clientX,t.clientY)},{passive:true});
    rootEl.addEventListener('touchmove',e=>{const t=e.touches[0];if(t)move(t.clientX,t.clientY,e)},{passive:false});
    rootEl.addEventListener('touchend',e=>release(e.changedTouches&&e.changedTouches[0]?.clientX),{passive:true});rootEl.addEventListener('touchcancel',cancel,{passive:true});
  }
}
function initSwipeNav(){
  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modalRoot');
  initSwipePaging(app, '.cal-grid-card', (dir)=>{
    if (state.screen!=='calendar') return;
    if (state.calTab==='gregorian') calGShiftMonth(dir);
    else if (state.calTab==='calendar') calShiftMonth(dir);
  },null,dir=>{const gregorian=state.calTab==='gregorian',serial=(gregorian?state.calGY:state.calJY)*12+(gregorian?state.calGM:state.calJM)-1,next=serial+dir;return gregorian?next>=2021*12&&next<=2030*12+11:next>=1400*12&&next<=1410*12+11});
  initSwipePaging(modalRoot, '.dp-day-grid', (dir)=>{
    const grid = modalRoot.querySelector('.dp-day-grid');
    const cid = grid ? grid.getAttribute('data-dp-cid') : null;
    if (cid) dpShiftMonth(cid, dir);
  },null,dir=>{const now=currentJalaliYMD(),min=now.jy*12+now.jm-1,max=min+12,serial=(state.reminderPickYear||now.jy)*12+(state.reminderPickMonth||now.jm)-1+dir;return serial>=min&&serial<=max});
  initSwipePaging(app,'.manager-calendar-week',(dir)=>managerCalendarShift(dir),()=>data.settings.appRole==='manager'&&managerState.section==='me',dir=>{managerInitCalendar();const c=managerState.meCal,j=c.kind==='jalali',serial=(j?c.jy:c.gy)*12+(j?c.jm:c.gm)-1+dir;return j?serial>=MANAGER_JALALI_MIN*12&&serial<=MANAGER_JALALI_MAX*12+11:serial>=MANAGER_GREGORIAN_MIN*12&&serial<=MANAGER_GREGORIAN_MAX*12+11});
  // چهار صفحهٔ اصلی به‌صورت خطی و مطابق جای واقعی آن‌ها در نوار پایین جابه‌جا می‌شوند.
  initSwipePaging(app, '.screen-fade', (dir)=>{
    const screens=['home','reminders','spin','profile'];
    const index=screens.indexOf(state.screen);
    if(index<0) return;
    const nextIndex=index+dir;if(nextIndex<0||nextIndex>=screens.length){haptic(4);return}
    const target=screens[nextIndex];
    const anim=dir>0?'next':'prev';
    if(target==='home') goHome(anim);
    else if(target==='reminders') goReminders(anim);
    else if(target==='spin') goSpin(anim);
    else goProfile(anim);
  },()=>data.settings.appRole==='teacher'&&(state.screen==='home'||(state.screen==='reminders'&&!state.reminderClassId)||state.screen==='spin'||state.screen==='profile'),dir=>{const i=['home','reminders','spin','profile'].indexOf(state.screen);return i>=0&&i+dir>=0&&i+dir<4});
}
function selectReminderDay(cid, day){
  haptic();
  state.reminderPickDay = day;
  if (day){
    const maxDay = jalaliDaysInMonth(state.reminderPickMonth||currentJalaliYMD().jm,state.reminderPickYear||currentJalaliYMD().jy);
    if (state.reminderPickDay > maxDay) state.reminderPickDay = maxDay;
  }
  closeModal();
  const txt = document.getElementById('reminder_text');
  const val = txt ? txt.value : '';
  render();
  const txt2 = document.getElementById('reminder_text');
  if (txt2) txt2.value = val;
}
function addReminder(cid){
  const el = document.getElementById('reminder_text');
  const text = el.value.trim();
  if (!text) return;
  const day = state.reminderPickDay || null;
  const month = state.reminderPickMonth || null,year=state.reminderPickYear||null;
  const c = getClass(cid); const t = tehranNow();
  if (!c.reminders) c.reminders=[];
  const reminder = {id:uid(), text, iso:t.iso, time:t.time, jalaliShort:t.jalaliShort};
  if (day && month&&year){
    const maxDay = jalaliDaysInMonth(month,year);
    reminder.dueIso=jalaliToGregorianIso(year,month,Math.min(day,maxDay));
  }
  c.reminders.push(reminder);
  clearDraft('reminder_text');
  const next=reminderPickerDefault();state.reminderPickMonth=next.jm;state.reminderPickYear=next.jy;
  state.reminderPickDay = null;
  saveData(); render(); toast(tr('toast_reminder_added'));
}
function deleteReminder(cid, rid){
  const c = getClass(cid);
  const index=(c.reminders||[]).findIndex(r=>r.id===rid); const removed=index>-1?c.reminders[index]:null;
  c.reminders = (c.reminders||[]).filter(r=>r.id!==rid);
  saveData(); render();
  undoToast(tr('toast_reminder_deleted'),()=>{ const cls=getClass(cid); if(cls&&removed&&!cls.reminders.some(r=>r.id===rid)){ cls.reminders.splice(Math.max(0,index),0,removed); saveData(); render(); toast(tr('toast_reminder_restored')); } });
}
function confirmDeleteReminder(cid, rid){
  confirmModal(tr('confirm_delete_reminder_title'), tr('confirm_delete_reminder_body'), ()=>{
    deleteReminder(cid, rid);
  });
}
function copyReminderText(cid, rid){
  const c = getClass(cid);
  const n = (c.reminders||[]).find(r=>r.id===rid);
  const text = n ? n.text : '';
  if (!text) return;
  const done = () => toast(tr('toast_reminder_copied'));
  const fail = () => {
    try{
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      done();
    }catch(e){}
  };
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(fail);
  } else {
    fail();
  }
}
