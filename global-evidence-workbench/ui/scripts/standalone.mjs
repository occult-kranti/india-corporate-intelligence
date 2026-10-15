import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('src/style.css','utf8'),model=fs.readFileSync('src/model.js','utf8').replaceAll('export ',''),data=JSON.parse(fs.readFileSync('public/data/dataset.json','utf8'));
const load="const response=await fetch('./public/data/dataset.json');if(!response.ok)throw Error(`Dataset request failed (${response.status})`);graph=normalize(await response.json());";
const app=fs.readFileSync('src/app.js','utf8').replace(/^import[^\n]+\n/,'').replace(load,`graph=normalize(${JSON.stringify(data).replaceAll('<','\\u003c')});`);
if(app.includes("await fetch('./public/data/dataset.json')"))throw Error('Standalone data injection failed');
fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/fieldwork-offline.html',html.replace('<link rel="stylesheet" href="./src/style.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="./src/app.js"></script>',()=>`<script type="module">${model}\n${app}</script>`));console.log('Created offline standalone HTML');
