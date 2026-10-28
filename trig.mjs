import { chromium } from 'playwright'; import fs from 'fs';
const T=fs.readFileSync('/home/weio/.local/state/reef/auth-token','utf8').trim();
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto(`http://localhost:8000/?token=${T}`,{waitUntil:'domcontentloaded'});
await p.waitForTimeout(20000); await b.close();
