import { sha256 } from './sha256.mjs';
import { NORMALIZED_STRINGIFY_SHA256 } from './pins.mjs';

export const KEY_DICTIONARY_LIMITS = Object.freeze({
  dictionaryKeys: 512, keyUnits: 256, stringUnits: 4096,
  arraySlots: 2048, totalArraySlots: 50000, valueVisits: 20000,
  depth: 32, reconstructedJsonUnits: 400000,
});
const forbidden = new Set(['__proto__','constructor','prototype']);
const version = 'olympus.key-dictionary.1';
const fail = () => { throw new Error('Invalid or over-budget key-dictionary transport'); };

/** Internal representation decoder; use decodeReviewedTransport for the reviewed data pin. */
export function decodeKeyDictionary(encoded) {
  const limits=KEY_DICTIONARY_LIMITS, active=new Set();
  let slots=0, visits=0, units=0;
  const charge=n=>{units+=n;if(units>limits.reconstructedJsonUnits)fail();};
  function list(value) {
    if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail();
    const size=Object.getOwnPropertyDescriptor(value,'length');
    if(!size||!('value' in size)||!Number.isSafeInteger(size.value)||size.value<0||size.value>limits.arraySlots)fail();
    if((slots+=size.value)>limits.totalArraySlots||Reflect.ownKeys(value).length!==size.value+1)fail();
    const fields=[];
    for(let i=0;i<size.value;i++){
      const d=Object.getOwnPropertyDescriptor(value,String(i));
      if(!d||!d.enumerable||!('value' in d))fail();
      fields.push(d.value);
    }
    return fields;
  }
  const envelope=list(encoded);
  if(envelope.length!==3||envelope[0]!==version)fail();
  const keys=list(envelope[1]), unique=new Set(), keyCosts=[], counts=[];
  if(!keys.length||keys.length>limits.dictionaryKeys)fail();
  for(const key of keys){
    if(typeof key!=='string'||!key.length||key.length>limits.keyUnits||forbidden.has(key)||unique.has(key))fail();
    unique.add(key); keyCosts.push(JSON.stringify(key).length); counts.push(0);
  }
  function decode(value,depth=0){
    if(++visits>limits.valueVisits||depth>limits.depth)fail();
    if(value===null||typeof value==='boolean'){charge(JSON.stringify(value).length);return value;}
    if(typeof value==='string'){if(value.length>limits.stringUnits)fail();charge(JSON.stringify(value).length);return value;}
    if(typeof value==='number'){if(!Number.isFinite(value)||Object.is(value,-0))fail();charge(JSON.stringify(value).length);return value;}
    if(!value||typeof value!=='object'||active.has(value))fail();
    active.add(value);
    try {
      const fields=list(value), tag=fields[0];
      if(tag===1){
        charge(2+Math.max(0,fields.length-2));
        const output=[];
        for(let i=1;i<fields.length;i++)output.push(decode(fields[i],depth+1));
        return output;
      }
      if(tag!==0||fields.length%2!==1)fail();
      charge(2+Math.max(0,(fields.length-1)/2-1));
      const output={}, seen=new Set(), order=[];
      for(let i=1;i<fields.length;i+=2){
        const id=fields[i];
        if(!Number.isSafeInteger(id)||Object.is(id,-0)||id<0||id>=keys.length||seen.has(id))fail();
        seen.add(id);counts[id]++;order.push(keys[id]);charge(keyCosts[id]+1);
        Object.defineProperty(output,keys[id],{value:decode(fields[i+1],depth+1),enumerable:true,writable:true,configurable:true});
      }
      // Reject alternate insertion order for integer-like object keys.
      if(Object.keys(output).some((key,i)=>key!==order[i]))fail();
      return output;
    }finally{active.delete(value);}
  }
  const output=decode(envelope[2]);
  for(let i=0;i<keys.length;i++){
    if(counts[i]===0||(i>0&&(counts[i]>counts[i-1]||(counts[i]===counts[i-1]&&keys[i]<keys[i-1]))))fail();
  }
  return output;
}

/** Reconstruct the exact approved normalized JSON before existing validators run. */
export function decodeReviewedTransport(encoded) {
  const output=decodeKeyDictionary(encoded);
  if(sha256(JSON.stringify(output))!==NORMALIZED_STRINGIFY_SHA256)throw new Error('Reviewed normalized transport digest mismatch');
  return output;
}
