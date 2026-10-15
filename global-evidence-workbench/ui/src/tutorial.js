import { tutorialContent } from './tutorial-content.js';

// Isolated, opt-in help. Never alters evidence, claims or casebook storage.
const KEY = 'fieldwork-static-tutorial:v1';
const page = document.body.dataset.tutorialPage || 'global';
const guide = tutorialContent.staticGuides.find(item => item.id === page) || tutorialContent.staticGuides[0];
const study = tutorialContent.caseStudy;
const tourList = [...tutorialContent.staticGuides.map(item => ({...item, steps:item.features})), {id:study.id,title:study.title,steps:study.steps}];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safe = input => {
  const out = {version:1,lastTour:null,tours:{}};
  if (!input || input.version !== 1 || !input.tours) return out;
  for (const tour of tourList) { const value=input.tours[tour.id]; if(value && Number.isInteger(value.step) && ['active','paused','skipped','completed'].includes(value.status)) out.tours[tour.id]={step:Math.max(0,Math.min(tour.steps.length-1,value.step)),status:value.status==='active'?'paused':value.status}; }
  if(Object.hasOwn(out.tours,input.lastTour)) out.lastTour=input.lastTour;
  return out;
};
let state; try {state=safe(JSON.parse(localStorage.getItem(KEY)||'null'));} catch {state=safe(null);}
let mode='help',current=guide,index=0,opener=null,target=null,storageBlocked=false,positioner=null;
const launcher=document.createElement('button');launcher.type='button';launcher.className='fw-tutorial-launcher';launcher.textContent='?  Help';launcher.dataset.tutorialLauncher='';launcher.setAttribute('aria-label','Open help and page tutorials');
const nav=document.querySelector('.section-nav');(nav||document.body).append(launcher);
const dialog=document.createElement('dialog');dialog.className='fw-tutorial-dialog';dialog.dataset.tutorialUi='';dialog.setAttribute('aria-labelledby','fw-tutorial-title');document.body.append(dialog);
const save=status=>{state.tours[current.id]={step:index,status};state.lastTour=current.id;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageBlocked=true;}};
function removeHighlight(){positioner?.stop();positioner=null;target?.removeAttribute('data-tutorial-highlight');target=null;}
function findTarget(selector){if(!selector)return null;try{return [...document.querySelectorAll(selector)].find(el=>!el.closest('[data-tutorial-ui]')&&el.getBoundingClientRect().height>0&&el.getBoundingClientRect().width>0)||null;}catch{return null;}}
function highlight(){removeHighlight();if(mode!=='tour')return;const resolve=()=>{const next=findTarget(current.steps[index].selector);if(next!==target){target?.removeAttribute('data-tutorial-highlight');target=next;target?.setAttribute('data-tutorial-highlight','true');}return target;};positioner=tutorialContent.watchPosition(dialog,resolve,tutorialContent.getPlacement);}
function focusTitle(){requestAnimationFrame(()=>dialog.querySelector('h2')?.focus({preventScroll:true}));}
function show(){if(!dialog.open){opener=document.activeElement;dialog.showModal();}render();focusTitle();}
function close(restore=true){if(mode==='tour')save('paused');removeHighlight();dialog.close();if(restore)(opener?.isConnected?opener:launcher).focus({preventScroll:true});}
function start(id,replay=false){const tour=tourList.find(item=>item.id===id);if(!tour)return;if(tour.id!==study.id&&tour.id!==page){const filename=tour.path.split('/').pop();location.href=`./${filename}?tutorial=${encodeURIComponent(id)}`;return;}if(tour.id===study.id&&page!=='finance-global'){location.href='./finance.html?tutorial='+study.id;return;}current=tour;index=!replay&&state.tours[id]?.status!=='completed'?(state.tours[id]?.step||0):0;mode='tour';save('active');show();}
function sources(step){const rows=study.sources.filter(source=>step.sourceIds?.includes(source.id));if(!rows.length)return '';return `<details class="fw-tutorial-sources"><summary>Read the source trail · ${rows.length}</summary><p>Already-retained sources, not newly re-audited for this guide. Check the original for later developments.</p>${rows.map(source=>`<article><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a><small>${esc(source.id)} · ${esc(source.publisher)} · ${esc(source.publication_date)}</small><p>${esc(source.locator)}</p><p>${esc(source.limitations)}</p></article>`).join('')}${step.claimIds?`<p>Retained claims: ${esc(step.claimIds.join(', '))}</p>`:''}</details>`;}
function render(){
  const step=current.steps?.[index];const last=tourList.find(item=>item.id===state.lastTour);const entry=last&&state.tours[last.id];const canResume=entry&&['paused','active','skipped'].includes(entry.status);
  dialog.dataset.mode=mode;
  let body='';
  if(mode==='help')body=`${canResume?`<div class="fw-tutorial-resume"><div><strong>${esc(last.title)}</strong><small>Saved at step ${entry.step+1} of ${last.steps.length}</small></div><button data-start="${esc(last.id)}">Resume</button></div>`:''}<p>Get a short guide to the controls on this page, or practice reading a source-backed case.</p><button class="fw-tutorial-primary fw-tutorial-wide" data-start="${esc(guide.id)}" data-replay="true">Guide this page · ${guide.features.length} steps</button><button class="fw-tutorial-wide" data-start="${study.id}" data-replay="true">Fairfax / IDBI evidence exercise · 7 steps</button><label class="fw-tutorial-search">Search the field guide<input type="search" placeholder="Try: voting, filters, source, date…" aria-label="Search workbench help"></label><div class="fw-tutorial-results" aria-live="polite"></div><div class="fw-tutorial-links">${tutorialContent.staticGuides.map(item=>`<button data-start="${item.id}" data-replay="true">${esc(item.title)} <span>→</span></button>`).join('')}<a href="../#/board">Return to the India case board →</a></div><p class="fw-tutorial-note">Progress is stored only in this browser. Tutorials do not add evidence, infer relationships or submit research.</p>`;
  if(mode==='tour')body=`<div class="fw-tutorial-progress"><span>Step ${index+1} of ${current.steps.length}</span><progress aria-label="Tutorial progress" value="${index+1}" max="${current.steps.length}"></progress></div><p class="fw-tutorial-description">${esc(step.body)}</p>${current.id===study.id?`<p class="fw-tutorial-note">Already-reported findings · ${study.caseId} · status ${study.statusAsOf}</p><button data-action="case" class="fw-tutorial-wide">Show the retained IDBI case</button><p class="fw-tutorial-case-status" role="status"></p>`:''}${step.question?`<fieldset class="fw-tutorial-check"><legend>${esc(step.question)}</legend>${step.answers.map((answer,i)=>`<label><input type="radio" name="fw-tutorial-answer" value="${i}"><span>${esc(answer)}</span></label>`).join('')}<p class="fw-tutorial-answer" role="status"></p></fieldset>`:''}${sources(step)}${findTarget(step.selector)?'<button data-action="try">Try this control · pause guide →</button>':''}<p class="fw-tutorial-note">Pause to use the page. Reopen Help to resume. Escape saves your place and closes this guide.</p>`;
  if(mode==='complete')body=`<p>You’ve reached the end of “${esc(current.title)}”. Keep the source, date, scope and open questions beside your conclusions.</p><div class="fw-tutorial-row"><button data-action="done" class="fw-tutorial-primary">Continue research</button><button data-start="${esc(current.id)}" data-replay="true">Replay</button></div>`;
  dialog.innerHTML=`<div class="fw-tutorial-shell"><header><div><p>${mode==='tour'?esc(current.id===study.id?'Evidence exercise · retained snapshot':current.title):'Field guide'}</p><h2 id="fw-tutorial-title" tabindex="-1">${mode==='help'?'A clearer way into the record.':mode==='complete'?'Ready to use the evidence.':esc(step.title)}</h2></div><button data-action="close" aria-label="${mode==='tour'?'Pause and close tutorial':'Close help'}" class="fw-tutorial-close">×</button></header><div class="fw-tutorial-body">${body}</div>${storageBlocked?'<p class="fw-tutorial-warning" role="status">This browser blocked saving progress. Resume may not survive a reload.</p>':''}<footer>${mode==='tour'?`<button data-action="skip" class="fw-tutorial-quiet">Skip tour</button><div><button data-action="back" ${index===0?'disabled':''}>← Back</button><button data-action="next" class="fw-tutorial-primary">${index+1===current.steps.length?'Finish':'Next →'}</button></div>`:`<span>Escape closes help · no research changes</span>${mode==='complete'?'<button data-action="help">All guides</button>':''}`}</footer></div>`;
  dialog.querySelectorAll('[data-start]').forEach(button=>button.addEventListener('click',()=>start(button.dataset.start,button.dataset.replay==='true')));
  dialog.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>act(button.dataset.action)));
  dialog.querySelectorAll('[name="fw-tutorial-answer"]').forEach(radio=>radio.addEventListener('change',()=>{dialog.querySelector('.fw-tutorial-answer').textContent=(+radio.value===step.correct?'That keeps the claim bounded. ':'Look again at the source boundary. ')+step.explanation;}));
  const search=dialog.querySelector('[type="search"]');if(search){search.addEventListener('input',()=>searchHelp(search.value));searchHelp('');}
  highlight();
}
function searchHelp(query){const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);const rows=tourList.flatMap(tour=>tour.steps.map((step,i)=>({tour,step,i}))).filter(row=>words.every(word=>`${row.tour.title} ${row.step.title} ${row.step.body}`.toLowerCase().includes(word)));const results=dialog.querySelector('.fw-tutorial-results');results.innerHTML=words.length?`<p>${rows.length} matching topics</p>${rows.map(row=>`<button data-topic="${esc(row.tour.id)}" data-step="${row.i}"><strong>${esc(row.step.title)}</strong><small>${esc(row.tour.title)}</small></button>`).join('')}`:'<p>Search controls, evidence stages and source-reading advice.</p>';results.querySelectorAll('[data-topic]').forEach(button=>button.addEventListener('click',()=>{start(button.dataset.topic,true);if(dialog.open&&current.id===button.dataset.topic){index=+button.dataset.step;save('active');render();focusTitle();}}));}
function act(action){
  if(action==='close'||action==='done')return close();
  if(action==='help'){mode='help';render();focusTitle();return;}
  if(action==='skip'){save('skipped');mode='help';removeHighlight();dialog.close();(opener?.isConnected?opener:launcher).focus({preventScroll:true});return;}
  if(action==='next'){if(index+1===current.steps.length){save('completed');mode='complete';}else{index++;save('active');}render();focusTitle();return;}
  if(action==='back'&&index>0){index--;save('active');render();focusTitle();return;}
  if(action==='try'){const selected=target;if(!selected)return;close(false);const had=selected.hasAttribute('tabindex');if(!had)selected.tabIndex=-1;selected.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});selected.focus({preventScroll:true});if(!had)selected.addEventListener('blur',()=>selected.removeAttribute('tabindex'),{once:true});return;}
  if(action==='case'){
    const status=dialog.querySelector('.fw-tutorial-case-status');const records=document.getElementById('records');
    if(!records?.childElementCount){status.textContent='The finance records are still loading or unavailable. The source trail above remains readable.';return;}
    // The user explicitly requested the case. Narrow only reversible form filters.
    const form=document.getElementById('filters');form.reset();
    const search=document.getElementById('search');search.value='IDBI';search.dispatchEvent(new Event('input',{bubbles:true}));
    const record=records.querySelector('[data-record="IN-IDBI-2022"]');
    if(record){record.click();status.textContent='IDBI selected behind this guide. Filters now show IDBI; Reset restores the full collection.';}else status.textContent='The exact retained case was not found. No substitute case or relationship has been created.';
    return;
  }
}
launcher.addEventListener('click',()=>{mode='help';show();});dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
// Only an explicit tutorial/help link opens a guide on arrival; ordinary visits stay quiet.
const params=new URLSearchParams(location.search);if(params.get('tutorial'))start(params.get('tutorial'));else if(params.get('help')==='1'){mode='help';show();}
