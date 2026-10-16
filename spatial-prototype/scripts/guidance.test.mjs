import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Unique temporary bundles keep this suite portable and safe under parallel tests.
const out = fs.mkdtempSync(path.join(tmpdir(), 'fieldwork-guidance-test-'));
after(() => fs.rmSync(out, { recursive: true, force: true }));
const options = { bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.css': 'empty' } };
await build({
  ...options,
  entryPoints: [path.join(root, 'src/guidance/model.ts')],
  outfile: path.join(out, 'model.cjs'),
});
await build({
  ...options,
  stdin: {
    contents: `import { renderToStaticMarkup } from 'react-dom/server';
      import { GuidedTutorial } from './src/guidance/GuidedTutorial';
      export function renderGuide(guide) {
        return renderToStaticMarkup(<GuidedTutorial guide={guide} open={false} onClose={() => {}} />);
      }`,
    resolveDir: root,
    sourcefile: 'guidance-renderer-entry.tsx',
    loader: 'tsx',
  },
  outfile: path.join(out, 'renderer.cjs'),
});
const m = require(path.join(out, 'model.cjs'));
const { renderGuide } = require(path.join(out, 'renderer.cjs'));
const guide = JSON.parse(fs.readFileSync(path.join(root, 'src/guidance/atlas-guide.json'), 'utf8'));
function storage(){const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
test('all 13 steps are source-bound and contain no action hooks',()=>{
 assert.equal(guide.steps.length,13);assert.equal(new Set(guide.steps.map(s=>s.id)).size,13);
 for(const step of guide.steps){assert.ok(step.body);assert.ok(step.prerequisite);assert.ok(step.target);assert.ok(!['button','body'].includes(step.target));assert.deepEqual(Object.keys(step).sort(),['body','id','prerequisite','target','title']);}
});
test('next at final step never completes; only explicit Finish does',()=>{
 let p=m.initialProgress();for(let i=0;i<20;i++) p=m.transition(p,'next',13);
 assert.equal(p.step,12);assert.equal(p.status,'active');
 assert.equal(m.transition(p,'pause',13).status,'paused');
 assert.equal(m.transition(p,'finish',13).status,'completed');
 assert.equal(m.transition(m.initialProgress(),'finish',13).status,'active');
});
test('Back bounds, Skip and Restart have explicit independent semantics',()=>{
 const p=Object.freeze({version:2,step:7,status:'active'});
 assert.deepEqual(m.transition(p,'skip',13),{version:2,step:7,status:'skipped'});
 assert.deepEqual(m.transition(p,'restart',13),{version:2,step:0,status:'active'});
 assert.equal(m.transition(m.initialProgress(),'back',13).step,0);assert.equal(p.step,7);
});
test('corrupt/unavailable/version-mismatched storage is safe and active reload pauses',()=>{
 const s=storage(),key=m.progressKey('guide');
 for(const raw of ['bad','null','{}','{"version":1,"step":0,"status":"active"}','{"version":2,"step":"2","status":"active"}']){s.setItem(key,raw);assert.deepEqual(m.readProgress(s,'guide',13),m.initialProgress());}
 s.setItem(key,JSON.stringify({version:2,step:999,status:'active'}));assert.deepEqual(m.readProgress(s,'guide',13),{version:2,step:12,status:'paused'});
 const denied={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
 assert.deepEqual(m.readProgress(denied,'guide',13),m.initialProgress());assert.equal(m.saveProgress(denied,'guide',m.initialProgress()),false);assert.equal(m.saveProgress(null,'guide',m.initialProgress()),false);
});
test('progress writes cannot overwrite casebook or other guides',()=>{
 const s=storage();s.setItem('casebook','unchanged');s.setItem(m.progressKey('other'),'other');
 m.saveProgress(s,'atlas',m.transition(m.initialProgress(),'next',13));
 assert.equal(s.getItem('casebook'),'unchanged');assert.equal(s.getItem(m.progressKey('other')),'other');assert.equal(s.data.size,3);
});
test('absent, invalid, hidden, unique and ambiguous targets never select an unrelated element',()=>{
 assert.equal(m.inspectTarget(undefined,{querySelectorAll(){throw Error();}},()=>true),'unanchored');
 assert.equal(m.inspectTarget('[bad',{querySelectorAll(){throw Error();}},()=>true),'absent');
 assert.equal(m.inspectTarget('.source',{querySelectorAll:()=>[]},()=>true),'absent');
 assert.equal(m.inspectTarget('.source',{querySelectorAll:()=>[{}]},()=>false),'absent');
 assert.equal(m.inspectTarget('.source',{querySelectorAll:()=>[{}]},()=>true),'available');
 assert.equal(m.inspectTarget('.source',{querySelectorAll:()=>[{},{}]},()=>true),'ambiguous');
});
test('Tab containment covers heading, first and last controls without hijacking other keys',()=>{
 assert.equal(m.trapIndex('Tab',false,-1,5),0);assert.equal(m.trapIndex('Tab',true,0,5),4);assert.equal(m.trapIndex('Tab',false,4,5),0);assert.equal(m.trapIndex('Tab',false,2,5),null);
 for(const key of ['Home','ArrowRight','Enter',' ','Escape']) assert.equal(m.trapIndex(key,false,0,5),null);
});
test('focus restoration uses connected invoker or safe launcher fallback',()=>{
 const connected={isConnected:true,getClientRects:()=>[{}],closest:()=>null,matches:()=>false},fallback={isConnected:true};
 assert.equal(m.focusDestination(connected,fallback),connected);
 assert.equal(m.focusDestination({...connected,isConnected:false},fallback),fallback);
 assert.equal(m.focusDestination({...connected,matches:()=>true},fallback),fallback);
 assert.equal(m.focusDestination({...connected,getClientRects:()=>[]},fallback),fallback);
 assert.equal(m.focusDestination(null,null),null);
});
test('server rendered initial dialog is named, described, closed and has manual controls',()=>{
 const html=renderGuide(guide);assert.match(html,/<dialog[^>]*aria-labelledby=/);assert.match(html,/aria-describedby=/);assert.doesNotMatch(html,/<dialog[^>]*\sopen(?:=|\s|>)/);
 for(const label of ['Next','Back','Pause to try this','Skip','Restart','Close field guide'])assert.ok(html.includes(label));
 assert.ok(!html.includes('>Finish<'));assert.match(html,/tabindex="-1"/);
});
test('renderer and integration expose no automatic research/camera/audio mutation ports',()=>{
 const source=fs.readFileSync(path.join(root,'src/guidance/GuidedTutorial.tsx'),'utf8');
 for(const forbidden of ['speechSynthesis','scrollIntoView','window.open','location.href =','setQuery(','setAreaFilter(','send("','pinCasebookItem','makeDownload'])assert.ok(!source.includes(forbidden),forbidden);
 const app=fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
 const onkey=app.indexOf('const onKey =');assert.ok(app.indexOf('if (helpOpen || event.defaultPrevented) return;',onkey)<app.indexOf('send("stop")',onkey));
 assert.match(app,/aria-label=\{narration.state === "paused" \? "Resume narration" : "Pause narration"\}/);
 assert.ok(!app.includes('fieldwork-spatial-tutorial:v1'));
});
test('persisted final step renders explicit Finish while Close and Skip remain separate',()=>{
 const oldWindow=globalThis.window;
 const s=storage();s.setItem(m.progressKey(guide.id),JSON.stringify({version:2,step:12,status:'paused'}));
 globalThis.window={localStorage:s};
 try { const html=renderGuide(guide);assert.ok(html.includes('>Finish<'));assert.ok(!html.includes('>Next<'));assert.ok(html.includes('>Skip<'));assert.ok(html.includes('>Restart<'));assert.equal(JSON.parse(s.getItem(m.progressKey(guide.id))).status,'paused'); }
 finally { if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow; }
});
