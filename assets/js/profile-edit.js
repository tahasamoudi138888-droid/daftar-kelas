function readAndResizeImage(file, maxDim, cb, quality=.82){
  if(!file || !/^image\/(png|jpeg|webp)$/i.test(file.type) || file.size>8*1024*1024){ toast(tr('photo_invalid')); return; }
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      let w=img.width, h=img.height;
      if (w>h){ if (w>maxDim){ h=Math.round(h*maxDim/w); w=maxDim; } }
      else { if (h>maxDim){ w=Math.round(w*maxDim/h); h=maxDim; } }
      const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,w,h);
      cb(canvas.toDataURL('image/jpeg',quality));
    };
    img.onerror = ()=>toast(tr('photo_unreadable'));
    img.src = e.target.result;
  };
  reader.onerror = ()=>toast(tr('photo_read_failed'));
  reader.readAsDataURL(file);
}
function handlePhotoSelect(ev){
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const optimize=data.settings.photoCompression!==false;
  readAndResizeImage(file, optimize?320:1200, function(dataUrl){
    data.profile.photo = dataUrl;
    saveData(); render(); toast(tr('toast_photo_saved'));
  },optimize?.82:.94);
}
function removePhoto(){
  data.profile.photo = '';
  saveData(); render();
}
function openProfileFormModal(){
  const p = data.profile;
  openModal(`
    <button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button>
    <h3>${tr('profile_form_title')}</h3>
    <div class="field"><label>${tr('profile_name_label')}</label><input type="text" id="p_name" value="${escapeAttr(p.name)}"></div>
    <div class="field"><label>${tr('profile_phone_field_label')}</label><input type="tel" id="p_phone" value="${escapeAttr(p.phone)}"></div>
    <div class="field"><label>${tr('profile_subject_label')}</label><input type="text" id="p_subject" value="${escapeAttr(p.subject)}" placeholder="${tr('profile_subject_ph')}"></div>
    <div class="field"><label>${tr('profile_workplace_field_label')}</label><input type="text" id="p_workplace" value="${escapeAttr(p.workplace)}"></div>
    <div class="modal-actions"><button class="btn btn-gold" data-action="saveProfileForm()">${tr('btn_save')}</button></div>
  `);
}
function saveProfileForm(){
  data.profile.name = document.getElementById('p_name').value.trim();
  data.profile.phone = document.getElementById('p_phone').value.trim();
  data.profile.subject = document.getElementById('p_subject').value.trim();
  data.profile.workplace = document.getElementById('p_workplace').value.trim();
  saveData(); closeModal(); render(); toast(tr('toast_saved'));
}
function addNote(){
  const el = document.getElementById('note_text');
  const text = el.value.trim();
  if (!text) return;
  const t = tehranNow();
  if (!data.profile.notes) data.profile.notes=[];
  data.profile.notes.push({id:uid(), text, iso:t.iso, time:t.time, jalaliShort:t.jalaliShort});
  clearDraft('note_text');
  saveData(); render(); toast(tr('toast_note_added'));
}
function deleteNote(id){
  const index=data.profile.notes.findIndex(n=>n.id===id); const removed=index>-1?data.profile.notes[index]:null;
  data.profile.notes = data.profile.notes.filter(n=>n.id!==id);
  saveData(); render();
  undoToast(tr('toast_note_deleted'),()=>{ if(removed&&!data.profile.notes.some(n=>n.id===id)){ data.profile.notes.splice(Math.max(0,index),0,removed); saveData(); render(); toast(tr('toast_note_restored')); } });
}
