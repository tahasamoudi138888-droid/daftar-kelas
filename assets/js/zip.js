(function(root){
  'use strict';
  const enc=new TextEncoder(),dec=new TextDecoder();
  const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
  function crcUpdate(c,bytes){for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return c}
  function crc32(bytes){return(crcUpdate(0xffffffff,bytes)^0xffffffff)>>>0}
  function u16(v){return new Uint8Array([v&255,(v>>>8)&255])}
  function u32(v){return new Uint8Array([v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255])}
  function join(parts){const size=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(size);let off=0;for(const p of parts){out.set(p,off);off+=p.length}return out}
  function asBytes(value){if(typeof value==='string')return enc.encode(value);if(value instanceof Uint8Array)return value;if(value instanceof ArrayBuffer)return new Uint8Array(value);if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer,value.byteOffset,value.byteLength);throw new Error('unsupported ZIP entry')}
  function dosDateTime(date=new Date()){let y=Math.max(1980,date.getFullYear());return{time:(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1),date:((y-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate()}}
  function makeZip(entries){
    const local=[],central=[];let offset=0;const dt=dosDateTime();
    for(const entry of entries){
      const name=enc.encode(String(entry.name).replace(/^\/+|\.\.(?:\/|\\)/g,'')),data=asBytes(entry.data),crc=crc32(data),flags=0x0800;
      const lh=join([u32(0x04034b50),u16(20),u16(flags),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
      local.push(lh);
      central.push(join([u32(0x02014b50),u16(20),u16(20),u16(flags),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]));
      offset+=lh.length;
    }
    const directory=join(central),body=join(local);
    const end=join([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(directory.length),u32(body.length),u16(0)]);
    return join([body,directory,end]);
  }
  async function blobMeta(value,onChunk){
    const blob=value instanceof Blob?value:new Blob([typeof value==='string'?enc.encode(value):asBytes(value)]);
    if(blob.size>0xffffffff)throw new Error('ZIP entry exceeds 4 GiB');
    let crc=0xffffffff;
    if(blob.stream){
      const reader=blob.stream().getReader();
      try{for(;;){const {done,value:chunk}=await reader.read();if(done)break;crc=crcUpdate(crc,chunk);if(onChunk)onChunk(chunk.byteLength)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
    }else crc=crcUpdate(crc,new Uint8Array(await blob.arrayBuffer()));
    return {blob,size:blob.size,crc:(crc^0xffffffff)>>>0};
  }
  async function makeZipBlob(entries,onProgress){
    const total=entries.reduce((n,x)=>n+(x.data instanceof Blob?x.data.size:asBytes(x.data).byteLength),0);let processed=0;
    if(entries.length>5000)throw new Error('too many ZIP entries');
    const localParts=[],central=[];let offset=0;const dt=dosDateTime();
    for(const entry of entries){
      const safeName=String(entry.name).replace(/^\/+|\.\.(?:\/|\\)/g,'');
      const name=enc.encode(safeName),meta=await blobMeta(entry.data,bytes=>{processed+=bytes;if(onProgress)onProgress(processed,total)}),flags=0x0800;
      const header=join([u32(0x04034b50),u16(20),u16(flags),u16(0),u16(dt.time),u16(dt.date),u32(meta.crc),u32(meta.size),u32(meta.size),u16(name.length),u16(0),name]);
      localParts.push(header,meta.blob);
      central.push(join([u32(0x02014b50),u16(20),u16(20),u16(flags),u16(0),u16(dt.time),u16(dt.date),u32(meta.crc),u32(meta.size),u32(meta.size),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]));
      offset+=header.length+meta.size;
      if(offset>0xffffffff)throw new Error('ZIP archive exceeds 4 GiB');
    }
    const directory=join(central),end=join([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(directory.length),u32(offset),u16(0)]);
    return new Blob([...localParts,directory,end],{type:'application/zip'});
  }
  function readU16(v,o){return v.getUint16(o,true)}function readU32(v,o){return v.getUint32(o,true)}
  function parseZip(input){
    const bytes=asBytes(input),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let eocd=-1;
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(readU32(view,i)===0x06054b50){eocd=i;break}
    if(eocd<0)throw new Error('invalid ZIP');
    const count=readU16(view,eocd+10),centralOffset=readU32(view,eocd+16),files=new Map();let pos=centralOffset;
    if(count>5000)throw new Error('too many ZIP entries');
    for(let i=0;i<count;i++){
      if(readU32(view,pos)!==0x02014b50)throw new Error('invalid ZIP directory');
      const method=readU16(view,pos+10),crc=readU32(view,pos+16),size=readU32(view,pos+24),nameLen=readU16(view,pos+28),extraLen=readU16(view,pos+30),commentLen=readU16(view,pos+32),localOffset=readU32(view,pos+42);
      if(method!==0)throw new Error('compressed ZIP entries are unsupported');
      const name=dec.decode(bytes.subarray(pos+46,pos+46+nameLen));
      if(name.includes('..')||name.startsWith('/')||name.includes('\\'))throw new Error('unsafe ZIP path');
      if(readU32(view,localOffset)!==0x04034b50)throw new Error('invalid ZIP entry');
      const localNameLen=readU16(view,localOffset+26),localExtraLen=readU16(view,localOffset+28),start=localOffset+30+localNameLen+localExtraLen,end=start+size;
      if(end>bytes.length)throw new Error('truncated ZIP');
      const data=bytes.slice(start,end);if(crc32(data)!==crc)throw new Error('ZIP checksum mismatch');files.set(name,data);
      pos+=46+nameLen+extraLen+commentLen;
    }
    return files;
  }
  async function parseZipBlob(input){
    const blob=input instanceof Blob?input:new Blob([input]);if(blob.size<22||blob.size>0xffffffff)throw new Error('invalid ZIP');
    const tailStart=Math.max(0,blob.size-65557),tail=new Uint8Array(await blob.slice(tailStart).arrayBuffer()),tailView=new DataView(tail.buffer,tail.byteOffset,tail.byteLength);let eocd=-1;
    for(let i=tail.length-22;i>=0;i--)if(readU32(tailView,i)===0x06054b50){eocd=i;break}if(eocd<0)throw new Error('invalid ZIP');
    const count=readU16(tailView,eocd+10),centralSize=readU32(tailView,eocd+12),centralOffset=readU32(tailView,eocd+16);if(count>5000||centralSize>32*1024*1024||centralOffset+centralSize>blob.size)throw new Error('invalid ZIP directory');
    const central=new Uint8Array(await blob.slice(centralOffset,centralOffset+centralSize).arrayBuffer()),view=new DataView(central.buffer,central.byteOffset,central.byteLength),files=new Map();let pos=0;
    for(let i=0;i<count;i++){
      if(pos+46>central.length||readU32(view,pos)!==0x02014b50)throw new Error('invalid ZIP directory');
      const method=readU16(view,pos+10),crc=readU32(view,pos+16),size=readU32(view,pos+24),nameLen=readU16(view,pos+28),extraLen=readU16(view,pos+30),commentLen=readU16(view,pos+32),localOffset=readU32(view,pos+42);if(method!==0)throw new Error('compressed ZIP entries are unsupported');
      const name=dec.decode(central.subarray(pos+46,pos+46+nameLen));if(name.includes('..')||name.startsWith('/')||name.includes('\\'))throw new Error('unsafe ZIP path');
      const localHead=new Uint8Array(await blob.slice(localOffset,localOffset+30).arrayBuffer()),localView=new DataView(localHead.buffer,localHead.byteOffset,localHead.byteLength);if(localHead.length<30||readU32(localView,0)!==0x04034b50)throw new Error('invalid ZIP entry');
      const start=localOffset+30+readU16(localView,26)+readU16(localView,28),end=start+size;if(end>blob.size)throw new Error('truncated ZIP');const entryBlob=blob.slice(start,end);
      const meta=await blobMeta(entryBlob);if(meta.crc!==crc)throw new Error('ZIP checksum mismatch');files.set(name,entryBlob);pos+=46+nameLen+extraLen+commentLen;
    }
    return files;
  }
  const api={makeZip,makeZipBlob,parseZip,parseZipBlob,crc32};root.DKZip=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
