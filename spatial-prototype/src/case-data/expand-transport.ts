/** Bounded, data-only reference expansion. Never a source or admission decision. */
export const TRANSPORT_LIMITS=Object.freeze({strings:1000,objects:256,encodedVisits:100000,depth:64,expandedCost:2000000});
interface Expanded {value:unknown;cost:number;depth:number}
const forbidden=new Set(['__proto__','constructor','prototype']);
function record(value:unknown):Record<string,unknown> {
 if(!value||typeof value!=='object'||Array.isArray(value)||(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null))throw new Error('Non-plain transport record');
 const keys=Object.keys(value);
 if(Reflect.ownKeys(value).length!==keys.length)throw new Error('Hidden transport key');
 for(const key of keys){if(forbidden.has(key)||!('value' in Object.getOwnPropertyDescriptor(value,key)!))throw new Error('Unsafe transport key/accessor');}
 return value as Record<string,unknown>;
}
function list(value:unknown):unknown[] {
 if(!Array.isArray(value)||Object.keys(value).length!==value.length||Reflect.ownKeys(value).length!==value.length+1)throw new Error('Invalid transport array');
 for(let i=0;i<value.length;i++)if(!('value' in Object.getOwnPropertyDescriptor(value,String(i))!))throw new Error('Transport array accessor');
 return value;
}
export function expandTransport(value:unknown):unknown {
 const input=record(value);
 if(input.schemaVersion!=='olympus.case-diagram-transport.2'||Object.keys(input).sort().join(',')!=='objects,root,schemaVersion,strings')throw new Error('Unknown transport schema');
 const strings=list(input.strings),objects=list(input.objects),table:Expanded[]=[];
 if(strings.length>TRANSPORT_LIMITS.strings||objects.length>TRANSPORT_LIMITS.objects||strings.some(s=>typeof s!=='string')||strings.reduce<number>((n,s)=>n+(s as string).length,0)>TRANSPORT_LIMITS.expandedCost)throw new Error('Transport table budget/type');
 const active=new Set<object>();let visits=0;
 function bounded(value:unknown,cost:number,depth:number):Expanded {
  if(cost>TRANSPORT_LIMITS.expandedCost||depth>TRANSPORT_LIMITS.depth)throw new Error('Expansion budget exceeded');
  return {value,cost,depth};
 }
 function expand(v:unknown,nesting=0):Expanded {
  if(++visits>TRANSPORT_LIMITS.encodedVisits||nesting>TRANSPORT_LIMITS.depth)throw new Error('Encoded transport budget exceeded');
  if(v===null||typeof v==='boolean')return bounded(v,5,0);
  if(typeof v==='string')return bounded(v,v.length+2,0);
  if(typeof v==='number'){if(!Number.isFinite(v))throw new Error('Nonfinite transport value');return bounded(v,24,0);}
  if(!v||typeof v!=='object'||active.has(v))throw new Error('Invalid/cyclic transport field');
  active.add(v);
  try {
   if(Array.isArray(v)){
    const values=list(v),expanded:unknown[]=[];let cost=2,depth=1;
    for(const child of values){const item=expand(child,nesting+1);cost+=item.cost+1;depth=Math.max(depth,item.depth+1);bounded(null,cost,depth);expanded.push(item.value);}
    return bounded(expanded,cost,depth);
   }
   const source=record(v),keys=Object.keys(source);
   if(keys.includes('$s')||keys.includes('$o')){
    if(keys.length!==1)throw new Error('Mixed reference/content');
    const kind=keys[0],index=source[kind],values=kind==='$s'?strings:table;
    if(typeof index!=='number'||!Number.isSafeInteger(index)||index<0||index>=values.length)throw new Error('Unknown/forward transport reference');
    if(kind==='$s')return bounded(strings[index],(strings[index] as string).length+2,0);
    return table[index];
   }
   const entries:[string,unknown][]=[];let cost=2,depth=1;
   for(const key of keys){const item=expand(source[key],nesting+1);cost+=key.length+item.cost+4;depth=Math.max(depth,item.depth+1);bounded(null,cost,depth);entries.push([key,item.value]);}
   return bounded(Object.fromEntries(entries),cost,depth);
  }finally{active.delete(v);}
 }
 for(const object of objects)table.push(expand(object));
 const result=expand(input.root);
 // Cost/depth/reference limits are checked before expanding shared object references.
 return JSON.parse(JSON.stringify(result.value)) as unknown;
}
