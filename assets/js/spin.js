/* ============ SPIN SCREEN ============ */
function renderSpinScreen(){
  if (data.classes.length===0){
    return `<div class="empty-state">${ICON.dice}<p>${tr('spin_empty')}</p></div>`;
  }
  const selectRows = data.classes.map(c=>{
    const sel = !!state.spinSelected[c.id];
    const schedule = [c.info && c.info.days && c.info.days.length ? formatDaysFull(c.info.days) : '', c.info && c.info.startTime ? c.info.startTime : ''].filter(Boolean).join(' — ');
    return `
      <div class="spin-chk-row ${sel?'sel':''}" data-action="toggleSpinClass('${c.id}')">
        <div class="box">${ICON.check}</div>
        <div class="stitle">${escapeHtml(c.name)}${schedule?`<br><span data-style="font-weight:500;font-size:11px;color:var(--ink-soft);">${escapeHtml(schedule)}</span>`:''}</div>
        <div class="scount">${c.students.length} ${tr('spin_people_suffix')}</div>
      </div>`;
  }).join('');

  const modeToggle = `
    <div class="tabbar" data-style="margin-top:0;">
      <button class="${state.spinMode==='normal'?'active':''}" data-action="setSpinMode('normal')">${tr('spin_mode_normal')}</button>
      <button class="${state.spinMode==='oral'?'active':''}" data-action="setSpinMode('oral')">${tr('spin_mode_oral')}</button>
    </div>`;

  const activePool=buildSpinPool();
  const currentKey=spinPoolSignature(activePool);
  const fairRemaining=(state.spinPoolKey===currentKey && state.spinBag.length)?state.spinBag.length:activePool.length;
  const historyHtml=state.spinHistory.length ? `<div class="spin-history" aria-label="${escapeAttr(tr('spin_recent'))}">${state.spinHistory.map(x=>`<span>${escapeHtml(x.studentName)} · ${escapeHtml(x.className)}</span>`).join('')}</div>` : '';

  let reelHtml, winnerHtml='';
  if (state.spinWinner){
    const {student, cls} = state.spinWinner;
    reelHtml = `<div class="reel-name" data-style="color:${state.spinWinnerColor}">${escapeHtml(student.name)}</div><div class="reel-sub">${escapeHtml(cls.name)}</div>`;
    if (state.spinMode==='oral'){
      winnerHtml = `
        <div class="winner-card">
          <div class="wname">${escapeHtml(student.name)} ${tr('spin_asked_q')}</div>
          <div class="wclass">${tr('spin_oral_current')} ${student.oral!=null?student.oral:'—'} (${tr('of_label')} ${EXAM_LIMITS.oral})</div>
          <div class="grade-btns" data-style="margin-top:14px;">
            <button class="gbtn plus" data-action="gradeFromSpin('plus')">${ICON.plusCircle}<span>${tr('spin_oral_up')}</span></button>
            <button class="gbtn neutral" data-action="gradeFromSpin('neutral')">${ICON.neutralCircle}<span>${tr('spin_oral_neutral')}</span></button>
            <button class="gbtn minus" data-action="gradeFromSpin('minus')">${ICON.minusCircle}<span>${tr('spin_oral_down')}</span></button>
          </div>
          <div class="custom-grade-row" data-style="margin-top:14px;margin-bottom:0;">
            <input type="number" step="any" min="0" max="${EXAM_LIMITS.oral}" inputmode="decimal" id="oralDirectInput" placeholder="${tr('spin_oral_direct_ph')}">
            <button class="btn btn-gold btn-sm" data-action="gradeFromSpin('custom')">${tr('btn_submit')}</button>
          </div>
        </div>`;
    } else {
      winnerHtml = `
        <div class="winner-card">
          <div class="wname">${escapeHtml(student.name)} ${tr('spin_asked_q')}</div>
          <div class="wclass">${tr('spin_now_grade')}</div>
          <div class="grade-btns" data-style="margin-top:14px;">
            <button class="gbtn plus" data-action="gradeFromSpin('plus')">${ICON.plusCircle}<span>${tr('grade_positive')}</span></button>
            <button class="gbtn neutral" data-action="gradeFromSpin('neutral')">${ICON.neutralCircle}<span>${tr('grade_neutral')}</span></button>
            <button class="gbtn minus" data-action="gradeFromSpin('minus')">${ICON.minusCircle}<span>${tr('grade_negative')}</span></button>
          </div>
          <div class="custom-grade-row" data-style="margin-top:14px;margin-bottom:0;">
            <input type="number" step="any" inputmode="decimal" id="spinCustomInput" placeholder="${tr('spin_custom_ph')}">
            <button class="btn btn-gold btn-sm" data-action="gradeFromSpin('custom')">${tr('btn_submit')}</button>
          </div>
        </div>`;
    }
  } else if (state.spinning){
    reelHtml = `<div class="reel-name spinning" id="reelName" data-style="color:${FOLDER_COLORS[0]}">...</div><div class="reel-sub">${tr('spin_spinning')}</div>`;
  } else {
    reelHtml = `<div class="reel-placeholder">${tr('spin_placeholder')}</div>`;
  }

  return `
    ${modeToggle}
    <h2 class="section-title">${tr('spin_choose_classes_title')}</h2>
    <div class="spin-select-list">${selectRows}</div>
    <div class="fair-picker-info">
      <div><b>${tr('spin_fair')}</b><br><span>${tr('spin_fair_remaining').replace('{count}',fairRemaining)}</span></div>
      <button type="button" class="theme-switch ${state.spinSkipAbsent?'on':''}" data-action="toggleSpinSkipAbsent()" aria-label="${escapeAttr(tr('spin_skip_absent'))}"><span class="knob">${state.spinSkipAbsent?ICON.check:ICON.x}</span></button>
    </div>
    <div data-style="font-size:10.5px;color:var(--ink-soft);margin:-7px 4px 10px;">${tr(state.spinSkipAbsent?'spin_absent_excluded':'spin_absent_included')}</div>
    <div class="reel-wrap">${reelHtml}</div>
    ${winnerHtml}
    ${historyHtml}
    <button class="btn btn-gold" ${state.spinning?'disabled':''} data-action="startSpin()">${state.spinWinner ? tr('spin_next') : tr('spin_go')}</button>
  `;
}
function setSpinMode(m){ state.spinMode = m; render(); }
function toggleSpinSkipAbsent(){ state.spinSkipAbsent=!state.spinSkipAbsent; state.spinBag=[]; state.spinPoolKey=''; state.spinWinner=null; render(); }
function toggleSpinClass(id){
  state.spinSelected[id] = !state.spinSelected[id];
  state.spinBag=[]; state.spinAll=[]; state.spinPoolKey=''; state.spinWinner=null;
  render();
}
function buildSpinPool(){
  let pool=[];
  const today=tehranNow().iso;
  data.classes.forEach(c=>{
    if (state.spinSelected[c.id]){
      const att=c.attendance&&c.attendance[today];
      c.students.forEach(s=>{
        if(state.spinSkipAbsent && att && att.records && att.records[s.id]==='absent') return;
        pool.push({student:s, cls:c});
      });
    }
  });
  return pool;
}
function spinPoolSignature(pool){ return pool.map(x=>`${x.cls.id}:${x.student.id}`).sort().join('|'); }
function secureRandomInt(max){
  if(max<=1) return 0;
  try{ const a=new Uint32Array(1); crypto.getRandomValues(a); return Math.floor((a[0]/4294967296)*max); }
  catch(_){ return Math.floor(Math.random()*max); }
}
function shuffle(arr){
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--){ const j=secureRandomInt(i+1); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function startSpin(){
  const pool = buildSpinPool();
  if (pool.length===0){ toast(tr('toast_pick_class')); return; }
  // shuffle-bag: don't repeat a student until everyone in the pool has been asked once
  const poolKey=spinPoolSignature(pool);
  if (state.spinBag.length===0 || state.spinPoolKey!==poolKey){
    state.spinAll = pool;
    state.spinBag = shuffle(pool);
    state.spinPoolKey=poolKey;
  }
  state.spinWinner=null;
  state.spinning=true;
  render();
  const displayPool = pool;
  let ticks=0;
  const maxTicks = 22;
  const reelEl = ()=>document.getElementById('reelName');
  const interval = setInterval(()=>{
    ticks++;
    const rnd = displayPool[Math.floor(Math.random()*displayPool.length)];
    const color = FOLDER_COLORS[Math.floor(Math.random()*FOLDER_COLORS.length)];
    const el = reelEl();
    if (el){ el.textContent = rnd.student.name; el.style.color = color; }
    if (ticks>=maxTicks){
      clearInterval(interval);
      const winner = state.spinBag.pop();
      state.spinWinner = winner;
      state.spinHistory.unshift({studentName:winner.student.name,className:winner.cls.name,at:Date.now()});
      state.spinHistory=state.spinHistory.slice(0,6);
      state.spinWinnerColor = FOLDER_COLORS[Math.floor(Math.random()*FOLDER_COLORS.length)];
      state.spinning=false;
      render();
    }
  }, ticks<10?70:120);
}
function gradeFromSpin(value){
  if (!state.spinWinner) return;
  const {student} = state.spinWinner;
  const t = tehranNow();

  if (state.spinMode==='oral'){
    const max = EXAM_LIMITS.oral;
    if (value==='plus'){
      student.oral = clamp((student.oral!=null?student.oral:0)+1, 0, max);
    } else if (value==='minus'){
      student.oral = clamp((student.oral!=null?student.oral:0)-1, 0, max);
    } else if (value==='neutral'){
      saveData();
      toast(tr('toast_recorded_no_change'));
      state.spinWinner=null;
      render();
      return;
    } else if (value==='custom'){
      const el = document.getElementById('oralDirectInput');
      const v = parseFloat(el ? el.value : '');
      if (isNaN(v)){ toast(tr('toast_enter_number')); return; }
      if (v<0 || v>max){ toast(tr('toast_oral_range').replace('{max}', max)); return; }
      student.oral = v;
    }
    saveData();
    toast(tr('toast_oral_saved'));
    state.spinWinner=null;
    render();
    runFeedbackMotion(value==='plus'?'positive':value==='minus'?'negative':'success');
    return;
  }

  if (value==='custom'){
    const el = document.getElementById('spinCustomInput');
    const amount = parseFloat(el ? el.value : '');
    if (isNaN(amount)){ toast(tr('toast_enter_number')); return; }
    if (!student.grades) student.grades=[];
    student.grades.push({id:uid(), value:'custom', amount, iso:t.iso, time:t.time, jalaliShort:t.jalaliShort, note:tr('grade_note_from_spin')});
  } else {
    if (!student.grades) student.grades=[];
    student.grades.push({id:uid(), value, iso:t.iso, time:t.time, jalaliShort:t.jalaliShort, note:tr('grade_note_from_spin')});
  }
  saveData();
  toast(tr('toast_grade_saved'));
  state.spinWinner=null;
  render();
  runFeedbackMotion(value==='plus'?'positive':value==='minus'?'negative':'success');
}

