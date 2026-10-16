import {GROUPS,GROUP_LABELS,statusGroup,groupCounts,validateSnapshot,selectTasks,freshness,safeURL} from './model.mjs';
const $=id=>document.getElementById(id);
function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
const displayTime=value=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(value))+' UTC';
function badge(status,reviewStage){return element('span',GROUP_LABELS[statusGroup(status)]+(status==='review-pending'?(reviewStage==='source-review'?' · Source review pending':' · Review pending'):''),'badge '+status);}
function renderTask(task){
 const card=element('article',undefined,'task');card.id='task-'+task.id;card.setAttribute('aria-labelledby','title-'+task.id);
 const meta=element('div',undefined,'task-state');meta.append(badge(task.status,task.reviewStage),element('span',task.role,'task-role'));
 const checked=element('time','Checked '+displayTime(task.lastChecked));checked.dateTime=task.lastChecked;meta.append(checked);
 const body=element('div');const title=element('h3',task.title);title.id='title-'+task.id;
 const next=element('p',undefined,'next-action');next.append(element('strong','NEXT ACTION'),document.createTextNode(task.nextAction));
 const sources=element('ul',undefined,'evidence');sources.setAttribute('aria-label','Evidence and reference titles');
 for(const evidence of task.evidence){const item=element('li');if(evidence.url&&safeURL(evidence.url)){const link=element('a',evidence.title+' ↗');link.href=evidence.url;link.rel='noopener noreferrer';item.append(link);}else item.textContent=evidence.title+' · title only';sources.append(item);}
 body.append(title,element('p',task.question,'question'),element('p',task.summary,'summary'),next,sources);
 if(task.completion)body.append(element('p','Verification: '+task.completion.note,'verification'));
 card.append(meta,body);return card;
}
async function main(){
 try{
  const response=await fetch('./snapshot.json',{cache:'no-store'});if(!response.ok)throw new Error('Snapshot file could not be loaded.');
  const data=await response.json();const result=validateSnapshot(data);if(!result.valid)throw new Error('Snapshot validation failed. Unverified data has been withheld.');
  $('scope').textContent=data.scope;$('as-of').textContent=displayTime(data.asOf);$('as-of').dateTime=data.asOf;
  const state=freshness(data);$('freshness').classList.toggle('stale',state!=='snapshot');
  $('freshness').textContent=state==='stale'?'This snapshot is more than '+data.freshnessHours+' hours old. Recheck sources before relying on task or release status.':state==='future'?'The snapshot timestamp is ahead of this device’s clock. Confirm the date before relying on status.':'Dated snapshot only. Updates record reviewed roadmap progress. “Working on” can include review pending; it does not indicate live worker activity. Recheck sources before release decisions.';
  $('total-count').textContent=data.tasks.length+' tracked items';$('checkpoint').textContent='Baseline: '+data.checkpointTitle;
  let active='all';const totals=groupCounts(data.tasks);const buttons=[];
  for(const status of ['all',...GROUPS]){
   const button=element('button',status==='all'?'All work':GROUP_LABELS[status],'filter');button.type='button';button.dataset.status=status;button.setAttribute('aria-pressed',String(status==='all'));
   button.append(element('span',String(status==='all'?data.tasks.length:totals[status]),'filter-count'));
   button.addEventListener('click',()=>{active=status;render();});buttons.push(button);$('filters').append(button);
  }
  function render(){
   for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.status===active));
   const tasks=selectTasks(data.tasks,{status:active,query:$('search').value});$('tasks').replaceChildren(...tasks.map(renderTask));$('empty').hidden=tasks.length>0;
   $('result-count').textContent=`${tasks.length} of ${data.tasks.length} items shown`+(active==='all'?'':' · '+GROUP_LABELS[active]);
  }
  $('search').addEventListener('input',render);$('search-form').addEventListener('submit',event=>event.preventDefault());
  $('search-form').addEventListener('reset',event=>{event.preventDefault();active='all';$('search').value='';render();$('search').focus();});
  for(const m of data.milestones){const task=data.tasks.find(t=>t.id===m.taskId);const li=element('li',undefined,'milestone');li.append(element('h3',m.title),badge(task.status),element('p',m.detail));$('milestone-list').append(li);}
  $('console-content').hidden=false;render();
 }catch(error){$('scope').textContent='The snapshot is unavailable.';$('as-of').textContent='Unavailable';$('freshness').hidden=true;$('error').hidden=false;$('error').textContent='Unable to show research activity. '+(error instanceof SyntaxError?'The snapshot file is not valid JSON.':error.message)+' Restore a validated snapshot and reload this page.';}
}
main();
