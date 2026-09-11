const {chromium}=require(process.env.LOCALAPPDATA+'/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.LOCALAPPDATA+'/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>localStorage.setItem('dc_active_staff','cse-1'));
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:5183/admin/professor/profile',{waitUntil:'networkidle'});
  const original=await page.locator('textarea').inputValue();
  const text='DB profile roundtrip '+Date.now();
  await page.locator('textarea').fill(text);
  const saved=page.waitForResponse(r=>r.url().endsWith('/staff/cse-1/profile')&&r.request().method()==='PUT');
  await page.getByRole('button',{name:'저장',exact:true}).click();
  assert.equal((await saved).status(),200);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('textarea').inputValue(),text);
  assert.equal(await page.evaluate(()=>localStorage.getItem('dc_professor_profile')),null);
  await page.locator('textarea').fill(original);
  const restored=page.waitForResponse(r=>r.url().endsWith('/staff/cse-1/profile')&&r.request().method()==='PUT');
  await page.getByRole('button',{name:'저장',exact:true}).click();
  assert.equal((await restored).status(),200);
  console.log('PASS: professor profile UI save -> PostgreSQL -> reload; original restored; no localStorage override');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
