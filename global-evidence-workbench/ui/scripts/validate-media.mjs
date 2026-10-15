import fs from 'node:fs';import {mediaValidation,normalizeMedia} from '../src/media-model.js';
const raw=fs.readFileSync('public/data/media.json','utf8'),d=JSON.parse(raw);const errors=mediaValidation(d);
if(/\/workspace\/|\/tmp\/|file:\/\//.test(raw))errors.push('Local acquisition paths found in public payload');
if(d.entities.some(n=>n.id.startsWith('test:'))||d.edges.some(e=>e.id.startsWith('test:')))errors.push('Test fixture in production data');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
const g=normalizeMedia(d);console.log(JSON.stringify({valid:true,entities:g.entities.length,edges:g.edges.length,sources:g.sources.length,gaps:g.gaps.length,mappedProfiles:g.entities.filter(n=>n.location).length,sourcePackets:[...new Set(g.edges.map(e=>e.research_packet))],countries:[...new Set(g.entities.flatMap(n=>n.countries))],relationshipTypes:[...new Set(g.edges.map(e=>e.type))],statuses:[...new Set(g.edges.map(e=>e.status))]},null,2));
