import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {ROOT} from './contract.mjs';
export const PREFIX='/review-prototypes/epstein-world-map/';
// No path-derived filesystem access: exactly two delivered HTML documents and one isolated pinned fixture.
export function resourceFor(raw,method='GET'){
 if(!['GET','HEAD'].includes(method)||typeof raw!=='string')return null;
 const exact=new Map([[PREFIX+'index.html','dist/index.html'],[PREFIX+'readable.html','dist/readable.html'],[PREFIX+'controller-fixture.html','dist/controller-fixture.html']]);
 return exact.get(raw)??null;
}
export async function startServer(){const requests=[];const server=createServer(async(req,res)=>{requests.push({method:req.method,path:req.url});const file=resourceFor(req.url,req.method);if(!file){res.writeHead(404,{'content-type':'text/plain','cache-control':'no-store'});res.end('Not found');return;}try{const bytes=await readFile(resolve(ROOT,file));res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-length':bytes.length,'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(500);res.end();}});await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok);});const origin=`http://127.0.0.1:${server.address().port}`;return {server,origin,base:origin+PREFIX,requests,close:()=>new Promise(ok=>server.close(ok))};}
