function goCalendar(){
  const curJ = currentJalaliYMD();
  state.calJY = curJ.jy;
  state.calJM = curJ.jm;
  const curG = currentGregorianYMD();
  state.calGY = curG.gy;
  state.calGM = curG.gm;
  state.screen = 'calendar';
  render();
}
function calShiftMonth(delta){
  let serial=state.calJY*12+state.calJM-1+delta;
  serial=Math.max(1400*12,Math.min(1410*12+11,serial));
  state.calJY=Math.floor(serial/12);state.calJM=serial%12+1;
  state.calAnimDir = delta > 0 ? 'next' : 'prev';
  render();
}
function calGoToday(){
  const curJ = currentJalaliYMD();
  state.calJY = curJ.jy; state.calJM = curJ.jm;
  state.calAnimDir = null;
  render();
}
function calGShiftMonth(delta){
  let serial=state.calGY*12+state.calGM-1+delta;
  serial=Math.max(2021*12,Math.min(2030*12+11,serial));
  state.calGY=Math.floor(serial/12);state.calGM=serial%12+1;
  state.calAnimDir = delta > 0 ? 'next' : 'prev';
  render();
}
function calGoTodayGregorian(){
  const curG = currentGregorianYMD();
  state.calGY = curG.gy; state.calGM = curG.gm;
  state.calAnimDir = null;
  render();
}
function calSetTab(tab){
  if (state.calTab===tab) return;
  state.calTab = tab;
  state.calAnimDir = null;
  render();
}
function calSetJalaliYear(value){state.calJY=Math.max(1400,Math.min(1410,Number(value)||currentJalaliYMD().jy));render()}
function calSetGregorianYear(value){state.calGY=Math.max(2021,Math.min(2030,Number(value)||currentGregorianYMD().gy));render()}
// روی یک روز قرمز (تعطیل) توی تقویم می‌زنیم -> برو به تب رویدادها و برای چند لحظه رنگش را پررنگ/کم‌رنگ کن
function calDayToEvents(d){
  haptic();
  state.calHighlightDay = d;
  state.calTab = 'events';
  render();
  setTimeout(()=>{
    const el = document.querySelector('.cal-event-flash');
    if (el) el.classList.remove('cal-event-flash');
  }, 1100);
}
function renderCalendarScreen(){
  const jy = state.calJY, jm = state.calJM;
  const animDir = state.calAnimDir;
  state.calAnimDir = null;
  const curJ = currentJalaliYMD();
  const daysInMonth = jalaliDaysInMonth(jm, jy);
  const leadBlanks = jalaliWeekdayIndex(jy, jm, 1);
  const weekdayHeaders = weekdayHeaderLabels();
  const weekdaysHtml = weekdayHeaders.map((w,i)=>`<span class="${i===6?'fri':''}">${w}</span>`).join('');
  let cellsHtml = '';
  for (let i=0;i<leadBlanks;i++){ cellsHtml += `<div class="cal-cell empty"></div>`; }
  for (let d=1; d<=daysInMonth; d++){
    const wIdx = jalaliWeekdayIndex(jy, jm, d);
    const isFri = wIdx===6;
    const isToday = jy===curJ.jy && jm===curJ.jm && d===curJ.jd;
    const events = holidaysForJalaliDate(jy, jm, d);
    const isHoliday = isFri || events.length>0;
    const cls = ['cal-cell'];
    if (isToday) cls.push('today');
    else if (isHoliday) cls.push(isFri?'fri':'holiday');
    const dayClickAttr = isHoliday ? ` data-action="calDayToEvents(${d})" data-style="cursor:pointer;"` : '';
    cellsHtml += `<div class="${cls.join(' ')}"${dayClickAttr}>${formatLocaleNumber(d)}${events.length?'<span class="dot"></span>':''}</div>`;
  }
  const monthEvents = [];
  for (let d=1; d<=daysInMonth; d++){
    const wIdx = jalaliWeekdayIndex(jy, jm, d);
    holidaysForJalaliDate(jy, jm, d).forEach(title=>{ monthEvents.push({d, title, fri:wIdx===6}); });
  }
  const eventsHtml = monthEvents.map(ev=>`
    <div class="note-card${ev.d===state.calHighlightDay?' cal-event-flash':''}" data-cal-day="${ev.d}">
      <div class="cal-event-day">${formatLocaleNumber(ev.d)}</div>
      <div data-style="flex:1;">
        <div class="ntxt">${escapeHtml(ev.title)}</div>
        <div class="nmeta" data-style="margin-top:4px;"><span data-style="color:var(--coral);font-weight:700;">${tr('cal_holiday_tag')}</span></div>
      </div>
    </div>`).join('');
  state.calHighlightDay = null;

  // --- Gregorian grid (for the "میلادی" tab) ---
  const gy = state.calGY, gm = state.calGM;
  const curG = currentGregorianYMD();
  const gDaysInMonth = gregorianDaysInMonth(gm, gy);
  const gLeadBlanks = gregorianWeekdayIndex(gy, gm, 1);
  let gCellsHtml = '';
  for (let i=0;i<gLeadBlanks;i++){ gCellsHtml += `<div class="cal-cell empty"></div>`; }
  for (let d=1; d<=gDaysInMonth; d++){
    const wIdx = gregorianWeekdayIndex(gy, gm, d);
    const isFri = wIdx===6;
    const isToday = gy===curG.gy && gm===curG.gm && d===curG.gd;
    const cls = ['cal-cell'];
    if (isToday) cls.push('today');
    else if (isFri) cls.push('fri');
    gCellsHtml += `<div class="${cls.join(' ')}">${formatLocaleNumber(d)}</div>`;
  }

  const todayWeekday = tehranWeekdayName();
  const tabsHtml = `
    <div class="cal-tabs" role="tablist" aria-label="${escapeAttr(tr('manager_calendar'))}">
      <button type="button" role="tab" aria-selected="${state.calTab==='calendar'}" class="cal-tab${state.calTab==='calendar'?' active':''}" data-action="calSetTab('calendar')">${tr('cal_tab_calendar')}</button>
      <button type="button" role="tab" aria-selected="${state.calTab==='events'}" class="cal-tab${state.calTab==='events'?' active':''}" data-action="calSetTab('events')">${tr('cal_tab_events')}</button>
      <button type="button" role="tab" aria-selected="${state.calTab==='gregorian'}" class="cal-tab${state.calTab==='gregorian'?' active':''}" data-action="calSetTab('gregorian')">${tr('cal_tab_gregorian')}</button>
    </div><p class="calendar-swipe-hint">${ICON.chev}<span>${tr('calendar_swipe_hint')}</span>${ICON.chev}</p><p class="cal-range-note">${tr('manager_calendar_range')}</p>`;
  const calendarTabHtml = `
    <div class="cal-nav-card">
      <button type="button" class="cal-nav-btn prev" data-action="calShiftMonth(-1)" aria-label="${escapeAttr(tr('manager_prev'))}" ${jy===1400&&jm===1?'disabled':''}>${ICON.chev}</button>
      <div class="cal-title-wrap">
        <b>${calendarMonthName('jalali',jy,jm)}</b><select class="cal-year-select" data-change="calSetJalaliYear(this.value)" aria-label="${escapeAttr(tr('manager_calendar_year'))}">${Array.from({length:11},(_,i)=>1400+i).map(y=>`<option value="${y}" ${y===jy?'selected':''}>${formatLocaleNumber(y)}</option>`).join('')}</select>
        <button type="button" class="cal-today-btn" data-action="calGoToday()">${tr('btn_today')}</button>
      </div>
      <button type="button" class="cal-nav-btn next" data-action="calShiftMonth(1)" aria-label="${escapeAttr(tr('manager_next'))}" ${jy===1410&&jm===12?'disabled':''}>${ICON.chev}</button>
    </div>
    <div class="cal-grid-card${animDir?` swipe-enter-${animDir}`:''}">
      <div class="cal-weekdays">${weekdaysHtml}</div>
      <div class="cal-days">${cellsHtml}</div>
      <div class="cal-legend">
        <div class="cal-legend-item"><span class="cal-legend-dot" data-style="background:var(--chalk-gold);"></span>${tr('btn_today')}</div>
        <div class="cal-legend-item"><span class="cal-legend-dot" data-style="background:var(--coral);"></span>${tr('cal_holiday_tag')}</div>
      </div>
    </div>`;
  const eventsTabHtml = `
    <h2 class="section-title" data-style="color:var(--ink);opacity:.7;margin-top:0;">${calendarMonthName('jalali',jy,jm)} ${formatLocaleNumber(jy)}</h2>
    <div class="cal-events-list">
      ${eventsHtml || `<p data-style="font-size:12.5px;color:var(--ink-soft);padding:6px 4px;">${tr('cal_no_events')}</p>`}
    </div>`;
  const gregorianTabHtml = `
    <div class="cal-nav-card">
      <button type="button" class="cal-nav-btn prev" data-action="calGShiftMonth(-1)" aria-label="${escapeAttr(tr('manager_prev'))}" ${gy===2021&&gm===1?'disabled':''}>${ICON.chev}</button>
      <div class="cal-title-wrap">
        <b>${calendarMonthName('gregorian',gy,gm)}</b><select class="cal-year-select" data-change="calSetGregorianYear(this.value)" aria-label="${escapeAttr(tr('manager_calendar_year'))}">${Array.from({length:10},(_,i)=>2021+i).map(y=>`<option value="${y}" ${y===gy?'selected':''}>${formatLocaleNumber(y)}</option>`).join('')}</select>
        <button type="button" class="cal-today-btn" data-action="calGoTodayGregorian()">${tr('btn_today')}</button>
      </div>
      <button type="button" class="cal-nav-btn next" data-action="calGShiftMonth(1)" aria-label="${escapeAttr(tr('manager_next'))}" ${gy===2030&&gm===12?'disabled':''}>${ICON.chev}</button>
    </div>
    <div class="cal-grid-card${animDir?` swipe-enter-${animDir}`:''}">
      <div class="cal-weekdays">${weekdaysHtml}</div>
      <div class="cal-days">${gCellsHtml}</div>
      <div class="cal-legend">
        <div class="cal-legend-item"><span class="cal-legend-dot" data-style="background:var(--chalk-gold);"></span>${tr('btn_today')}</div>
      </div>
    </div><p class="cal-range-note">${tr('manager_calendar_range')}</p>`;
  const tabContent = state.calTab==='events' ? eventsTabHtml
    : state.calTab==='gregorian' ? gregorianTabHtml
    : calendarTabHtml;
  return `
    <div class="cal-hero">
      <div class="cal-hero-top">
        <div class="cal-hero-daynum">${formatLocaleNumber(curJ.jd)}</div>
        <div class="cal-hero-info">
          <b>${todayWeekday} ${formatLocaleNumber(curJ.jd)} ${calendarMonthName('jalali',curJ.jy,curJ.jm)}</b>
          <span>${formatLocaleNumber(curJ.jy)} — ${formatLocaleNumber(curG.gd)} ${calendarMonthName('gregorian',curG.gy,curG.gm)} ${formatLocaleNumber(curG.gy)}</span>
        </div>
      </div>
    </div>
    ${tabsHtml}
    ${tabContent}
  `;
}
