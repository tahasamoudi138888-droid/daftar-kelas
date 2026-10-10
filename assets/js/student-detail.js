/* ============ STUDENT SCREEN ============ */
function renderStudentScreen(){
  const c = getClass(state.classId);
  const s = c && getStudent(c, state.studentId);
  if (!s) return '';
  const total = studentTotal(s);
  const t = tehranNow();
  const history = (s.grades||[]).slice().reverse().map(g=>{
    const color = g.value==='plus' ? 'var(--mint)' : g.value==='minus' ? 'var(--coral)' : g.value==='custom' ? 'var(--sky)' : 'var(--paper-2)';
    const label = g.value==='plus' ? tr('grade_positive') : g.value==='minus' ? tr('grade_negative') : g.value==='custom' ? (tr('grade_score_prefix')+g.amount) : tr('grade_neutral');
    return `
      <div class="hist-item">
        <div class="hist-dot" data-style="background:${color}"></div>
        <div class="htxt">${label}${g.note?' — '+escapeHtml(g.note):''}</div>
        <div class="htime">${g.jalaliShort||''} ${g.time||''}</div>
        <div class="hist-del" data-action="deleteGrade('${s.id}','${g.id}')">${ICON.trash}</div>
      </div>`;
  }).join('');

  return `
    <div class="total-badge">
      <div><div class="lbl">${tr('total_grades')}</div><div class="num" data-style="color:${total>0?'var(--mint-ink)':total<0?'var(--coral-ink)':'var(--ink)'}">${total>0?'+':''}${total}</div></div>
    </div>
    <h2 class="section-title" data-style="color:var(--ink);opacity:.7;margin-top:0;">${tr('new_grade_title')} ${t.jalaliShort}</h2>
    <div class="grade-btns" data-style="margin-bottom:12px;">
      <button class="gbtn plus" data-action="addGrade('${s.id}','plus')">${ICON.plusCircle}<span>${tr('grade_positive')}</span></button>
      <button class="gbtn neutral" data-action="addGrade('${s.id}','neutral')">${ICON.neutralCircle}<span>${tr('grade_neutral')}</span></button>
      <button class="gbtn minus" data-action="addGrade('${s.id}','minus')">${ICON.minusCircle}<span>${tr('grade_negative')}</span></button>
    </div>
    <div class="custom-grade-row">
      <input type="number" step="any" inputmode="decimal" id="customScoreInput" placeholder="${tr('custom_grade_ph')}">
      <button class="btn btn-gold btn-sm" data-action="addCustomGrade('${s.id}')">${tr('btn_submit_grade')}</button>
    </div>
    <h2 class="section-title" data-style="color:var(--ink);opacity:.7;">${tr('term_grades_title')}</h2>
    <div class="exam-grid">
      ${['midterm','oral','final'].map(k=>{
        const val = s[k];
        const color = scoreColor(val, EXAM_LIMITS[k]);
        return `
        <div class="exam-card" data-action="openExamModal('${s.id}','${k}')">
          <div class="elabel">${examLabel(k)} (${tr('of_label')} ${EXAM_LIMITS[k]})</div>
          <div class="evalue" data-style="${color?`color:${color}`:''}">${(val!=null && val!=='') ? val : '—'}</div>
        </div>`;
      }).join('')}
    </div>
    <section class="student-timeline-section">
      <div class="student-timeline-heading"><div><h2>${tr('timeline_title')}</h2><p>${tr('timeline_hint')}</p></div><button type="button" class="icon-action add" data-action="openStudentTimelineNoteModal('${c.id}','${s.id}')" aria-label="${escapeAttr(tr('timeline_add_note'))}">${ICON.plus}</button></div>
      <div class="student-timeline">${renderStudentTimeline(c,s)}</div>
    </section>
    <h2 class="section-title" data-style="color:var(--ink);opacity:.7;">${tr('grade_history_title')}</h2>
    <div class="info-card" data-style="padding:6px 14px;">
      ${history || `<p data-style="font-size:12.5px;color:var(--ink-soft);padding:14px 4px;">${tr('grade_history_empty')}</p>`}
    </div>
    <h2 class="section-title" data-style="color:var(--ink);opacity:.7;">${tr('hw_history_title')}</h2>
    <div class="info-card" data-style="padding:6px 14px;">
      ${renderStudentHomeworkHistory(c, s) || `<p data-style="font-size:12.5px;color:var(--ink-soft);padding:14px 4px;">${tr('hw_history_student_empty')}</p>`}
    </div>
    <h2 class="section-title" data-style="color:var(--ink);opacity:.7;">${tr('student_attendance_history_title')}</h2>
    <div class="info-card" data-style="padding:6px 14px;">
      ${renderStudentAttendanceHistory(c, s) || `<p data-style="font-size:12.5px;color:var(--ink-soft);padding:14px 4px;">${tr('student_attendance_history_empty')}</p>`}
    </div>
  `;
}
function studentTimelineEvents(c,s){
  const events=[];
  (s.grades||[]).forEach(g=>events.push({id:`grade:${g.id}`,kind:'grade',iso:g.iso||'',time:g.time||'',createdAt:g.createdAt||'',title:g.value==='plus'?tr('grade_positive'):g.value==='minus'?tr('grade_negative'):g.value==='custom'?`${tr('grade_score_prefix')}${g.amount}`:tr('grade_neutral'),detail:g.note||''}));
  (s.examHistory||[]).forEach(x=>events.push({id:`exam:${x.id}`,kind:'exam',iso:x.iso||'',time:x.time||'',createdAt:x.createdAt||'',title:tr('timeline_exam').replace('{exam}',examLabel(x.key)),detail:String(x.value)}));
  Object.entries(c.attendance||{}).forEach(([iso,rec])=>{if(rec&&rec.finalized&&rec.records&&rec.records[s.id]){const status=rec.records[s.id];events.push({id:`attendance:${iso}`,kind:status==='absent'?'absence':status==='late'?'late':'attendance',iso,time:'',title:status==='absent'?tr('att_absent'):status==='late'?tr('att_late'):tr('att_present'),detail:''})}});
  Object.entries(c.homework||{}).forEach(([iso,rec])=>{if(rec&&rec.finalized&&Object.prototype.hasOwnProperty.call(rec.checks||{},s.id))events.push({id:`homework:${iso}`,kind:rec.checks[s.id]?'homework':'homework-missed',iso,time:'',title:rec.checks[s.id]?tr('hw_done2'):tr('hw_notdone2'),detail:String(rec.text||'').slice(0,180)})});
  (s.timelineNotes||[]).forEach(n=>events.push({id:`note:${n.id}`,noteId:n.id,kind:'note',iso:n.iso||'',time:n.time||'',createdAt:n.createdAt||'',title:tr('timeline_note'),detail:n.text}));
  return events.sort((a,b)=>`${b.iso} ${b.time} ${b.createdAt}`.localeCompare(`${a.iso} ${a.time} ${a.createdAt}`)).slice(0,120);
}
function renderStudentTimeline(c,s){
  const events=studentTimelineEvents(c,s);
  if(!events.length)return `<div class="personal-reminder-empty">${ICON.history||ICON.user}<span>${tr('timeline_empty')}</span></div>`;
  const icons={grade:ICON.plusCircle,exam:ICON.chart,attendance:ICON.check,absence:ICON.x,late:ICON.clock,homework:ICON.book,'homework-missed':ICON.book,note:ICON.edit};
  return events.map(e=>`<article class="timeline-item timeline-${e.kind}"><div class="timeline-icon">${icons[e.kind]||ICON.history}</div><div class="timeline-copy"><b>${escapeHtml(e.title)}</b>${e.detail?`<p>${escapeHtml(e.detail)}</p>`:''}<span>${e.iso?isoToJalali(e.iso,true):''}${e.time?` · ${escapeHtml(e.time)}`:''}</span></div>${e.noteId?`<button type="button" class="icon-action danger" data-action="deleteStudentTimelineNote('${c.id}','${s.id}','${e.noteId}')" aria-label="${escapeAttr(tr('btn_delete'))}">${ICON.trash}</button>`:''}</article>`).join('');
}
function openStudentTimelineNoteModal(cid,sid){
  openModal(`<button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${tr('timeline_add_note')}</h3><div class="field"><label>${tr('timeline_note_label')}</label><textarea id="timelineNoteText" maxlength="2000" placeholder="${escapeAttr(tr('timeline_note_placeholder'))}"></textarea></div><button type="button" class="btn btn-gold" data-action="saveStudentTimelineNote('${cid}','${sid}')">${tr('btn_save')}</button>`);
}
function saveStudentTimelineNote(cid,sid){
  const c=getClass(cid),s=c&&getStudent(c,sid),text=String(document.getElementById('timelineNoteText')?.value||'').trim().slice(0,2000);if(!s||!text){toast(tr('timeline_note_required'));return}
  const t=tehranNow();if(!Array.isArray(s.timelineNotes))s.timelineNotes=[];s.timelineNotes.push({id:uid(),text,iso:t.iso,time:t.time,createdAt:new Date().toISOString()});saveData();closeModal();render();toast(tr('timeline_note_saved'));
}
function deleteStudentTimelineNote(cid,sid,nid){
  const c=getClass(cid),s=c&&getStudent(c,sid);if(!s)return;const index=(s.timelineNotes||[]).findIndex(n=>n.id===nid),removed=index>-1?s.timelineNotes[index]:null;if(!removed)return;s.timelineNotes=s.timelineNotes.filter(n=>n.id!==nid);saveData();render();undoToast(tr('timeline_note_deleted'),()=>{const current=getStudent(getClass(cid),sid);if(current&&!current.timelineNotes.some(n=>n.id===nid)){current.timelineNotes.splice(Math.max(0,index),0,removed);saveData();render()}});
}
function renderStudentAttendanceHistory(c, s){
  const records = Object.keys(c.attendance||{})
    .filter(iso => c.attendance[iso].finalized && ['present','late','absent'].includes(c.attendance[iso].records[s.id]))
    .sort().reverse().map(iso=>({iso,status:c.attendance[iso].records[s.id]}));
  if (!records.length) return '';
  return records.map(({iso,status})=>`
    <div class="hist-item">
      <div class="hist-dot" data-style="background:${status==='present'?'var(--mint)':status==='late'?'var(--action-color)':'var(--coral)'}"></div>
      <div class="htxt">${isoToJalali(iso)} — ${tr(status==='present'?'att_present':status==='late'?'att_late':'att_absent')}</div>
    </div>`).join('');
}
function renderStudentHomeworkHistory(c, s){
  const isos = Object.keys(c.homework||{})
    .filter(iso => c.homework[iso].finalized && Object.prototype.hasOwnProperty.call(c.homework[iso].checks||{}, s.id))
    .sort().reverse();
  if (!isos.length) return '';
  return isos.map(iso=>{
    const done = !!c.homework[iso].checks[s.id];
    const hg = (c.homework[iso].homeworkGrades||{})[s.id];
    const tag = hg ? `<div class="hw-score-tag ${hg.amount>0?'pos':'neg'}">${hg.amount>0?'+':''}${hg.amount}</div>` : '';
    return `
      <div class="hist-item">
        <div class="hist-dot" data-style="background:${done?'var(--mint)':'var(--coral)'}"></div>
        <div class="htxt">${isoToJalali(iso)} — ${done ? tr('hw_done2') : tr('hw_notdone2')}</div>
        ${tag}
        <div class="hist-del" data-action="showHomeworkTextModal('${c.id}','${iso}')">${ICON.dots}</div>
      </div>`;
  }).join('');
}
function showHomeworkTextModal(cid, iso){
  const c = getClass(cid); const rec = c.homework[iso];
  const gs = c.homeworkGradeSettings || {};
  const posLine = (gs.posEnabled && typeof gs.posAmount==='number') ? `+${gs.posAmount}` : tr('toggle_off');
  const negLine = (gs.negEnabled && typeof gs.negAmount==='number') ? `${gs.negAmount}` : tr('toggle_off');
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <h3>${tr('hw_modal_title')} ${isoToJalali(iso)}</h3>
    <p data-style="font-size:13.5px;color:var(--ink);line-height:1.9;">${rec && rec.text ? escapeHtml(rec.text) : tr('hw_text_modal_empty')}</p>
    <div class="hw-modal-scores">
      <div class="hw-modal-score-row"><span>${tr('hw_grade_pos_label')}</span><b class="pos">${posLine}</b></div>
      <div class="hw-modal-score-row"><span>${tr('hw_grade_neg_label')}</span><b class="neg">${negLine}</b></div>
    </div>
  `);
}
function addGrade(sid, value){
  const c = getClass(state.classId); const s = getStudent(c, sid); const t = tehranNow();
  if (!s.grades) s.grades=[];
  s.grades.push({id:uid(), value, iso:t.iso, time:t.time, jalaliShort:t.jalaliShort, note:''});
  saveData(); render();
  toast(value==='plus'?tr('toast_grade_pos'):value==='minus'?tr('toast_grade_neg'):tr('toast_grade_neutral'));
}
function addCustomGrade(sid){
  const el = document.getElementById('customScoreInput');
  const amount = parseFloat(el.value);
  if (isNaN(amount)){ toast(tr('toast_enter_number')); return; }
  const c = getClass(state.classId); const s = getStudent(c, sid); const t = tehranNow();
  if (!s.grades) s.grades=[];
  s.grades.push({id:uid(), value:'custom', amount, iso:t.iso, time:t.time, jalaliShort:t.jalaliShort, note:''});
  saveData(); render();
  toast(tr('toast_grade_saved'));
}
function openExamModal(sid, key){
  const c = getClass(state.classId); const s = getStudent(c, sid);
  const max = EXAM_LIMITS[key];
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <h3>${tr('exam_score_title')} ${examLabel(key)}</h3>
    <div class="field"><label>${tr('exam_score_label').replace('{max}', max)}</label><input type="number" step="any" min="0" max="${max}" inputmode="decimal" id="examVal" value="${s[key]!=null?s[key]:''}" placeholder="${tr('exam_score_ph').replace('{max}', max)}" data-style="height:56px;font-size:19px;font-weight:700;text-align:center;border-radius:14px;"></div>
    <div class="modal-actions">
      <button class="btn btn-outline-dark" data-action="closeModal()">${tr('btn_cancel')}</button>
      <button class="btn btn-gold" data-action="saveExamScore('${sid}','${key}')">${tr('btn_save')}</button>
    </div>
  `);
  setTimeout(()=>{ const el=document.getElementById('examVal'); if(el){ el.focus(); el.select(); } }, 50);
}
function saveExamScore(sid, key){
  const c = getClass(state.classId); const s = getStudent(c, sid);
  const raw = document.getElementById('examVal').value.trim();
  const max = EXAM_LIMITS[key];
  if (raw===''){ s[key] = null; }
  else {
    const v = parseFloat(raw);
    if (isNaN(v)){ toast(tr('toast_enter_number')); return; }
    if (v<0){ toast(tr('toast_exam_negative').replace('{label}', examLabel(key))); return; }
    if (v>max){ toast(tr('toast_exam_too_high').replace('{label}', examLabel(key)).replace('{max}', max)); return; }
    s[key] = v;
    const t=tehranNow();if(!Array.isArray(s.examHistory))s.examHistory=[];s.examHistory.push({id:uid(),key,value:v,iso:t.iso,time:t.time,createdAt:new Date().toISOString()});
  }
  saveData(); closeModal(); render(); toast(tr('toast_saved'));
}
function deleteGrade(sid, gid){
  const c = getClass(state.classId); const s = getStudent(c, sid);
  const index=s.grades.findIndex(g=>g.id===gid); const removed=index>-1?s.grades[index]:null;
  s.grades = s.grades.filter(g=>g.id!==gid);
  saveData(); render();
  undoToast(tr('toast_grade_deleted'),()=>{ const cls=getClass(c.id),student=cls&&getStudent(cls,sid); if(student&&removed&&!student.grades.some(g=>g.id===gid)){ student.grades.splice(Math.max(0,index),0,removed); saveData(); render(); toast(tr('toast_grade_restored')); } });
}
