/* V18 — actionable day plan for teachers and risk pulse for managers. */
function teacherDayPlan(){
  const now=tehranNowFull(),current=now.hour*60+now.minute;
  const classes=(data.classes||[]).filter(c=>classActiveToday(c,now.weekday)).map(c=>({item:c,start:parseTimeToMinutes(c.info&&c.info.startTime),duration:c.info?.durationMinutes||90})).filter(x=>x.start!==null).sort((a,b)=>a.start-b.start);
  const passed=classes.filter(x=>x.start+x.duration<=current).length;
  const active=classes.find(x=>current>=x.start&&current<x.start+x.duration);
  const next=active||classes.find(x=>x.start>current)||null;
  return {classes,current,passed,active,next};
}
function renderTeacherDayPlan(){
  const plan=teacherDayPlan(),total=plan.classes.length,progress=total?Math.round(100*plan.passed/total):0;
  if(!total)return `<article class="app-widget dayflow-widget empty"><header><span>${ICON.clock}</span><div><b>${tr('widget_day_plan')}</b><small>${tr('widget_day_plan_hint')}</small></div></header><div class="dayflow-empty">${ICON.calendar}<span>${tr('widget_no_classes_today')}</span></div></article>`;
  const target=plan.next,delta=target?target.start-plan.current:0,status=plan.active?tr('widget_class_now'):target?(delta>0?tr('widget_starts_in').replace('{minutes}',formatLocaleNumber(delta)):tr('widget_started_ago').replace('{minutes}',formatLocaleNumber(Math.abs(delta)))):tr('widget_day_complete');
  const dots=plan.classes.slice(0,6).map(x=>`<span class="${x===plan.active?'active':x.start<plan.current?'passed':''}" title="${escapeAttr(`${x.item.name} · ${x.item.info.startTime}`)}"></span>`).join('');
  return `<button type="button" class="app-widget dayflow-widget" ${target?`data-action="openClass('${target.item.id}')"`:''}><header><span>${ICON.clock}</span><div><b>${tr('widget_day_plan')}</b><small>${tr('widget_classes_done').replace('{done}',formatLocaleNumber(plan.passed)).replace('{total}',formatLocaleNumber(total))}</small></div><em>${formatLocaleNumber(progress)}٪</em></header><div class="dayflow-track"><i data-style="width:${progress}%"></i>${dots}</div><div class="dayflow-next"><div><small>${target?tr(plan.active?'widget_class_now':'widget_next_class'):tr('widget_day_complete')}</small><b>${target?escapeHtml(target.item.name):tr('widget_day_complete')}</b><span>${escapeHtml(status)}</span></div>${target?ICON.chev:ICON.check}</div></button>`;
}
function renderTeacherWidgets(){
  const focus=teacherFocusItem(),stats=teacherLoadStats();
  return `<section class="teacher-widget-zone v18-widget-zone" aria-labelledby="teacherWidgetsTitle"><div class="widget-zone-head"><div><span>${ICON.sparkle}</span><div><h2 id="teacherWidgetsTitle">${tr('widget_teacher_title')}</h2><p>${tr('widget_teacher_hint')}</p></div></div><em>${tr('widget_live')}</em></div><div class="teacher-widget-grid v18-widget-grid">
    ${renderTeacherMomentumCard()}
    ${renderTeacherDayPlan()}
    <button type="button" class="app-widget focus-widget ${focus.tone}" data-action="${focus.action}"><span class="widget-orb">${focus.icon}</span><div><small>${tr('widget_next_action')}</small><b>${escapeHtml(focus.title)}</b><p>${escapeHtml(focus.detail)}</p></div>${ICON.chev}</button>
    <article class="app-widget load-widget"><header><span>${ICON.folder}</span><b>${tr('widget_class_load')}</b></header><div class="load-numbers"><div><strong>${formatLocaleNumber(stats.classes)}</strong><span>${tr('manager_classes')}</span></div><div><strong>${formatLocaleNumber(stats.students)}</strong><span>${tr('manager_students')}</span></div><div class="${stats.backup.status}"><strong>${stats.backup.days==null?'—':formatLocaleNumber(stats.backup.days)}</strong><span>${tr('widget_backup_days')}</span></div></div></article>
  </div></section>`;
}
function renderManagerRiskPulse(summary){
  const attention=summary.attention||{},month=summary.month||{},risk=Math.max(0,Number(month.at_risk_students||0)),stale=Math.max(0,Number(attention.stale_sync||0)),missing=Math.max(0,Number(attention.waiting_sync||0)),total=risk+stale+missing;
  const academic=typeof managerCanAcademic==='function'&&managerCanAcademic(),action=academic?(risk?"managerSetSection('classes')":"managerSetSection('teachers')"):"managerSetSection('branches')";
  return `<button class="manager-command-widget risk ${total?'has-risk':'clear'}" data-action="${action}"><span>${total?ICON.info:ICON.check}</span><div><small>${tr('widget_risk_pulse')}</small><b>${total?formatLocaleNumber(total):tr('widget_risk_clear')}</b><p>${risk?`${formatLocaleNumber(risk)} ${tr('widget_risk_students')}`:''}${risk&&(stale||missing)?' · ':''}${stale?`${formatLocaleNumber(stale)} ${tr('widget_stale_reports')}`:''}${stale&&missing?' · ':''}${missing?`${formatLocaleNumber(missing)} ${tr('widget_missing_reports')}`:''}</p></div>${ICON.chev}</button>`;
}
function renderManagerCommandWidgets(summary){
  const coverage=managerReportCoverage(summary),branches=summary.branches||[],best=branches.filter(b=>b.attendance_rate!=null).sort((a,b)=>Number(b.attendance_rate)-Number(a.attendance_rate))[0],today=summary.today||{},attendanceTotal=Number(today.present||0)+Number(today.late||0)+Number(today.absent||0),presentPct=attendanceTotal?Math.round(100*Number(today.present||0)/attendanceTotal):0,latePct=attendanceTotal?Math.round(100*Number(today.late||0)/attendanceTotal):0;
  return `<section class="manager-widget-zone v18-widget-zone">${renderManagerExecutivePulse(summary)}<div class="widget-zone-head"><div><span>${ICON.sparkle}</span><div><h2>${tr('widget_manager_title')}</h2><p>${tr('widget_manager_hint')}</p></div></div><em>${tr('widget_live')}</em></div><div class="manager-command-grid v18-manager-command-grid">
    <button class="manager-command-widget coverage" data-action="managerSetSection('teachers')"><span class="widget-ring" data-style="--value:${coverage.percent}"><b>${formatLocaleNumber(coverage.percent)}٪</b></span><div><small>${tr('widget_report_coverage')}</small><b>${formatLocaleNumber(coverage.covered)} / ${formatLocaleNumber(coverage.total)}</b><p>${coverage.waiting?tr('widget_waiting_count').replace('{count}',coverage.waiting):tr('widget_all_synced')}</p></div>${ICON.chev}</button>
    <button class="manager-command-widget branch" data-action="managerSetSection('branches')"><span>${ICON.starFilled}</span><div><small>${tr('widget_best_branch')}</small><b>${escapeHtml(best?.name||'—')}</b><p>${best?`${formatLocaleNumber(best.attendance_rate)}٪ ${tr('manager_attendance')}`:tr('manager_no_metrics')}</p></div>${ICON.chev}</button>
    <article class="manager-command-widget attendance"><span>${ICON.chart}</span><div><small>${tr('widget_today_mix')}</small><b>${formatLocaleNumber(attendanceTotal)} ${tr('manager_students')}</b><div class="attendance-stack"><i class="present" data-style="width:${presentPct}%"></i><i class="late" data-style="width:${latePct}%"></i><i class="absent"></i></div><p>${formatLocaleNumber(today.present||0)} ${tr('manager_present')} · ${formatLocaleNumber(today.late||0)} ${tr('manager_late_students')} · ${formatLocaleNumber(today.absent||0)} ${tr('manager_absent')}</p></div></article>
    ${renderManagerRiskPulse(summary)}
    ${managerTrendWidget(summary)}
  </div></section>`;
}
