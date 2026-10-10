/* Teacher-controlled report shared with the manager. Private notes, media, phone and PIN are excluded. */
function managerGradeValue(grade){if(grade.value==='plus')return 1;if(grade.value==='minus')return-1;if(grade.value==='custom')return Number(grade.amount)||0;return 0}
function managerSnapshotData(){
  const today=tehranNow().iso;
  return {schemaVersion:1,today,teacher:{name:String(data.profile.name||'').trim()},classes:(data.classes||[]).map(c=>({
    id:c.id,name:c.name,days:c.info&&c.info.days||[],startTime:c.info&&c.info.startTime||'',durationMinutes:c.info?.durationMinutes||90,students:(c.students||[]).map(s=>{
      const attendance=Object.keys(c.attendance||{}).sort().slice(-180).map(iso=>({iso,status:c.attendance[iso]&&c.attendance[iso].records&&c.attendance[iso].records[s.id]||'',finalized:Boolean(c.attendance[iso]&&c.attendance[iso].finalized)})).filter(x=>x.status);
      const homework=Object.keys(c.homework||{}).sort().slice(-120).map(iso=>{const rec=c.homework[iso]||{},linked=rec.homeworkGrades&&rec.homeworkGrades[s.id];return {iso,text:rec.text||'',done:Boolean(rec.checks&&rec.checks[s.id]),finalized:Boolean(rec.finalized),grade:linked&&Number(linked.amount)}});
      return {id:s.id,name:s.name,institutionStudentId:s.institutionStudentId||'',total:(s.grades||[]).reduce((sum,g)=>sum+managerGradeValue(g),0),exams:{midterm:s.midterm,oral:s.oral,final:s.final},grades:(s.grades||[]).map(g=>({id:g.id,value:g.value,amount:g.amount,iso:g.iso,time:g.time,note:g.note||''})),examHistory:s.examHistory||[],attendance,homework};
    })
  }))};
}
async function refreshTeacherOrganization(rerender=true){
  if(!cloudToken)return;
  try{const result=await cloudRequest('/api/v1/organization/membership');cloudConfig.managerMembership=result.membership||null;if(!cloudConfig.managerMembership)cloudConfig.managerSharing=false;await persistCloudConfig();if(rerender)openCloudSyncModal()}catch(_){ }
}
function renderTeacherManagerSharing(){
  const m=cloudConfig.managerMembership;
  if(!m)return `<section class="teacher-manager-share"><div class="share-heading">${ICON.users||ICON.user}<div><b>${tr('manager_share_title')}</b><span>${tr('manager_share_join_hint')}</span></div></div><div class="field"><label for="managerTeacherName">${tr('manager_share_teacher_name')}</label><input id="managerTeacherName" maxlength="150" value="${escapeAttr(data.profile.name||'')}"></div><div class="field"><label for="managerJoinCode">${tr('manager_share_code')}</label><input id="managerJoinCode" dir="ltr" maxlength="16" autocomplete="one-time-code" placeholder="AB12CD34"></div><button type="button" class="btn btn-outline-dark" data-action="joinTeacherOrganization()">${tr('manager_share_join')}</button></section>`;
  return `<section class="teacher-manager-share joined"><div class="share-heading">${ICON.shield}<div><b>${escapeHtml(m.organization_name)}</b><span>${escapeHtml(m.branch_name||'')} · ${tr('manager_share_connected')}</span></div><span class="share-state ${cloudConfig.managerSharing?'on':'off'}">${cloudConfig.managerSharing?tr('toggle_on'):tr('toggle_off')}</span></div><p>${tr('manager_share_scope')}</p>${cloudConfig.managerLastSharedAt?`<small>${tr('manager_share_last').replace('{date}',new Date(cloudConfig.managerLastSharedAt).toLocaleString())}</small>`:''}<div class="share-actions"><button type="button" class="btn btn-gold btn-sm" data-action="publishManagerSnapshot(true)">${tr('manager_share_now')}</button><button type="button" class="btn btn-outline-dark btn-sm" data-action="toggleManagerSharing(${cloudConfig.managerSharing?'false':'true'})">${cloudConfig.managerSharing?tr('manager_share_pause'):tr('manager_share_enable')}</button><button type="button" class="btn btn-outline-dark btn-sm" data-action="confirmRevokeManagerSnapshot()">${tr('manager_share_revoke')}</button><button type="button" class="icon-action danger" data-action="confirmLeaveTeacherOrganization()" aria-label="${escapeAttr(tr('manager_share_leave'))}">${ICON.x}</button></div></section>`;
}
async function joinTeacherOrganization(){
  const code=String(document.getElementById('managerJoinCode')?.value||'').trim(),displayName=String(document.getElementById('managerTeacherName')?.value||data.profile.name||'').trim();
  if(code.length<6||!displayName){toast(tr('manager_share_join_invalid'));return}
  try{cloudConfig.managerMembership=await cloudRequest('/api/v1/organization/join',{method:'POST',body:JSON.stringify({code,displayName})});cloudConfig.managerSharing=true;data.profile.name=data.profile.name||displayName;await saveData({throwOnError:true});await persistCloudConfig();await publishManagerSnapshot(false);openCloudSyncModal();toast(tr('manager_share_joined'))}catch(error){toast(error.message==='join_code_invalid'?tr('manager_share_code_invalid'):tr('manager_share_failed'))}
}
async function toggleManagerSharing(enabled){cloudConfig.managerSharing=Boolean(enabled);await persistCloudConfig();if(enabled)await publishManagerSnapshot(false);openCloudSyncModal();toast(tr(enabled?'manager_share_enabled':'manager_share_paused'))}
async function publishManagerSnapshot(showResult=true){
  if(!cloudToken||!cloudConfig.managerMembership||!cloudConfig.managerSharing){if(showResult)toast(tr('manager_share_not_ready'));return}
  try{const result=await cloudRequest('/api/v1/teacher/manager-snapshot',{method:'PUT',body:JSON.stringify({snapshot:managerSnapshotData()})});cloudConfig.managerLastSharedAt=result.updatedAt||new Date().toISOString();await persistCloudConfig();if(showResult){openCloudSyncModal();toast(tr('manager_share_done'))}}catch(error){console.warn('Manager report failed',error);if(showResult)toast(tr('manager_share_failed'))}
}
function confirmLeaveTeacherOrganization(){confirmModal(tr('manager_share_leave'),tr('manager_share_leave_confirm'),leaveTeacherOrganization)}
async function leaveTeacherOrganization(){try{await cloudRequest('/api/v1/organization/membership',{method:'DELETE'});cloudConfig.managerMembership=null;cloudConfig.managerSharing=false;cloudConfig.managerLastSharedAt=null;await persistCloudConfig();openCloudSyncModal();toast(tr('manager_share_left'))}catch(_){toast(tr('manager_share_failed'))}}

function confirmRevokeManagerSnapshot(){confirmModal(tr('manager_share_revoke'),tr('manager_share_revoke_confirm'),revokeManagerSnapshot)}
async function revokeManagerSnapshot(){try{await cloudRequest('/api/v1/teacher/manager-snapshot',{method:'DELETE'});cloudConfig.managerSharing=false;cloudConfig.managerLastSharedAt=null;await persistCloudConfig();openCloudSyncModal();toast(tr('manager_share_revoked'))}catch(_){toast(tr('manager_share_failed'))}}
