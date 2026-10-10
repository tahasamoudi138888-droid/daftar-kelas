const MANAGER_CONFIG_KEY='dk_manager_config_v1';
let managerConfig={apiUrl:'',email:'',phone:'',displayName:'',personalNotes:[]};
let managerToken='';
const managerState={view:'auth',authMode:'login',section:'overview',loading:false,error:'',summary:null,branchId:''};

async function initManagerPortal(){
  try{managerConfig=Object.assign(managerConfig,JSON.parse((await storageGet(MANAGER_CONFIG_KEY))||'null')||{})}catch(_){ }
  try{managerToken=sessionStorage.getItem('dk_manager_token')||''}catch(_){ }
  if(managerToken)managerState.view='dashboard';
}
async function managerPersistConfig(){const personalNotes=(Array.isArray(managerConfig.personalNotes)?managerConfig.personalNotes:[]).slice(-100).map(n=>({id:String(n.id||'').slice(0,80),text:String(n.text||'').trim().slice(0,500),done:Boolean(n.done),due:/^\d{4}-\d{2}-\d{2}$/.test(String(n.due||''))?String(n.due):''})).filter(n=>n.id&&n.text);await storageSet(MANAGER_CONFIG_KEY,JSON.stringify({apiUrl:managerConfig.apiUrl,email:managerConfig.email,phone:managerConfig.phone,displayName:String(managerConfig.displayName||'').slice(0,150),personalNotes}))}
async function managerRequest(path,options={}){
  if(!managerConfig.apiUrl)throw new Error('server_required');
  const headers=Object.assign({'Content-Type':'application/json'},options.headers||{});if(managerToken)headers.Authorization=`Bearer ${managerToken}`;
  const started=Date.now();
  try{const payload=await apiJsonRequest(`${managerConfig.apiUrl}${path}`,{...options,headers});managerState.network={lastOkAt:Date.now(),durationMs:Date.now()-started};return payload}
  catch(error){managerState.network={...(managerState.network||{}),failedAt:Date.now()};throw error}
}
function renderManagerPortal(){
  document.title=tr('manager_dashboard');applyLocale();applyTheme();setTeacherChrome(false);
  if(managerState.view==='auth'||!managerToken)return renderManagerAuth();
  renderManagerDashboard();if(!managerState.summary&&!managerState.loading)managerRefresh();
}
function renderManagerAuth(){
  const register=managerState.authMode==='register',app=document.getElementById('app');
  app.innerHTML=`<section class="manager-auth screen-fade"><button type="button" class="portal-back" data-action="showRoleGateway()">${ICON.back}<span>${tr('manager_back')}</span></button>
    <div class="manager-auth-card"><div class="manager-mark">${ICON.chart}</div><span class="manager-badge">${tr('manager_aggregate_badge')}</span><h1>${tr('manager_signin')}</h1><p>${tr('manager_signin_hint')}</p>
      <div class="manager-auth-tabs" role="tablist"><button type="button" class="${!register?'active':''}" data-action="setManagerAuthMode('login')">${tr('manager_login')}</button><button type="button" class="${register?'active':''}" data-action="setManagerAuthMode('register')">${tr('manager_register')}</button></div>
      <div class="field"><label for="managerPhone">${tr('manager_phone')}</label><input id="managerPhone" type="tel" dir="ltr" inputmode="numeric" autocomplete="tel-national" required minlength="11" maxlength="11" pattern="09[0-9]{9}" placeholder="09123456789" value="${escapeAttr(managerConfig.phone||'')}" aria-describedby="managerPhoneHint" data-input-action="normalizeManagerPhoneInput(this)"><small id="managerPhoneHint">${tr('manager_phone_hint')}</small></div>
      ${register?`<div class="manager-form-grid"><div class="field"><label for="managerOrgName">${tr('manager_org_name')}</label><input id="managerOrgName" maxlength="120"></div></div>`:''}
      <div class="field"><label for="managerEmail">${tr('manager_email')}</label><input id="managerEmail" type="email" dir="ltr" required maxlength="254" autocomplete="username" value="${escapeAttr(managerConfig.email)}"></div>
      <div class="field"><label for="managerPassword">${tr('manager_password')}</label><input id="managerPassword" type="password" dir="ltr" minlength="10" maxlength="128" autocomplete="${register?'new-password':'current-password'}" data-key-action="managerAuthenticate('${register?'register':'login'}')"></div>
      ${managerState.mfaRequired?`<div class="field"><label>${tr('account_code')}</label><input id="managerMfaCode" dir="ltr" autocomplete="one-time-code" maxlength="30"></div>`:''}
      <div id="managerAuthError" class="manager-error manager-auth-error" role="alert" ${managerState.error?'':'hidden'}>${ICON.info}<span>${escapeHtml(managerState.error||'')}</span></div>
      <button type="button" class="btn btn-gold manager-submit" data-action="managerAuthenticate('${register?'register':'login'}')">${register?tr('manager_register'):tr('manager_login')}</button>
      ${!register?`<button class="btn btn-outline-dark" data-action="openPasswordReset()">${tr('account_reset_title')}</button>`:''}
      <details class="manager-security-note"><summary>${tr('account_security')}</summary>${ICON.shield}<span>${tr('manager_contact_note')} ${tr('manager_data_protection')}</span></details>
    </div></section>`;
  enhanceAccessibility(app);window.scrollTo(0,0);
}
function setManagerAuthMode(mode){if(managerState.authBusy)return;managerState.authMode=mode==='register'?'register':'login';managerState.error='';renderManagerPortal()}
function normalizeManagerPhoneInput(input){input.value=normalizeIranMobile(input.value);input.setCustomValidity('');input.removeAttribute('aria-invalid')}
function managerAuthFieldError(input,key){
  const message=tr(key);managerState.error=message;
  const alert=document.getElementById('managerAuthError');if(alert){alert.hidden=false;alert.querySelector('span').textContent=message}
  if(input){input.setAttribute('aria-invalid','true');input.setCustomValidity(message);input.reportValidity();input.focus()}
  return null;
}
function managerAuthFields(mode){
  const phoneInput=document.getElementById('managerPhone'),emailInput=document.getElementById('managerEmail'),passwordInput=document.getElementById('managerPassword');
  [phoneInput,emailInput,passwordInput].forEach(input=>{input.setCustomValidity('');input.removeAttribute('aria-invalid')});
  const phone=normalizeIranMobile(phoneInput.value),email=emailInput.value.trim().toLowerCase(),password=passwordInput.value;
  phoneInput.value=phone;emailInput.value=email;
  if(!isValidIranMobile(phone))return managerAuthFieldError(phoneInput,'manager_phone_invalid');
  if(!isValidContactEmail(email))return managerAuthFieldError(emailInput,'manager_email_invalid');
  if(password.length<10||password.length>128)return managerAuthFieldError(passwordInput,'manager_password_invalid');
  const body={phone,email,password,role:'manager',deviceId:cloudConfig.deviceId,deviceName:(navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||'Manager web app'};
  if(mode==='register'){
    const org=document.getElementById('managerOrgName');org.setCustomValidity('');org.removeAttribute('aria-invalid');body.organizationName=String(org.value||'').trim();
    if(!body.organizationName||body.organizationName.length>120)return managerAuthFieldError(org,'manager_org_invalid');
  }
  const mfa=document.getElementById('managerMfaCode');if(mfa)body.mfaCode=normalizeDigits(mfa.value).trim();
  return body;
}
function managerBackendUrl(){
  const configured=document.querySelector('meta[name="app-api-origin"]')?.content?.trim();
  if(configured)return normalizedCloudUrl(configured);
  if(location.protocol==='https:'||(location.protocol==='http:'&&['localhost','127.0.0.1'].includes(location.hostname)))return normalizedCloudUrl(location.origin);
  const previous=managerConfig.apiUrl||cloudConfig.apiUrl;
  if(previous)return normalizedCloudUrl(previous);
  throw new Error('manager_backend_unconfigured');
}
async function managerAuthenticate(mode){
  if(!['login','register'].includes(mode)||managerState.authBusy)return;
  const body=managerAuthFields(mode);if(!body)return;
  const alert=document.getElementById('managerAuthError');if(alert)alert.hidden=true;
  const attempt=managerState.authAttempt=(managerState.authAttempt||0)+1;
  const submit=document.querySelector('.manager-submit');if(submit)submit.disabled=true;managerState.error='';managerState.authBusy=true;
  try{
    managerConfig.apiUrl=managerBackendUrl();managerConfig.email=body.email;managerConfig.phone=body.phone;
    const result=await managerRequest(`/api/v1/auth/${mode}`,{method:'POST',body:JSON.stringify(body)});
    if(data.settings.appRole!=='manager'||attempt!==managerState.authAttempt)return;
    if(result.role!=='manager')throw new Error('role_mismatch');
    managerToken=result.token;try{sessionStorage.setItem('dk_manager_token',managerToken)}catch(_){ }
    await managerPersistConfig();managerState.view='dashboard';managerState.summary=null;managerState.error='';managerState.workbench=null;renderManagerPortal();
    if(mode==='register')toast(tr('manager_registered'));
  }catch(error){
    if(data.settings.appRole!=='manager'||attempt!==managerState.authAttempt)return;
    if(error.message==='mfa_required'){managerState.mfaRequired=true;renderManagerAuth();return}
    const key=error.message==='role_mismatch'?'manager_role_mismatch':error.message==='manager_backend_unconfigured'?'manager_backend_unconfigured':error.status===409?'manager_account_exists':'manager_auth_failed';
    managerAuthFieldError(null,key);
  }finally{if(attempt===managerState.authAttempt){managerState.authBusy=false;if(submit)submit.disabled=false}}
}

function managerMetric(icon,label,value,tone=''){return `<article class="manager-metric ${tone}"><span>${icon}</span><div><b>${value==null?tr('manager_not_reported'):formatLocaleNumber(value)}</b><small>${label}</small></div></article>`}
function formatLocaleNumber(value){if(value==null)return tr('manager_not_reported');const num=Number(value);return Number.isFinite(num)?num.toLocaleString(data.settings.lang==='fa'?'fa-IR':undefined):escapeHtml(String(value||'—'))}
function renderManagerBranchCards(branches){if(!branches.length)return `<div class="manager-empty mini">${ICON.folder}<p>${tr('manager_no_branches')}</p></div>`;return `<div class="manager-branch-grid">${branches.map(b=>`<button type="button" class="manager-branch-card" data-action="managerSelectBranch('${b.id}')"><span class="branch-art">${ICON.folder}</span><div><b>${escapeHtml(b.name)}</b><small>${formatLocaleNumber(b.class_count)} ${tr('manager_classes')} · ${formatLocaleNumber(b.student_count)} ${tr('manager_students')}</small><div><span>${tr('manager_attendance')}: ${b.attendance_rate==null?'—':`${formatLocaleNumber(b.attendance_rate)}٪`}</span><span>${tr('manager_satisfaction')}: ${b.satisfaction==null?'—':`${formatLocaleNumber(b.satisfaction)}/۵`}</span></div></div>${ICON.chev}</button>`).join('')}</div>`}
function managerSelectBranch(id){managerState.branchId=id;renderManagerPortal()}
function managerBackToOverview(){managerState.branchId='';managerState.section='branches';renderManagerPortal()}
async function managerLogout(){try{if(managerToken)await managerRequest('/api/v1/auth/logout',{method:'POST',body:'{}'})}catch(_){ }managerToken='';try{sessionStorage.removeItem('dk_manager_token')}catch(_){ }managerState.view='auth';managerState.summary=null;managerState.error='';managerState.network=null;managerState.directory={teachers:[],classes:[]};managerState.classDirectory={classes:[],page:1,pages:1,total:0};managerState.teacherId='';managerState.classId='';managerState.studentId='';managerState.branchId='';managerState.teacherDetail=null;managerState.staff=[];managerState.joinCodes=[];managerState.systemHealth=null;renderManagerPortal()}
