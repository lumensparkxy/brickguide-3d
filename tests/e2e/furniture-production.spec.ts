import {expect, test} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const evidence = 'var/evidence/production-hardening';
const actions = ['prepare', 'identify', ...Array.from({length:4}, (_,i)=>[`screw-${i+1}`,`leg-${i+1}`]).flat(), 'final-checks'];
for (const viewport of [{width:1440,height:1000}, {width:390,height:844}]) {
  test(`built coach renders all actions under release CSP at ${viewport.width}px`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'reduce'});
    const errors:string[]=[];
    page.on('pageerror', error=>errors.push(error.message));
    page.on('console', message=>{if(message.type()==='error') errors.push(message.text());});
    page.on('response', response=>{if(response.status()>=400) errors.push(`${response.status()} ${response.url()}`);});
    await page.goto('/ikea?product=30449908&action=prepare');
    await expect(page.getByTestId('coach-app')).toBeVisible();
    await expect(page).toHaveTitle('Furniture Assembly Assistant');
    await expect(page.getByTestId('nandi-pet')).toHaveAttribute('data-ready','true');
    const model = page.getByTestId('coach-viewport');
    for (const action of actions) {
      await expect(model).toHaveAttribute('data-action',action);
      await expect(model.locator('canvas')).toBeVisible();
      if(action !== 'final-checks') {
        await page.getByRole('group',{name:'Assembly viewer. Space plays or pauses.'}).focus();
        await page.keyboard.press('ArrowRight');
      }
    }
    await page.getByRole('button',{name:'Official diagram',exact:true}).click();
    const diagram = page.getByRole('img',{name:/Official diagram/});
    await expect(diagram).toBeVisible();
    await expect.poll(()=>diagram.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBeTruthy();
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(model).toHaveAttribute('data-action','final-checks');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    mkdirSync(evidence,{recursive:true});
    await page.screenshot({path:`${evidence}/production-${viewport.width}.png`,fullPage:true});
    expect(errors).toEqual([]);
  });
}

test('release exposes only read routes and disables voice without a failing UI request',async({request})=>{
  const status=await request.get('/api/v1/furniture/voice/status');
  expect(await status.json()).toEqual({configured:false,reason:'disabled_for_release'});
  for(const path of ['/api/v1/jobs','/api/v1/sets','/openapi.json','/lego','/.env']) {
    expect((await request.get(path)).status()).toBe(404);
  }
  expect((await request.post('/api/v1/furniture/voice/session',{data:{}})).status()).toBe(404);
  const response=await request.get('/ikea');
  expect(response.headers()['permissions-policy']).toContain('microphone=()');
  expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
});
