// PROPOSAL ONLY. Fixed pinned codecs; raw bytes are never logged or rewritten.
import {createRequire} from 'node:module';
import {readFileSync, readSync, writeSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const SCHEMA='world-image-frame-proposal-v1', MAX_INPUT=32*1024*1024;
const CODEC='580f571bf063e2256b51b3946a035bc452fc0e22808d5547b198baea39923a32';
const base=resolve(process.env.GITHUB_WORKSPACE,'spatial-prototype');
const digest=b=>createHash('sha256').update(b).digest('hex');
function requireThat(value){if(!value)throw Error('FRAME_OR_CODEC_DENIED');}
function output(value){const line=Buffer.from(JSON.stringify(value)+'\n');requireThat(line.length<=512);let offset=0;while(offset<line.length)offset+=writeSync(1,line,offset,line.length-offset);}
function exact(size,cleanEof=false){const b=Buffer.allocUnsafe(size);let offset=0;while(offset<size){const n=readSync(0,b,offset,size-offset,null);if(!n){if(cleanEof&&offset===0)return null;throw Error('TRUNCATED_FRAME');}offset+=n;}return b;}
function decode(b){const image=b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?PNG.sync.read(b,{checkCRC:true}):jpegjs.decode(b,{useTArray:true,formatAsRGBA:true,tolerantDecoding:false,maxResolutionInMP:16,maxMemoryUsageInMB:256});requireThat(Number.isSafeInteger(image.width)&&Number.isSafeInteger(image.height)&&image.width>0&&image.height>0&&image.width<=4096&&image.height<=4096&&image.width*image.height<=16*1024*1024&&image.data.length===image.width*image.height*4);return {width:image.width,height:image.height};}
let PNG,jpegjs;
try{
 for(const [file,pin] of [['package.json','a6e52ae408cbf957e3726601864d149703f1be96e13c607f16cdf8fd9f383134'],['package-lock.json','01e715955bbde6e3b4baf72ecfaaab25be89503fda4a992d8cd9b2e16c3c1926'],['node_modules/playwright-core/lib/utilsBundle.js',CODEC]])requireThat(digest(readFileSync(resolve(base,file)))===pin);
 const require=createRequire(resolve(base,'package.json'));
 requireThat(require(resolve(base,'node_modules/playwright-core/package.json')).version==='1.62.1');
 ({PNG,jpegjs}=require(resolve(base,'node_modules/playwright-core/lib/utilsBundle.js')));
 output({schema:SCHEMA,type:'ready',codec:CODEC});
 let count=0;
 while(true){
  const prefix=exact(4,true);
  if(prefix===null){output({schema:SCHEMA,type:'done',count});break;}
  const headerLength=prefix.readUInt32BE(0);requireThat(headerLength>0&&headerLength<=256);
  const headerBytes=exact(headerLength);requireThat(headerBytes.every(b=>b>=32&&b<=126));
  const text=headerBytes.toString('ascii'), h=JSON.parse(text);
  requireThat(h!==null&&typeof h==='object'&&!Array.isArray(h));
  requireThat(Object.keys(h).join(',')==='schema,index,bytes,sha256');
  requireThat(h.schema===SCHEMA&&Number.isSafeInteger(h.index)&&h.index===count&&count<49999&&Number.isSafeInteger(h.bytes)&&h.bytes>0&&h.bytes<=MAX_INPUT&&typeof h.sha256==='string'&&/^[0-9a-f]{64}$/.test(h.sha256));
  // Canonical equality rejects duplicate keys, escaped/noncanonical keys/numbers.
  requireThat(JSON.stringify(h)===text);
  const b=exact(h.bytes);requireThat(digest(b)===h.sha256);
  let size;try{size=decode(b);}catch{
   output({schema:SCHEMA,type:'result',index:count,bytes:h.bytes,sha256:h.sha256,ok:false,width:null,height:null});
   process.exitCode=1;break;
  }
  output({schema:SCHEMA,type:'result',index:count,bytes:h.bytes,sha256:h.sha256,ok:true,...size});count++;
 }
}catch{process.exitCode=1;}
