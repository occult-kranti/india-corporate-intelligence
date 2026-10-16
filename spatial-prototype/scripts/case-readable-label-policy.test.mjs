import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const host = path.resolve(process.env.CASE_LABEL_HOST ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const sourceRoot = path.resolve(process.env.CASE_LABEL_SOURCE_ROOT ?? host);
const require = createRequire(path.join(host, 'package.json')), { build } = require('esbuild');
const built = await build({ entryPoints: [path.join(sourceRoot, 'src/profile-host/readable-label-layout.ts')], bundle:true, write:false, format:'cjs', platform:'node' });
const module={exports:{}};new Function('module','exports',built.outputFiles[0].text)(module,module.exports);
const { planReadableCaseLabels: plan, wrapReadableNodeLabels: wrap, isAllLabelPose, observeReadableCaseLabels: observe }=module.exports;
const node=(id,left,top,width=96,height=30)=>({id,left,top,width,height});
const policy=(ids,required=[],requireAll=false,roles=[])=>({allNodeIds:ids,allRoleIds:roles,requiredNodeIds:required,requiredRoleIds:roles,requireAll});

test('96px lower bound preserves naturally short names and never changes text or pins',()=>{
 const elements=[40,182,182].map((natural,i)=>({textContent:`Complete source ${i}`,dataset:{caseNodeId:String(i),caseLabelX:String(i*40),caseLabelY:'100'},style:{maxWidth:'',left:`${i*40}px`,top:'100px'},getBoundingClientRect(){return{width:this.style.maxWidth?Math.min(natural,parseFloat(this.style.maxWidth)):natural};}}));
 const before=elements.map(e=>({text:e.textContent,x:e.style.left,y:e.style.top}));wrap(elements);
 assert.deepEqual(elements.map(e=>Number(e.dataset.caseLabelReadableMin)),[40,96,96]);
 assert.deepEqual(elements.map(e=>e.getBoundingClientRect().width),[40,96,96]);
 assert.deepEqual(elements.map(e=>({text:e.textContent,x:e.style.left,y:e.style.top})),before);
 for(let i=0;i<20;i++)wrap(elements);assert.deepEqual(elements.map(e=>e.getBoundingClientRect().width),[40,96,96]);
});

test('all-fit collision is insufficient instead of squeezing or silently deferring',()=>{
 const nodes=[node('a',50,50),node('b',100,50)];const before=structuredClone(nodes);
 const result=plan(nodes,[],525.58,300,policy(['a','b'],[],true));
 assert.equal(result.report.status,'insufficient');assert.deepEqual(result.report.deferredNodes,[]);assert.ok(result.report.failures.some(f=>f.reason==='collision'));
 assert.deepEqual(nodes,before);
});

test('a genuinely readable short board stays available; there is no fixed575px scene ban',()=>{
 const nodes=[node('a',40,75),node('b',200,75),node('c',360,75)];
 const result=plan(nodes,[],525.58,180,policy(['a','b','c'],[],true));assert.equal(result.report.status,'ready');assert.deepEqual(result.report.failures,[]);
});

test('selected Koch-like near-edge peripheral nodes are explicitly off-view at unchanged anchors',()=>{
 const nodes=[node('koch',235,351,100,20),node('foundation',481,351,148,20),node('gmu',735.4516,336,182,50),node('ihs',735.4516,580,182,50)];
 const before=structuredClone(nodes),result=plan(nodes,[],840,722.265625,policy(nodes.map(n=>n.id),['koch']));
 assert.equal(result.report.status,'ready');assert.deepEqual(result.report.deferredNodes,[{id:'gmu',reason:'outside-view'},{id:'ihs',reason:'outside-view'}]);assert.deepEqual(nodes,before);
 const selected=plan(nodes,[],840,722.265625,policy(nodes.map(n=>n.id),['gmu']));assert.equal(selected.report.status,'insufficient');assert.ok(!selected.report.deferredNodes.some(n=>n.id==='gmu'));
});

test('required role is placed before optional nodes, preventing false mandatory fallback',()=>{
 const nodes=[node('a',20,20,50,30),node('b',300,20,50,30),node('optional',160,85,80,30)];
 const roles=[{id:'r',x:200,y:100,width:160,height:30,selected:true}];
 const result=plan(nodes,roles,400,250,policy(nodes.map(n=>n.id),['a','b'],false,['r']));
 assert.equal(result.report.status,'ready');assert.deepEqual(result.report.deferredNodes,[{id:'optional',reason:'crowded'}]);assert.equal(result.roles[0].unresolved,false);
});

test('required missing nodes and impossible selected role force explicit insufficiency',()=>{
 assert.deepEqual(plan([],[],400,250,policy(['a'],['a'])).report.failures,[{id:'a',reason:'missing'}]);
 const result=plan([node('a',30,20,40,30)],[{id:'r',x:50,y:50,width:200,height:200,selected:true}],100,100,policy(['a'],['a'],false,['r']));
 assert.equal(result.report.status,'insufficient');assert.ok(result.report.failures.some(f=>f.id==='r'&&f.reason==='no-role-placement'));assert.deepEqual(result.report.deferredRoles,[]);
});

test('source-order peripheral accounting is deterministic and includes unprojected nodes',()=>{
 const nodes=[node('a',50,50),node('b',60,50),node('c',300,50)];const p=policy(['a','missing','b','c']);
 const a=plan(nodes,[],500,250,p),b=plan(nodes,[],500,250,p);assert.deepEqual(a,b);
 assert.deepEqual(a.report.deferredNodes,[{id:'missing',reason:'outside-view'},{id:'b',reason:'crowded'}]);
});

test('all-fit and mandatory labels cannot obscure provider credits',()=>{
 const nodes=[node('a',20,20)];const p=policy(['a'],[],true),credit={left:20,top:20,width:150,height:20};
 assert.equal(plan(nodes,[],500,250,p,[credit]).report.status,'insufficient');
 assert.deepEqual(plan(nodes,[],500,250,policy(['a']),[credit]).report.deferredNodes,[{id:'a',reason:'crowded'}]);
});

test('existing home pose recognizes Fit with retained selection without changing camera state',()=>{
 const bounds={minX:0,maxX:10,minY:0,maxY:8},home={center:[5,4],zoom:1,bearing:0,tilt:0};const before=structuredClone(home);
 assert.equal(isAllLabelPose(home,bounds),true);assert.equal(isAllLabelPose({...home,zoom:1.2},bounds),false);assert.equal(isAllLabelPose({...home,center:[4,4]},bounds),false);assert.deepEqual(home,before);
});

function observerFixture(){
 let callback,settled=false,disconnected=false,next=1;const frames=new Map(),reports=[],fontHandlers=new Map();
 const element={dataset:{caseNodeId:'a',caseLabelX:'100',caseLabelY:'80'},style:{},getBoundingClientRect(){return{left:52,top:65,width:96,height:30};}};
 const win={requestAnimationFrame(fn){const id=next++;frames.set(id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);},ResizeObserver:class{constructor(fn){callback=fn;}observe(){}disconnect(){disconnected=true;}}};
 const root={isConnected:true,dataset:{},getBoundingClientRect(){return{left:0,top:0,width:500,height:200};},querySelectorAll(selector){return selector==='.cw-node-label'?[element]:[];},ownerDocument:{defaultView:win,querySelectorAll(){return[];},fonts:{addEventListener(name,fn){fontHandlers.set(name,fn);},removeEventListener(name){fontHandlers.delete(name);}}}};
 const step=()=>{const jobs=[...frames.values()];frames.clear();for(const fn of jobs)fn();};
 return{root,element,frames,reports,fontHandlers,step,setSettled:value=>{settled=value;},get disconnected(){return disconnected;},notify:()=>callback(),options:{...policy(['a'],['a']),isSettled:()=>settled,onReport:r=>reports.push(r)}};
}

test('observer never reports in-flight or stale states and has no idle polling loop',()=>{
 const f=observerFixture(),stop=observe(f.root,f.options);assert.equal(f.frames.size,0);f.step();f.step();assert.equal(f.reports.length,0);assert.equal(f.frames.size,0);
 f.setSettled(true);f.notify();f.step();f.step();assert.equal(f.reports.length,1);assert.equal(f.reports[0].status,'ready');assert.equal(f.frames.size,0);
 f.notify();assert.equal(f.frames.size,0);stop();assert.equal(f.disconnected,true);assert.equal(f.fontHandlers.size,0);
});

test('observer cleanup cancels queued delivery and ignores a callback already queued before cleanup',()=>{
 const f=observerFixture();f.setSettled(true);const stop=observe(f.root,f.options),queued=[...f.frames.values()][0];stop();queued();f.notify();f.step();assert.equal(f.reports.length,0);assert.equal(f.frames.size,0);
});

test('host report is bound to the exact controller state and uses existing reader route',()=>{
 const source=fs.readFileSync(path.join(sourceRoot,'src/profile-host/CaseWorkspace.tsx'),'utf8');
 assert.match(source,/active.controller.state === state/);assert.match(source,/dataset.caseMotion === 'false'/);assert.match(source,/dataset.caseSelection === selection/);
 assert.match(source,/if \(report.status === 'insufficient'\) \{[\s\S]*?act\(\{ type: 'set-view', view: 'list' \}\)/);
 assert.match(source,/data-case-deferred-node-count=\{labelReport.deferredNodes.length\}/);assert.match(source,/data-case-deferred-role-count=\{labelReport.deferredRoles.length\}/);
 assert.match(source,/Use Fit case to show all nodes, or Complete reader/);
});


test('all-fit cannot lose explicit required roles and off-view frame roles remain accounted',()=>{
 const base=policy(['a'],['a'],true,['selected']);
 assert.deepEqual(plan([node('a',30,30)],[],400,250,{...base,allRoleIds:[]}).report.failures,[{id:'selected',reason:'missing'}]);
 const partial=plan([node('a',30,30)],[],400,250,{...policy(['a'],['a']),allRoleIds:['offscreen-role']});
 assert.deepEqual(partial.report.deferredRoles,[{id:'offscreen-role',reason:'outside-view'}]);
 const fit=plan([node('a',30,30)],[],400,250,{...policy(['a'],[],true),allRoleIds:['offscreen-role']});
 assert.equal(fit.report.status,'insufficient');assert.deepEqual(fit.report.failures,[{id:'offscreen-role',reason:'missing'}]);
});

test('freshness predicate can cancel same-selection camera or resize fallback without delivering stale report',()=>{
 const f=observerFixture();let revision=1;const bound=revision;f.options.isSettled=()=>revision===bound;
 const stop=observe(f.root,f.options);f.step();revision++;f.step();assert.equal(f.reports.length,0);assert.equal(f.frames.size,0);stop();
 const source=fs.readFileSync(path.join(sourceRoot,'src/profile-host/CaseWorkspace.tsx'),'utf8');
 assert.match(source,/context\?\.frame === frame/);assert.match(source,/box!\.width - context.width/);assert.match(source,/box!\.height - context.height/);
 assert.match(source,/state.navigation.edgeId \?\? state.navigation.factId \?\? state.navigation.nodeId/);
});


test('unsettled frames do not hide peripheral plaques or claim a settled policy report',()=>{
 const f=observerFixture();f.options.requiredNodeIds=[];f.element.getBoundingClientRect=()=>({left:490,top:65,width:96,height:30});
 const stop=observe(f.root,f.options);assert.equal(f.element.style.visibility,'');assert.equal(f.root.dataset.caseLabelReport,'');f.step();f.step();assert.equal(f.reports.length,0);
 f.setSettled(true);f.notify();assert.equal(f.element.style.visibility,'hidden');f.step();f.step();assert.deepEqual(f.reports[0].deferredNodes,[{id:'a',reason:'outside-view'}]);stop();
});
