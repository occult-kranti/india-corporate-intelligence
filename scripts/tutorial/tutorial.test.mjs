import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const catalog=JSON.parse(read('src/tutorial/catalog.json'));
const modelCode=ts.transpileModule(read('src/tutorial/model.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const model=await import(`data:text/javascript;base64,${Buffer.from(modelCode).toString('base64')}`);
const lengths={intro:5,'page:finance':3,'fairfax-idbi':7};

test('every explicit route is covered, including aliases and dynamic dossiers',()=>{
 const paths=[...read('src/App.tsx').matchAll(/<Route\s+path="([^"]+)"/g)].map(match=>match[1]).filter(value=>value!=='*');
 assert.ok(paths.length>=60,'Expected the retained full route system.');
 for(const route of paths)assert.ok(catalog.guides.some(guide=>guide.path===route||guide.aliases?.includes(route)),`Missing guide for ${route}`);
 assert.ok(catalog.guides.some(guide=>guide.path==='/board'));
});
test('all 52 page modules are accounted for, including superseded and nested modules',()=>{
 const modules=fs.readdirSync(path.join(root,'src/pages')).filter(name=>name.endsWith('.tsx'));
 const covered=new Set(catalog.guides.flatMap(guide=>guide.modules));
 for(const name of modules)assert.ok(covered.has(name),`Missing page module ${name}`);
 assert.ok(catalog.guides.find(guide=>guide.id==='group').features.some(step=>step.body.includes('superseded')));
});
test('guide IDs are unique and every entry explains real controls and evidence boundaries',()=>{
 assert.equal(new Set(catalog.guides.map(guide=>guide.id)).size,catalog.guides.length);
 for(const guide of [...catalog.guides,...catalog.staticGuides]){
  assert.ok(guide.title&&guide.path&&guide.features.length>=3,guide.id);
  for(const step of guide.features)assert.ok(step.title&&step.body.length>50,`${guide.id}: ${step.title}`);
 }
});
test('case exercise sources and claim IDs resolve to the retained finance dataset',()=>{
 const finance=JSON.parse(read('global-evidence-workbench/ui/public/data/finance.json'));
 const current=finance.cases.find(item=>item.id===catalog.caseStudy.caseId);assert.ok(current);
 assert.equal(catalog.caseStudy.statusAsOf,current.statusAsOf);
 for(const source of catalog.caseStudy.sources){const retained=finance.sources.find(item=>item.id===source.id);assert.ok(retained);assert.equal(source.url,retained.url);assert.equal(source.locator,retained.locator);}
 for(const step of catalog.caseStudy.steps){for(const id of step.sourceIds)assert.ok(catalog.caseStudy.sources.some(source=>source.id===id));for(const id of step.claimIds||[])assert.ok(finance.claims.some(claim=>claim.id===id&&claim.caseId===current.id));}
});
test('IDBI exercise preserves stage, denominators, overlapping votes, proposal and valuation limits',()=>{
 const text=JSON.stringify(catalog.caseStudy);
 for(const requirement of ['already-reported','no binding definitive agreements','52,878.0806181','30.48%','30.24%','41.9%','43.3%','Do not add','economic equity','no named acquisition lender','potential asset sales','94.42','75.99','INR 81','not independently reproduced fair value'])assert.ok(text.includes(requirement),requirement);
 for(const step of catalog.caseStudy.steps.filter(step=>step.question)){assert.ok(step.answers.length>=2);assert.ok(step.correct>=0&&step.correct<step.answers.length);assert.ok(step.explanation);}
});
test('malformed, stale and foreign storage cannot create an active tutorial',()=>{
 for(const value of [null,'bad JSON','null','[]','{"version":2,"tours":{}}'])assert.deepEqual(model.readProgress(value,lengths),model.emptyProgress());
 const value=model.readProgress(JSON.stringify({version:1,lastTour:'missing',tours:{intro:{step:800,status:'active',updatedAt:'today'},missing:{step:0,status:'paused'},'fairfax-idbi':{step:1.5,status:'active'}}}),lengths);
 assert.equal(value.tours.intro.step,4);assert.equal(value.tours.intro.status,'paused');assert.equal(value.lastTour,null);assert.equal(Object.keys(value.tours).length,1);
});
test('pause, skip, resume and replay preserve other guide progress',()=>{
 let value=model.updateProgress(model.emptyProgress(),'intro',2,'paused',5,'test');
 value=model.updateProgress(value,'page:finance',1,'skipped',3,'test','/finance?iw_view=dossier&iw_state=mh');
 assert.equal(value.tours.intro.step,2);assert.equal(value.lastTour,'page:finance');
 value=model.updateProgress(value,'page:finance',0,'active',3,'test');assert.equal(value.tours['page:finance'].route,'/finance?iw_view=dossier&iw_state=mh');
 value=model.readProgress(JSON.stringify(value),lengths);assert.equal(value.tours['page:finance'].status,'paused');
 assert.equal(value.tours.intro.step,2);
});
test('storage rejects unsafe route restoration and clamps indices',()=>{
 const raw={version:1,lastTour:'intro',tours:{intro:{step:-42,status:'paused',route:'//untrusted.example',updatedAt:'x'}}};
 const value=model.readProgress(JSON.stringify(raw),lengths);assert.equal(value.tours.intro.step,0);assert.equal(value.tours.intro.route,undefined);
 assert.deepEqual(model.updateProgress(value,'intro',NaN,'active',5),value);
});
test('route matching preserves exact identities and query scope for a current dossier',()=>{
 assert.ok(model.matchesRoute('/company/:id','/company/reliance-industries'));
 assert.ok(!model.matchesRoute('/company/:id','/company/'));
 assert.ok(!model.matchesRoute('/company/:id','/company/a/more'));
 const current=model.guideDestination({path:'/finance'},'/finance','?iw_state=TN&lens=capital');
 const url=new URL(current,'https://local.test');assert.equal(url.searchParams.get('lens'),'capital');assert.equal(url.searchParams.get('iw_state'),'TN');assert.equal(url.searchParams.get('iw_view'),'dossier');
 assert.equal(model.guideDestination({path:'/board'},'/board','',false),'/board');
});
test('search finds feature terms and combines words rather than searching titles alone',()=>{
 assert.ok(model.matchesHelpQuery(catalog.guides.find(guide=>guide.id==='education'),'export source'));
 assert.ok(model.matchesHelpQuery(catalog.caseStudy,'voting denominator'));
 assert.ok(!model.matchesHelpQuery(catalog.guides.find(guide=>guide.id==='search'),'unicorn zzz'));
});
test('static HTML exposes one help script, the tutorial theme and case-board links',()=>{
 for(const filename of ['index','finance','media']){const html=read(`global-evidence-workbench/ui/${filename}.html`);assert.equal((html.match(/src="\.\/src\/tutorial\.js"/g)||[]).length,1);assert.ok(html.includes('href="./src/tutorial.css"'));assert.ok(html.includes('href="./src/archive.css"'));assert.ok(html.includes('href="../#/board"'));assert.ok(html.includes('data-tutorial-page='));}
});
test('UI sources retain accessible native dialogs, explicit dismiss, source links and reduced motion',()=>{
 const react=read('src/tutorial/TutorialProvider.tsx'),staticJs=read('global-evidence-workbench/ui/src/tutorial.js');
 for(const token of ['showModal','onCancel','aria-labelledby','Pause and close tutorial','Skip tour','Resume','Replay','prefers-reduced-motion'])assert.ok(react.includes(token),token);
 for(const token of ['showModal','cancel','aria-labelledby','Pause and close tutorial','Skip tour','Resume','Replay','prefers-reduced-motion'])assert.ok(staticJs.includes(token),token);
 assert.ok(read('src/tutorial/tutorial.css').includes('@media(prefers-reduced-motion:reduce)'));assert.ok(read('global-evidence-workbench/ui/src/tutorial.css').includes('@media(prefers-reduced-motion:reduce)'));
});
