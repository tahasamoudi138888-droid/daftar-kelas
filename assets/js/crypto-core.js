(function(root){
  'use strict';
  const enc=new TextEncoder(),dec=new TextDecoder();
  function bytesToBase64(bytes){
    let out='';const u=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    for(let i=0;i<u.length;i+=0x8000)out+=String.fromCharCode(...u.subarray(i,i+0x8000));
    return btoa(out);
  }
  function base64ToBytes(value){
    const raw=atob(String(value||''));const out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;
  }
  async function deriveKey(pin,salt,iterations){
    const material=await crypto.subtle.importKey('raw',enc.encode(String(pin)),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:salt instanceof Uint8Array?salt:new Uint8Array(salt),iterations:iterations||310000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function encryptBytes(input,key,aad){
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const plain=input instanceof Uint8Array?input:new Uint8Array(input);
    const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,...(aad?{additionalData:enc.encode(aad)}:{})},key,plain));
    const packed=new Uint8Array(iv.length+cipher.length);packed.set(iv);packed.set(cipher,iv.length);return packed;
  }
  async function decryptBytes(input,key,aad){
    const packed=input instanceof Uint8Array?input:new Uint8Array(input);
    if(packed.length<29)throw new Error('invalid encrypted payload');
    return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:packed.subarray(0,12),...(aad?{additionalData:enc.encode(aad)}:{})},key,packed.subarray(12)));
  }
  async function encryptText(text,key){return bytesToBase64(await encryptBytes(enc.encode(String(text)),key))}
  async function decryptText(value,key){return dec.decode(await decryptBytes(base64ToBytes(value),key))}
  const api={bytesToBase64,base64ToBytes,deriveKey,encryptBytes,decryptBytes,encryptText,decryptText,encodeText:s=>enc.encode(String(s)),decodeText:b=>dec.decode(b)};
  root.DKCrypto=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
