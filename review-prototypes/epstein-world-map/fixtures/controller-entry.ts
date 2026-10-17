// ISOLATED TEST FIXTURE ONLY. This is not loaded by either delivered app document.
// The production board has no file importer. This adapter makes its frozen
// createWorldBoard.load boundary available to native File API/race probes.
import {createWorldBoard} from '../src/world-ui.ts';
import type {Inputs} from '../src/world-model.ts';
const exact={} as Inputs;
for(const key of ['packet','anchors','candidates','review','root'] as const){const e=document.querySelector('#input-'+key)!;exact[key]=Uint8Array.from(atob(e.textContent!),c=>c.charCodeAt(0));e.remove();}
const geo=document.querySelector('#world-geometry')!,geometry=atob(geo.textContent!);geo.remove();
const board=createWorldBoard(document.querySelector<HTMLElement>('#world-root')!,geometry);
let ticket=0;
document.querySelector<HTMLInputElement>('#fixture-file')!.addEventListener('change',async e=>{const own=++ticket;const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;const packet=new Uint8Array(await file.arrayBuffer());if(own!==ticket)return;await board.load({...exact,packet});});
Object.defineProperty(window,'__worldFixture',{value:Object.freeze({
 load:async(key:keyof Inputs,bytes:number[])=>board.load({...exact,[key]:new Uint8Array(bytes)}),
 exact:async()=>board.load(exact),
 concurrent:async(latestValid:boolean)=>{const invalid={...exact,review:new Uint8Array(1)};return Promise.all([board.load(latestValid?invalid:exact),board.load(latestValid?exact:invalid)]);},
 state:()=>board.state()
})});
void board.load(exact);
