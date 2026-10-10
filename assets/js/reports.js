/* Academic reports: printable PDF workflow and Excel-compatible export. */
function reportRows(c){
  const finalizedDates=Object.keys(c.attendance||{}).filter(d=>c.attendance[d]&&c.attendance[d].finalized);
  return (c.students||[]).map((s,index)=>{
    const absent=finalizedDates.filter(d=>c.attendance[d].records&&c.attendance[d].records[s.id]==='absent').length;
    const present=finalizedDates.filter(d=>c.attendance[d].records&&c.attendance[d].records[s.id]==='present').length;
    const late=finalizedDates.filter(d=>c.attendance[d].records&&c.attendance[d].records[s.id]==='late').length;
    const missed=(c.homeworkLog||[]).filter(x=>x.studentId===s.id&&!x.done).length;
    return {index:index+1,name:s.name,total:studentTotal(s),midterm:s.midterm??'',oral:s.oral??'',final:s.final??'',present,late,absent,missed};
  });
}
function safeReportName(name){return String(name||'class').replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,60)}
function exportClassExcel(cid){
  const c=getClass(cid);if(!c)return;
  const headers=[tr('report_row'),tr('report_student'),tr('report_total'),tr('exam_midterm'),tr('exam_oral'),tr('exam_final'),tr('report_present'),tr('report_late'),tr('report_absent'),tr('report_missed')];
  const rows=reportRows(c).map(r=>[r.index,r.name,r.total,r.midterm,r.oral,r.final,r.present,r.late,r.absent,r.missed]);
  const bytes=DKExport.makeXlsx({sheetName:c.name,headers,rows,rtl:(data.settings&&data.settings.lang)==='fa'});
  downloadBlob(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${safeReportName(c.name)}-report.xlsx`);
  toast(tr('xlsx_created'));
}
function canvasToJpeg(canvas){return new Promise((resolve,reject)=>canvas.toBlob(async blob=>blob?resolve(new Uint8Array(await blob.arrayBuffer())):reject(new Error('canvas export failed')),'image/jpeg',.92))}
function fitCanvasText(ctx,value,maxWidth){
  const text=String(value==null?'':value);if(ctx.measureText(text).width<=maxWidth)return text;
  let out=text;while(out.length>1&&ctx.measureText(out+'…').width>maxWidth)out=out.slice(0,-1);return out+'…';
}
async function createReportJpegs(c){
  if(document.fonts&&document.fonts.ready)await document.fonts.ready;
  const rtl=(data.settings&&data.settings.lang)==='fa',pageW=1240,pageH=1754,margin=62,rowH=54,tableTop=236;
  const widths=[50,250,90,90,80,90,80,80,80,110];
  const headers=[tr('report_row'),tr('report_student'),tr('report_total'),tr('exam_midterm'),tr('exam_oral'),tr('exam_final'),tr('report_present'),tr('report_late'),tr('report_absent'),tr('report_missed')];
  const rows=reportRows(c).map(r=>[r.index,r.name,r.total,r.midterm,r.oral,r.final,r.present,r.late,r.absent,r.missed]);
  const perPage=Math.max(1,Math.floor((pageH-tableTop-125)/rowH)-1),pages=[];
  for(let start=0;start<Math.max(1,rows.length);start+=perPage){
    const canvas=document.createElement('canvas');canvas.width=pageW;canvas.height=pageH;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,pageW,pageH);ctx.direction=rtl?'rtl':'ltr';ctx.textBaseline='middle';
    ctx.fillStyle='#1f3a32';ctx.font='800 42px Vazirmatn, sans-serif';ctx.textAlign=rtl?'right':'left';ctx.fillText(`${tr('report_heading')} — ${c.name}`,rtl?pageW-margin:margin,78);
    ctx.fillStyle='#5e665f';ctx.font='500 23px Vazirmatn, sans-serif';ctx.fillText(`${formatDaysFull(c.info&&c.info.days||[])}  •  ${c.info&&c.info.startTime||''}  •  ${tehranNow().jalaliShort}`,rtl?pageW-margin:margin,132);
    const drawRow=(values,y,header=false)=>{
      let x=rtl?pageW-margin:margin;ctx.font=`${header?'800':'500'} 21px Vazirmatn, sans-serif`;
      values.forEach((value,i)=>{const w=widths[i];const left=rtl?x-w:x;ctx.fillStyle=header?'#234a3e':((Math.floor((y-tableTop)/rowH)%2)?'#f5efe4':'#ffffff');ctx.fillRect(left,y,w,rowH);ctx.strokeStyle='#d8d0c1';ctx.strokeRect(left,y,w,rowH);ctx.fillStyle=header?'#ffffff':'#292b28';ctx.textAlign=i===1?(rtl?'right':'left'):'center';const tx=i===1?(rtl?left+w-10:left+10):left+w/2;ctx.fillText(fitCanvasText(ctx,value,w-18),tx,y+rowH/2);x+=rtl?-w:w});
    };
    drawRow(headers,tableTop,true);rows.slice(start,start+perPage).forEach((row,i)=>drawRow(row,tableTop+rowH*(i+1),false));
    ctx.fillStyle='#6d746e';ctx.font='500 19px Vazirmatn, sans-serif';ctx.textAlign='center';ctx.fillText(`${tr('title_app')} • ${Math.floor(start/perPage)+1} / ${Math.max(1,Math.ceil(rows.length/perPage))}`,pageW/2,pageH-58);
    pages.push(await canvasToJpeg(canvas));
    if(!rows.length)break;
  }
  return {pages,width:pageW,height:pageH};
}
async function printClassReport(cid){
  const c=getClass(cid);if(!c)return;
  try{
    toast(tr('pdf_building'));
    const rendered=await createReportJpegs(c),bytes=DKExport.makeImagePdf(rendered.pages,rendered.width,rendered.height);
    downloadBlob(new Blob([bytes],{type:'application/pdf'}),`${safeReportName(c.name)}-report.pdf`);toast(tr('pdf_created'));
  }catch(error){console.error(error);toast(tr('pdf_failed'))}
}
function openReportsModal(){
  openModal(`<button type="button" class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr('settings_close'))}">${ICON.x}</button><h3>${tr('report_title')}</h3><p class="appearance-note">${tr('report_hint')}</p>${data.classes.length?data.classes.map(c=>`<div class="report-class-row"><div><b>${escapeHtml(c.name)}</b><span>${c.students.length} ${tr('home_students_suffix')}</span></div><div class="report-actions"><button class="btn btn-outline-dark btn-sm" data-action="exportClassExcel('${c.id}')">Excel</button><button class="btn btn-gold btn-sm" data-action="printClassReport('${c.id}')">PDF</button></div></div>`).join(''):`<div class="empty-state"><p>${tr('report_empty')}</p></div>`}`);
}

/* v13.4 — individual student reports */
function studentReportSnapshot(c,s){
  const finalizedDates=Object.keys(c.attendance||{}).filter(d=>c.attendance[d]&&c.attendance[d].finalized).sort();
  const present=finalizedDates.filter(d=>c.attendance[d].records&&c.attendance[d].records[s.id]==='present').length;
  const late=finalizedDates.filter(d=>c.attendance[d].records&&c.attendance[d].records[s.id]==='late').length;
  const absent=finalizedDates.filter(d=>c.attendance[d].records&&c.attendance[d].records[s.id]==='absent').length;
  const missed=(c.homeworkLog||[]).filter(x=>x.studentId===s.id&&!x.done).length;
  return {present,late,absent,missed,total:studentTotal(s),grades:(s.grades||[]).slice().reverse().slice(0,14)};
}
function exportStudentExcel(cid,sid){
  const c=getClass(cid),s=c&&getStudent(c,sid);if(!c||!s)return;
  const x=studentReportSnapshot(c,s);
  const rows=[
    [tr('report_student'),s.name],[tr('report_total'),x.total],[tr('exam_midterm'),s.midterm??''],[tr('exam_oral'),s.oral??''],[tr('exam_final'),s.final??''],
    [tr('report_present'),x.present],[tr('report_late'),x.late],[tr('report_absent'),x.absent],[tr('report_missed'),x.missed]
  ];
  const bytes=DKExport.makeXlsx({sheetName:s.name,headers:[tr('student_report_metric'),tr('student_report_value')],rows,rtl:(data.settings&&data.settings.lang)==='fa'});
  downloadBlob(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${safeReportName(c.name)}-${safeReportName(s.name)}.xlsx`);
  toast(tr('xlsx_created'));
}
async function printStudentReport(cid,sid){
  const c=getClass(cid),s=c&&getStudent(c,sid);if(!c||!s)return;
  try{
    toast(tr('pdf_building'));
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    const snap=studentReportSnapshot(c,s),canvas=document.createElement('canvas');canvas.width=1240;canvas.height=1754;const ctx=canvas.getContext('2d');
    const rtl=(data.settings&&data.settings.lang)==='fa',x=rtl?1170:70;ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.direction=rtl?'rtl':'ltr';ctx.textAlign=rtl?'right':'left';ctx.textBaseline='middle';
    ctx.fillStyle='#1f3a32';ctx.font='800 44px Vazirmatn, sans-serif';ctx.fillText(`${tr('student_report_title')} — ${s.name}`,x,85);
    ctx.fillStyle='#5e665f';ctx.font='600 24px Vazirmatn, sans-serif';ctx.fillText(`${c.name}  •  ${tehranNow().jalaliShort}`,x,140);
    const cards=[[tr('report_total'),snap.total],[tr('exam_midterm'),s.midterm??'—'],[tr('exam_oral'),s.oral??'—'],[tr('exam_final'),s.final??'—'],[tr('report_present'),snap.present],[tr('report_late'),snap.late],[tr('report_absent'),snap.absent],[tr('report_missed'),snap.missed]];
    let cy=235;ctx.font='700 25px Vazirmatn, sans-serif';
    cards.forEach(([label,value])=>{ctx.fillStyle='#f5efe4';ctx.fillRect(70,cy,1100,72);ctx.fillStyle='#26332e';ctx.fillText(`${label}: ${value}`,x,cy+36);cy+=86;});
    ctx.fillStyle='#1f3a32';ctx.font='800 30px Vazirmatn, sans-serif';ctx.fillText(tr('student_report_recent_grades'),x,cy+25);cy+=75;
    ctx.font='500 22px Vazirmatn, sans-serif';ctx.fillStyle='#34433d';
    if(!snap.grades.length)ctx.fillText(tr('student_report_no_grades'),x,cy);
    snap.grades.forEach((g,i)=>{const amount=g.value==='plus'?'+1':g.value==='minus'?'-1':String(g.amount??0);ctx.fillText(`${g.jalaliShort||g.iso||''}   ${amount}${g.note?` — ${g.note}`:''}`,x,cy+i*52);});
    const jpg=await canvasToJpeg(canvas),bytes=DKExport.makeImagePdf([jpg],canvas.width,canvas.height);
    downloadBlob(new Blob([bytes],{type:'application/pdf'}),`${safeReportName(c.name)}-${safeReportName(s.name)}.pdf`);toast(tr('pdf_created'));
  }catch(error){console.error(error);toast(tr('pdf_failed'))}
}
