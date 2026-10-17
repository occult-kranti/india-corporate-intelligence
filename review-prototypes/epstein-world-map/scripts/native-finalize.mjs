import {writeFile as fsWriteFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {summaryFor} from './report-contract.mjs';
// Each cleanup and receipt operation is independent; one rejection cannot skip others.
export async function finalizeNative({context,browser,http,report,inventory,output,writeFile=fsWriteFile,setFailure=()=>{process.exitCode=1;},cleanupTimeoutMs=10000}){
 const fail=(stage,error)=>{report.status='failed';(report.cleanupErrors??=[]).push({stage,error:String(error)});setFailure();};
 const attempt=async(stage,fn)=>{let timer;try{await Promise.race([fn(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Cleanup deadline exceeded')),cleanupTimeoutMs);})]);}catch(e){fail(stage,e);}finally{clearTimeout(timer);}};
 if(context)await attempt('trace',()=>context.tracing.stop({path:resolve(output,'trace.zip')}));
 if(context)await attempt('context',()=>context.close());
 if(browser)await attempt('browser',()=>browser.close());
 if(http)await attempt('server',()=>http.close());
 report.finishedAt=new Date().toISOString();report.completedCases=inventory.filter(x=>x.status==='passed').length;
 const receiptFailure=(stage,error)=>{report.status='failed';(report.receiptErrors??=[]).push({stage,error:String(error)});setFailure();};
 // Summary is fixed-template data, but stays private until the release gate validates it.
 try{await writeFile(resolve(output,'summary.md'),summaryFor(report));}catch(e){receiptFailure('summary',e);}
 try{await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}catch(e){receiptFailure('report',e);}
 return report;
}
