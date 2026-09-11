const { chromium } = require(process.env.LOCALAPPDATA + '/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const scenarios = [
    ['career_kim', 'staff', ['/admin', '/admin/students', '/admin/settings']],
    ['psych_lee', 'staff', ['/admin']],
    ['cse-1', 'staff', ['/admin', '/admin/professor/advisees', '/admin/professor/counsel/records', '/admin/professor/profile']],
    ['asst_kim', 'staff', ['/admin', '/admin/assistant/advisor', '/admin/assistant/advisor/records']],
    ['system-admin', 'staff', ['/admin', '/admin/notices']],
    ...['chaewon', 'changwon', 'jiwoo'].map(id => [id, 'student', ['/v2/main', '/v2/counsel/professor']]),
  ];
  const results = [];
  for (const [id, kind, routes] of scenarios) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(({id, kind}) => localStorage.setItem('dc_active_' + kind, id), {id, kind});
    const page = await context.newPage();
    for (const route of routes) {
      const errors = [];
      const onError = e => errors.push(e.message);
      const onConsole = m => { if (m.type() === 'error') errors.push(m.text()); };
      const onResponse = r => { if (r.url().includes('/api/') && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); };
      page.on('pageerror', onError); page.on('console', onConsole); page.on('response', onResponse);
      try {
        await page.goto('http://127.0.0.1:5183' + route, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(500);
        const body = await page.locator('body').innerText();
        results.push({ id, route, url: page.url(), errors: [...new Set(errors)], bodyLength: body.length, excerpt: body.slice(0, 180) });
      } catch (e) { results.push({ id, route, errors: [...errors, e.message] }); }
      page.off('pageerror', onError); page.off('console', onConsole); page.off('response', onResponse);
    }
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'browser-smoke-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  if (results.some(r => r.errors.length || r.bodyLength < 100 || /Unexpected Application Error|다시 연결/.test(r.excerpt ?? ''))) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
