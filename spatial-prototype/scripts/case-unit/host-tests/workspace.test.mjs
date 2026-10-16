import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import {acceptedCatalog,pins,hash} from '../test-tools.mjs';
const accepted=await acceptedCatalog();
const here=path.dirname(fileURLToPath(import.meta.url));
const host=path.resolve(here,'../../..');
const require=createRequire(path.join(host,'package.json'));
const {build}=require('esbuild');
const source=path.join(host,'src/profile-host/CaseWorkspace.tsx');
const index=JSON.parse(fs.readFileSync(path.join(host,'src/profile-host/case-index.json'),'utf8'));
const options={bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},nodePaths:[path.join(host,'node_modules')]};
async function moduleFrom(entry,extra={},loader=require){const result=await build({...options,entryPoints:[entry],...extra});const mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(loader,mod,mod.exports);return mod.exports;}

test('chooser copies exactly the accepted 19-case/72-claim index',()=>{
  assert.equal(index.length,19);assert.equal(index.reduce((n,item)=>n+item.claimCount,0),72);
  assert.equal(fs.readFileSync(path.join(host,'src/profile-host/case-index.json'),'utf8'),JSON.stringify(accepted.cases.map(f=>({id:f.id,label:f.label,profileId:f.profileId,researchJurisdiction:{label:f.researchJurisdiction.label,qualification:f.researchJurisdiction.qualification},claimCount:f.claims.length})),null,2)+'\n');
  for(const item of index)assert.deepEqual(Object.keys(item),['id','label','profileId','researchJurisdiction','claimCount']);
});

test('SSR begins with only the chooser, without scene/reader/source bodies',async()=>{
  const Component=(await moduleFrom(source,{external:['react','react/jsx-runtime','react-dom','three','maplibre-gl']})).default;
  const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
  const html=renderToStaticMarkup(React.createElement(Component,{graphics:null,reducedMotion:false,onClose(){},onRecreateGraphics(){}}));
  assert.equal((html.match(/data-profile-id=/g)||[]).length,19);
  assert.match(html,/data-case-view="chooser"/);assert.match(html,/72 core claims/);
  assert.doesNotMatch(html,/data-case-surface|data-reader-body|class="ocv2-evidence"/);
  assert.doesNotMatch(html,/<canvas|<audio|<iframe/);
});

test('reader dependency closure contains one normalized transport and no graphics implementation',async()=>{
  const result=await build({...options,entryPoints:[path.join(host,'src/profile-host/reader-runtime.ts')],metafile:true,external:['react','react/jsx-runtime']});
  const files=Object.keys(result.metafile.inputs);
  assert.equal(files.filter(file=>file.endsWith('/transport-key-dictionary/transport.kd.json')).length,1);
  assert.equal(files.filter(file=>/CaseSceneLayer|gl-boundary|geometry\.ts|integration-adapter|node_modules\/(three|maplibre-gl)/.test(file)).length,0);
  assert.equal(files.filter(file=>/reviewed-input\.json|reviewed-catalog\.json|reviewed-transport\.json|reviewed-transport\.canonical\.json/.test(file)).length,0);
  assert.equal(files.filter(file=>file.endsWith('/runtime-transport.ts')).length,1);
  assert.equal(files.filter(file=>file.endsWith('/transport-key-dictionary/decoder.mjs')).length,1);
});

test('every accepted case renders all core claim qualifications and reader-only facts in list mode',async()=>{
  const runtime=await moduleFrom(path.join(host,'src/profile-host/reader-runtime.ts'),{external:['react','react/jsx-runtime']});
  const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
  const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
  let claims=0,facts=0;
  for(const item of index){
    const controller=new runtime.CaseController(runtime.getCase(item.profileId),true);
    const state=controller.dispatch({type:'set-view',view:'list'},0);
    const html=renderToStaticMarkup(React.createElement(runtime.CaseSceneEvidence,{caseFile:controller.file,model:controller.model,state,onAction(){}}));
    assert.match(html,/data-main-view="list"/);assert.ok(html.includes(escape(item.researchJurisdiction.qualification)));
    for(const claim of controller.file.claims){claims++;assert.ok(html.includes(escape(claim.alwaysVisibleQualification)),claim.claimId);assert.ok(html.includes(escape(claim.mandatoryBoundary)),claim.claimId);}
    for(const id of controller.file.readerFactIds){facts++;assert.ok(html.includes(`data-claim-id="${escape(id)}" data-reader-only="true"`));}
  }
  assert.equal(claims,72);assert.equal(facts,13);
});

// Small deterministic React-hook harness, not a DOM/browser substitute. It exercises
// the workspace's own asynchronous/lifecycle logic with the approved reader runtime.
async function harness(graphics,viewport={width:1280,height:900}){
  const hooks=[];let cursor=0,dirty=false,tree,effects=[],closed=0,recreated=0,attached=0,disposed=0,sessionOptions,lastQuality=1;
  const listeners=new Map();const oldDocument=globalThis.document,oldElement=globalThis.HTMLElement,oldWindow=globalThis.window;
  class Element{isConnected=true;open=false;dataset={};style={};focus(){document.activeElement=this;}contains(target){return allNodes().some(node=>node.element===target);}getClientRects(){return [{}];}getBoundingClientRect(){return {left:0,top:150,right:600,bottom:450,width:600,height:300};}closest(){return null;}querySelector(){return allNodes().find(node=>node.type==='button')?.element;}querySelectorAll(){return allNodes().filter(node=>['button','summary'].includes(node.type)||node.props.tabIndex===0).map(node=>node.element);}showModal(){this.open=true;}close(){this.open=false;}}
  const externalOpener=new Element();
  globalThis.HTMLElement=Element;
  globalThis.window={innerWidth:viewport.width,innerHeight:viewport.height,addEventListener(type,fn){listeners.set(`window:${type}`,fn);},removeEventListener(type){listeners.delete(`window:${type}`);}};
  if(graphics&&!graphics.map)graphics.map={getCanvas:()=>({getBoundingClientRect:()=>({left:0,top:0,right:window.innerWidth,bottom:window.innerHeight,width:window.innerWidth,height:window.innerHeight})})};
  globalThis.document={activeElement:externalOpener,body:{style:{overflow:''}},addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type){listeners.delete(type);}};
  const elementByRef=new Map();const react={
    useId(){const i=cursor++;return hooks[i]??(hooks[i]=`id-${i}`);},
    useRef(initial){const i=cursor++;return hooks[i]??(hooks[i]={current:initial});},
    useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return [hooks[i],value=>{const next=typeof value==='function'?value(hooks[i]):value;if(!Object.is(next,hooks[i])){hooks[i]=next;dirty=true;}}];},
    useEffect(fn,deps){const i=cursor++;const old=hooks[i];if(!old||deps.some((dep,n)=>!Object.is(dep,old.deps[n]))){effects.push(()=>{old?.cleanup?.();hooks[i]={deps,cleanup:fn()};});}},
  };
  const jsx=(type,props,key)=>({type,props:props??{},key});
  const attach=options=>{
    attached++;sessionOptions=options;let dead=false;
    options.onFrame({nodes:[],roles:[],presentation:options.controller.presentation});
    return {dispatch(action){options.onState(options.controller.dispatch(action,performance.now()));},setInteractionMode(){},setQuality(value){lastQuality=value;},requestRepaint(){},dispose(){if(!dead){dead=true;disposed++;}}};
  };
  const mockPlugin={name:'mock-only-graphics-boundary',setup(build){build.onResolve({filter:/^\.\/attachScene$/},args=>args.importer===source?{path:'attachScene',namespace:'test'}:null);build.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const attachCaseScene = options => require("test-attach")(options)',loader:'js'}));}};
  const Component=(await moduleFrom(source,{external:['react','react/jsx-runtime','test-attach'],plugins:[mockPlugin]},name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx,Fragment:Symbol.for('fragment')}:name==='test-attach'?attach:require(name))).default;
  let props={graphics,reducedMotion:false,onClose(){closed++;},onRecreateGraphics(){recreated++;}};
  function allNodes(){const nodes=[];function visit(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(visit);return;}if(node.props){nodes.push(node);visit(node.props.children);}}visit(tree);return nodes;}
  function text(node){if(node==null||typeof node==='boolean')return '';if(Array.isArray(node))return node.map(text).join('');return typeof node==='object'?text(node.props?.children):String(node);}
  function render(){cursor=0;effects=[];dirty=false;tree=Component(props);const activeRefs=new Set();for(const node of allNodes()){if(typeof node.type==='string'){const ref=node.props.ref;if(ref){activeRefs.add(ref);if(!elementByRef.has(ref))elementByRef.set(ref,new Element());ref.current=elementByRef.get(ref);node.element=ref.current;}else node.element=new Element();}}for(const [ref] of elementByRef)if(!activeRefs.has(ref))ref.current=null;for(const effect of effects)effect();}
  async function flush(){for(let i=0;i<20;i++){if(dirty||!tree)render();await Promise.resolve();}assert.equal(dirty,false,'hook harness must settle');}
  function find(predicate){const result=allNodes().find(predicate);assert.ok(result,'expected host element');return result;}
  async function click(label){const node=find(node=>node.type==='button'&&text(node).startsWith(label));assert.ok(!node.props.disabled,`${label} is enabled`);node.element.focus();node.props.onClick();await flush();return node;}
  function evidence(){return find(node=>typeof node.type==='function'&&node.type.name==='CaseSceneEvidence').props;}
  await flush();
  return {find,text,click,flush,evidence,get props(){return props;},get tree(){return tree;},get closed(){return closed;},get recreated(){return recreated;},get attached(){return attached;},get disposed(){return disposed;},get quality(){return lastQuality;},get sessionOptions(){return sessionOptions;},async patch(value){props={...props,...value};dirty=true;await flush();},async act(action){evidence().onAction(action);await flush();},async resize(width,height){window.innerWidth=width;window.innerHeight=height;listeners.get('window:resize')?.();await flush();},async key(event){const result={...event,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;}};listeners.get('keydown')(result);await flush();return result;},async escape(){listeners.get('keydown')({key:'Escape',preventDefault(){},stopPropagation(){}});await flush();},destroy(){for(const hook of hooks)hook?.cleanup?.();globalThis.document=oldDocument;globalThis.HTMLElement=oldElement;globalThis.window=oldWindow;}};
}

test('explicit choice is list-first; missing graphics preserves selection and exposes recreation',async()=>{
  const h=await harness(null);
  try{
    await h.click(index[0].label);assert.equal(h.evidence().state.view,'list');assert.equal(h.attached,0);
    const model=h.evidence().model,edge=h.evidence().caseFile.edges[0];await h.act({type:'select-edge',id:edge.id});
    await h.act({type:'set-view',view:'scene'});assert.equal(h.attached,0);assert.equal(h.evidence().state.view,'list');assert.equal(h.evidence().state.navigation.edgeId,edge.id);
    await h.click('Recreate graphics');assert.equal(h.recreated,1);assert.equal(h.evidence().model,model);
    await h.click('Choose another case');await h.click(index[0].label);assert.equal(h.evidence().model,model,'same case retains controller model');
  }finally{h.destroy();}
});

test('source dialog and selection survive graphics failure; Escape dismisses sources first',async()=>{
  const graphics={isUsable:()=>true};const h=await harness(graphics);
  try{
    await h.click(index[0].label);const original=h.evidence().model,edge=h.evidence().caseFile.edges[0];
    await h.act({type:'set-view',view:'scene'});assert.equal(h.attached,1);
    await h.act({type:'select-edge',id:edge.id});assert.ok(h.evidence().state.motion);
    await h.click('Pause travel');assert.equal(h.evidence().state.motion,null);await h.click('Resume travel');assert.ok(h.evidence().state.motion);
    await h.click('Inspect selected claim');assert.equal(h.find(node=>'data-case-source-dialog' in node.props).props.ref.current.open,true);
    h.sessionOptions.onFailure('test failure');await h.flush();assert.equal(h.evidence().state.view,'list');assert.equal(h.evidence().model,original);assert.equal(h.evidence().state.navigation.edgeId,edge.id);assert.equal(h.disposed,1);
    await h.patch({graphics:null});assert.equal(h.find(node=>'data-case-source-dialog' in node.props).props.ref.current.open,true);
    await h.patch({graphics:{isUsable:()=>true,map:graphics.map}});assert.equal(h.find(node=>'data-case-source-dialog' in node.props).props.ref.current.open,true);assert.equal(h.evidence().model,original);
    await h.escape();assert.equal(h.closed,0);assert.equal(h.find(node=>'data-case-source-dialog' in node.props).props.ref.current.open,false);
    await h.act({type:'set-view',view:'scene'});assert.equal(h.attached,2);assert.equal(h.sessionOptions.controller.model,original);assert.equal(h.evidence().state.navigation.edgeId,edge.id);
    await h.escape();assert.equal(h.closed,1);
  }finally{h.destroy();}
});

test('a deliberate different case clears selection and pending asynchronous choices obey latest input',async()=>{
  const h=await harness(null);
  try{
    await h.click(index[0].label);const original=h.evidence().model;await h.act({type:'select-edge',id:h.evidence().caseFile.edges[0].id});await h.click('Choose another case');
    const first=h.find(node=>node.props['data-profile-id']===index[1].profileId),last=h.find(node=>node.props['data-profile-id']===index[2].profileId);
    first.props.onClick();last.props.onClick();await h.flush();assert.equal(h.evidence().caseFile.profileId,index[2].profileId);assert.notEqual(h.evidence().model,original);assert.equal(h.evidence().state.navigation.edgeId,null);assert.equal(h.evidence().state.view,'list');
  }finally{h.destroy();}
});


test('320px and effective 640×450 viewports stay reader-only without importing graphics',async()=>{
  for(const viewport of [{width:320,height:780},{width:640,height:450}]){
    const h=await harness({isUsable:()=>true},viewport);
    try{await h.click(index[0].label);await h.act({type:'set-view',view:'scene'});assert.equal(h.attached,0);assert.equal(h.evidence().state.view,'list');assert.match(h.text(h.tree),/larger desktop viewport/);assert.equal(h.find(node=>'data-case-compact' in node.props).props['data-case-compact'],true);}
    finally{h.destroy();}
  }
});

test('compact resize returns to the complete reader; low quality is explicit and survives recreation',async()=>{
  const h=await harness({isUsable:()=>true});
  try{
    await h.click(index[0].label);await h.act({type:'set-view',view:'scene'});await h.click('Low quality off');assert.equal(h.quality,.65);
    const model=h.evidence().model;await h.resize(640,450);assert.equal(h.evidence().state.view,'list');assert.equal(h.disposed,1);assert.equal(h.evidence().model,model);
    await h.resize(1280,900);assert.equal(h.attached,1,'growing viewport must not reopen a scene automatically');
    await h.act({type:'set-view',view:'scene'});assert.equal(h.attached,2);assert.equal(h.quality,.65);
  }finally{h.destroy();}
});


test('workspace key handler leaves browser-modified zoom shortcuts untouched',async()=>{
  const h=await harness(null);
  try{for(const event of [{key:'+',ctrlKey:true},{key:'-',metaKey:true},{key:'0',ctrlKey:true}]){const result=await h.key(event);assert.equal(result.defaultPrevented,undefined);assert.equal(result.stopped,undefined);}assert.equal(h.closed,0);}
  finally{h.destroy();}
});
