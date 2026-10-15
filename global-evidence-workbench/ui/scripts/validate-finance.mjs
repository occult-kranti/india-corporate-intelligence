import fs from 'node:fs';import {financeValidation} from '../src/finance-model.js';
const data=JSON.parse(fs.readFileSync('public/data/finance.json','utf8'));const errors=financeValidation(data);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Finance validation passed: ${data.cases.length} cases, ${data.relationships.length} typed relationships, ${data.sources.length} sources.`);
