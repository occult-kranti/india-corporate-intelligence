export const metricConfig = Object.freeze({
  HashRate: {label:'Estimated hash rate', short:'Hash rate', field:'HashRate_THs_daily_mean', divisor:1e6, unit:'EH/s', aggregation:'Mean of observed daily estimates', limit:'Compute power is not a count of miners or owners.'},
  TxCnt: {label:'On-chain transactions', short:'Transactions', field:'TxCnt_sum', divisor:1, unit:'transactions / observed month', aggregation:'Sum of daily transactions, excluding coinbase', limit:'Transactions are not people or payments.'},
  AdrActCnt: {label:'Daily active addresses', short:'Active addresses', field:'AdrActCnt_daily_mean', divisor:1, unit:'addresses / day', aggregation:'Mean of daily unique-address counts', limit:'Addresses are not users; daily uniques are not summed.'},
  SplyCur: {label:'Ledger supply', short:'Supply', field:'SplyCur_BTC_last', divisor:1, unit:'BTC', aggregation:'Last observed daily supply in selected month', limit:'Supply is not liquid or spendable supply; lost keys are unresolved.'}
});
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeURL(value) {try {const u=new URL(value); return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
// Year-only evidence enters a through-month view at year end; this is a browsing
// boundary, never an inferred publication month. Original date strings stay intact.
export function monthKey(value) {return value.length===4?`${value}-12`:value.slice(0,7);}
export function monthIndex(value) {const [y,m]=monthKey(value).split('-').map(Number);return y*12+m-1;}
export function monthFromIndex(n) {return `${Math.floor(n/12)}-${String(n%12+1).padStart(2,'0')}`;}
export function bitcoinScope(e) {return ['bitcoin','bitcoin_and_bitcoin_cash','precursor'].includes(e.asset_scope);}
export function admittedRows(data,kind) {
  const field=kind==='events'?'accepted_event_ids':'accepted_edge_ids';
  const ids=new Set(data.review[field]);
  return data[kind].filter(r=>r.status==='reviewed_source_claim'&&ids.has(r.id));
}
export function visibleEvents(data,state) {return admittedRows(data,'events').filter(e=>(state.context||bitcoinScope(e))&&(!state.country||countryCode(e)===state.country)).sort((a,b)=>a.event_time.localeCompare(b.event_time)||a.id.localeCompare(b.id));}
export function occurred(e,month) {return monthIndex(e.event_time)<=monthIndex(month);}
export function countryCode(e) {const code=e.geography?.code;return code==='US-DE'?'US':['US','JP','SV','CN'].includes(code)?code:null;}
export function countryMeaning(e) {
  if(!e.geography)return 'Global / unlocated record. No geographic origin is asserted.';
  const {kind,code}=e.geography;
  if(code==='EU')return 'European Union legal jurisdiction. No country crosswalk is drawn in this prototype.';
  if(code==='US-DE')return 'Delaware domicile, shown only at country scale as United States context. No asset or person location is implied.';
  if(kind==='program_country')return 'El Salvador is the borrower / program country. This is not the location of the IMF approval.';
  return `${kind.replaceAll('_',' ')} · ${e.geography.label?e.geography.label+' · ':''}${code}. Area highlight only; no precise event coordinates.`;
}
export function metricValue(row,key) {if(!row)return null; const v=row[metricConfig[key].field];return v===null?null:v/metricConfig[key].divisor;}
export function formatValue(v) {if(v===null||v===undefined)return 'No observation';if(v===0)return '0';if(v<.001)return v.toExponential(2);return new Intl.NumberFormat('en-US',{maximumFractionDigits:v<10?3:v<1000?2:0}).format(v);}
export function chartPath(rows,key,width=900,height=180) {
  const values=rows.map(r=>metricValue(r,key)); const max=Math.max(...values.filter(v=>v!==null),1);
  let pen=false; return {max,path:values.map((v,i)=>{if(v===null){pen=false;return '';}const point=`${(i/(rows.length-1)*width).toFixed(2)},${(height-v/max*height).toFixed(2)}`;const s=(pen?'L':'M')+point;pen=true;return s;}).join('')};
}
export function relationshipRows(data,month) {return admittedRows(data,'edges').filter(e=>monthIndex(e.valid_at)<=monthIndex(month));}
