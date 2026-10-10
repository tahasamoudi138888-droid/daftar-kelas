/* Shared bounded transport. Only safe GETs may retry; writes never replay automatically. */
async function apiJsonRequest(url,options={}){
  const {timeoutMs=20000,...requestOptions}=options,method=String(options.method||'GET').toUpperCase(),attempts=method==='GET'?2:1;
  for(let attempt=0;attempt<attempts;attempt++){
    const controller=new AbortController(),external=options.signal,onAbort=()=>controller.abort(external.reason);
    if(external?.aborted)onAbort();else external?.addEventListener('abort',onAbort,{once:true});
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url,{...requestOptions,signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error'});
      let body;try{body=await response.json()}catch{const error=new Error('invalid_server_response');error.status=response.status;throw error}
      if(!response.ok){const error=new Error(body?.error||`http_${response.status}`);error.status=response.status;error.body=body;error.requestId=response.headers.get('X-Request-Id')||body?.requestId||'';error.retryAfter=Number(response.headers.get('Retry-After')||0);throw error}
      return body;
    }catch(error){
      if(external?.aborted)throw error;
      if(controller.signal.aborted){const timedOut=new Error('request_timeout');timedOut.status=408;throw timedOut}
      if(attempt+1<attempts&&!error.retryAfter&&(error instanceof TypeError||[502,503,504].includes(error.status)))continue;
      throw error;
    }finally{clearTimeout(timer);external?.removeEventListener('abort',onAbort)}
  }
}
function renderManagerConnectionBar(){
  const network=managerState.network||{},offline=navigator.onLine===false,tone=offline||managerState.error?'warning':managerState.loading?'loading':'ready';
  const label=offline?'api_offline':managerState.error?'api_stale':managerState.loading?'api_refreshing':'api_connected';
  const meta=network.lastOkAt?new Date(network.lastOkAt).toLocaleTimeString(data.settings.lang==='fa'?'fa-IR':undefined,{hour:'2-digit',minute:'2-digit'}):'—';
  return `<aside class="api-connection-bar ${tone}" role="status"><span class="api-signal">${tone==='ready'?ICON.shield:ICON.info}</span><div><b>${tr(label)}</b><small>${tr('api_last_check').replace('{time}',escapeHtml(meta))}</small></div><button type="button" ${managerState.loading?'disabled':''} data-action="managerRefresh()" aria-label="${escapeAttr(tr('manager_retry'))}">${ICON.refresh}</button></aside>`;
}
