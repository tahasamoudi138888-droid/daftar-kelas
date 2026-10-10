/* V15.2 — lightweight, privacy-preserving widgets derived from existing local data. */
function teacherWidgetDates(){const today=tehranNow().iso;return Array.from({length:7},(_,i)=>addDaysIso(today,i-6))}
function teacherWeeklyPulse(){
  return teacherWidgetDates().map(iso=>{
    let present=0,late=0,absent=0;
    for(const c of data.classes||[]){const rec=c.attendance&&c.attendance[iso];if(!rec||!rec.finalized)continue;for(const v of Object.values(rec.records||{})){if(v==='present')present++;else if(v==='late')late++;else if(v==='absent')absent++}}
    const total=present+late+absent,rate=total?Math.round(100*(present+late)/total):0;
    return {iso,present,late,absent,total,rate};
  });
}
function teacherFocusItem(){
  let best=null;
  for(const c of data.classes||[]){const m=classHealthMetrics(c);if(!best||m.total>best.metrics.total)best={classItem:c,metrics:m}}
  if(best&&best.metrics.total)return {title:best.classItem.name,detail:tr('widget_focus_pending').replace('{count}',best.metrics.total),icon:ICON.bell,action:`openClassHealthCenter('${best.classItem.id}')`,tone:'warn'};
  const due=(data.profile.personalReminders||[]).filter(r=>r.dueIso<=tehranNow().iso).sort((a,b)=>a.dueIso.localeCompare(b.dueIso))[0];
  if(due)return {title:due.text,detail:tr('widget_focus_reminder'),icon:ICON.clock,action:"navClick('profile')",tone:'warn'};
  return {title:tr('widget_focus_clear'),detail:tr('widget_focus_clear_hint'),icon:ICON.check,action:"navClick('home')",tone:'good'};
}
function teacherLoadStats(){const classes=(data.classes||[]).length,students=(data.classes||[]).reduce((n,c)=>n+(c.students||[]).length,0),backup=backupHealthInfo();return {classes,students,backup}}
function managerReportCoverage(summary){const total=Number(managerState.directory?.total||summary.teachers?.length||0),waiting=Number(summary.attention?.waiting_sync||0),covered=Math.max(0,total-waiting),percent=total?Math.round(100*covered/total):0;return {total,waiting,covered,percent}}
