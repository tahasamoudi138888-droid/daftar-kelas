/* Class health centre: a single actionable view of unfinished teacher work. */
function classHealthMetrics(c){
  const homework=Object.entries(c.homework||{}).filter(([,r])=>r&&String(r.text||'').trim()&&!r.finalized).length;
  let exams=0;Object.keys(EXAM_LIMITS).forEach(key=>{if((c.students||[]).some(s=>s[key]!=null&&s[key]!==''))exams+=(c.students||[]).filter(s=>s[key]==null||s[key]==='').length});
  const dates=Object.keys(c.attendance||{}).filter(iso=>c.attendance[iso]&&c.attendance[iso].finalized).sort().reverse();let absence=0;
  if(dates.length>=3)(c.students||[]).forEach(s=>{let streak=0;for(const iso of dates){if(c.attendance[iso].records&&c.attendance[iso].records[s.id]==='absent')streak++;else break}if(streak>=3)absence++});
  const today=tehranNow().iso,reminders=(c.reminders||[]).filter(r=>r.dueIso&&r.dueIso<=today).length;
  return {homework,exams,absence,reminders,total:homework+exams+absence+reminders};
}
function backupHealthInfo(){
  const last=data.settings&&data.settings.lastExportAt?new Date(data.settings.lastExportAt):null,days=last&&Number.isFinite(last.getTime())?Math.max(0,Math.floor((Date.now()-last.getTime())/86400000)):null;
  return {days,status:days==null?'never':days>=30?'urgent':days>=14?'warning':'good'};
}
function renderClassHealthSummary(c){
  const m=classHealthMetrics(c),tone=m.total?'needs-attention':'healthy';
  return `<button type="button" class="class-health-center ${tone}" data-action="openClassHealthCenter('${c.id}')"><span class="health-center-icon">${m.total?ICON.bell:ICON.check}</span><span><b>${tr('health_center_title')}</b><small>${m.total?tr('health_center_pending').replace('{count}',m.total):tr('health_center_clear')}</small></span><span class="health-center-count">${m.total}</span>${ICON.chev}</button>`;
}
function renderBackupHealthCard(){const backup=backupHealthInfo();return `<div class="backup-health-card ${backup.status}">${ICON.download}<div><b>${tr('backup_health_title')}</b><span>${backup.days==null?tr('backup_health_never'):tr('backup_health_days').replace('{count}',backup.days)}</span></div><button type="button" class="btn btn-gold btn-sm" data-action="exportFullZip()">${tr('backup_health_action')}</button></div>`}
function openClassHealthCenter(cid){
  const c=getClass(cid);if(!c)return;const m=classHealthMetrics(c),backup=backupHealthInfo();
  const row=(icon,label,count,action)=>`<button type="button" class="health-detail-row" data-action="${action}"><span>${icon}</span><span><b>${label}</b><small>${tr(count?'health_items_pending':'health_item_clear').replace('{count}',count)}</small></span><strong>${count}</strong>${ICON.chev}</button>`;
  openModal(`<button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${tr('health_center_title')} — ${escapeHtml(c.name)}</h3><p class="appearance-note">${tr('health_center_hint')}</p><div class="health-detail-list">${row(ICON.book,tr('health_homework'),m.homework,`openClassHealthWork('homework','${c.id}')`)}${row(ICON.chart,tr('health_exam'),m.exams,`openClassHealthWork('students','${c.id}')`)}${row(ICON.user,tr('health_absence'),m.absence,`openClassHealthWork('students','${c.id}')`)}${row(ICON.bell,tr('health_reminders'),m.reminders,`openClassHealthWork('reminders','${c.id}')`)}</div><div class="backup-health-card ${backup.status}">${ICON.download}<div><b>${tr('backup_health_title')}</b><span>${backup.days==null?tr('backup_health_never'):tr('backup_health_days').replace('{count}',backup.days)}</span></div><button type="button" class="btn btn-gold btn-sm" data-action="exportFullZipFromHealth()">${tr('backup_health_action')}</button></div>`);
}
function exportFullZipFromHealth(){closeModal();return exportFullZip()}
function openClassHealthWork(kind,cid){closeModal();if(kind==='reminders'){openReminderClass(cid);return}state.classId=cid;state.screen='class';state.classTab=kind==='homework'?'homework':'students';render()}
