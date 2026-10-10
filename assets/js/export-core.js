(function(root){
  'use strict';
  const enc=new TextEncoder();
  const xml=value=>String(value==null?'':value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&apos;'}[ch]||''));
  const colName=index=>{let out='';for(let n=index+1;n;n=Math.floor((n-1)/26))out=String.fromCharCode(65+(n-1)%26)+out;return out};
  function xlsxCell(value,row,col,style){
    const ref=`${colName(col)}${row}`;
    if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}"${style?` s="${style}"`:''}><v>${value}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${style?` s="${style}"`:''}><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  }
  function makeXlsx({sheetName='Report',headers=[],rows=[],rtl=false}){
    const safeSheet=String(sheetName||'Report').replace(/[\\/?*\[\]:]/g,' ').slice(0,31)||'Report';
    const all=[headers,...rows];
    const rowXml=all.map((row,ri)=>`<row r="${ri+1}">${row.map((value,ci)=>xlsxCell(value,ri+1,ci,ri===0?1:0)).join('')}</row>`).join('');
    const widths=headers.map((_,ci)=>Math.min(42,Math.max(10,...all.map(row=>String(row[ci]??'').length+2))));
    const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"${rtl?' rightToLeft="1"':''}/></sheetViews><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rowXml}</sheetData><autoFilter ref="A1:${colName(Math.max(0,headers.length-1))}${Math.max(1,all.length)}"/><pageSetup orientation="landscape" fitToWidth="1"/></worksheet>`;
    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF234A3E"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs></styleSheet>`;
    const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(safeSheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const entries=[
      {name:'[Content_Types].xml',data:`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`},
      {name:'_rels/.rels',data:`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`},
      {name:'xl/workbook.xml',data:workbook},{name:'xl/worksheets/sheet1.xml',data:sheet},{name:'xl/styles.xml',data:styles},
      {name:'xl/_rels/workbook.xml.rels',data:`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
      {name:'docProps/core.xml',data:`<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:title>${xml(safeSheet)}</dc:title><dc:creator>Daftar Kelas</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`},
      {name:'docProps/app.xml',data:`<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Daftar Kelas</Application></Properties>`}
    ];
    return root.DKZip.makeZip(entries);
  }
  function concat(parts){const size=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(size);let at=0;for(const part of parts){out.set(part,at);at+=part.length}return out}
  function makeImagePdf(images,width,height){
    if(!images.length)throw new Error('PDF needs at least one page');
    const objects=[],pageIds=[];
    for(let i=0;i<images.length;i++)pageIds.push(3+i*3);
    objects[1]=[enc.encode('<< /Type /Catalog /Pages 2 0 R >>')];
    objects[2]=[enc.encode(`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${images.length} >>`)];
    images.forEach((jpeg,i)=>{
      const page=3+i*3,image=page+1,content=page+2,name=`Im${i}`;
      objects[page]=[enc.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /${name} ${image} 0 R >> >> /Contents ${content} 0 R >>`)];
      objects[image]=[enc.encode(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,enc.encode('\nendstream')];
      const command=enc.encode(`q\n595.28 0 0 841.89 0 0 cm\n/${name} Do\nQ\n`);
      objects[content]=[enc.encode(`<< /Length ${command.length} >>\nstream\n`),command,enc.encode('endstream')];
    });
    const chunks=[enc.encode('%PDF-1.4\n')],offsets=[0];let offset=chunks[0].length;
    for(let id=1;id<objects.length;id++){
      offsets[id]=offset;const head=enc.encode(`${id} 0 obj\n`),tail=enc.encode('\nendobj\n');chunks.push(head,...objects[id],tail);offset+=head.length+tail.length+objects[id].reduce((n,p)=>n+p.length,0);
    }
    const xrefOffset=offset;let xref=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for(let id=1;id<objects.length;id++)xref+=`${String(offsets[id]).padStart(10,'0')} 00000 n \n`;
    chunks.push(enc.encode(`${xref}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
    return concat(chunks);
  }
  root.DKExport={makeXlsx,makeImagePdf};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.DKExport;
})(typeof globalThis!=='undefined'?globalThis:this);
