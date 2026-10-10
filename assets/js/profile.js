function personalReminderDateLabel(reminder){
  const date=isoToJalali(reminder.dueIso,true);
  return reminder.repeatDays?`${date} · ${tr('personal_reminder_every_days').replace('{count}',reminder.repeatDays)}`:date;
}
function renderPersonalReminders(){
  const today=tehranNow().iso,items=(data.profile.personalReminders||[]).slice().sort((a,b)=>a.dueIso.localeCompare(b.dueIso));
  if(!items.length)return `<div class="personal-reminder-empty">${ICON.bell}<span>${tr('personal_reminder_empty')}</span></div>`;
  return items.map(r=>{
    const overdue=r.dueIso<today,notified=r.lastNotifiedFor===r.dueIso;
    return `<article class="personal-reminder-card${overdue?' overdue':''}${r.kind==='backup'?' backup':''}">
      <div class="personal-reminder-icon">${r.kind==='backup'?ICON.download:ICON.bell}</div>
      <div class="personal-reminder-content"><b>${escapeHtml(r.text)}</b><span>${escapeHtml(personalReminderDateLabel(r))}${notified?` · ${tr('personal_reminder_notified')}`:''}</span></div>
      <div class="personal-reminder-actions"><button type="button" class="icon-action" data-action="openPersonalReminderModal('${r.id}')" aria-label="${escapeAttr(tr('personal_reminder_edit'))}">${ICON.edit}</button><button type="button" class="icon-action danger" data-action="confirmDeletePersonalReminder('${r.id}')" aria-label="${escapeAttr(tr('btn_delete'))}">${ICON.trash}</button></div>
    </article>`;
  }).join('');
}
function openPersonalReminderModal(id){
  const reminder=id?(data.profile.personalReminders||[]).find(r=>r.id===id):null;
  const due=reminder?reminder.dueIso:addDaysIso(tehranNow().iso,1),repeat=reminder?reminder.repeatDays:0;
  openModal(`<button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <h3>${tr(reminder?'personal_reminder_edit_title':'personal_reminder_new_title')}</h3>
    <div class="field"><label>${tr('personal_reminder_text_label')}</label><textarea id="personalReminderText" maxlength="1000" placeholder="${escapeAttr(tr('personal_reminder_text_placeholder'))}">${reminder?escapeHtml(reminder.text):''}</textarea></div>
    <div class="field"><label>${tr('personal_reminder_date_label')}</label><input id="personalReminderDate" type="date" dir="ltr" value="${escapeAttr(due)}"></div>
    <div class="field"><label>${tr('personal_reminder_repeat_label')}</label><input id="personalReminderRepeat" type="number" inputmode="numeric" min="0" max="365" value="${repeat}"><small>${tr('personal_reminder_repeat_hint')}</small></div>
    <button type="button" class="btn btn-gold" data-action="savePersonalReminder('${id||''}')">${tr('btn_save')}</button>`);
}
function savePersonalReminder(id){
  const text=String(document.getElementById('personalReminderText')?.value||'').trim().slice(0,1000),dueIso=String(document.getElementById('personalReminderDate')?.value||''),repeatDays=Math.max(0,Math.min(365,Math.floor(Number(document.getElementById('personalReminderRepeat')?.value)||0)));
  if(!text){toast(tr('personal_reminder_text_required'));return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dueIso)||Number.isNaN(new Date(`${dueIso}T12:00:00Z`).getTime())){toast(tr('personal_reminder_date_required'));return}
  const list=data.profile.personalReminders||(data.profile.personalReminders=[]),existing=id?list.find(r=>r.id===id):null;
  if(existing){existing.text=text;existing.dueIso=dueIso;existing.repeatDays=repeatDays;existing.lastNotifiedFor=''}
  else list.push({id:uid(),kind:'personal',text,dueIso,repeatDays,createdAt:new Date().toISOString(),lastNotifiedFor:''});
  saveData();closeModal();render();toast(tr('personal_reminder_saved'));
}
function deletePersonalReminder(id){
  const list=data.profile.personalReminders||[],index=list.findIndex(r=>r.id===id),removed=index>-1?list[index]:null;if(!removed)return;
  data.profile.personalReminders=list.filter(r=>r.id!==id);saveData();render();
  undoToast(tr('personal_reminder_deleted'),async()=>{if(!data.profile.personalReminders.some(r=>r.id===id)){data.profile.personalReminders.splice(Math.max(0,index),0,removed);await saveData({throwOnError:true});render();toast(tr('personal_reminder_restored'))}});
}
function confirmDeletePersonalReminder(id){confirmModal(tr('personal_reminder_delete_title'),tr('personal_reminder_delete_body'),()=>deletePersonalReminder(id))}
let personalNotificationRunning=false;
async function checkPersonalReminderNotifications(){
  if(personalNotificationRunning||!data.settings.notifications||!('Notification'in window)||Notification.permission!=='granted'||!navigator.serviceWorker)return;
  const today=tehranNow().iso,due=(data.profile.personalReminders||[]).filter(r=>r.dueIso<=today&&r.lastNotifiedFor!==r.dueIso).slice(0,5);if(!due.length)return;
  personalNotificationRunning=true;let changed=false;
  try{
    const reg=await navigator.serviceWorker.ready;
    for(const r of due){
      if(reg.active)reg.active.postMessage({type:'SHOW_PERSONAL_NOTIFICATION',payload:{title:tr(r.kind==='backup'?'personal_backup_notification_title':'personal_reminder_notification_title'),body:r.kind==='backup'?tr('personal_backup_notification_body'):r.text,tag:`personal:${r.id}:${r.dueIso}`,url:'./?screen=profile'}});
      const firedFor=r.dueIso;r.lastNotifiedFor=firedFor;
      if(r.repeatDays){do{r.dueIso=addDaysIso(r.dueIso,r.repeatDays)}while(r.dueIso<=today);r.lastNotifiedFor=''}
      changed=true;
    }
    if(changed){await saveData({throwOnError:true});if(state.screen==='profile')render()}
  }catch(error){recordLocalError('personal_notification',error)}finally{personalNotificationRunning=false}
}
function renderProfileScreen(){
  const p = data.profile;
  const notes = (p.notes||[]).slice().reverse().map(n=>`
    <div class="note-card">
      <div class="ntxt">${escapeHtml(n.text)}</div>
      <div class="nmeta"><span>${n.jalaliShort} — ${n.time}</span><div class="hist-del" data-action="deleteNote('${n.id}')">${ICON.trash}</div></div>
    </div>`).join('');
  return `
    <section class="my-dashboard" aria-labelledby="myDashboardTitle">
      <div class="my-dashboard-heading">
        <span>${ICON.chart}</span>
        <div><h2 id="myDashboardTitle">${tr('my_dashboard_title')}</h2><p>${tr('my_dashboard_hint')}</p></div>
      </div>
      ${renderTeacherHero()}
      ${renderDailyDashboard()}
    </section>
    ${renderTeacherWidgets()}
    ${renderCommandLauncher()}
    ${renderBackupHealthCard()}
    <div class="profile-header">
      <div class="profile-avatar-wrap">
        <div class="profile-avatar" data-style="${p.photo?`background-image:url('${p.photo}')`:''}">${p.photo?'':initials(p.name)}</div>
        <label class="avatar-edit-badge" for="photoInput">${ICON.camera}</label>
        ${p.photo ? `<div class="avatar-remove-badge" data-action="removePhoto()">${ICON.x}</div>` : ''}
        <input type="file" id="photoInput" accept="image/*" data-style="display:none" data-change="handlePhotoSelect(event)">
      </div>
      <h3>${p.name ? escapeHtml(p.name) : tr('title_profile')}</h3>
      <p>${p.subject ? escapeHtml(p.subject) : tr('profile_edit_hint')}</p>
    </div>
    <div class="info-card">
      <div class="info-grid">
        ${p.phone ? `<div class="info-chip">${tr('profile_phone_label')} <b>${escapeHtml(p.phone)}</b></div>` : ''}
        ${p.workplace ? `<div class="info-chip">${tr('profile_workplace_label')} <b>${escapeHtml(p.workplace)}</b></div>` : ''}
      </div>
      <button class="btn btn-outline-dark btn-sm" data-style="width:100%;margin-top:${(p.phone||p.workplace)?'12px':'0'};" data-action="openProfileFormModal()">${tr('btn_edit_profile')}</button>
    </div>
    <div class="info-card" data-style="display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;" data-action="goCalendar()">
      <div data-style="display:flex;align-items:center;gap:12px;">
        <div data-style="width:42px;height:42px;border-radius:12px;background:var(--chalk-gold);color:var(--chalk-gold-ink);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${ICON.calendar}</div>
        <div>
          <div class="row-title">${tr('calendar_card_title')}</div>
          <div class="row-sub">${tr('calendar_card_sub')}</div>
        </div>
      </div>
      <div class="chev">${ICON.chev}</div>
    </div>
    <h2 class="section-title" data-style="color:var(--ink);opacity:.7;">${tr('my_notes_title')}</h2>
    <div class="field">
      <textarea id="note_text" placeholder="${tr('note_ph')}"></textarea>
      <button class="btn btn-gold btn-sm" data-style="width:100%;margin-top:8px;" data-action="addNote()">${tr('btn_add_note')}</button>
    </div>
    ${notes || `<p data-style="font-size:12.5px;color:var(--ink-soft);padding:6px 4px;">${tr('notes_empty')}</p>`}
    <section class="personal-reminders-section">
      <div class="personal-reminders-heading"><div><h2>${tr('personal_reminders_title')}</h2><p>${tr('personal_reminders_hint')}</p></div><button type="button" class="icon-action add" data-action="openPersonalReminderModal('')" aria-label="${escapeAttr(tr('personal_reminder_add'))}">${ICON.plus}</button></div>
      <div class="personal-reminder-list">${renderPersonalReminders()}</div>
      <button type="button" class="btn btn-outline-dark btn-sm" data-style="width:100%;margin-top:10px" data-action="openPersonalReminderModal('')">${ICON.plus} ${tr('personal_reminder_add')}</button>
    </section>
    <div data-style="text-align:center;margin-top:28px;">
      <span class="about-link" data-action="openAboutModal()">${ICON.info} ${tr('about_link')}</span>
    </div>
  `;
}
