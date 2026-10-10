/* ============ utils ============ */
function escapeHtml(str){
  return String(str==null?'':str).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function escapeAttr(str){ return escapeHtml(str); }

const DRAFT_IDS=new Set(['hw_text','reminder_text','note_text']);
function draftKey(id){ return `dk_draft:${id}:${state.classId||state.reminderClassId||'global'}:${state.studentId||''}`; }
function clearDraft(id){ try{ localStorage.removeItem(draftKey(id)); }catch(_){ } }
function encryptedStorageActive(){ return !!(encryptionMeta&&encryptionMeta.enabled); }
function purgePlaintextDrafts(){
  try{
    for(let i=localStorage.length-1;i>=0;i--){
      const key=localStorage.key(i); if(key&&key.startsWith('dk_draft:')) localStorage.removeItem(key);
    }
  }catch(_){ }
}
function restoreDrafts(root){
  if(encryptedStorageActive()){ purgePlaintextDrafts(); return; }
  DRAFT_IDS.forEach(id=>{
    const el=root.querySelector(`#${id}`);
    if(!el) return;
    try{ const value=localStorage.getItem(draftKey(id)); if(value!==null) el.value=value; }catch(_){ }
  });
}
document.addEventListener('input',event=>{
  const el=event.target;
  if(!el||!DRAFT_IDS.has(el.id)) return;
  // Never leave homework, reminder or note text unencrypted while app encryption is enabled.
  if(encryptedStorageActive()){ clearDraft(el.id); return; }
  try{ localStorage.setItem(draftKey(el.id),String(el.value||'').slice(0,20000)); }catch(_){ }
});

function updateConnectionStatus(){
  const el=document.getElementById('connectionStatus');
  if(!el) return;
  el.hidden=data.settings.showConnectionStatus===false;
  const online=navigator.onLine;
  el.classList.toggle('offline',!online);
  el.querySelector('span:last-child').textContent=online?tr('status_online'):tr('status_offline');
}
window.addEventListener('online',updateConnectionStatus);
window.addEventListener('offline',updateConnectionStatus);

/* ============ CSP-safe behaviors ============ */
const SAFE_ACTIONS=new Set([
  'addCustomGrade','addGrade','addNote','addReminder','calDayToEvents','calGShiftMonth','calGoToday','calGoTodayGregorian','calSetTab','calShiftMonth','calSetJalaliYear','calSetGregorianYear',
  'managerStudentPage','studentPageChange','managerLoadWorkbench','managerEditTask','managerSaveTask','managerSaveView','managerConfirmSaveView','managerApplyView','managerDeleteView','managerWeeklyReport','managerOpenClassStatus','managerSaveClassStatus','openAccountSecurity','requestContactCode','confirmContactCode','openPasswordReset','requestPasswordReset','openMfaSetup','prepareMfa','confirmMfa','openManagerSettings','cancelHeavyOperation','closeModal','confirmCloudLogoutAll','confirmDeleteReminder','confirmDeletePersonalReminder','confirmDeleteTextbook','confirmDeleteListening','copyBaleId','copyHomeworkText','copyReminderText','deleteClass','deleteGrade','deleteHomeworkLogEntry','deleteNote','deletePersonalReminder','deleteStudent','deleteStudentTimelineNote',
  'disablePinLock','disableBiometricUnlock','dismissLangHint','downloadTextbook','downloadListeningAudio','dpShiftMonth','enableNotifications','disableNotifications','enablePinLock','openBiometricSetup','enableBiometricUnlock','unlockWithBiometric','exportBackup','goCalendar','gradeFromSpin','handleBack',
  'handlePhotoSelect','importBackup','installClassApp','lockApp','navClick','openAboutModal','openAppearanceModal','openAttHistory','openClass','openClassFormModal','openClassHealthCenter','openClassHealthWork','openClassInfoModal','openClassMenu','openDayPickerModal','openPersonalReminderModal','openStudentTimelineNoteModal',
  'openExamModal','openProfileFormModal','openReminderClass','openReportsModal','openSecurityModal','openSettingsModal','openStorageManager','openStudent','openStudentSettingsModal','openStudentFormModal','openTextbookFile','openTextbookModal','openListeningModal','openListeningPlayer','openTodayWork',
  'protectStoredData','removePhoto','resetClassStudentsData','resetCurrentCustomColors','resetStudentData','restoreLatestAutoBackup','runNineDayAutoBackupNow','saveClassForm','saveCustomColors','saveExamScore','saveHomeworkText',
  'saveHomeworkGradeAmount','savePersonalReminder','saveProfileForm','saveStudentForm','saveStudentTimelineNote','searchClasses','searchStudents','selectReminderDay','selectSeg','setAttendance','setAutoLockMinutes','setButtonTone','setClassTab','setLang','setNineDayAutoBackup','setPalette','setStudentFilter','scrollSettingsTo',
  'setConnectionStatusVisible','setSpinMode','setFontScale','setPhotoCompression','showHomeworkTextModal','smartReminderAction','startSpin','toggleFinalize','toggleHomeworkCheck','toggleHomeworkFinalize','toggleHomeworkGradeEnabled','toggleSpinClass',
  'toggleSpinSkipAbsent','toggleTheme','toggleWeekdayBtn','unlockAttendance','unlockHomeworkChecklist','unlockWithPin','usePresetColors','uploadTextbook','uploadListeningAudio','exportClassExcel','printClassReport','exportStudentExcel','printStudentReport','openListeningNameModal','saveListeningName','toggleListeningFavorite','setListeningRate','skipListening',
  'exportFullZip','exportMediaArchive','triggerFileInput','deleteStoredTextbook','refreshSettingsModal','render','openCloudSyncModal','openCloudSessions','cloudAuthenticate','cloudSyncNow','cloudLogout','cloudLogoutAll','revokeCloudSession','openCloudDeleteAccountModal','cloudDeleteAccount','enableCloudPush','disableCloudPush','resolveCloudConflict'
  ,'chooseAppRole','showRoleGateway','setManagerAuthMode','managerAuthenticate','normalizeManagerPhoneInput','managerRefresh','managerSelectBranch','managerBackToOverview','managerLogout','managerSetSection'
  ,'joinTeacherOrganization','toggleManagerSharing','publishManagerSnapshot','confirmRevokeManagerSnapshot','confirmLeaveTeacherOrganization','leaveTeacherOrganization','managerCreateJoinCode','copyManagerJoinCode','managerOpenTeacher','managerOpenClass','managerOpenStudent','managerDirectoryBack','managerOpenJoinCodeModal','managerRevokeJoinCode','managerOpenBranchModal','managerSaveBranch','managerArchiveBranch','managerOpenStaffModal','managerAddStaff','managerRemoveStaff','managerOpenOperationalMetrics','managerSaveOperationalMetrics','managerLoadSystemHealth','managerApplyDirectorySearch','managerDirectoryPage'
  ,'managerEditProfile','managerSaveProfile','managerSwitchOrganization','managerStaffRoleChanged','managerAddNote','managerSaveNote','managerToggleNote','managerDeleteNote','managerSetCalendarKind','managerCalendarShift','managerCalendarYear'
  ,'openCommandPalette','commandPaletteFilter','commandPaletteSelect','openAttHistoryDay','clearAttHistoryDay','enterClassFromModal','exportFullZipFromHealth','toggleThemeAndReopenAppearance','setLangAndRefresh','switchRoleFromSettings','openManagerSettingsSection'
]);
const INVALID_ACTION_ARG=Symbol('invalid-action-arg');
function splitActionArgs(source){
  const out=[];let cur='',quote='',escape=false;
  for(const ch of source){
    if(escape){cur+=ch;escape=false;continue}
    if(ch==='\\'){cur+=ch;escape=true;continue}
    if(quote){cur+=ch;if(ch===quote)quote='';continue}
    if(ch==="'"||ch==='"'){quote=ch;cur+=ch;continue}
    if(ch===','){out.push(cur.trim());cur='';continue}
    cur+=ch;
  }
  if(cur.trim())out.push(cur.trim());
  return out;
}
function actionValue(token,el,event){
  if(token==='this')return el;if(token==='this.value')return el.value;if(token==='event')return event;
  if(token==='null')return null;if(token==='true')return true;if(token==='false')return false;
  if(/^-?\d+(?:\.\d+)?$/.test(token))return Number(token);
  if((token.startsWith("'")&&token.endsWith("'"))||(token.startsWith('"')&&token.endsWith('"'))){
    const value=token.slice(1,-1).replace(/\\(['"\\])/g,'$1');
    return /^[A-Za-z0-9_.:@+\-]*$/.test(value)?value:INVALID_ACTION_ARG;
  }
  return INVALID_ACTION_ARG;
}
function runSafeAction(code,el,event){
  const statement=String(code||'').trim();
  if(!statement||statement.includes(';')){console.warn('Blocked action',statement);return}
  const m=statement.match(/^([A-Za-z_$][\w$]*)\((.*)\)$/);
  if(!m||!SAFE_ACTIONS.has(m[1])||typeof window[m[1]]!=='function'){console.warn('Blocked action',statement);return}
  const args=splitActionArgs(m[2]).map(v=>actionValue(v,el,event));
  if(args.includes(INVALID_ACTION_ARG)){console.warn('Blocked action arguments',m[1]);return}
  window[m[1]](...args);
}
function applyDataStyles(root=document){
  const nodes=[];
  if(root.nodeType===1&&root.hasAttribute('data-style'))nodes.push(root);
  if(root.querySelectorAll)nodes.push(...root.querySelectorAll('[data-style]'));
  nodes.forEach(el=>{
    const text=el.getAttribute('data-style')||'';
    text.split(';').forEach(part=>{const i=part.indexOf(':');if(i<1)return;const key=part.slice(0,i).trim(),value=part.slice(i+1).trim();if(key&&value)el.style.setProperty(key,value)});
    el.removeAttribute('data-style');
  });
}
document.addEventListener('click',event=>{const el=event.target.closest('[data-action]');if(el)runSafeAction(el.dataset.action,el,event)});
document.addEventListener('change',event=>{const el=event.target.closest('[data-change]');if(el)runSafeAction(el.dataset.change,el,event)});
document.addEventListener('input',event=>{const el=event.target.closest('[data-input-action]');if(el)runSafeAction(el.dataset.inputAction,el,event)});
document.addEventListener('keydown',event=>{const el=event.target.closest('[data-key-action]');if(el&&(event.key==='Enter'||event.key===' ')){event.preventDefault();runSafeAction(el.dataset.keyAction,el,event)}});
new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(applyDataStyles))).observe(document.documentElement,{subtree:true,childList:true});
applyDataStyles(document);
window.addEventListener('error',event=>recordLocalError('window_error',event.error||new Error('window_error')));
window.addEventListener('unhandledrejection',event=>recordLocalError('promise_rejection',event.reason instanceof Error?event.reason:new Error('promise_rejection')));

/* ============ init ============ */
(async function init(){
  await recoverInterruptedSecurityMigration();
  await loadData();
  if(ensureDefaultPersonalBackupReminder())await saveData({throwOnError:true});
  else await runScheduledAutoBackup();
  if(typeof initCloudSync==='function')await initCloudSync();
  if(typeof initManagerPortal==='function')await initManagerPortal();
  const shortcut=new URLSearchParams(location.search).get('screen');
  if(['home','reminders','spin','profile'].includes(shortcut))state.screen=shortcut;
  if(shortcut&&history.replaceState)history.replaceState(null,'',location.pathname+location.hash);
  initSwipeNav();
  updateConnectionStatus();
  if(appLockEnabled()){ applyTheme();await lockApp(); }
  else render();
  setTimeout(()=>{if(data.settings.appRole==='teacher'&&typeof checkPersonalReminderNotifications==='function')checkPersonalReminderNotifications()},1200);
})();
