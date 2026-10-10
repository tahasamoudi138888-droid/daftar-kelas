/* ============ ATTENDANCE (shared day view, used by today's tab and by history) ============ */
function renderAttendanceDay(c, iso, isHistory){
  const rec = c.attendance[iso] || {records:{}, finalized:false};
  const locked = !!rec.finalized;
  const t = tehranNow();
  const dateLabel = isHistory ? isoToJalali(iso, true) : `${t.jalali} — ${t.time}`;
  const rows = c.students.map(s=>{
    const v = rec.records[s.id];
    return `
      <div class="att-row">
        <div class="row-main"><div class="row-title">${escapeHtml(s.name)}</div></div>
        <div class="att-toggle">
          <button class="present ${v==='present'?'sel':''}" ${locked?'disabled':''} data-action="setAttendance('${c.id}','${s.id}','present','${iso}')">${tr('att_present')}</button>
          <button class="late ${v==='late'?'sel':''}" ${locked?'disabled':''} data-action="setAttendance('${c.id}','${s.id}','late','${iso}')">${tr('att_late')}</button>
          <button class="absent ${v==='absent'?'sel':''}" ${locked?'disabled':''} data-action="setAttendance('${c.id}','${s.id}','absent','${iso}')">${tr('att_absent')}</button>
        </div>
      </div>`;
  }).join('');
  return `
    <div class="info-chip" data-style="display:inline-block;margin-bottom:14px;">${dateLabel}</div>
    ${locked ? `<div class="locked-banner">${ICON.lock} ${tr('att_locked_banner')}</div>` : ''}
    ${c.students.length ? `<div class="row-list">${rows}</div>` : `<div class="empty-state"><p>${tr('add_student_first')}</p></div>`}
    ${c.students.length ? (locked ? `
      <div class="lock-bar checked">
        <div class="box">${ICON.check}</div>
        <div><b>${tr('att_finalize_title')}</b><span>${tr('att_finalize_sub')}</span></div>
      </div>
      <button type="button" class="btn btn-outline-dark btn-sm" data-style="width:100%;margin-top:10px;" data-action="unlockAttendance('${c.id}','${iso}')">${tr('att_edit_day')}</button>
    ` : `
      <div class="lock-bar" data-action="toggleFinalize('${c.id}','${iso}')">
        <div class="box">${ICON.check}</div>
        <div><b>${tr('att_finalize_title')}</b><span>${tr('att_finalize_sub')}</span></div>
      </div>
    `) : ''}
    ${!isHistory ? `<button class="btn btn-outline-dark" data-style="margin-top:16px;" data-action="openAttHistory()">${tr('btn_view_att_history')}</button>` : ''}
  `;
}
function renderAttendanceTab(c){ return renderAttendanceDay(c, tehranNow().iso, false); }
function setAttendance(cid, sid, val, iso){
  const c = getClass(cid);
  if (!c.attendance[iso]) c.attendance[iso] = {records:{}, finalized:false};
  c.attendance[iso].finalized = false;
  const cur = c.attendance[iso].records[sid];
  if (cur===val) delete c.attendance[iso].records[sid];
  else c.attendance[iso].records[sid] = val;
  saveData(); render();
}
function toggleFinalize(cid, iso){
  const c = getClass(cid);
  if (!c.attendance[iso]) c.attendance[iso] = {records:{}, finalized:false};
  const rec = c.attendance[iso];
  if (!rec.finalized){
    const missing = c.students.filter(s=>!rec.records[s.id]);
    if (missing.length>0){ toast(tr('toast_att_all_required')); return; }
    const t = tehranNow();
    rec.finalized = true; rec.finalizedTime = t.time;
    toast(tr('toast_att_finalized'));
    runFeedbackMotion('success');
  } else {
    rec.finalized = false;
  }
  saveData(); render();
}
function unlockAttendance(cid, iso){
  const c = getClass(cid);
  if (c.attendance[iso]) c.attendance[iso].finalized = false;
  saveData(); render();
}

/* ============ ATTENDANCE HISTORY ============ */
function renderAttendanceHistoryScreen(){
  const c = getClass(state.classId);
  if (!c) return '';
  const dates = Object.keys(c.attendance).filter(d=>c.attendance[d].finalized).sort().reverse();
  if (state.attHistDate){
    return `
      <button class="btn btn-outline-dark btn-sm" data-style="margin-bottom:14px;" data-action="clearAttHistoryDay()">${tr('btn_back_to_dates')}</button>
      ${renderAttendanceDay(c, state.attHistDate, true)}`;
  }
  if (dates.length===0) return `<div class="empty-state">${ICON.calendar}<p>${tr('att_history_empty')}</p></div>`;
  const list = dates.map(d=>{
    const rec = c.attendance[d];
    const present = Object.values(rec.records).filter(v=>v==='present').length;
    const late = Object.values(rec.records).filter(v=>v==='late').length;
    const absent = Object.values(rec.records).filter(v=>v==='absent').length;
    return `
      <div class="row-card" data-action="openAttHistoryDay('${d}')">
        <div class="row-main">
          <div class="row-title">${isoToJalali(d)}</div>
          <div class="row-sub">${present} ${tr('att_present')} · ${late} ${tr('att_late')} · ${absent} ${tr('att_absent')}</div>
        </div>
        <div class="chev">${ICON.chev}</div>
      </div>`;
  }).join('');
  return `<div class="row-list">${list}</div>`;
}
function openAttHistoryDay(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||'')))return;state.attHistDate=iso;render()}
function clearAttHistoryDay(){state.attHistDate=null;render()}
