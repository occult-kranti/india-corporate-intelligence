import { inlineTutorialAssets } from './inline-tutorial.mjs';
import fs from 'node:fs';import {mediaValidation} from '../src/media-model.js';
const read=p=>fs.readFileSync(p,'utf8');const data=JSON.parse(read('public/data/media.json'));const errors=mediaValidation(data);if(errors.length)throw Error(errors.join('; '));
const model=read('src/media-model.js').replaceAll('export ','');let app=read('src/media-app.js').replace(/^import[^\n]+\n/gm,'');
const loader="const response=await fetch('./public/data/media.json');if(!response.ok)throw Error(`Dataset request failed (${response.status})`);const payload=await response.json();";
if(!app.includes(loader))throw Error('Media loader changed; review standalone export');
app=app.replace(loader,`const payload=${JSON.stringify(data).replaceAll('<','\\u003c')};`);
let html=read('media.html').replace('<link rel="stylesheet" href="./src/style.css">',()=>`<style>${read('src/style.css')}</style>`).replace('<link rel="stylesheet" href="./src/media.css">',()=>`<style>${read('src/media.css')}</style>`).replace('<script type="module" src="./src/media-app.js"></script>',()=>`<script type="module">${model}\n${app}</script>`).replace('href="./index.html"','href="./fieldwork-offline.html"').replace('href="./finance.html"','href="./finance-offline.html"').replace('href="./media.html"','href="./media-offline.html"');
fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/media-offline.html',inlineTutorialAssets(html));console.log('Created dist/media-offline.html with embedded data, CSS and code.');
