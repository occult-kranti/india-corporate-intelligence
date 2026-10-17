// Decode original bytes using the already installed, version-pinned Playwright
// image codecs. This validates format; it does not certify pixel semantics.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {createInterface} from 'node:readline';
const base=resolve(process.env.GITHUB_WORKSPACE,'spatial-prototype');
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const [file,pin] of [['package.json','a6e52ae408cbf957e3726601864d149703f1be96e13c607f16cdf8fd9f383134'],['package-lock.json','01e715955bbde6e3b4baf72ecfaaab25be89503fda4a992d8cd9b2e16c3c1926'],['node_modules/playwright-core/lib/utilsBundle.js','580f571bf063e2256b51b3946a035bc452fc0e22808d5547b198baea39923a32']])if(digest(resolve(base,file))!==pin)throw Error('PINNED_IMAGE_CODEC_BYTES_REQUIRED');
const require=createRequire(resolve(base,'package.json'));
if(require(resolve(base,'node_modules/playwright-core/package.json')).version!=='1.62.1')throw Error('PINNED_IMAGE_DECODER_REQUIRED');
const {PNG,jpegjs}=require(resolve(process.env.GITHUB_WORKSPACE,'spatial-prototype/node_modules/playwright-core/lib/utilsBundle.js'));
const lines=createInterface({input:process.stdin});for await(const line of lines){try{const b=Buffer.from(line,'base64');if(b.length>32*1024*1024)throw Error();const image=b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?PNG.sync.read(b,{checkCRC:true}):jpegjs.decode(b,{useTArray:true,formatAsRGBA:true,tolerantDecoding:false,maxResolutionInMP:16,maxMemoryUsageInMB:256});if(!image.width||!image.height||image.width>4096||image.height>4096||image.width*image.height>16*1024*1024||image.data.length!==image.width*image.height*4)throw Error();console.log(JSON.stringify({ok:true,width:image.width,height:image.height}));}catch{console.log('{"ok":false}');}}
