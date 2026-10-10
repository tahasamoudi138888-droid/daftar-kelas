/* V19 — useful command centre, class priorities and management trends. */
let commandPaletteCache=[],commandPaletteMatches=[],commandPaletteActive=0;
function commandNormalize(value){return String(value||'').trim().toLocaleLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,' ')}
function commandPaletteItems(){
  const items=[];
  if(data.settings.appRole==='manager'){
    const directory=managerState.directory||{},classes=managerState.classDirectory?.classes||directory.classes||[];
    for(const b of managerState.summary?.branches||[])items.push({kind:'branch',icon:ICON.folder,title:b.name,meta:tr('command_branches'),a:b.id});
    for(const t of directory.teachers||[])items.push({kind:'teacher',icon:ICON.user,title:t.name||t.email,meta:`${tr('command_teachers')} · ${t.branch_name||''}`,a:t.id});
    for(const c of classes)items.push({kind:'managerClass',icon:ICON.book,title:c.name,meta:`${tr('command_classes')} · ${c.teacherName||''}`,a:c.teacherId,b:c.id});
    items.push({kind:'managerAction',icon:ICON.chart,title:tr('manager_overview'),meta:tr('command_actions'),a:'overview'},{kind:'managerAction',icon:ICON.user,title:tr('manager_me'),meta:tr('command_actions'),a:'me'});
  }else{
    for(const c of data.classes||[]){
      items.push({kind:'class',icon:ICON.folder,title:c.name,meta:`${tr('command_classes')} · ${(c.students||[]).length} ${tr('manager_students')}`,a:c.id});
      for(const s of c.students||[])items.push({kind:'student',icon:ICON.user,title:s.name,meta:`${tr('command_students')} · ${c.name}`,a:c.id,b:s.id});
    }
    items.push(
      {kind:'teacherAction',icon:ICON.dice,title:tr('nav_spin'),meta:tr('command_actions'),a:'spin'},
      {kind:'teacherAction',icon:ICON.bell,title:tr('nav_reminders'),meta:tr('command_actions'),a:'reminders'},
      {kind:'teacherAction',icon:ICON.calendar,title:tr('calendar_card_title'),meta:tr('command_actions'),a:'calendar'},
      {kind:'teacherAction',icon:ICON.chart,title:tr('report_title'),meta:tr('command_actions'),a:'reports'},
      {kind:'teacherAction',icon:ICON.gear,title:tr('settings_title'),meta:tr('command_actions'),a:'settings'}
    );
  }
  return items;
}
function openCommandPalette(){
  commandPaletteCache=commandPaletteItems();
  openModal(`<div class="command-palette"><div class="command-head"><span>${ICON.search}</span><div><h3>${tr('command_open')}</h3><p>${tr('command_hint')}</p></div><button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button></div><label class="command-input"><span>${ICON.search}</span><input id="commandPaletteInput" type="search" autocomplete="off" maxlength="100" placeholder="${escapeAttr(tr('command_placeholder'))}" data-input-action="commandPaletteFilter(this.value)" aria-controls="commandPaletteResults" aria-autocomplete="list" aria-expanded="true"></label><div id="commandPaletteResults" class="command-results" role="listbox" aria-label="${escapeAttr(tr('command_open'))}"></div><div id="commandPaletteStatus" class="sr-only" role="status" aria-live="polite"></div><footer><span>${tr('command_keyboard')}</span><span><kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd> <kbd>Esc</kbd></span></footer></div>`);
  commandPaletteFilter('');setTimeout(()=>document.getElementById('commandPaletteInput')?.focus(),20);
}
function commandPaletteFilter(value){
  const q=commandNormalize(value),words=q.split(' ').filter(Boolean);
  const matches=commandPaletteCache.filter(item=>{const hay=commandNormalize(`${item.title} ${item.meta}`);return words.every(word=>hay.includes(word))}).slice(0,24);commandPaletteMatches=matches;commandPaletteActive=0;
  const root=document.getElementById('commandPaletteResults');if(!root)return;
  root.innerHTML=matches.length?matches.map((item,index)=>`<button id="command-option-${index}" type="button" role="option" aria-selected="${index===0?'true':'false'}" class="${index===0?'is-active':''}" data-command-index="${commandPaletteCache.indexOf(item)}" data-action="commandPaletteSelect(${commandPaletteCache.indexOf(item)})"><span class="command-icon">${item.icon}</span><span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.meta)}</small></span>${ICON.chev}</button>`).join(''):`<div class="command-empty">${ICON.search}<span>${tr('command_empty')}</span></div>`;
  const input=document.getElementById('commandPaletteInput'),status=document.getElementById('commandPaletteStatus');if(input)input.setAttribute('aria-activedescendant',matches.length?'command-option-0':'');if(status)status.textContent=matches.length?`${formatLocaleNumber(matches.length)} ${tr('command_open')}`:tr('command_empty');
}
function commandPaletteMove(delta){const options=[...document.querySelectorAll('#commandPaletteResults [role="option"]')];if(!options.length)return;commandPaletteActive=(commandPaletteActive+delta+options.length)%options.length;options.forEach((el,index)=>{const active=index===commandPaletteActive;el.classList.toggle('is-active',active);el.setAttribute('aria-selected',String(active))});const active=options[commandPaletteActive];document.getElementById('commandPaletteInput')?.setAttribute('aria-activedescendant',active.id);active.scrollIntoView({block:'nearest'})}
function commandPaletteSelect(index){
  const item=commandPaletteCache[Number(index)];if(!item)return;closeModal();
  if(item.kind==='class')return openClass(item.a);
  if(item.kind==='student')return openStudent(item.a,item.b);
  if(item.kind==='branch')return managerSelectBranch(item.a);
  if(item.kind==='teacher')return managerOpenTeacher(item.a);
  if(item.kind==='managerClass')return managerOpenClass(item.a,item.b);
  if(item.kind==='managerAction')return managerSetSection(item.a);
  if(item.a==='calendar')return goCalendar();if(item.a==='reports')return openReportsModal();if(item.a==='settings')return openSettingsModal();return navClick(item.a);
}
function renderCommandLauncher(){return `<button type="button" class="command-launcher" data-action="openCommandPalette()" aria-keyshortcuts="Control+K Meta+K"><span>${ICON.search}</span><div><b>${tr('command_open')}</b><small>${tr('command_hint')}</small></div><kbd>Ctrl K</kbd></button>`}
function renderTeacherPriorityBoard(){
  const rows=(data.classes||[]).map(c=>({c,m:classHealthMetrics(c)})).filter(x=>x.m.total>0).sort((a,b)=>b.m.total-a.m.total).slice(0,3);
  return `<section class="priority-board" aria-labelledby="priorityBoardTitle"><header><span>${ICON.bell}</span><div><h2 id="priorityBoardTitle">${tr('priority_title')}</h2><p>${tr('priority_hint')}</p></div></header>${rows.length?`<div class="priority-list">${rows.map(({c,m},index)=>{const value=Math.min(100,18+m.total*10);return `<button type="button" data-action="openClassHealthCenter('${c.id}')"><em>${formatLocaleNumber(index+1)}</em><span><b>${escapeHtml(c.name)}</b><small>${formatLocaleNumber(m.total)} ${tr('priority_items')}</small></span><i role="progressbar" aria-label="${escapeAttr(c.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" data-style="--priority:${value}%"></i>${ICON.chev}</button>`}).join('')}</div>`:`<div class="priority-clear">${ICON.check}<span><b>${tr('priority_clear')}</b><small>${tr('priority_clear_hint')}</small></span></div>`}</section>`;
}
function managerTrendWidget(summary){
  const trend=(summary.trend||[]).filter(x=>x.attendance_rate!=null),rates=trend.map(x=>Number(x.attendance_rate));
  if(!rates.length)return `<article class="manager-trend-widget empty"><header><span>${ICON.chart}</span><div><b>${tr('trend_title')}</b><small>${tr('trend_no_data')}</small></div></header></article>`;
  const min=Math.min(...rates),max=Math.max(...rates),range=Math.max(8,max-min),points=rates.map((v,i)=>`${rates.length===1?50:Math.round(i*100/(rates.length-1))},${Math.round(42-(v-min)*32/range)}`).join(' '),delta=rates[rates.length-1]-rates[0],tone=delta>2?'up':delta<-2?'down':'flat';
  const trendLabel=`${tr('trend_title')}: ${formatLocaleNumber(rates[rates.length-1])}٪، ${tr(`trend_${tone}`)}`;
  return `<article class="manager-trend-widget ${tone}" aria-label="${escapeAttr(trendLabel)}"><header><span>${ICON.chart}</span><div><b>${tr('trend_title')}</b><small>${tr('trend_hint')}</small></div><em>${delta>0?'+':''}${formatLocaleNumber(delta.toFixed(1))}٪</em></header><svg viewBox="0 0 100 48" preserveAspectRatio="none" role="img" aria-label="${escapeAttr(trendLabel)}"><defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".28"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><polygon points="0,48 ${points} 100,48" fill="url(#trendFill)"/><polyline points="${points}" fill="none" vector-effect="non-scaling-stroke"/></svg><footer><b>${formatLocaleNumber(rates[rates.length-1])}٪</b><span>${tr(`trend_${tone}`)}</span><small>${formatLocaleNumber(trend.length)} ${tr('trend_days')}</small></footer></article>`;
}
document.addEventListener('keydown',event=>{
  const target=event.target,typing=target&&['INPUT','TEXTAREA','SELECT'].includes(target.tagName);
  if(target?.id==='commandPaletteInput'&&['ArrowDown','ArrowUp','Enter'].includes(event.key)){event.preventDefault();if(event.key==='ArrowDown')commandPaletteMove(1);else if(event.key==='ArrowUp')commandPaletteMove(-1);else document.querySelectorAll('#commandPaletteResults [role="option"]')[commandPaletteActive]?.click();return}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openCommandPalette()}
  else if(event.key==='/'&&!typing&&!document.getElementById('modalOverlay')){event.preventDefault();openCommandPalette()}
});
