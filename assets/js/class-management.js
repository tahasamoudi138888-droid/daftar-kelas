/* ============ HOME ============ */

function dailyDashboardStats(){
  const now=tehranNowFull(),today=now.iso;
  const todays=data.classes.filter(c=>classActiveToday(c,now.weekday));
  const attendancePending=todays.filter(c=>!(c.attendance&&c.attendance[today]&&c.attendance[today].finalized)).length;
  const homeworkPending=todays.filter(c=>{
    const h=c.homework&&c.homework[today];
    return !!(h&&String(h.text||'').trim()&&!h.finalized);
  }).length;
  let reminders=0;
  data.classes.forEach(c=>(c.reminders||[]).forEach(r=>{if(r.dueIso&&r.dueIso<=today)reminders++;}));
  const students=todays.reduce((n,c)=>n+(c.students||[]).length,0);
  return {todays,attendancePending,homeworkPending,reminders,students};
}
function renderDailyDashboard(){
  const d=dailyDashboardStats();
  const classNames=d.todays.slice(0,3).map(c=>escapeHtml(c.name)).join('، ');
  const more=d.todays.length>3?` +${d.todays.length-3}`:'';
  return `<details class="daily-dashboard" ${d.todays.length?'open':''}>
    <summary><span>${ICON.sparkle||ICON.calendar}</span><b>${tr('dashboard_today')}</b><em>${d.todays.length} ${tr('dashboard_classes')}</em></summary>
    <div class="daily-grid">
      <div><b>${d.students}</b><span>${tr('dashboard_students')}</span></div>
      <button type="button" data-action="openTodayWork('attendance')"><b>${d.attendancePending}</b><span>${tr('dashboard_attendance_pending')}</span></button>
      <button type="button" data-action="openTodayWork('homework')"><b>${d.homeworkPending}</b><span>${tr('dashboard_homework_pending')}</span></button>
      <button type="button" data-action="openTodayWork('reminders')"><b>${d.reminders}</b><span>${tr('dashboard_reminders')}</span></button>
    </div>
    <div class="daily-classes">${classNames||tr('dashboard_no_class')}${more}</div>
  </details>`;
}
function openTodayWork(kind){
  if(kind==='reminders'){goReminders();return}
  const d=dailyDashboardStats(),target=d.todays.find(c=>kind==='attendance'?!(c.attendance&&c.attendance[tehranNow().iso]&&c.attendance[tehranNow().iso].finalized):!!(c.homework&&c.homework[tehranNow().iso]&&String(c.homework[tehranNow().iso].text||'').trim()&&!c.homework[tehranNow().iso].finalized));
  if(target){openClass(target.id);state.classTab=kind;render()}else toast(tr('dashboard_nothing_pending'));
}
function greetingKey(){const h=tehranNowFull().hour;return h<12?'greeting_morning':h<17?'greeting_afternoon':'greeting_evening'}
function renderTeacherHero(){
  const d=dailyDashboardStats(),name=String(data.profile&&data.profile.name||tr('teacher_default_name')).trim();
  const summary=tr('greeting_summary').replace('{classes}',d.todays.length).replace('{reminders}',d.reminders);
  const avatar=data.profile&&data.profile.photo?`<img src="${escapeAttr(data.profile.photo)}" alt="">`:`<span>${ICON.user}</span>`;
  return `<section class="teacher-hero"><div class="teacher-avatar">${avatar}</div><div class="teacher-welcome"><small>${escapeHtml(tehranNow().jalali)}</small><h2>${tr(greetingKey())}، ${escapeHtml(name)}</h2><p>${escapeHtml(summary)}</p></div><div class="teacher-status" aria-label="${escapeAttr(tr('dashboard_today'))}">${d.attendancePending||d.homeworkPending||d.reminders?ICON.bell:ICON.check}</div></section>`;
}
function renderLanguageHint(){
  return data.settings.langHintSeen ? '' : `<button type="button" class="lang-hint-note" data-style="width:100%;border:0;text-align:start;font-family:inherit" data-action="dismissLangHint()">${ICON.gear}<span>Tap here once to choose your language, theme and app color.</span></button>`;
}
function renderHome(){
  if (data.classes.length===0){
    return `
      <div class="empty-state">
        ${ICON.folder}
        <p>${tr('home_empty')}</p>
      </div>
      ${renderLanguageHint()}`;
  }
  const query=String(state.classSearch||'').trim().toLocaleLowerCase('fa');
  const sortedClasses = data.classes.filter(c=>!query||String(c.name||'').toLocaleLowerCase('fa').includes(query)||(c.students||[]).some(s=>String(s.name||'').toLocaleLowerCase('fa').includes(query))).sort((a,b)=> minutesUntilNextClass(a) - minutesUntilNextClass(b));
  const cards = sortedClasses.map((c,i)=>{
    const color = GENDER_COLORS[c.gender] || c.color || colorForIndex(i);
    const daysLabel = c.info && c.info.days && c.info.days.length ? formatDaysFull(c.info.days) : '';
    const metaParts = [
      genderLabel(c.gender) || '',
      c.info && c.info.startTime ? c.info.startTime : ''
    ].filter(Boolean);
    const meta = metaParts.length ? metaParts.join(' · ') : tr('home_no_info');
    const today=tehranNow().iso,att=!!(c.attendance&&c.attendance[today]&&c.attendance[today].finalized),hw=!!(c.homework&&c.homework[today]&&String(c.homework[today].text||'').trim()&&!c.homework[today].finalized),due=(c.reminders||[]).filter(r=>r.dueIso&&r.dueIso<=today).length;
    return `
      <div class="folder-card" data-style="--tab-color:${color}" data-action="openClass('${c.id}')">
        <button type="button" class="dots" aria-label="${escapeAttr(tr('class_more_actions'))}" data-action="openClassInfoModal('${c.id}')">${ICON.dots}</button>
        <div>
          <div class="fname">${escapeHtml(c.name)}</div>
          ${daysLabel ? `<div class="fname-days">${escapeHtml(daysLabel)}</div>` : ''}
          <div class="fmeta">${escapeHtml(meta)}</div>
        </div>
        <div class="class-card-footer"><div class="count-pill">${c.students.length} ${tr('home_students_suffix')}</div><div class="class-health"><span class="${att?'done':'pending'}" title="${escapeAttr(tr('tab_attendance'))}">${att?ICON.check:ICON.calendar}</span>${hw?`<span class="warning" title="${escapeAttr(tr('tab_homework'))}">${ICON.book}</span>`:''}${due?`<span class="urgent" title="${escapeAttr(tr('nav_reminders'))}">${ICON.bell}<b>${due}</b></span>`:''}</div></div>
      </div>`;
  }).join('');
  return `<div class="search-box">${ICON.search||ICON.user}<input id="classSearch" type="search" value="${escapeAttr(state.classSearch||'')}" placeholder="${escapeAttr(tr('search_classes'))}" data-input-action="searchClasses(this.value)" autocomplete="off"></div><h2 class="section-title">${tr('home_my_classes')}</h2>${cards?`<div class="folder-grid">${cards}</div>`:`<div class="empty-state">${ICON.search||ICON.user}<p>${tr('search_no_results')}</p></div>`}${renderLanguageHint()}`;
}
let classSearchTimer=null,studentSearchTimer=null;
function searchClasses(value){state.classSearch=String(value||'').slice(0,100);clearTimeout(classSearchTimer);classSearchTimer=setTimeout(render,120)}

function openClassFormModal(editId){
  const c = editId ? getClass(editId) : null;
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <h3>${c ? tr('class_edit_title') : tr('class_new_title')}</h3>
    <div class="field"><label>${tr('class_name_label')}</label><input type="text" id="f_name" value="${c ? escapeAttr(c.name):''}" placeholder="${tr('class_name_ph')}"></div>
    <div class="field">
      <label>${tr('class_type_label')}</label>
      <div class="seg" id="f_gender">
        ${[['boys',tr('gender_boys')],['girls',tr('gender_girls')],['other',tr('gender_other')]].map(([v,label])=>`<button type="button" data-v="${v}" class="${(c && c.gender===v) ? 'sel':''}" data-action="selectSeg(this)">${label}</button>`).join('')}
      </div>
    </div>
    <div class="field"><label>${tr('class_time_label')}</label><input type="text" id="f_time" value="${c && c.info ? escapeAttr(c.info.startTime||''):''}" placeholder="${tr('class_time_ph')}"></div>
    <div class="field"><label>${tr('class_duration')}</label><input id="f_duration" type="number" min="15" max="480" value="${c?.info?.durationMinutes||90}"></div>
    <div class="field">
      <label>${tr('class_days_label')}</label>
      <div class="weekday-grid" id="f_days">
        ${WEEKDAYS.map(d=>`<button type="button" data-v="${d}" class="wd-btn ${c && c.info && (c.info.days||[]).indexOf(d)>-1 ? 'sel':''}" data-action="toggleWeekdayBtn(this)">${dayLabel(d)}</button>`).join('')}
      </div>
    </div>
    <div class="field"><label>${tr('class_note_label')}</label><textarea id="f_note" placeholder="${tr('class_note_ph')}">${c && c.info ? escapeHtml(c.info.note||''):''}</textarea></div>
    <div class="modal-actions">
      <button class="btn btn-gold" data-action="saveClassForm('${c?c.id:''}')">${tr('btn_save')}</button>
    </div>
  `);
}
function selectSeg(btn){
  [...btn.parentElement.children].forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
}
function toggleWeekdayBtn(btn){ btn.classList.toggle('sel'); }
function saveClassForm(id){
  const name = document.getElementById('f_name').value.trim();
  if (!name){ toast(tr('toast_class_name_required')); return; }
  const durationMinutes=Number(document.getElementById('f_duration')?.value||90);if(!Number.isInteger(durationMinutes)||durationMinutes<15||durationMinutes>480){toast(tr('class_duration_invalid'));return}
  const genderBtn = document.querySelector('#f_gender .sel');
  if (!genderBtn){ toast(tr('toast_class_gender_required')); return; }
  const gender = genderBtn.dataset.v;
  const rawTime = document.getElementById('f_time').value.trim();
  const time = validateStartTime(rawTime);
  if (!time){ toast(tr('toast_class_time_invalid')); return; }
  const dayBtns = document.querySelectorAll('#f_days .wd-btn.sel');
  const days = Array.from(dayBtns).map(b=>b.dataset.v);
  if (!days.length){ toast(tr('toast_class_days_required')); return; }
  const note = document.getElementById('f_note').value.trim();
  if (id){
    const c = getClass(id);
    c.name = name; c.info = {startTime:time, durationMinutes, days, note}; c.gender = gender;
  } else {
    const createdAt=new Date().toISOString();
    data.classes.push({ id: uid(), name, gender, color: colorForIndex(data.classes.length), createdAt, info:{startTime:time, durationMinutes, days, note}, students:[], homework:{}, homeworkLog:[], attendance:{}, reminders:[], textbook:null, listenings:[] });
    ensureDefaultPersonalBackupReminder(createdAt);
  }
  saveData(); closeModal(); render(); toast(tr('toast_saved'));
}
function deleteClass(id){
  confirmModal(tr('confirm_delete_class_title'), tr('confirm_delete_class_body'), ()=>{
    const index=data.classes.findIndex(c=>c.id===id);
    const removed=index>-1?data.classes[index]:null;
    if(!removed) return;
    const textbookBackup=idbGet(textbookStorageKey(id)).catch(()=>null);
    const listeningBackups=(removed.listenings||[]).map(a=>({id:a.id,promise:idbGet(listeningStorageKey(id,a.id)).catch(()=>null)}));
    idbDelete(textbookStorageKey(id)).catch(()=>{});
    (removed.listenings||[]).forEach(a=>idbDelete(listeningStorageKey(id,a.id)).catch(()=>{}));
    setTimeout(async()=>{if(!getClass(id)){await discardPreparedMedia(await textbookBackup);for(const item of listeningBackups)await discardPreparedMedia(await item.promise)}},10000);
    data.classes = data.classes.filter(c=>c.id!==id);
    saveData(); state.screen='home'; render();
    undoToast(tr('toast_class_deleted'),async()=>{ if(removed&&!getClass(removed.id)){ data.classes.splice(Math.max(0,index),0,removed); const stored=await textbookBackup; if(stored) await idbSet(textbookStorageKey(id),stored).catch(()=>{}); for(const item of listeningBackups){const audio=await item.promise;if(audio)await idbSet(listeningStorageKey(id,item.id),audio).catch(()=>{});} saveData(); render(); toast(tr('toast_class_restored')); } });
  });
}
function openClassInfoModal(id){
  const c = getClass(id);
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <h3>${escapeHtml(c.name)}</h3>
    <div class="info-grid">
      ${c.gender ? `<div class="info-chip">${tr('class_info_type')} <b>${genderLabel(c.gender)}</b></div>` : ''}
      <div class="info-chip">${tr('class_info_time')} <b>${c.info && c.info.startTime ? escapeHtml(c.info.startTime) : '—'}</b></div>
      <div class="info-chip">${tr('class_info_days')} <b>${c.info && c.info.days && c.info.days.length ? escapeHtml(formatDaysFull(c.info.days)) : '—'}</b></div>
      <div class="info-chip">${tr('class_info_count')} <b>${c.students.length}</b></div>
    </div>
    ${c.info && c.info.note ? `<p data-style="font-size:13px;color:var(--ink-soft);line-height:1.9;margin-top:14px;">${escapeHtml(c.info.note)}</p>` : ''}
    <div class="modal-actions" data-style="margin-top:18px;">
      <button class="btn btn-outline-dark" data-action="openClassFormModal('${c.id}')">${tr('btn_edit')}</button>
      <button class="btn btn-gold" data-action="enterClassFromModal('${c.id}')">${tr('btn_enter_class')}</button>
    </div>
    <div data-style="text-align:center;margin-top:16px;">
      <span class="about-link" data-action="exportBackup('${c.id}')">${ICON.download} ${tr('backup_export_class_link')}</span>
    </div>
    <div class="modal-actions" data-style="margin-top:12px;"><button class="btn btn-outline-dark" data-action="exportClassExcel('${c.id}')">${tr('export_excel')}</button><button class="btn btn-gold" data-action="printClassReport('${c.id}')">${tr('report_pdf')}</button></div>
    <button type="button" class="btn btn-danger btn-sm" data-style="width:100%;margin-top:22px;" data-action="resetClassStudentsData('${c.id}')">${tr('btn_reset_class_students')}</button>
    <button type="button" class="btn btn-danger btn-sm" data-style="width:100%;margin-top:10px;" data-action="deleteClass('${c.id}')">${tr('btn_delete_class')}</button>
  `);
}
function openClassMenu(){ openClassInfoModal(state.classId); }
function enterClassFromModal(id){closeModal();openClass(id)}

