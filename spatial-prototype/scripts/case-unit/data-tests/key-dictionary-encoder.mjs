import { decodeKeyDictionary } from '../../../src/case-data/transport-key-dictionary/decoder.mjs';

/** Build-only encoder. Input is JSON text, so accessors/prototypes/cycles cannot enter. */
export function encodeNormalizedJson(text) {
  if(typeof text!=='string'||text.length>400000)throw new Error('Normalized JSON text required within 400000 UTF-16 units');
  const input=JSON.parse(text), frequency=new Map();
  function collect(value,depth=0){
    if(depth>32)throw new Error('Encoding depth budget');
    if(value&&typeof value==='object'){
      if(!Array.isArray(value))for(const key of Object.keys(value))frequency.set(key,(frequency.get(key)??0)+1);
      for(const child of Object.values(value))collect(child,depth+1);
    }
  }
  collect(input);
  const dictionary=[...frequency].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:a[0]>b[0]?1:0)).map(([key])=>key);
  const ids=new Map(dictionary.map((key,i)=>[key,i]));
  function encode(value){
    if(!value||typeof value!=='object')return value;
    if(Array.isArray(value))return [1,...value.map(encode)];
    return [0,...Object.entries(value).flatMap(([key,child])=>[ids.get(key),encode(child)])];
  }
  const encoded=['olympus.key-dictionary.1',dictionary,encode(input)];
  if(JSON.stringify(decodeKeyDictionary(encoded))!==JSON.stringify(input))throw new Error('Lossless encoding assertion failed');
  return encoded;
}
