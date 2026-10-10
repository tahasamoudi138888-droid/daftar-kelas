function openAppearanceModal(){
  applyTheme();
  const theme=data.settings.theme==='dark'?'dark':'light';
  const customEnabled=!!(data.settings.customColors&&data.settings.customColors.enabled&&Object.keys(data.settings.customColors[theme]||{}).length);
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <button type="button" class="btn btn-outline-dark btn-sm" data-style="width:auto;margin:0 0 12px;" data-action="openSettingsModal()">${ICON.back} ${tr('appearance_back')}</button>
    <h3 class="appearance-title" data-style="margin-bottom:6px;">${ICON.brush}<span>${tr('settings_appearance_title')}</span></h3>
    <p class="appearance-note">${tr('appearance_hint')}</p>
    <h2 class="section-title" data-style="color:var(--ink);opacity:.75;">${tr('font_size_title')}</h2>
    <div class="font-size-picker" role="group" aria-label="${escapeAttr(tr('font_size_title'))}">
      ${[['small','font_size_small','A'],['standard','font_size_standard','A'],['large','font_size_large','A']].map(([key,label,sample],i)=>`<button type="button" class="font-size-option ${data.settings.fontScale===key?'sel':''}" data-action="setFontScale('${key}')"><span data-font-preview="${key}">${sample}</span><b>${tr(label)}</b></button>`).join('')}
    </div>
    <div class="theme-card">
      <div class="theme-info"><div class="theme-icon">${theme==='dark'?ICON.moon:ICON.sun}</div><div class="theme-texts"><b>${tr(theme==='dark'?'theme_dark_label':'theme_light_label')}</b><span>${tr('appearance_separate_modes')}</span></div></div>
      <button type="button" class="theme-switch ${theme==='dark'?'on':''}" data-action="toggleThemeAndReopenAppearance()"><span class="knob">${theme==='dark'?ICON.moon:ICON.sun}</span></button>
    </div>
    <h2 class="section-title" data-style="color:var(--ink);opacity:.75;">${tr('appearance_presets')}</h2>
    <div class="palette-picker" aria-label="${escapeAttr(tr('appearance_presets'))}">
      ${[
        ['classic','palette_classic','palette_classic_desc',['#eee3cc','#234a3e','#d7a83e']],
        ['lavender','palette_lavender','palette_lavender_desc',['#e8e1f3','#51406f','#82cda9']],
        ['peach','palette_peach','palette_peach_desc',['#f9e3d8','#63404f','#8ecdae']],
        ['sky','palette_sky','palette_sky_desc',['#ddeef5','#2f586a','#e58e86']],
        ['rose','palette_rose','palette_rose_desc',['#f5dfe8','#633e59','#8fcdb3']],
        ['sage','palette_sage','palette_sage_desc',['#e3eee3','#3a5e52','#dd8f84']],
        ['butter','palette_butter','palette_butter_desc',['#f5ebc8','#455873','#7cafd4']]
      ].map(([key,nameKey,descKey,colors])=>`<button type="button" class="palette-card ${!customEnabled&&data.settings.palette===key?'sel':''}" data-action="setPalette('${key}')" aria-label="${escapeAttr(tr(nameKey))}"><span class="palette-preview">${colors.map(color=>`<span data-style="background:${color}"></span>`).join('')}</span><b>${tr(nameKey)}</b><small>${tr(descKey)}</small></button>`).join('')}
    </div>
    <h2 class="section-title" data-style="color:var(--ink);opacity:.75;">${tr('appearance_button_colors')}</h2>
    <div class="button-tone-picker" aria-label="${escapeAttr(tr('appearance_button_colors'))}">
      ${[
        ['auto','tone_auto','linear-gradient(135deg,#d5a12e,#68b990,#579cc7)','#fff'],['amber','tone_amber','#d5a12e','#302100'],
        ['coral','tone_coral','#b94f43','#fffaf7'],['mint','tone_mint','#68b990','#102d21'],['blue','tone_blue','#579cc7','#102b3b'],
        ['violet','tone_violet','#7655ad','#fffaff'],['navy','tone_navy','#405f7c','#ffffff']
      ].map(([key,labelKey,color,ink])=>`<button type="button" class="button-tone ${data.settings.buttonTone===key?'sel':''}" data-style="background:${color};--tone-ink:${ink}" data-action="setButtonTone('${key}')" aria-label="${escapeAttr(tr(labelKey))}" title="${escapeAttr(tr(labelKey))}"></button>`).join('')}
    </div>
    <details class="advanced-colors">
      <summary>${ICON.sliders||ICON.brush}<span><b>${tr('appearance_advanced')}</b><small>${tr('appearance_advanced_hint')}</small></span>${ICON.chev}</summary>
      <h2 class="section-title" data-style="color:var(--ink);opacity:.75;">${tr('appearance_custom')} — ${tr(theme==='dark'?'theme_dark_label':'theme_light_label')}</h2>
      <div class="custom-color-grid">
        ${CUSTOM_COLOR_FIELDS.map(([key,cssVar,labelKey])=>`<label class="custom-color-field"><input type="color" value="${appearanceColorValue(key,cssVar)}" data-custom-color="${key}"><span>${tr(labelKey)}</span></label>`).join('')}
      </div>
      <p class="appearance-note">${tr('appearance_contrast_hint')}</p>
      <button type="button" class="btn btn-gold" data-action="saveCustomColors()">${tr('appearance_save_custom')}</button>
      <button type="button" class="btn btn-outline-dark" data-style="margin-top:9px;" data-action="usePresetColors()">${tr('appearance_use_presets')}</button>
      ${customEnabled?`<button type="button" class="btn btn-danger" data-style="margin-top:9px;" data-action="resetCurrentCustomColors()">${tr('appearance_clear_custom')}</button>`:''}
    </details>
  `);
}
function openSettingsModal(){
  const autoBackupEnabled=!!data.settings.autoBackup9Days;
  const autoBackupLast=data.settings.autoBackupLastAt?isoToJalali(data.settings.autoBackupLastAt.slice(0,10),false):'';
  const autoBackupNext=data.settings.autoBackupLastAt?isoToJalali(new Date(new Date(data.settings.autoBackupLastAt).getTime()+AUTO_BACKUP_INTERVAL_MS).toISOString().slice(0,10),false):'';
  const autoBackupHint=autoBackupEnabled
    ?(autoBackupLast?tr('auto_backup_status').replace('{last}',autoBackupLast).replace('{next}',autoBackupNext):tr('auto_backup_first_hint'))
    :tr('auto_backup_off_hint');
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${tr('settings_close')}">${ICON.x}</button>
    <h3 data-style="margin-bottom:14px;">${tr('settings_title')}</h3>
    <div class="settings-jump"><button type="button" data-action="scrollSettingsTo('settingsPersonal')">${ICON.brush}<span>${tr('settings_personalization')}</span></button><button type="button" data-action="scrollSettingsTo('settingsSecurity')">${ICON.shield}<span>${tr('settings_security_section')}</span></button><button type="button" data-action="scrollSettingsTo('settingsDevice')">${ICON.gear}<span>${tr('settings_device_section')}</span></button><button type="button" data-action="scrollSettingsTo('settingsBackup')">${ICON.download}<span>${tr('backup_section_title')}</span></button></div>
    <h2 id="settingsPersonal" class="section-title settings-section-title" data-style="color:var(--ink);margin-top:0;">${tr('settings_personalization')}</h2>
    <div class="backup-row" data-action="openAppearanceModal()">
      <div class="theme-icon">${ICON.brush}</div>
      <div class="theme-texts"><b>${tr('settings_appearance_title')}</b><span>${tr('settings_appearance_hint')}</span></div>
      <div class="chev">${ICON.chev}</div>
    </div>
    <div class="backup-row" data-action="setPhotoCompression(${!data.settings.photoCompression})">
      <div class="theme-icon">${ICON.image||ICON.camera}</div>
      <div class="theme-texts"><b>${tr('photo_compression_title')}</b><span>${tr(data.settings.photoCompression?'photo_compression_on':'photo_compression_off')}</span></div>
      <div class="settings-state ${data.settings.photoCompression?'on':'off'}">${data.settings.photoCompression?ICON.check:ICON.x}</div>
    </div>
    <h2 class="section-title settings-section-title" data-style="color:var(--ink);">${tr('lang_section_title')}</h2>
    <div class="seg seg-3col" id="f_lang" dir="rtl" data-style="margin-bottom:4px;">
      <button type="button" dir="auto" class="${(data.settings.lang||'fa')==='fa'?'sel':''}" data-action="setLangAndRefresh('fa')">${tr('lang_fa')}</button>
      <button type="button" dir="auto" class="${(data.settings.lang||'fa')==='en'?'sel':''}" data-action="setLangAndRefresh('en')">${tr('lang_en')}</button>
      <button type="button" dir="auto" class="${(data.settings.lang||'fa')==='fr'?'sel':''}" data-action="setLangAndRefresh('fr')">${tr('lang_fr')}</button>
      <button type="button" dir="auto" class="${(data.settings.lang||'fa')==='tr'?'sel':''}" data-action="setLangAndRefresh('tr')">${tr('lang_tr')}</button>
      <button type="button" dir="auto" class="${(data.settings.lang||'fa')==='it'?'sel':''}" data-action="setLangAndRefresh('it')">${tr('lang_it')}</button>
      <button type="button" dir="auto" class="${(data.settings.lang||'fa')==='zh'?'sel':''}" data-action="setLangAndRefresh('zh')">${tr('lang_zh')}</button>
    </div>
    <h2 id="settingsSecurity" class="section-title settings-section-title" data-style="color:var(--ink);">${tr('settings_security_section')}</h2>
    <div class="backup-row" data-action="openSecurityModal()">
      <div class="theme-icon">${ICON.shield}</div>
      <div class="theme-texts"><b>${appLockEnabled()?tr('settings_lock_on'):tr('settings_lock_off')}</b><span>${tr('settings_lock_hint')}</span></div>
      <div class="chev">${ICON.chev}</div>
    </div>
    <h2 id="settingsDevice" class="section-title settings-section-title" data-style="color:var(--ink);">${tr('settings_device_section')}</h2>
    <div class="auto-backup-card connection-setting">
      <div class="theme-icon">${ICON.info}</div>
      <div class="theme-texts"><b>${tr('connection_badge_title')}</b><span>${tr('connection_badge_hint')}</span><small>${tr(data.settings.showConnectionStatus===false?'connection_badge_off':'connection_badge_on')}</small></div>
      <button type="button" class="theme-switch ${data.settings.showConnectionStatus===false?'':'on'}" role="switch" aria-checked="${data.settings.showConnectionStatus!==false}" aria-label="${escapeAttr(tr('connection_badge_title'))}" data-action="setConnectionStatusVisible(${data.settings.showConnectionStatus===false})"><span class="knob">${data.settings.showConnectionStatus===false?ICON.x:ICON.check}</span></button>
    </div>
    <div class="backup-row" data-action="${data.settings.notifications?'disableNotifications()':'enableNotifications()'}">
      <div class="theme-icon">${ICON.bell}</div>
      <div class="theme-texts"><b>${data.settings.notifications?tr('settings_notifications_on'):tr('settings_notifications_off')}</b><span>${tr('settings_notifications_hint')}</span></div>
      <div class="chev">${ICON.chev}</div>
    </div>
    <div class="backup-row" data-action="installClassApp()">
      <div class="theme-icon">${ICON.download}</div>
      <div class="theme-texts"><b>${tr('settings_install_title')}</b><span>${tr('settings_install_hint')}</span></div>
      <div class="chev">${ICON.chev}</div>
    </div>
    <div class="backup-row" data-action="protectStoredData()">
      <div class="theme-icon">${ICON.shield}</div>
      <div class="theme-texts"><b>${tr('settings_offline_protection_title')}</b><span>${tr('settings_offline_protection_hint')}</span></div>
      <div class="chev">${ICON.chev}</div>
    </div>
    <div class="backup-row" data-action="openStorageManager()"><div class="theme-icon">${ICON.book}</div><div class="theme-texts"><b>${tr('settings_storage_title')}</b><span>${tr('settings_storage_hint')}</span></div><div class="chev">${ICON.chev}</div></div>
    <div class="backup-row" data-action="openReportsModal()"><div class="theme-icon">${ICON.chart}</div><div class="theme-texts"><b>${tr('settings_reports_title')}</b><span>${tr('settings_reports_hint')}</span></div><div class="chev">${ICON.chev}</div></div>
    <div class="backup-row" data-action="openCloudSyncModal()"><div class="theme-icon">${ICON.upload}</div><div class="theme-texts"><b>${tr('cloud_title')}</b><span>${tr('cloud_settings_hint')}</span></div><div class="chev">${ICON.chev}</div></div>
    <div class="backup-row" data-action="switchRoleFromSettings()"><div class="theme-icon">${ICON.user}</div><div class="theme-texts"><b>${tr('role_change')}</b><span>${tr('role_welcome_hint')}</span></div><div class="chev">${ICON.chev}</div></div>
    <h2 id="settingsBackup" class="section-title settings-section-title" data-style="color:var(--ink);">${tr('backup_section_title')}</h2>
    <div class="auto-backup-card ${autoBackupEnabled?'is-on':''}">
      <div class="theme-icon">${ICON.history||ICON.download}</div>
      <div class="theme-texts"><b>${tr('auto_backup_9day_title')}</b><span>${autoBackupHint}</span><small>${tr('auto_backup_local_note')}</small></div>
      <button type="button" class="theme-switch ${autoBackupEnabled?'on':''}" data-action="setNineDayAutoBackup(${!autoBackupEnabled})" role="switch" aria-checked="${autoBackupEnabled?'true':'false'}" aria-label="${escapeAttr(tr('auto_backup_9day_title'))}"><span class="knob">${autoBackupEnabled?ICON.check:ICON.x}</span></button>
    </div>
    ${autoBackupEnabled?`<button type="button" class="btn btn-outline-dark auto-backup-now" data-action="runNineDayAutoBackupNow()">${ICON.download} ${tr('auto_backup_now')}</button>`:''}
    <div class="backup-row" data-action="exportFullZip()">
      <div class="theme-icon">${ICON.download}</div>
      <div class="theme-texts">
        <b>${tr('settings_full_backup_title')}</b>
        <span>${tr('settings_full_backup_hint')}</span>
      </div>
      <div class="chev">${ICON.chev}</div>
    </div>
    <div class="backup-row" data-action="exportMediaArchive()">
      <div class="theme-icon">${ICON.folder}</div>
      <div class="theme-texts"><b>${tr('archive_title')}</b><span>${tr('archive_hint')}</span></div>
      <div class="chev">${ICON.chev}</div>
    </div>
    <div class="backup-row" data-action="triggerFileInput('backupImportInput')">
      <div class="theme-icon">${ICON.upload}</div>
      <div class="theme-texts">
        <b>${tr('backup_import_label')}</b>
        <span>${tr('backup_import_hint')}</span>
      </div>
      <div class="chev">${ICON.chev}</div>
    </div>
    <div class="backup-row" data-action="restoreLatestAutoBackup()">
      <div class="theme-icon">${ICON.history||ICON.upload}</div>
      <div class="theme-texts">
        <b>${tr('settings_auto_restore_title')}</b>
        <span>${tr('settings_auto_restore_hint')}</span>
      </div>
      <div class="chev">${ICON.chev}</div>
    </div>
    <input type="file" id="backupImportInput" accept="application/json,.json,application/zip,.zip" data-style="display:none" data-change="importBackup(this)">
    <div class="legal-links"><a href="privacy.html">${tr('settings_privacy_link')}</a><a href="changelog.html">${tr('settings_changelog_link')}</a></div>
  `);
}

async function setNineDayAutoBackup(enabled){
  data.settings.autoBackup9Days=!!enabled;
  if(enabled)data.settings.autoBackupLastAt=null;
  await saveData({throwOnError:true});
  refreshSettingsModal();
  toast(tr(enabled?(lastAutoBackupFailed?'auto_backup_failed':'auto_backup_enabled'):'auto_backup_disabled'));
}
async function runNineDayAutoBackupNow(){
  data.settings.autoBackupLastAt=null;
  await saveData({throwOnError:true});
  refreshSettingsModal();
  toast(lastSaveFailed?tr('save_failed'):tr(lastAutoBackupFailed?'auto_backup_failed':'auto_backup_created'));
}

function refreshSettingsModal(){ openSettingsModal(); }
function toggleThemeAndReopenAppearance(){toggleTheme();openAppearanceModal()}
function setLangAndRefresh(lang){setLang(lang);refreshSettingsModal()}
function switchRoleFromSettings(){closeModal();showRoleGateway()}
function scrollSettingsTo(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})}
function openAboutModal(){
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <div data-style="text-align:center;padding:6px 0 2px;">
      <div data-style="width:52px;height:52px;border-radius:50%;background:var(--slate);color:var(--chalk-gold);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">${ICON.folder}</div>
      <h3 data-style="margin-bottom:10px;">${tr('about_title')}</h3>
      <p data-style="font-size:13px;color:var(--ink-soft);line-height:1.9;margin:0 0 14px;">${tr('about_desc')}</p>
      <div data-style="font-size:14px;font-weight:800;color:var(--ink);margin-top:6px;">${tr('about_designer')}</div>
      <p data-style="font-size:12.5px;color:var(--ink-soft);line-height:1.9;margin:20px 0 8px;padding-top:16px;border-top:1px dashed var(--board-line);">${tr('about_contact')}</p>
      <a href="https://ble.ir/taha_samoudi" target="_blank" rel="noopener" data-action="copyBaleId()" data-style="display:inline-flex;align-items:center;gap:8px;background:var(--paper-2);color:var(--ink);text-decoration:none;font-weight:800;font-size:14px;padding:11px 18px;border-radius:30px;">
        @taha_samoudi
      </a>
      <div data-style="font-size:10.5px;color:var(--ink-soft);margin-top:8px;">${tr('bale_hint')}</div>
    </div>
  `);
}
function copyBaleId(){
  const id = 'taha_samoudi';
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(id).then(()=>toast(tr('toast_id_copied'))).catch(()=>toast(id));
  } else {
    toast(id);
  }
}

async function setConnectionStatusVisible(visible){
  data.settings.showConnectionStatus=!!visible;
  updateConnectionStatus();
  await saveData({throwOnError:true});
  refreshSettingsModal();
}
