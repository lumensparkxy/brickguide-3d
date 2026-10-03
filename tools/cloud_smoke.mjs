// Actual public deployment checks. Never creates or approves tutorial releases.
import {chromium, expect} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';

const base = process.argv[2];
const preview = process.argv[3];
if (!base || !/^https:\/\/guide2build-web-[a-z0-9.-]+\.run\.app$/.test(base)) {
  throw new Error('Pass the verified Guide2Build Cloud Run public URL');
}
const output = 'var/evidence/cloud-release/browser-live';
await mkdir(output, {recursive: true});
const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
const page = await context.newPage();
const errors = [], urls = [], timings = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => urls.push(request.url()));
try {
  const config = await context.request.get(`${base}/api/v1/config`);
  expect(config.status()).toBe(200);
  expect(await config.json()).toEqual({mode: 'public', source_images: false, requests_enabled: true});
  for (const path of ['jobs/example', 'conversions', 'sources/example/pages/0',
    'reconstructions/example/scene', 'approvals', 'corrections']) {
    expect((await context.request.get(`${base}/api/v1/${path}`)).status()).toBe(404);
  }
  if (preview) expect((await context.request.get(preview)).status()).toBe(403);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  // Controlled network conditions measure this portal only, not missing 3D tutorials.
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 40, downloadThroughput: 5_000_000 / 8, uploadThroughput: 1_000_000 / 8,
  });
  for (const state of ['cold', 'warm']) {
    await cdp.send('Network.setCacheDisabled', {cacheDisabled: state === 'cold'});
    if (state === 'cold') await cdp.send('Network.clearBrowserCache');
    const start = performance.now();
    await page.goto(base);
    await expect(page.getByRole('button', {name: 'Find my set', exact: true})).toBeEnabled();
    timings.push({state, portalReadyMs: performance.now() - start,
      navigation: await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.toJSON())});
  }
  await page.screenshot({path: `${output}/desktop.png`, fullPage: true});
  await page.getByLabel('Your set number').fill('30669');
  const recorded = page.waitForResponse(r => r.url() === `${base}/api/v1/requests` && r.request().method() === 'POST');
  await page.getByRole('button', {name: 'Find my set', exact: true}).click();
  expect((await recorded).status()).toBe(202);
  const message = 'This build isn’t ready yet. We’ve added it to our building list. Come back later to see what’s new!';
  await expect(page.getByRole('status').filter({hasText: message})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Open tutorial', exact: true})).toHaveCount(0);
  await page.screenshot({path: `${output}/recorded-request.png`});
  const duplicate = await context.request.post(`${base}/api/v1/requests`, {
    data: {set_number: '30669'}, headers: {Origin: base},
  });
  expect(duplicate.status()).toBe(202);
  expect((await duplicate.json()).duplicate).toBe(true);
  await page.getByRole('button', {name: 'Close booklet selection'}).click();
  await page.setViewportSize({width: 390, height: 844});
  await page.getByLabel('Your set number').fill('99998');
  await page.getByRole('button', {name: 'Find my set', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: message})).toBeVisible();
  await expect(page.getByRole('link', {name: 'View official instructions'})).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: `${output}/phone.png`});
  expect(urls.filter(url => /\/api\/v1\/(sources|reconstructions|conversions|jobs)\b|\.pdf(?:\?|$)|assets-local/.test(url))).toEqual([]);
  expect(errors).toEqual([]);
  await writeFile(`${output}/report.json`, JSON.stringify({base, preview, passed: true, timings,
    network: {latencyMs: 40, downloadMbps: 5, uploadMbps: 1}, urls, errors,
    tutorialLoadAndGpu: 'not_measured_no_published_complete_tutorial',
    browser: await browser.version()}, null, 2));
  console.log(JSON.stringify({passed: true, base, output, timings: timings.map(({state, portalReadyMs}) => ({state, portalReadyMs}))}));
} finally {
  await browser.close();
}
