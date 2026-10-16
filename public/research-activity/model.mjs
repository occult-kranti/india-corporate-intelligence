export const STATUSES = ['planned', 'running', 'review-pending', 'blocked', 'completed'];
export const LABELS = {planned:'Planned',running:'Running', 'review-pending':'Review pending',blocked:'Blocked',completed:'Completed'};
export const GROUPS = ['completed', 'working', 'planned', 'blocked'];
export const GROUP_LABELS = {completed:'Done',working:'Working on',planned:'Next',blocked:'Blocked'};
export const statusGroup = status => status === 'running' || status === 'review-pending' ? 'working' : status;
export function groupCounts(tasks) {return Object.fromEntries(GROUPS.map(group=>[group,tasks.filter(task=>statusGroup(task.status)===group).length]));}
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const validTime = value => typeof value === 'string' && ISO.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().replace('.000','') === value;
const plain = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 1200 && !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) && !/https?:\/\//i.test(value);
export function safeURL(value) {
  if (typeof value !== 'string') return false;
  // A deliberate closed public-link policy, not a general-purpose URL sanitizer.
  return /^https:\/\/github\.com\/occult-kranti\/india-corporate-intelligence\/pull\/[1-9][0-9]*(?![\s\S])/.test(value);
}
function keys(object, allowed) {return object && typeof object === 'object' && !Array.isArray(object) && Object.keys(object).every(key => allowed.includes(key));}
export function validateSnapshot(data) {
  const errors=[];
  const fail=message=>errors.push(message);
  if (!keys(data,['schemaVersion','asOf','checkpointTitle','freshnessHours','scope','tasks','milestones'])) return {valid:false,errors:['Snapshot must be an object with approved fields only.']};
  if(data.schemaVersion !== 1) fail('Unsupported schema version.');
  if(!validTime(data.asOf)) fail('Invalid snapshot timestamp.');
  if(!plain(data.checkpointTitle)||!plain(data.scope)) fail('Invalid snapshot text.');
  if(!Number.isInteger(data.freshnessHours)||data.freshnessHours<1||data.freshnessHours>168) fail('Invalid freshness window.');
  if(!Array.isArray(data.tasks)||data.tasks.length<1||data.tasks.length>100) return {valid:false,errors:[...errors,'Expected 1–100 tasks.']};
  const ids=new Set();
  for (const task of data.tasks) {
    if(!keys(task,['id','title','status','role','question','lastChecked','nextAction','summary','evidence','completion','privateProjectLink','reviewStage'])) {fail('Task contains unknown fields.');continue;}
    if(typeof task.id!=='string'||!/^[a-z][a-z0-9-]{0,79}$/.test(task.id)||ids.has(task.id)) fail('Task IDs must be safe and unique.');
    ids.add(task.id);
    if(!STATUSES.includes(task.status)) fail('Unknown task status.');
    if(task.reviewStage !== undefined && (task.reviewStage !== 'source-review' || task.status !== 'review-pending')) fail('Source-review qualification requires review-pending status.');
    for(const field of ['title','role','question','nextAction','summary']) if(!plain(task[field])) fail(`Invalid ${field}.`);
    if(!validTime(task.lastChecked)||Date.parse(task.lastChecked)>Date.parse(data.asOf)) fail('Task timestamp must be valid and no newer than snapshot.');
    if(task.privateProjectLink !== null) fail('Private-project links must be disabled.');
    if(!Array.isArray(task.evidence)||task.evidence.length>20) {fail('Invalid evidence list.');continue;}
    for(const item of task.evidence) {
      if(!keys(item,['title','url'])||!plain(item?.title)||(item.url!==undefined&&!safeURL(item.url))) fail('Unsafe evidence or link.');
    }
    if(task.status==='completed') {
      const c=task.completion;
      if(!keys(c,['evidenceIndex','verifiedAt','note']) || !Number.isInteger(c.evidenceIndex) || !safeURL(task.evidence[c.evidenceIndex]?.url) || !validTime(c.verifiedAt) || Date.parse(c.verifiedAt)>Date.parse(task.lastChecked) || !plain(c.note)) fail('Completion requires a public evidence link, verification date and explanatory note.');
    } else if(task.completion !== undefined) fail('Only completed tasks may carry completion metadata.');
  }
  if(!Array.isArray(data.milestones)||data.milestones.length>20) fail('Invalid milestones.');
  else for(const m of data.milestones) if(!keys(m,['title','taskId','detail'])||!plain(m.title)||!plain(m.detail)||!ids.has(m.taskId)) fail('Invalid milestone or unknown task reference.');
  return {valid:errors.length===0,errors};
}
export function selectTasks(tasks,{status='all',query=''}={}) {
 const needle=query.trim().toLocaleLowerCase();
 return tasks.filter(t=>(status==='all'||t.status===status||(status==='working'&&statusGroup(t.status)==='working'))&&[t.title,t.question,t.role,t.summary,t.nextAction,...t.evidence.map(e=>e.title)].join(' ').toLocaleLowerCase().includes(needle));
}
export function counts(tasks) {return Object.fromEntries(STATUSES.map(status=>[status,tasks.filter(t=>t.status===status).length]));}
export function freshness(data,now=Date.now()) {
 const age=now-Date.parse(data.asOf);
 if(age<0) return 'future';
 return age>data.freshnessHours*3600000?'stale':'snapshot';
}
