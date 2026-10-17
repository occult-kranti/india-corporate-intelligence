import {appendFile} from 'node:fs/promises';
import {UNAVAILABLE} from './evidence-policy.mjs';
import {verifyCurrentRelease} from './release-check.mjs';
let summary=UNAVAILABLE;
try{if(process.env.CURRENT_RELEASE_OUTCOME==='success')summary=(await verifyCurrentRelease()).summary;}catch{}
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,summary);
else process.stdout.write(summary);
