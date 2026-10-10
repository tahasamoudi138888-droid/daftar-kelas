/* ============ HOMEWORK TAB ============ */
function renderHomeworkTab(c){
  const t = tehranNow();
  const today = c.homework[t.iso] || {text:'', checks:{}, finalized:false};
  const locked = !!today.finalized;
  const gs = c.homeworkGradeSettings || {};
  const checksHtml = c.students.length ? c.students.map((s,i)=>{
    const done = !!today.checks[s.id];
    let tagAmount = null;
    if (done && gs.posEnabled && typeof gs.posAmount==='number' && gs.posAmount>0) tagAmount = gs.posAmount;
    else if (!done && gs.negEnabled && typeof gs.negAmount==='number' && gs.negAmount<0) tagAmount = gs.negAmount;
    const tag = tagAmount!=null ? `<div class="hw-score-tag ${tagAmount>0?'pos':'neg'}">${tagAmount>0?'+':''}${tagAmount}</div>` : '';
    return `
      <div class="spin-chk-row ${done?'sel':''}${locked?' locked':''}" ${locked?'':`data-action="toggleHomeworkCheck('${c.id}','${s.id}')"`}>
        <div class="box">${ICON.check}</div>
        <div class="avatar" data-style="width:32px;height:32px;font-size:12px;background:${colorForIndex(i)}">${initials(s.name)}</div>
        <div class="stitle">${escapeHtml(s.name)}</div>
        <div class="scount">${done?tr('hw_done'):tr('hw_not_done')}</div>
        ${tag}
      </div>`;
  }).join('') : '';

  const log = (c.homeworkLog||[]).slice().reverse().map(l=>`
    <div class="hist-item">
      <div class="hist-dot" data-style="background:var(--coral)"></div>
      <div class="htxt">${escapeHtml(l.studentName)} — ${l.jalaliShort||isoToJalali(l.iso)}</div>
      <div class="hist-del" data-action="showHomeworkTextModal('${c.id}','${l.iso}')">${ICON.dots}</div>
      <div class="hist-del" data-action="deleteHomeworkLogEntry('${c.id}','${l.id}')">${ICON.trash}</div>
    </div>`).join('');

  const assignHistory = Object.keys(c.homework||{}).filter(iso=>c.homework[iso].text).sort().reverse().slice(0,30).map(iso=>`
    <div class="hist-item">
      <div class="hist-dot" data-style="background:var(--sky)"></div>
      <div class="htxt">${escapeHtml(c.homework[iso].text)}</div>
      <div class="htime">${isoToJalali(iso)}</div>
    </div>`).join('');

  return `
    <div class="info-card">
      <label data-style="display:block;font-size:12.5px;font-weight:700;color:var(--ink-soft);margin-bottom:8px;">${tr('hw_today_label')} (${t.jalaliShort})</label>
      <textarea id="hw_text" placeholder="${tr('hw_ph')}" data-style="width:100%;border:1.5px solid var(--paper-2);border-radius:12px;padding:11px 13px;font-family:inherit;font-size:16px;min-height:70px;">${escapeHtml(today.text||'')}</textarea>
      <div data-style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn btn-gold btn-sm" data-style="flex:1;" data-action="saveHomeworkText('${c.id}')">${tr('btn_save_hw')}</button>
        <button class="btn btn-sm hw-copy-btn" title="${tr('btn_copy_hw')}" aria-label="${escapeAttr(tr('btn_copy_hw'))}" data-style="width:42px;flex:0 0 42px;display:flex;align-items:center;justify-content:center;background:var(--paper-2);color:var(--ink);" data-action="copyHomeworkText()">${ICON.copy}</button>
      </div>
    </div>
    <div class="info-card" data-style="margin-top:14px;">
      <div class="hw-grade-set-title">${tr('hw_grade_settings_title')}</div>
      <div class="hw-grade-row ${gs.posEnabled?'':'is-off'}">
        <div class="hw-grade-label">${tr('hw_grade_pos_label')}</div>
        <input type="number" step="any" inputmode="decimal" class="hw-grade-input" id="hw_pos_amount" value="${gs.posAmount!=null?gs.posAmount:''}" placeholder="${tr('hw_grade_pos_ph')}" data-change="saveHomeworkGradeAmount('${c.id}','pos', this.value)">
        <button type="button" aria-pressed="${gs.posEnabled}" class="hw-grade-toggle ${gs.posEnabled?'on':'off'}" data-action="toggleHomeworkGradeEnabled('${c.id}','pos')">${gs.posEnabled?tr('toggle_on'):tr('toggle_off')}</button>
      </div>
      <div class="hw-grade-row ${gs.negEnabled?'':'is-off'}">
        <div class="hw-grade-label">${tr('hw_grade_neg_label')}</div>
        <input type="number" step="any" inputmode="decimal" class="hw-grade-input" id="hw_neg_amount" value="${gs.negAmount!=null?gs.negAmount:''}" placeholder="${tr('hw_grade_neg_ph')}" data-change="saveHomeworkGradeAmount('${c.id}','neg', this.value)">
        <button type="button" aria-pressed="${gs.negEnabled}" class="hw-grade-toggle ${gs.negEnabled?'on':'off'}" data-action="toggleHomeworkGradeEnabled('${c.id}','neg')">${gs.negEnabled?tr('toggle_on'):tr('toggle_off')}</button>
      </div>
    </div>
    ${c.students.length ? `
      <h2 class="section-title" data-style="margin-top:20px;">${tr('hw_checklist_title')}</h2>
      ${locked ? `<div class="locked-banner">${ICON.lock} ${tr('hw_locked_banner')}</div>` : ''}
      <div class="row-list">${checksHtml}</div>
      ${locked ? `
        <div class="lock-bar checked">
          <div class="box">${ICON.check}</div>
          <div><b>${tr('hw_finalize_title')}</b><span>${tr('hw_finalize_sub')}</span></div>
        </div>
        <button type="button" class="btn btn-outline-dark btn-sm" data-style="width:100%;margin-top:10px;" data-action="unlockHomeworkChecklist('${c.id}')">${tr('hw_edit_checklist')}</button>
      ` : `
        <div class="lock-bar" data-action="toggleHomeworkFinalize('${c.id}')">
          <div class="box">${ICON.check}</div>
          <div><b>${tr('hw_finalize_title')}</b><span>${tr('hw_finalize_sub')}</span></div>
        </div>
      `}
    ` : `<div class="empty-state"><p>${tr('add_student_first')}</p></div>`}
    <h2 class="section-title" data-style="margin-top:22px;">${tr('hw_not_done_title')}</h2>
    ${log ? `<div class="info-card" data-style="padding:6px 14px;">${log}</div>` : `<p data-style="font-size:12.5px;color:var(--ink-soft);padding:6px 4px;">${tr('hw_none_yet')}</p>`}
    <h2 class="section-title" data-style="margin-top:22px;">${tr('hw_assign_history_title')}</h2>
    ${assignHistory ? `<div class="info-card" data-style="padding:6px 14px;">${assignHistory}</div>` : `<p data-style="font-size:12.5px;color:var(--ink-soft);padding:6px 4px;">${tr('hw_history_none')}</p>`}
  `;
}
function toggleHomeworkGradeEnabled(cid, type){
  const c = getClass(cid);
  if (!c.homeworkGradeSettings) c.homeworkGradeSettings = {};
  const key = type==='pos' ? 'posEnabled' : 'negEnabled';
  c.homeworkGradeSettings[key] = !c.homeworkGradeSettings[key];
  saveData(); render();
  runFeedbackMotion(value==='plus'?'positive':value==='minus'?'negative':'success');
}
function saveHomeworkGradeAmount(cid, type, raw){
  const c = getClass(cid);
  if (!c.homeworkGradeSettings) c.homeworkGradeSettings = {};
  const key = type==='pos' ? 'posAmount' : 'negAmount';
  if (raw===''){ c.homeworkGradeSettings[key] = null; saveData(); render(); return; }
  const val = parseFloat(raw);
  if (isNaN(val)){ render(); return; }
  if (type==='pos' && val<=0){ toast(tr('toast_hw_grade_pos_invalid')); render(); return; }
  if (type==='neg' && val===0){ toast(tr('toast_hw_grade_neg_invalid')); render(); return; }
  const finalVal = type==='neg' ? -Math.abs(val) : val;
  c.homeworkGradeSettings[key] = finalVal;
  saveData(); render();
}
function applyHomeworkGrades(c, rec, t){
  const gs = c.homeworkGradeSettings || {};
  if (!rec.homeworkGrades) rec.homeworkGrades = {};
  c.students.forEach(s=>{
    const prev = rec.homeworkGrades[s.id];
    if (prev){
      s.grades = (s.grades||[]).filter(g=>g.id!==prev.id);
      delete rec.homeworkGrades[s.id];
    }
    const done = !!rec.checks[s.id];
    let amount = null;
    if (done && gs.posEnabled && typeof gs.posAmount==='number' && gs.posAmount>0) amount = gs.posAmount;
    else if (!done && gs.negEnabled && typeof gs.negAmount==='number' && gs.negAmount<0) amount = gs.negAmount;
    if (amount!=null){
      if (!s.grades) s.grades=[];
      const gid = uid();
      s.grades.push({id:gid, value:'custom', amount, iso:t.iso, time:t.time, jalaliShort:t.jalaliShort, note: done?tr('hw_grade_note_done'):tr('hw_grade_note_missed')});
      rec.homeworkGrades[s.id] = {id:gid, amount};
    }
  });
}
function removeHomeworkGrades(c, rec){
  if (!rec.homeworkGrades) return;
  c.students.forEach(s=>{
    const prev = rec.homeworkGrades[s.id];
    if (prev){ s.grades = (s.grades||[]).filter(g=>g.id!==prev.id); }
  });
  rec.homeworkGrades = {};
}
function saveHomeworkText(cid){
  const c = getClass(cid); const t = tehranNow();
  const text = document.getElementById('hw_text').value.trim();
  if (!c.homework[t.iso]) c.homework[t.iso] = {text:'', checks:{}, finalized:false};
  c.homework[t.iso].text = text;
  clearDraft('hw_text');
  saveData(); render(); toast(tr('toast_hw_saved'));
}
function copyHomeworkText(){
  const el = document.getElementById('hw_text');
  const text = el ? el.value.trim() : '';
  if (!text){ toast(tr('toast_hw_empty_copy')); return; }
  const done = () => toast(tr('toast_hw_copied'));
  const fail = () => {
    try{
      el.focus(); el.select();
      document.execCommand('copy');
      done();
    }catch(e){ toast(tr('toast_hw_empty_copy')); }
  };
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(fail);
  } else {
    fail();
  }
}
function unlockHomeworkChecklist(cid){
  const c = getClass(cid); const t = tehranNow();
  const rec = c.homework[t.iso];
  if (!rec || !rec.finalized) return;
  removeHomeworkGrades(c, rec);
  rec.finalized = false;
  saveData(); render();
}
function toggleHomeworkCheck(cid, sid){
  const c = getClass(cid); const t = tehranNow();
  if (!c.homework[t.iso]) c.homework[t.iso] = {text:'', checks:{}, finalized:false};
  const rec = c.homework[t.iso];
  const wasFinalized = rec.finalized;
  rec.finalized = false;
  rec.checks[sid] = !rec.checks[sid];
  if (wasFinalized){ removeHomeworkGrades(c, rec); }
  saveData(); render();
}
function toggleHomeworkFinalize(cid){
  const c = getClass(cid); const t = tehranNow();
  if (!c.homework[t.iso]) c.homework[t.iso] = {text:'', checks:{}, finalized:false};
  const rec = c.homework[t.iso];
  if (!rec.finalized){
    if (!c.homeworkLog) c.homeworkLog = [];
    c.students.forEach(s=>{
      rec.checks[s.id] = !!rec.checks[s.id];
      if (!rec.checks[s.id]){
        const existing = c.homeworkLog.find(l=>l.iso===t.iso && l.studentId===s.id);
        if (existing){ existing.text = rec.text; existing.studentName = s.name; }
        else { c.homeworkLog.push({id:uid(), studentId:s.id, studentName:s.name, text:rec.text, iso:t.iso, jalaliShort:t.jalaliShort}); }
      }
    });
    applyHomeworkGrades(c, rec, t);
    rec.finalized = true;
    toast(tr('toast_hw_finalized'));
  } else {
    removeHomeworkGrades(c, rec);
    rec.finalized = false;
  }
  saveData(); render();
}
function deleteHomeworkLogEntry(cid, lid){
  const c = getClass(cid);
  const index=(c.homeworkLog||[]).findIndex(l=>l.id===lid);
  const removed=index>-1?c.homeworkLog[index]:null;
  c.homeworkLog = (c.homeworkLog||[]).filter(l=>l.id!==lid);
  saveData(); render();
  undoToast(tr('toast_homework_item_deleted'),()=>{ const cls=getClass(cid); if(cls&&removed&&!cls.homeworkLog.some(l=>l.id===lid)){ cls.homeworkLog.splice(Math.max(0,index),0,removed); saveData(); render(); toast(tr('toast_homework_item_restored')); } });
}

