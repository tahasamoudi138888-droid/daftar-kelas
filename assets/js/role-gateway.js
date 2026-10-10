function setTeacherChrome(visible){
  ['topbar','bottomnav','fabBtn','classAlertBadge'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=!visible});
  const shell=document.getElementById('shell');if(shell)shell.classList.toggle('portal-shell',!visible);
}
function renderRoleGateway(){
  document.title=tr('role_welcome');applyLocale();applyTheme();setTeacherChrome(false);
  const app=document.getElementById('app');
  app.innerHTML=`<section class="role-gateway screen-fade" aria-labelledby="role-title">
    <div class="role-brand" aria-hidden="true"><img src="icon-192.png" alt="" width="82" height="82"></div>
    <div class="role-heading"><span class="role-kicker">CLASS NOTEBOOK</span><h1 id="role-title">${tr('role_welcome')}</h1><p>${tr('role_welcome_hint')}</p></div>
    <div class="role-options">
      <button type="button" class="role-card teacher-role" data-action="chooseAppRole('teacher')"><span class="role-icon">${ICON.user}</span><span class="role-copy"><b>${tr('role_teacher')}</b><small>${tr('role_teacher_hint')}</small><em>${tr('role_teacher_action')} ${ICON.chev}</em></span></button>
      <button type="button" class="role-card manager-role" data-action="chooseAppRole('manager')"><span class="role-icon">${ICON.chart}</span><span class="role-copy"><b>${tr('role_manager')}</b><small>${tr('role_manager_hint')}</small><em>${tr('role_manager_action')} ${ICON.chev}</em></span></button>
    </div>
    <div class="role-privacy">${ICON.shield}<span>${tr('role_privacy')}</span></div>
  </section>`;
  enhanceAccessibility(app);window.scrollTo(0,0);
}
async function chooseAppRole(role){
  if(!['teacher','manager'].includes(role))return;
  closeModal();
  managerState.authAttempt=(managerState.authAttempt||0)+1;
  data.settings.appRole=role;await saveData({throwOnError:true});
  if(role==='manager'){managerState.view=managerToken?'dashboard':'auth';managerState.error=''}else state.screen='home';
  render();
}
async function showRoleGateway(){
  closeModal();
  managerState.authAttempt=(managerState.authAttempt||0)+1;
  managerState.authBusy=false;
  // Switching workspaces keeps the authenticated session; it is not a logout.

  data.settings.appRole='';await saveData({throwOnError:true});render();
}
