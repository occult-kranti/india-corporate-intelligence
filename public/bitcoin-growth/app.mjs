import {metricConfig,escapeHTML as h,safeURL,monthKey,monthIndex,monthFromIndex,admittedRows,visibleEvents,occurred,countryCode,countryMeaning,metricValue,formatValue,chartPath,relationshipRows} from './model.mjs';

const $=id=>document.getElementById(id);
const state={month:'2026-10',metric:'HashRate',context:false,country:null,selected:null,zoom:1,relations:false};
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let data,geography,lastTrigger=null;
const countryNames={US:'United States',JP:'Japan',SV:'El Salvador',CN:'China (mainland scope)'};
const caveatText=r=>[r.original_caveat,r.caveat].filter(Boolean).join(' ');
const words=value=>String(value??'').replaceAll('_',' ');
const link=(url,label)=>safeURL(url)?`<a href="${h(safeURL(url))}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${h(label)} ↗</a>`:h(label);
const monthLabel=m=>new Intl.DateTimeFormat('en-US',{year:'numeric',month:'long',timeZone:'UTC'}).format(new Date(`${m}-01T00:00:00Z`));
const sourceById=id=>data.sources.find(s=>s.id===id);
const sourceButtons=ids=>ids.map(id=>{const s=sourceById(id);return s?`<button class="record-source" data-source="${h(id)}">${h(s.title)}<small>${h(id)} · ${h(words(s.source_kind))} · source date ${h(s.document_or_publication_date||'not established')}</small></button>`:'';}).join('');
const provenance=()=>`Sources reviewed ${data.review.reviewed_at.slice(0,10)} · Data refreshed ${data.last_refresh} · Metric coverage ${data.coverage.start}–${data.coverage.end} UTC.`;
const selectedEvent=()=>admittedRows(data,'events').find(e=>e.id===state.selected);

function drawer(title,html,trigger=document.activeElement){
  lastTrigger=trigger; $('drawer-title').textContent=title; $('drawer-content').innerHTML=html;
  if(!$('source-drawer').open)$('source-drawer').showModal();
  $('close-drawer').focus();
}
function closeDrawer(){if($('source-drawer').open)$('source-drawer').close();}
function sourceHTML(s){return `<section class="source-item"><h3>${h(s.title)}</h3><p>${link(s.url,'Open original source')}</p><dl><dt>Source ID / kind</dt><dd>${h(s.id)} · ${h(words(s.source_kind))}</dd><dt>Document date</dt><dd>${h(s.document_or_publication_date||'Not established; do not substitute the event date')}</dd><dt>Exact locator</dt><dd>${h(s.locator||'Not supplied')}</dd><dt>Retrieved</dt><dd>${h(s.retrieved_at||s.retrieved_date)}</dd><dt>Reading coverage</dt><dd>${h(s.reading_coverage)}</dd></dl>${s.sha256?`<details><summary>Retained-source checksum</summary><p>${h(s.sha256)}</p></details>`:''}<p class="fine">The original is linked. No archival copy is served in this board. Source support is distinct from independent verification of the underlying event.</p></section>`;}
function openSource(id){const s=sourceById(id);if(s)drawer(s.title,sourceHTML(s)+`<p class="mini-provenance">${h(provenance())}</p>`);}
function openMethods(){drawer('How to read this atlas',`<h3>Two different kinds of evidence</h3><p>The map shows selected dated jurisdiction and institutional contexts. The charts show global Bitcoin measures. No country-level adoption, mining share, reachable-node series or wallet-to-person location was acquired.</p><h3>Review boundary</h3><p>${data.events.length} historical records, all ${data.nodes.length} reviewed node records and ${data.edges.length} typed relationships passed a source-first local review with their qualifications. Nine stronger inferences remain held outside the display. Review establishes narrow source support, not a full audit of underlying events.</p><ul>${data.limits.map(x=>`<li>${h(x)}</li>`).join('')}</ul><h3>Metric coverage & missingness</h3><p>${data.coverage.daily_rows.toLocaleString()} daily rows; ${data.coverage.monthly_rows} derived monthly observations. Coverage ${data.coverage.start} through ${data.coverage.end} UTC. No missing calendar dates; hash rate is null for the first six days (January 3–8, 2009), never zero-filled. January 2009 and October 2026 are partial months.</p><p>The provider reports zero supply on genesis day; this is retained in the source and not silently “repaired.” Monthly supply is the last daily observation. No historical user census is inferred.</p><p>Arithmetic was independently reconciled with the retained provider payload. Acquisition timing and the blockchain were not independently reconstructed.</p><h3>License & transformations</h3><p>${h(data.license.author)} Community Data. ${link(data.license.url,data.license.name)}. ${link(data.license.source_url,'Pinned source query')}.</p><p>${h(data.license.changes)}</p><p>${h(data.usage)} No provider endorsement is implied.</p><p class="mini-provenance">${h(provenance())}</p>`);}
function openMetricSources(){const m=data.metrics.find(m=>m.id===state.metric);drawer(metricConfig[state.metric].label,`<p>${h(m.definition)}</p><p><strong>Display unit:</strong> ${h(metricConfig[state.metric].unit)}. <strong>Aggregation:</strong> ${h(metricConfig[state.metric].aggregation)}.</p><ul>${m.limits.map(x=>`<li>${h(x)}</li>`).join('')}</ul><p>Six early hash-rate nulls are excluded from the mean, with the observed denominator retained. No 30-day series is claimed: this chart displays monthly summaries.</p>${m.sources.map(id=>sourceHTML(sourceById(id))).join('')}<p>${link(data.license.url,data.license.name)} · ${h(data.license.changes)}</p><p class="mini-provenance">${h(provenance())}</p>`);}

function renderMap(){
  const events=visibleEvents(data,{...state,country:null}).filter(e=>occurred(e,state.month));
  const counts={};for(const e of events){const code=countryCode(e);if(code)counts[code]=(counts[code]||0)+1;}
  const selected=selectedEvent();const selectedCode=selected?countryCode(selected):null;
  for(const path of $('country-paths').children){const code=path.dataset.country;path.classList.toggle('recorded',!!counts[code]);path.classList.toggle('selected',code===selectedCode);}
  $('country-buttons').innerHTML=Object.entries(counts).map(([code,n])=>`<button data-country="${code}" aria-pressed="${state.country===code}">${h(countryNames[code])} · ${n} record${n===1?'':'s'}</button>`).join('')||'<span class="fine">No mapped jurisdiction records through this month.</span>';
  $('clear-country').hidden=!state.country;
  $('map-context').textContent=selected?countryMeaning(selected):`${Object.keys(counts).length} documented country contexts through ${monthLabel(state.month)}. Counts are selected records, never users, adoption scores or mining shares. Protocol records remain unlocated.`;
}
function renderMetrics(){
  const row=data.months.find(m=>m.month===state.month);const config=metricConfig[state.metric];
  $('metric-switcher').innerHTML=Object.entries(metricConfig).map(([key,c])=>`<button data-metric="${key}" aria-pressed="${state.metric===key}"><span>${h(c.short)}</span><strong>${h(formatValue(metricValue(row,key)))}</strong><small>${h(c.unit)}</small></button>`).join('');
  $('chart-title').textContent=config.label;$('chart-unit').textContent=`${config.unit} · linear scale`;
  const {max,path}=chartPath(data.months,state.metric);const ix=data.months.findIndex(m=>m.month===state.month);const x=ix/Math.max(1,data.months.length-1)*900;
  const y=row?180-metricValue(row,state.metric)/max*180:0;
  $('chart-content').innerHTML=`<g transform="translate(48 14)">${[0,.5,1].map(r=>`<path d="M0 ${r*180}H900" class="chart-grid"/><text x="-8" y="${r*180+4}" text-anchor="end" class="chart-axis">${h(new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(max*(1-r)))}</text>`).join('')}<path d="${path}" class="chart-path"/>${row?`<path d="M${x.toFixed(2)} 0V180" class="chart-cursor"/><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.5" class="chart-dot"/>`:''}${[0,60,120,180,213].map(i=>`<text x="${i/213*900}" y="204" text-anchor="${i===0?'start':i===213?'end':'middle'}" class="chart-axis">${data.months[i].month.slice(0,4)}</text>`).join('')}</g>`;
  $('chart-description').textContent=`Global Bitcoin ${config.label}; ${config.aggregation}. ${data.months.length} monthly observations, January 2009 through October 2026. Selected ${monthLabel(state.month)}: ${row?formatValue(metricValue(row,state.metric))+' '+config.unit:'outside the observation window'}. The expandable table provides all values.`;
  $('metric-observation').innerHTML=row?`<strong>${h(monthLabel(state.month))}:</strong> ${h(config.aggregation)}. ${row.observed_days} days observed, ${row.first_day}–${row.last_day} UTC.${state.metric==='HashRate'?` ${row.HashRate_nonnull_days} non-null hash-rate days.`:''} ${row.complete_calendar_month?'Complete calendar month.':'<span class="partial">Partial calendar month; do not compare totals as a full month.</span>'}`:`<strong>No observation for ${h(monthLabel(state.month))}.</strong> The global series begins ${data.coverage.start}; no values are backfilled.`;
  $('metric-limit').textContent='The chart shows the full observation series; the cursor selects one month. '+config.limit+(state.metric==='SplyCur'?' Provider supply on genesis day is zero; monthly values use the last observation.':'');
  $('table-wrap').innerHTML=`<table><caption class="sr-only">${h(config.label)}. ${h(config.unit)}. Coin Metrics derived monthly data.</caption><thead><tr><th scope="col">Month</th><th scope="col">${h(config.unit)}</th><th scope="col">Observed days</th><th scope="col">Coverage</th></tr></thead><tbody>${data.months.map(m=>`<tr><th scope="row">${m.month}</th><td>${h(formatValue(metricValue(m,state.metric)))}</td><td>${state.metric==='HashRate'?`${m.HashRate_nonnull_days} non-null / `:''}${m.observed_days}</td><td>${m.complete_calendar_month?'Complete':'Partial'}</td></tr>`).join('')}</tbody></table>`;
  $('data-credit').innerHTML=`Data: ${link(data.license.source_url,'Coin Metrics Community Data')} · ${link(data.license.url,data.license.name)} · monthly aggregates calculated for this board; hash rate converted to EH/s. Coverage ${data.coverage.start}–${data.coverage.end} UTC. Refreshed ${h(data.last_refresh)}. Noncommercial use; no endorsement implied.`;
}
function renderSelection(){
  const event=selectedEvent();$('clear-selection').hidden=!event;
  if(!event){$('selected-record').innerHTML='<h2 id="record-heading">Follow the evidence.</h2><p>Select a chronological card below to read its date, scope and original sources.</p><p class="fine">Global events remain unlocated. A country highlight expresses only the geographic role documented in that record.</p>';return;}
  const dates=[['Record date',event.event_time],['Precision',event.date_precision],['Stage',words(event.stage)],['Disclosure',event.disclosure_time],['Effective',event.effective_time],['First issue',event.first_disclosure_time]].filter(r=>r[1]);
  $('selected-record').innerHTML=`<span class="record-index">${h(event.id)} / ${h(words(event.asset_scope))}</span><h2 id="record-heading">${h(event.title)}</h2><dl class="date-grid">${dates.map(([k,v])=>`<dt>${h(k)}</dt><dd>${h(v)}</dd>`).join('')}</dl><p class="qualified">${h(caveatText(event)||'This record establishes the stated historical milestone only.')}</p><p>${h(countryMeaning(event))}</p>${event.geography?.scope?`<p class="fine">${h(event.geography.scope)}</p>`:''}${event.amount?`<p><strong>Reported amount:</strong> ${h(event.amount.qualifier||'')} ${h(formatValue(Number(event.amount.quantity||event.amount.btc)))} ${h(event.amount.unit||'BTC')}. Reporting date ${h(event.event_time)}.</p>`:''}<details><summary>What the source review supports</summary><p>${h(event.evidence_scope)}</p></details><p class="source-label"><strong>Original sources / ${event.source_ids.length}</strong></p>${sourceButtons(event.source_ids)}<p class="mini-provenance">${h(provenance())} Historical source claim; current validity is not inferred.</p>`;
  $('selected-record').scrollTop=0;
}
function renderTimeline(){
  const events=visibleEvents(data,state);const past=events.filter(e=>occurred(e,state.month));
  $('timeline-count').textContent=`${events.length} reviewed records in this view; ${past.length} within the through-month boundary. Uncovered date ranges remain visible so you can jump ahead. Year-only records use year-end for browsing; no month is inferred. Original date precision is retained.`;
  $('timeline').innerHTML=events.map(e=>`<button class="timeline-card${occurred(e,state.month)?'':' future'}" data-event="${h(e.id)}" aria-pressed="${state.selected===e.id}"><time datetime="${h(e.event_time)}">${h(e.event_time)} · ${h(e.date_precision)}</time><strong>${h(e.title)}</strong><small>${h(words(e.asset_scope))} / ${h(words(e.layer))}<br>${e.geography?h(words(e.geography.kind)):'Global / unlocated'}</small><span class="status-label">${e.id} · ${occurred(e,state.month)?'WITHIN VIEW BOUNDARY':e.date_precision==='year'?'YEAR NOT YET FULLY COVERED':'LATER THAN SELECTED MONTH'}</span></button>`).join('')||'<p class="fine">No reviewed records match this filter. Clear the country filter or include broader-crypto context.</p>';
}
function renderRelations(){
  $('relations-list').hidden=!state.relations;$('toggle-relations').setAttribute('aria-expanded',String(state.relations));$('toggle-relations').textContent=state.relations?'Hide relationships':'Show relationships';
  if(!state.relations)return;
  const rows=relationshipRows(data,state.month);const node=id=>data.nodes.find(n=>n.id===id);
  $('relations-list').innerHTML=rows.map(e=>`<article class="relation" data-relation="${h(e.id)}"><div class="relation-triplet"><span class="relation-node">${h(node(e.subject)?.label||e.subject)}</span><span class="relation-predicate">${h(words(e.relationship))}</span><span class="relation-node">${h(node(e.object)?.label||e.object)}</span></div><p><strong>${h(e.id)} / ${h(e.valid_at)}</strong> · ${h(words(e.time_basis||'dated source observation; not a continuing state'))}. ${h(words(e.stage))}.</p>${e.amount?`<p>Reported amount: ${h(e.amount.qualifier||'')} ${h(formatValue(Number(e.amount.quantity)))} ${h(e.amount.unit)}. Date ${h(e.valid_at)}.</p>`:''}<p>${h(caveatText(e)||'This is the stated source relationship, not evidence of a separate transfer or present-day state.')}</p><details><summary>Source review and endpoint roles</summary><p>${h(e.evidence_scope)}</p><p>${h(node(e.subject)?.kind)} → ${h(node(e.object)?.kind)}. End date ${e.valid_to?h(e.valid_to):'unknown; no current validity inferred'}.</p></details>${sourceButtons(e.source_ids)}<p class="mini-provenance">${h(provenance())}</p></article>`).join('')||'<p class="fine">No reviewed relationships are dated through this month.</p>';
  const endpointCount=new Set(admittedRows(data,'edges').flatMap(e=>[e.subject,e.object])).size;
  $('relations-list').insertAdjacentHTML('beforeend',`<details class="node-registry"><summary>All ${data.nodes.length} reviewed node records (${endpointCount} are relationship endpoints)</summary><p class="fine">The full reviewed set is conserved. The relationship list is a view of cited edges, not a filter on which nodes exist. Null coordinates remain null.</p>${data.nodes.map(n=>`<article class="relation"><h3>${h(n.label)}</h3><p>${h(words(n.kind))} · ${h(n.review_decision)}. ${h(n.evidence_scope)}</p>${sourceButtons(n.source_ids)}</article>`).join('')}</details>`);
}
function render(){
  $('month').value=monthIndex(state.month);$('month-label').textContent=monthLabel(state.month);$('month').setAttribute('aria-valuetext',monthLabel(state.month));
  renderMap();renderMetrics();renderSelection();renderTimeline();renderRelations();
  $('provenance-line').textContent=`${provenance()} ${data.coverage.daily_rows.toLocaleString()} daily / ${data.coverage.monthly_rows} monthly observations. Review projection ${data.review.version}. Original source records preserved; only admitted claims are displayed.`;
}
function updateMonth(month){closeDrawer();state.month=month;const e=selectedEvent();if(e&&!occurred(e,month))state.selected=null;render();}
function selectEvent(id){const e=admittedRows(data,'events').find(e=>e.id===id);if(!e)return;closeDrawer();state.selected=id;state.month=monthKey(e.event_time);render();$('announcement').textContent=`Selected ${e.title}. ${e.event_time}. ${countryMeaning(e)}`;}
function setZoom(value){const box=$('map-viewport');const old=state.zoom;state.zoom=Math.max(1,Math.min(4,value));box.style.setProperty('--zoom',state.zoom);box.scrollLeft=(box.scrollLeft+box.clientWidth/2)*state.zoom/old-box.clientWidth/2;box.scrollTop=(box.scrollTop+box.clientHeight/2)*state.zoom/old-box.clientHeight/2;$('zoom-label').textContent=`${Math.round(state.zoom*100)}%`;$('zoom-out').disabled=state.zoom===1;$('zoom-in').disabled=state.zoom===4;}
function pan(x,y){$('map-viewport').scrollBy({left:x,top:y,behavior:'auto'});}
function resetMap(){setZoom(1);$('map-viewport').scrollTo(0,0);}
function scrollTimeline(direction){$('timeline').scrollBy({left:direction*Math.max(260,$('timeline').clientWidth*.75),behavior:reduced()?'auto':'smooth'});}

async function init(){
  const results=await Promise.all(['./data/projection-v2.json','./assets/world-paths-v1.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error(`Could not load ${url} (${r.status})`);return r.json();}));
  [data,geography]=results;
  if(data.schema_version!=='olympus-bitcoin-public-noncommercial-projection-v2'||!data.review||data.public_use_authorized!==true||data.publication_contract?.purpose!=='noncommercial_research'||data.publication_contract?.commercial_permission_claimed!==false)throw Error('The versioned noncommercial review projection is missing or has an unexpected contract.');
  state.month=monthKey(data.coverage.end);$('month').max=monthIndex(state.month);$('month').min=monthIndex('1980-01');
  $('country-paths').innerHTML=geography.paths.map(p=>`<path class="country" data-country="${h(p.code)}" d="${h(p.d)}"><title>${h(p.name)}</title></path>`).join('');
  $('open-methods').addEventListener('click',openMethods);$('metric-source').addEventListener('click',openMetricSources);
  $('geography-source').addEventListener('click',()=>{const s=geography.sources[0];drawer('Geography provenance',`<p>${h(s.title)}. ${link(s.url,'Original dataset')} · ${link(s.licenseUrl,s.license)}.</p><p>Retained geometry retrieved ${h(s.retrievedAt)}. ${h(geography.transformation)}</p><ul>${s.limitations.map(l=>`<li>${h(l)}</li>`).join('')}</ul><p>Display uses equirectangular projection, not the Mercator option discussed in the upstream reuse notes. Current generalized boundaries are background context, not a reconstruction of historical borders.</p><p>No invented point coordinates, wallet locations, person origins or geographic relationship edges are rendered.</p><p class="mini-provenance">${h(provenance())}</p>`);});
  $('close-drawer').addEventListener('click',closeDrawer);$('source-drawer').addEventListener('close',()=>{if(lastTrigger?.isConnected)lastTrigger.focus();});
  $('month').addEventListener('input',e=>updateMonth(monthFromIndex(Number(e.target.value))));
  $('latest').addEventListener('click',()=>updateMonth(monthKey(data.coverage.end)));
  $('include-context').addEventListener('change',e=>{closeDrawer();state.context=e.target.checked;state.country=null;if(!visibleEvents(data,state).some(e=>e.id===state.selected))state.selected=null;render();});
  $('clear-selection').addEventListener('click',()=>{const previous=state.selected;state.selected=null;render();document.querySelector(`[data-event="${previous}"]`)?.focus({preventScroll:true});});
  $('clear-country').addEventListener('click',()=>{state.country=null;render();$('country-buttons').querySelector('button')?.focus();});
  $('toggle-relations').addEventListener('click',()=>{state.relations=!state.relations;renderRelations();});
  $('timeline-prev').addEventListener('click',()=>scrollTimeline(-1));$('timeline-next').addEventListener('click',()=>scrollTimeline(1));
  $('zoom-in').addEventListener('click',()=>setZoom(state.zoom+.5));$('zoom-out').addEventListener('click',()=>setZoom(state.zoom-.5));$('map-reset').addEventListener('click',resetMap);
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.source)openSource(button.dataset.source);
    if(button.dataset.event){selectEvent(button.dataset.event);document.querySelector(`[data-event="${button.dataset.event}"]`)?.focus({preventScroll:true});}
    if(button.dataset.metric){state.metric=button.dataset.metric;renderMetrics();document.querySelector(`[data-metric="${state.metric}"]`)?.focus({preventScroll:true});}
    if(button.dataset.country){const code=button.dataset.country;state.country=state.country===code?null:code;state.selected=null;render();document.querySelector(`button[data-country="${code}"]`)?.focus({preventScroll:true});}
    if(button.dataset.pan)pan(...button.dataset.pan.split(',').map(Number));
  });
  $('world').addEventListener('click',e=>{if(consumeDragClick())return;const code=e.target.closest('path.recorded')?.dataset.country;if(code){state.country=state.country===code?null:code;state.selected=null;render();}});
  $('metric-chart').addEventListener('click',e=>{const rect=e.currentTarget.getBoundingClientRect();const unit=(e.clientX-rect.left)/rect.width*960;const index=Math.max(0,Math.min(data.months.length-1,Math.round((unit-48)/900*(data.months.length-1))));updateMonth(data.months[index].month);});
  const box=$('map-viewport');box.addEventListener('keydown',e=>{const moves={ArrowLeft:[-100,0],ArrowRight:[100,0],ArrowUp:[0,-100],ArrowDown:[0,100]};if(moves[e.key]){e.preventDefault();pan(...moves[e.key]);}else if(['+','=','-','0'].includes(e.key)){e.preventDefault();e.key==='0'?resetMap():setZoom(state.zoom+(e.key==='-'?-.5:.5));}});
  // Suppression belongs to one gesture only. Capture begins after an actual mouse
  // drag, so ordinary SVG clicks retain their native hit target.
  let gesture=null,suppressedUntil=0;
  const consumeDragClick=()=>{const suppress=performance.now()<suppressedUntil;suppressedUntil=0;return suppress;};
  const release=()=>{if(gesture?.captured&&box.hasPointerCapture?.(gesture.id))box.releasePointerCapture(gesture.id);box.classList.remove('dragging');};
  box.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch'&&e.button!==0)return;
    release();suppressedUntil=0;
    gesture={x:e.clientX,y:e.clientY,left:box.scrollLeft,top:box.scrollTop,id:e.pointerId,type:e.pointerType,dragged:false,captured:false};
  });
  box.addEventListener('pointermove',e=>{
    if(!gesture||e.pointerId!==gesture.id)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(Math.abs(dx)+Math.abs(dy)>4)gesture.dragged=true;
    if(gesture.type==='touch'||!gesture.dragged)return;
    if(!gesture.captured){box.setPointerCapture(e.pointerId);gesture.captured=true;}
    box.classList.add('dragging');box.scrollLeft=gesture.left-dx;box.scrollTop=gesture.top-dy;
  });
  box.addEventListener('pointerup',e=>{
    if(!gesture||e.pointerId!==gesture.id)return;
    suppressedUntil=gesture.dragged?performance.now()+500:0;release();gesture=null;
  });
  box.addEventListener('pointercancel',()=>{release();gesture=null;suppressedUntil=0;});
  render();setZoom(1);$('load-status').hidden=true;$('atlas').hidden=false;
}
init().catch(error=>{$('load-status').classList.add('error');$('load-status').textContent=`The atlas could not load. ${error.message} Serve the public folder over local HTTP using the README instructions, then reload. No unreviewed fallback data is displayed.`;console.error(error);});
