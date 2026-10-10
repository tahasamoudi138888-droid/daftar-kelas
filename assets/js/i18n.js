/* ============ icons ============ */
const ICON = {
  refresh:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7v5h-5"/><path d="M18.2 16.4A8 8 0 1 1 19.7 9L20 12"/></svg>`,
  clock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  back:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>`,
  dots:`<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`,
  plus:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  chev:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" transform="rotate(180 12 12)"/></svg>`,
  home:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.7 12 3.8l8.5 6.9"/><path d="M5.7 9.7v9.5a1.3 1.3 0 0 0 1.3 1.3h10a1.3 1.3 0 0 0 1.3-1.3V9.7"/><path d="M9.2 20.5v-6.2h5.6v6.2"/></svg>`,
  dice:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="8" cy="8" r="1.25" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1.25" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none"/><path d="M16 7.95h.01M8 16.05h.01"/></svg>`,
  user:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.7"/><path d="M4.6 20c.7-4 3.5-6.1 7.4-6.1s6.7 2.1 7.4 6.1"/><path d="M8.4 15.1c1 .8 2.2 1.2 3.6 1.2s2.6-.4 3.6-1.2" opacity=".55"/></svg>`,
  check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>`,
  x:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  trash:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>`,
  edit:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4M4 20h16"/></svg>`,
  folder:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>`,
  lock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>`,
  calendar:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`,
  camera:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13.5" r="3.2"/></svg>`,
  bell:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6.1 9.4a5.9 5.9 0 0 1 11.8 0c0 4.7 2 5.8 2 5.8H4.1s2-1.1 2-5.8Z"/><path d="M9.7 19a2.5 2.5 0 0 0 4.6 0M10 3.8a2.7 2.7 0 0 1 4 0"/></svg>`,
  info:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r="1" fill="currentColor" stroke="none"/></svg>`,
  sun:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8"/></svg>`,
  moon:`<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.5 14.5a8.5 8.5 0 01-11-11 8.5 8.5 0 1011 11z"/></svg>`,
  copy:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1"/></svg>`,
  download:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>`,
  upload:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8M7 13l5-5 5 5"/><path d="M4 19h16"/></svg>`,
  search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>`,
  book:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 5.8A2.8 2.8 0 0 1 6.3 3H10a3 3 0 0 1 3 3v14.8a3.5 3.5 0 0 0-3-1.7H3.5Z"/><path d="M20.5 5.8A2.8 2.8 0 0 0 17.7 3H14v17.8a3.5 3.5 0 0 1 3-1.7h3.5Z"/><path d="M7 7h2.5M16.5 7H18" opacity=".55"/></svg>`,
  audio:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17.8V6.4L19 4v11.7"/><path d="m9 9.2 10-2.4" opacity=".55"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>`,
  gear:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V19.5a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H4.5a2 2 0 010-4h.09A1.65 1.65 0 006.1 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06A2 2 0 118.54 3.9l.06.06a1.65 1.65 0 001.82.33H10.5a1.65 1.65 0 001-1.51V4.5a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V10.5a1.65 1.65 0 001.51 1H19.5a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  brush:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m13.7 5.1 5.2 5.2-8.5 8.5H5.2v-5.2Z"/><path d="m12.1 6.7 5.2 5.2M4 21h8"/><path d="M18.7 3.2v2.2M21 5.4h-2.3" opacity=".65"/></svg>`,
  sparkle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8c.7 4.6 2.6 6.5 7.2 7.2-4.6.7-6.5 2.6-7.2 7.2-.7-4.6-2.6-6.5-7.2-7.2 4.6-.7 6.5-2.6 7.2-7.2Z"/><path d="M19.2 16.2c.25 1.8 1 2.55 2.8 2.8-1.8.25-2.55 1-2.8 2.8-.25-1.8-1-2.55-2.8-2.8 1.8-.25 2.55-1 2.8-2.8Z"/></svg>`,
  star:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/></svg>`,
  starFilled:`<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/></svg>`,
  plusCircle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>`,
  minusCircle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>`,
  neutralCircle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>`,
  rewind:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8 4 12l5 4V8Z"/><path d="M20 8.5a7 7 0 1 0 0 7"/><path d="M20 5v3.5h-3.5"/></svg>`,
  forward:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m15 8 5 4-5 4V8Z"/><path d="M4 8.5a7 7 0 1 1 0 7"/><path d="M4 5v3.5h3.5"/></svg>`,
  image:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m4.5 17 4.7-4.7 3.2 3.2 2.2-2.2 4.9 4.7"/></svg>`,
  sliders:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h7M15 7h5M4 17h4M12 17h8"/><circle cx="13" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>`,
  chart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16"/><path d="m7 15 3-4 3 2 5-6"/><circle cx="18" cy="7" r="1" fill="currentColor"/></svg>`,
  shield:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 20 6v5c0 5.1-3.2 8.4-8 10-4.8-1.6-8-4.9-8-10V6Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>`,
};

const GENDER_COLORS = { boys:'#5b8fd6', girls:'#e2789e', other:'#7fb2c9' };
const GENDER_LABEL_KEYS = { boys:'gender_boys', girls:'gender_girls', other:'gender_other' };
const EXAM_LABEL_KEYS = { midterm:'exam_midterm', oral:'exam_oral', final:'exam_final' };
function genderLabel(g){ return g ? tr(GENDER_LABEL_KEYS[g] || g) : ''; }
function examLabel(k){ return tr(EXAM_LABEL_KEYS[k] || k); }

/* ============ i18n (language: Persian / English — dates & times always stay Persian/Tehran) ============ */
const WEEKDAY_EN = {'شنبه':'Saturday','یکشنبه':'Sunday','دوشنبه':'Monday','سه‌شنبه':'Tuesday','چهارشنبه':'Wednesday','پنجشنبه':'Thursday','جمعه':'Friday'};
const WEEKDAY_FR = {'شنبه':'Samedi','یکشنبه':'Dimanche','دوشنبه':'Lundi','سه‌شنبه':'Mardi','چهارشنبه':'Mercredi','پنجشنبه':'Jeudi','جمعه':'Vendredi'};
const WEEKDAY_TR = {'شنبه':'Cumartesi','یکشنبه':'Pazar','دوشنبه':'Pazartesi','سه‌شنبه':'Salı','چهارشنبه':'Çarşamba','پنجشنبه':'Perşembe','جمعه':'Cuma'};
const WEEKDAY_IT = {'شنبه':'Sabato','یکشنبه':'Domenica','دوشنبه':'Lunedì','سه‌شنبه':'Martedì','چهارشنبه':'Mercoledì','پنجشنبه':'Giovedì','جمعه':'Venerdì'};
const WEEKDAY_ZH = {'شنبه':'星期六','یکشنبه':'星期日','دوشنبه':'星期一','سه‌شنبه':'星期二','چهارشنبه':'星期三','پنجشنبه':'星期四','جمعه':'星期五'};
function dayLabel(d){
  const lang = (data.settings && data.settings.lang) || 'fa';
  if (lang==='en') return WEEKDAY_EN[d]||d;
  if (lang==='fr') return WEEKDAY_FR[d]||d;
  if (lang==='tr') return WEEKDAY_TR[d]||d;
  if (lang==='it') return WEEKDAY_IT[d]||d;
  if (lang==='zh') return WEEKDAY_ZH[d]||d;
  return d;
}
const WEEKDAY_HEAD = {
  fa: ['ش','ی','د','س','چ','پ','ج'],
  en: ['S','S','M','T','W','T','F'],
  fr: ['S','D','L','M','M','J','V'],
  tr: ['C','P','P','S','Ç','P','C'],
  it: ['S','D','L','M','M','G','V'],
  zh: ['六','日','一','二','三','四','五']
};
function weekdayHeaderLabels(){
  const lang = (data.settings && data.settings.lang) || 'fa';
  return WEEKDAY_HEAD[lang] || WEEKDAY_HEAD.fa;
}
function formatDaysFull(days){
  if (!days || !days.length) return '';
  return days.map(dayLabel).join(tr('day_sep'));
}
function tr(key){
  const lang = (data.settings && data.settings.lang) || 'fa';
  const dict = I18N[lang] || I18N.fa;
  return (key in dict) ? dict[key] : (I18N.fa[key] || key);
}
function setLang(lang){
  data.settings.lang = lang;
  if(encryptionMeta){encryptionMeta.lang=lang;persistEncryptionMeta().catch(()=>{});}
  saveData();
  render();
}
function toggleTheme(){
  data.settings.theme = (data.settings.theme==='dark') ? 'light' : 'dark';
  saveData();
  applyTheme();
  render();
}
const CUSTOM_COLOR_FIELDS=[
  ['board','--board','color_board'],['board2','--board-2','color_board2'],
  ['paper','--paper','color_paper'],['paper2','--paper-2','color_paper2'],
  ['boardLine','--board-line','color_border'],['fieldBg','--field-bg','color_field'],
  ['slate','--slate','color_header'],['slate2','--slate-2','color_nav'],['topbarText','--topbar-text','color_header_text'],
  ['ink','--ink','color_text'],['inkSoft','--ink-soft','color_muted_text'],
  ['actionColor','--action-color','color_primary'],['mint','--mint','color_positive'],
  ['coral','--coral','color_negative'],['sky','--sky','color_accent']
];
function validHexColor(value){ return /^#[0-9a-f]{6}$/i.test(String(value||'')); }
function hexRgb(value){ const h=String(value).slice(1); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
function readableInk(bg){
  const [r,g,b]=hexRgb(bg).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});
  const lum=.2126*r+.7152*g+.0722*b;
  return (1.05/(lum+.05))>=((lum+.05)/.05)?'#ffffff':'#111111';
}
function relativeLuminance(hex){
  const [r,g,b]=hexRgb(hex).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});
  return .2126*r+.7152*g+.0722*b;
}
function contrastRatio(a,b){const x=relativeLuminance(a),y=relativeLuminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function bestReadableFor(text,backgrounds,target=4.5){
  if(validHexColor(text)&&backgrounds.every(bg=>validHexColor(bg)&&contrastRatio(text,bg)>=target))return text;
  const choices=['#111111','#ffffff'];
  return choices.sort((a,b)=>Math.min(...backgrounds.map(bg=>contrastRatio(b,bg)))-Math.min(...backgrounds.map(bg=>contrastRatio(a,bg))))[0];
}
function enforceCustomContrast(colors){
  let corrected=0;
  const fix=(key,bgKeys,target)=>{
    let bgs=bgKeys.map(k=>colors[k]),next=bestReadableFor(colors[key],bgs,target);
    if(Math.min(...bgs.map(bg=>contrastRatio(next,bg)))<target){colors[bgKeys[1]]=colors[bgKeys[0]];bgs=bgKeys.map(k=>colors[k]);next=bestReadableFor(colors[key],bgs,target);corrected++}
    if(colors[key]!==next){colors[key]=next;corrected++}
  };
  fix('ink',['paper','board'],4.5);
  fix('inkSoft',['paper','board'],4.5);
  fix('topbarText',['slate','slate2'],4.5);
  return corrected;
}
function clearCustomColorProperties(){
  const style=document.documentElement.style;
  CUSTOM_COLOR_FIELDS.forEach(([,cssVar])=>style.removeProperty(cssVar));
  ['--action-ink','--mint-ink','--coral-ink','--ink-rgb','--days-color','--shadow'].forEach(v=>style.removeProperty(v));
}
function applyCustomColors(theme){
  clearCustomColorProperties();
  const cfg=data.settings&&data.settings.customColors;
  const colors=cfg&&cfg.enabled&&cfg[theme];
  if(!colors||typeof colors!=='object'||!Object.keys(colors).length) return;
  const style=document.documentElement.style;
  CUSTOM_COLOR_FIELDS.forEach(([key,cssVar])=>{
    if(!validHexColor(colors[key])) return;
    if(key==='actionColor' && data.settings.buttonTone!=='auto') return;
    style.setProperty(cssVar,colors[key]);
  });
  if(validHexColor(colors.ink)){
    const rgb=hexRgb(colors.ink); style.setProperty('--ink-rgb',rgb.join(','));
    style.setProperty('--shadow',`0 9px 24px rgba(${rgb.join(',')},.15)`);
  }
  if(validHexColor(colors.slate)) style.setProperty('--days-color',colors.slate);
  if(data.settings.buttonTone==='auto'&&validHexColor(colors.actionColor)) style.setProperty('--action-ink',readableInk(colors.actionColor));
  if(validHexColor(colors.mint)) style.setProperty('--mint-ink',readableInk(colors.mint));
  if(validHexColor(colors.coral)) style.setProperty('--coral-ink',readableInk(colors.coral));
}
function applyTheme(){
  const theme = (data.settings && data.settings.theme==='dark') ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-palette', (data.settings&&data.settings.palette)||'classic');
  document.documentElement.setAttribute('data-button-tone', (data.settings&&data.settings.buttonTone)||'auto');
  document.documentElement.setAttribute('data-font-size', (data.settings&&data.settings.fontScale)||'standard');
  applyCustomColors(theme);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--slate').trim() || '#234a3e');
}
function setFontScale(scale){
  if(!['small','standard','large'].includes(scale))return;
  data.settings.fontScale=scale;saveData();applyTheme();openAppearanceModal();
}
function setPhotoCompression(enabled){data.settings.photoCompression=!!enabled;saveData();openSettingsModal();toast(tr('toast_saved'))}
function setPalette(palette){
  if(!['classic','lavender','peach','sky','rose','sage','butter'].includes(palette)) return;
  data.settings.palette=palette; data.settings.customColors.enabled=false; saveData(); applyTheme(); openAppearanceModal();
}
function setButtonTone(tone){
  if(!['auto','amber','coral','mint','blue','violet','navy'].includes(tone)) return;
  data.settings.buttonTone=tone; saveData(); applyTheme(); openAppearanceModal();
}
function computedHex(cssVar){
  const value=getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  if(validHexColor(value)) return value.toLowerCase();
  const m=value.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/i);
  return m?'#'+[m[1],m[2],m[3]].map(v=>Number(v).toString(16).padStart(2,'0')).join(''):'#888888';
}
function appearanceColorValue(key,cssVar){
  const theme=data.settings.theme==='dark'?'dark':'light';
  const saved=data.settings.customColors&&data.settings.customColors[theme]&&data.settings.customColors[theme][key];
  return validHexColor(saved)?saved:computedHex(cssVar);
}
function saveCustomColors(){
  const theme=data.settings.theme==='dark'?'dark':'light'; const colors={};
  document.querySelectorAll('[data-custom-color]').forEach(input=>{ if(validHexColor(input.value)) colors[input.dataset.customColor]=input.value.toLowerCase(); });
  const corrected=enforceCustomContrast(colors);
  data.settings.customColors[theme]=colors; data.settings.customColors.enabled=true; data.settings.buttonTone='auto';
  saveData(); applyTheme(); openAppearanceModal(); toast(corrected?tr('colors_saved_corrected').replace('{count}',corrected):tr(theme==='dark'?'colors_saved_dark':'colors_saved_light'));
}
function usePresetColors(){ data.settings.customColors.enabled=false; saveData(); applyTheme(); openAppearanceModal(); toast(tr('colors_presets_enabled')); }
function resetCurrentCustomColors(){
  const theme=data.settings.theme==='dark'?'dark':'light'; data.settings.customColors[theme]={};
  const other=theme==='dark'?'light':'dark'; if(!Object.keys(data.settings.customColors[other]||{}).length) data.settings.customColors.enabled=false;
  saveData(); applyTheme(); openAppearanceModal(); toast(tr('colors_custom_cleared'));
}
function applyLocale(){
  const lang=(data.settings&&data.settings.lang)||'fa';
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==='fa'?'rtl':'ltr';
}
function dismissLangHint(){
  data.settings.langHintSeen = true;
  saveData();
  goProfile();
  setTimeout(openSettingsModal,80);
}
