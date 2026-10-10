/* V19.4 — privacy-safe, actionable pulse cards built only from existing local/aggregate data. */
function clampPulse(value){return Math.max(0,Math.min(100,Math.round(Number(value)||0)))}
function teacherMomentumSnapshot(){
  const pulse=teacherWeeklyPulse(),recorded=pulse.filter(day=>day.total),attendance=recorded.length?Math.round(recorded.reduce((sum,day)=>sum+day.rate,0)/recorded.length):null;
  const pending=(data.classes||[]).reduce((sum,classItem)=>sum+Number(classHealthMetrics(classItem).total||0),0),backup=backupHealthInfo();
  if(!recorded.length)return {score:null,tone:'neutral',label:tr('pulse_no_data'),hint:tr('pulse_no_data_hint'),action:"navClick('home')",attendance,pending,backup};
  const attendanceScore=attendance,focusScore=Math.max(20,100-Math.min(80,pending*8)),backupScore=backup.status==='good'?100:backup.status==='warning'?62:32;
  const score=clampPulse(attendanceScore*.55+focusScore*.3+backupScore*.15);
  let tone='good',label=tr('pulse_teacher_steady'),action="navClick('home')",hint=tr('pulse_teacher_clear');
  if(pending){tone='warn';label=tr('pulse_teacher_focus');hint=tr('pulse_teacher_pending').replace('{count}',formatLocaleNumber(pending));const target=(data.classes||[]).map(c=>({c,m:classHealthMetrics(c)})).sort((a,b)=>b.m.total-a.m.total)[0];if(target)action=`openClassHealthCenter('${target.c.id}')`}
  else if(backup.status!=='good'){tone='warn';label=tr('pulse_teacher_backup');hint=tr('pulse_teacher_backup_hint');action='exportFullZip()'}
  return {score,tone,label,hint,action,attendance,pending,backup};
}
function renderTeacherMomentumCard(){
  const pulse=teacherMomentumSnapshot();
  return `<button type="button" class="app-widget momentum-card ${pulse.tone}" data-action="${pulse.action}"><span class="momentum-ring" data-style="--pulse:${pulse.score||0}"><b>${pulse.score==null?'—':formatLocaleNumber(pulse.score)}</b><small>/${formatLocaleNumber(100)}</small></span><div class="momentum-copy"><small>${tr('pulse_teacher_title')}</small><b>${escapeHtml(pulse.label)}</b><p>${escapeHtml(pulse.hint)}</p><div class="momentum-signals"><span>${ICON.chart}${pulse.attendance==null?'—':`${formatLocaleNumber(pulse.attendance)}٪`}</span><span>${ICON.bell}${formatLocaleNumber(pulse.pending)}</span><span>${ICON.shield}${pulse.backup.days==null?'—':formatLocaleNumber(pulse.backup.days)}</span></div></div>${ICON.chev}</button>`;
}
function managerExecutiveSnapshot(summary){
  const coverage=managerReportCoverage(summary),month=summary.month||{},attention=summary.attention||{},attendance=Number(month.attendance_rate),risk=Number(month.at_risk_students||0),stale=Number(attention.stale_sync||0),waiting=Number(attention.waiting_sync||0);
  if(month.attendance_rate==null&&!coverage.total)return {score:null,tone:'neutral',title:tr('pulse_no_data'),hint:tr('pulse_no_data_hint'),action:"managerSetSection('branches')"};
  const base=(Number.isFinite(attendance)?attendance:75)*.55+coverage.percent*.45,score=clampPulse(base-Math.min(35,risk*2+stale*5+waiting*2)),academic=typeof managerCanAcademic==='function'&&managerCanAcademic();
  if(stale)return {score,tone:'danger',title:tr('pulse_manager_stale'),hint:tr('pulse_manager_stale_hint').replace('{count}',formatLocaleNumber(stale)),action:academic?"managerSetSection('teachers')":"managerSetSection('branches')"};
  if(risk)return {score,tone:'warn',title:tr('pulse_manager_risk'),hint:tr('pulse_manager_risk_hint').replace('{count}',formatLocaleNumber(risk)),action:academic?"managerSetSection('classes')":"managerSetSection('branches')"};
  if(waiting)return {score,tone:'warn',title:tr('pulse_manager_waiting'),hint:tr('pulse_manager_waiting_hint').replace('{count}',formatLocaleNumber(waiting)),action:academic?"managerSetSection('teachers')":"managerSetSection('branches')"};
  return {score,tone:'good',title:tr('pulse_manager_clear'),hint:tr('pulse_manager_clear_hint'),action:"managerSetSection('branches')"};
}
function renderManagerExecutivePulse(summary){
  const pulse=managerExecutiveSnapshot(summary);
  return `<button type="button" class="manager-executive-pulse ${pulse.tone}" data-action="${pulse.action}"><span class="executive-orbit" data-style="--pulse:${pulse.score||0}"><b>${pulse.score==null?'—':formatLocaleNumber(pulse.score)}</b><small>/${formatLocaleNumber(100)}</small></span><div><small>${tr('pulse_manager_title')}</small><b>${escapeHtml(pulse.title)}</b><p>${escapeHtml(pulse.hint)}</p></div><span class="executive-open">${ICON.chev}</span></button>`;
}
