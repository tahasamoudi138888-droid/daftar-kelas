/* ============ CLASS SCREEN ============ */
function renderClassScreen(){
  const c = getClass(state.classId);
  if (!c) return '';
  const tabs = `
    <div class="tabbar" role="tablist" aria-label="${escapeAttr(tr('class_tabs_label'))}">
      <button type="button" role="tab" aria-selected="${state.classTab==='students'}" class="${state.classTab==='students'?'active':''}" data-action="setClassTab('students')">${tr('tab_students')}</button>
      <button type="button" role="tab" aria-selected="${state.classTab==='homework'}" class="${state.classTab==='homework'?'active':''}" data-action="setClassTab('homework')">${tr('tab_homework')}</button>
      <button type="button" role="tab" aria-selected="${state.classTab==='attendance'}" class="${state.classTab==='attendance'?'active':''}" data-action="setClassTab('attendance')">${tr('tab_attendance')}</button>
    </div>`;
  let body='';
  if (state.classTab==='students') body = renderStudentsTab(c);
  else if (state.classTab==='homework') body = renderHomeworkTab(c);
  else body = renderAttendanceTab(c);
  return renderClassHealthSummary(c) + tabs + body;
}
function setClassTab(t){
  state.classTab=t;
  render();
}

function studentAbsenceCount(c,sid){return Object.values(c.attendance||{}).filter(r=>r&&r.finalized&&r.records&&r.records[sid]==='absent').length;}
function studentMissedHomeworkCount(c,sid){return (c.homeworkLog||[]).filter(x=>x.studentId===sid&&!x.done).length;}
function renderStudentsTab(c){
  if (c.students.length===0){
    return `<div class="empty-state">${ICON.user}<p>${tr('students_empty')}</p></div>`;
  }
  const query=String(state.studentSearch||'').trim().toLocaleLowerCase('fa');
  let students=c.students.filter(s=>!query||String(s.name||'').toLocaleLowerCase('fa').includes(query));
  const filter=state.studentFilter||'all';
  if(filter==='score')students.sort((a,b)=>studentTotal(b)-studentTotal(a));
  else if(filter==='absence')students.sort((a,b)=>studentAbsenceCount(c,b.id)-studentAbsenceCount(c,a.id));
  else if(filter==='homework')students.sort((a,b)=>studentMissedHomeworkCount(c,b.id)-studentMissedHomeworkCount(c,a.id));
  else students=students.slice();
  const pages=Math.max(1,Math.ceil(students.length/50));state.studentPage=Math.min(pages,Math.max(1,state.studentPage||1));
  const rows = students.slice((state.studentPage-1)*50,state.studentPage*50).map((s,i)=>{
    const total = studentTotal(s),abs=studentAbsenceCount(c,s.id),miss=studentMissedHomeworkCount(c,s.id);
    const cls = total>0?'score-pos':total<0?'score-neg':'score-zero';
    return `
      <div class="row-card" data-action="openStudent('${c.id}','${s.id}')">
        <div class="avatar" data-style="background:${colorForIndex(i)}">${initials(s.name)}</div>
        <div class="row-main">
          <div class="row-title">${escapeHtml(s.name)}</div>
          <div class="row-sub">${(s.grades||[]).length} ${tr('student_grades_count')} · ${abs} ${tr('filter_absence_short')} · ${miss} ${tr('filter_homework_short')}</div>
        </div>
        <div class="row-score ${cls}">${total>0?'+':''}${total}</div>
      </div>`;
  }).join('');
  const filters=[['all','filter_all'],['score','filter_score'],['absence','filter_absence'],['homework','filter_homework']].map(([v,k])=>`<button class="student-filter-btn ${filter===v?'active':''}" data-action="setStudentFilter('${v}')">${tr(k)}</button>`).join('');
  return `<div class="search-box">${ICON.search||ICON.user}<input id="studentSearch" type="search" value="${escapeAttr(state.studentSearch||'')}" placeholder="${escapeAttr(tr('search_students'))}" data-input-action="searchStudents(this.value)" autocomplete="off"></div><div class="student-filters">${filters}</div>${renderStudentPagination(pages)}${rows?`<div class="row-list">${rows}</div>`:`<div class="empty-state">${ICON.search||ICON.user}<p>${tr('search_no_students')}</p></div>`}`;
}
function studentPageChange(page){state.studentPage=page;render()}
function renderStudentPagination(pages){return pages>1?`<div class="manager-pagination"><button class="btn btn-outline-dark" ${state.studentPage<=1?'disabled':''} data-action="studentPageChange(${state.studentPage-1})">${tr('manager_prev')}</button><span>${state.studentPage} / ${pages}</span><button class="btn btn-outline-dark" ${state.studentPage>=pages?'disabled':''} data-action="studentPageChange(${state.studentPage+1})">${tr('manager_next')}</button></div>`:''}
function setStudentFilter(value){state.studentPage=1;state.studentFilter=['all','score','absence','homework'].includes(value)?value:'all';render();}
function searchStudents(value){state.studentPage=1;state.studentSearch=String(value||'').slice(0,100);clearTimeout(studentSearchTimer);studentSearchTimer=setTimeout(render,120)}

function openStudentFormModal(editId){
  const c = getClass(state.classId);
  const s = editId ? getStudent(c, editId) : null;
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <h3>${s ? tr('student_edit_title') : tr('student_new_title')}</h3>
    <div class="field"><label>${tr('student_name_label')}</label><input type="text" id="f_sname" value="${s?escapeAttr(s.name):''}" placeholder="${tr('student_name_ph')}"></div>
    <div class="field"><label>${tr('institution_student_id')}</label><input id="s_institution_id" maxlength="90" value="${escapeAttr(s?.institutionStudentId||'')}" dir="ltr"><small>${tr('institution_student_id_hint')}</small></div><div class="modal-actions">
      <button class="btn btn-gold" data-action="saveStudentForm('${s?s.id:''}')">${tr('btn_save')}</button>
    </div>
  `);
  setTimeout(()=>{ const el=document.getElementById('f_sname'); if(el) el.focus(); }, 50);
}
function openStudentSettingsModal(){
  const c=getClass(state.classId); const s=c&&getStudent(c,state.studentId);
  if(!c||!s) return;
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <h3>${tr('student_settings')} — ${escapeHtml(s.name)}</h3>
    <div class="backup-row" data-action="openStudentFormModal('${s.id}')">
      <div class="theme-icon">${ICON.gear}</div><div class="theme-texts"><b>${tr('student_edit_name')}</b><span>${tr('student_edit_name_hint')}</span></div><div class="chev">${ICON.chev}</div>
    </div>
    <div class="backup-row" data-action="resetStudentData('${c.id}','${s.id}')">
      <div class="theme-icon">${ICON.history||ICON.upload}</div><div class="theme-texts"><b>${tr('student_clear_data')}</b><span>${tr('student_clear_data_hint')}</span></div><div class="chev">${ICON.chev}</div>
    </div>
    <div class="modal-actions" data-style="margin-top:12px"><button class="btn btn-outline-dark" data-action="exportStudentExcel('${c.id}','${s.id}')">Excel</button><button class="btn btn-gold" data-action="printStudentReport('${c.id}','${s.id}')">PDF</button></div>
    <button type="button" class="btn btn-danger" data-style="width:100%;margin-top:12px" data-action="deleteStudent('${c.id}','${s.id}')">${tr('student_delete_full')}</button>
  `);
}
function saveStudentForm(id){
  const name = document.getElementById('f_sname').value.trim();
  if (!name){ toast(tr('toast_name_required')); return; }
  const c = getClass(state.classId);
  const institutionStudentId=String(document.getElementById('s_institution_id')?.value||'').trim();if(institutionStudentId&&(!/^[a-zA-Z0-9_-]{4,90}$/.test(institutionStudentId)||c.students.some(s=>s.id!==id&&s.institutionStudentId===institutionStudentId))){toast(tr('institution_student_id_invalid'));return}
  if (id){ Object.assign(getStudent(c,id),{name,institutionStudentId}); }
  else { c.students.push({id:uid(), name,institutionStudentId, grades:[], examHistory:[], timelineNotes:[], midterm:null, oral:null, final:null}); }
  saveData(); closeModal(); render(); toast(tr('toast_saved'));
}
function deleteStudent(cid, sid){
  confirmModal(tr('confirm_delete_student_title'), tr('confirm_delete_student_body'), ()=>{
    const c = getClass(cid);
    const before=JSON.parse(JSON.stringify(c));
    c.students = c.students.filter(s=>s.id!==sid);
    Object.values(c.attendance||{}).forEach(rec=>{ if(rec && rec.records) delete rec.records[sid]; });
    Object.values(c.homework||{}).forEach(rec=>{
      if(rec && rec.checks) delete rec.checks[sid];
      if(rec && rec.homeworkGrades) delete rec.homeworkGrades[sid];
    });
    c.homeworkLog = (c.homeworkLog||[]).filter(item=>item.studentId!==sid);
    saveData(); closeModal(); state.screen='class'; render();
    undoToast(tr('toast_deleted'),()=>{ const i=data.classes.findIndex(x=>x.id===cid); if(i>-1){ restoreStudentRecords(data.classes[i],before,sid,true);saveData(); render(); toast(tr('toast_student_restored')); } });
  });
}
function resetStudentData(cid, sid){
  confirmModal(tr('confirm_reset_student_title'), tr('confirm_reset_student_body'), ()=>{
    const c = getClass(cid);
    const s = c && getStudent(c, sid);
    if (!s) return;
    const before=JSON.parse(JSON.stringify(c));
    s.grades = [];
    s.examHistory = [];
    s.timelineNotes = [];
    s.midterm = null;
    s.oral = null;
    s.final = null;
    Object.keys(c.attendance||{}).forEach(iso=>{
      if (c.attendance[iso] && c.attendance[iso].records) delete c.attendance[iso].records[sid];
    });
    Object.keys(c.homework||{}).forEach(iso=>{
      if (c.homework[iso] && c.homework[iso].checks) delete c.homework[iso].checks[sid];
      if (c.homework[iso] && c.homework[iso].homeworkGrades) delete c.homework[iso].homeworkGrades[sid];
    });
    c.homeworkLog = (c.homeworkLog||[]).filter(l=>l.studentId!==sid);
    saveData(); closeModal(); render();
    undoToast(tr('toast_student_reset'),()=>{ const i=data.classes.findIndex(x=>x.id===cid); if(i>-1){ restoreStudentRecords(data.classes[i],before,sid);saveData(); render(); toast(tr('toast_student_data_restored')); } });
  });
}
function resetClassStudentsData(cid){
  confirmModal(tr('confirm_reset_class_title'), tr('confirm_reset_class_body'), ()=>{
    const c = getClass(cid);
    if (!c) return;
    const before=JSON.parse(JSON.stringify(c));
    (c.students||[]).forEach(s=>{
      s.grades = [];
      s.examHistory = [];
      s.timelineNotes = [];
      s.midterm = null;
      s.oral = null;
      s.final = null;
    });
    Object.keys(c.attendance||{}).forEach(iso=>{
      if (c.attendance[iso]) c.attendance[iso].records = {};
    });
    Object.keys(c.homework||{}).forEach(iso=>{
      if (c.homework[iso]) {c.homework[iso].checks = {};c.homework[iso].homeworkGrades = {};}
    });
    c.homeworkLog = [];
    saveData(); closeModal(); render();
    undoToast(tr('toast_class_students_reset'),()=>{ const i=data.classes.findIndex(x=>x.id===cid); if(i>-1){ for(const oldStudent of before.students)restoreStudentRecords(data.classes[i],before,oldStudent.id);saveData(); render(); toast(tr('toast_class_data_restored')); } });
  });
}

function restoreStudentRecords(current,before,sid,deleted=false){
  const old=before.students.find(s=>s.id===sid);if(!old)return;let student=current.students.find(s=>s.id===sid);
  if(!student){if(!deleted)return;student=JSON.parse(JSON.stringify(old));current.students.splice(Math.min(before.students.findIndex(s=>s.id===sid),current.students.length),0,student)}else{
    for(const key of ['grades','examHistory','timelineNotes']){const newer=student[key]||[],ids=new Set((old[key]||[]).map(x=>x.id));student[key]=[...JSON.parse(JSON.stringify(old[key]||[])),...newer.filter(x=>!ids.has(x.id))]}
    for(const key of ['midterm','oral','final'])if(student[key]==null)student[key]=old[key]??null;
  }
  for(const [iso,record] of Object.entries(before.attendance||{})){if(record.records&&Object.hasOwn(record.records,sid)){current.attendance[iso]||=JSON.parse(JSON.stringify({...record,records:{}}));current.attendance[iso].records||={};if(!Object.hasOwn(current.attendance[iso].records,sid))current.attendance[iso].records[sid]=record.records[sid]}}
  for(const [iso,record] of Object.entries(before.homework||{})){for(const field of ['checks','homeworkGrades'])if(record[field]&&Object.hasOwn(record[field],sid)){current.homework[iso]||=JSON.parse(JSON.stringify({...record,checks:{},homeworkGrades:{}}));current.homework[iso][field]||={};if(!Object.hasOwn(current.homework[iso][field],sid))current.homework[iso][field][sid]=JSON.parse(JSON.stringify(record[field][sid]))}}
  const oldLog=(before.homeworkLog||[]).filter(x=>x.studentId===sid),currentLog=current.homeworkLog||[],ids=new Set(currentLog.map(x=>x.id||JSON.stringify(x)));current.homeworkLog=[...oldLog.filter(x=>!ids.has(x.id||JSON.stringify(x))),...currentLog];
}
