/* Contact syntax validation. This does not verify ownership. */
function normalizeIranMobile(value){return String(value??'').trim().replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))}
function isValidIranMobile(value){return typeof value==='string'&&/^09[0-9]{9}$/.test(value)}
function isValidContactEmail(value){
  if(typeof value!=='string'||value.length>254||/\s/.test(value))return false;
  const parts=value.split('@');if(parts.length!==2)return false;
  const [local,domain]=parts;
  if(!local||local.length>64||local.startsWith('.')||local.endsWith('.')||local.includes('..')||! /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local))return false;
  const labels=domain.split('.');
  return labels.length>=2&&labels.every(label=>/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label))&&/^(?:[a-zA-Z]{2,63}|xn--[a-zA-Z0-9-]{2,59})$/.test(labels.at(-1));
}
