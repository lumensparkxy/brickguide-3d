import {test,expect,type Page,type Locator} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const evidence='var/evidence/furniture-animation';
const preview='/ikea?experience=legacy&product=30449908&step=attach-legs';
async function ready(page:Page) {
  await page.goto(preview);
  await page.getByRole('button',{name:'Connection close-up',exact:true}).click();
  await expect(page.getByTestId('connection-viewport').locator('canvas')).toBeVisible();
  return page.getByTestId('connection-viewport');
}
async function seek(page:Page,value:number) {
  const range=page.getByRole('slider',{name:'Assembly animation progress'});
  await range.evaluate((element,value)=>{
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(element,String(value));
    element.dispatchEvent(new Event('input',{bubbles:true}));
    element.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
}
async function progress(stage:Locator) {return Number(await stage.getAttribute('data-animation-progress'));}

test('connection plays actual motion, pauses, scrubs and replays to an identical endpoint',async({page})=>{
  test.setTimeout(45000);
  mkdirSync(evidence,{recursive:true});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1000});
  const stage=await ready(page);
  await expect(stage).toHaveAttribute('data-playing','false');
  expect(await progress(stage)).toBe(0);
  const startingImage=await stage.locator('canvas').screenshot();
  await page.getByRole('button',{name:'Play animation',exact:true}).click();
  await expect.poll(()=>progress(stage)).toBeGreaterThan(.04);
  await page.getByRole('button',{name:'Pause animation',exact:true}).click();
  const paused=await progress(stage);await page.waitForTimeout(250);
  expect(await progress(stage)).toBe(paused);
  expect((await stage.locator('canvas').screenshot()).equals(startingImage)).toBeFalsy();
  await seek(page,35);
  await expect(stage).toHaveAttribute('data-animation-phase','insert-screw');
  await page.screenshot({path:`${evidence}/desktop-screw.png`,fullPage:true});
  await seek(page,75);
  await expect(stage).toHaveAttribute('data-animation-phase','turn-leg');
  await expect(stage).toHaveAttribute('data-playing','false');
  await page.screenshot({path:`${evidence}/desktop-leg.png`,fullPage:true});
  await seek(page,100);
  await expect(stage).toHaveAttribute('data-animation-phase','seated');
  const endpoint=await stage.evaluate(el=>({screw:el.getAttribute('data-screw-y'),leg:el.getAttribute('data-leg-y'),rotation:el.getAttribute('data-leg-rotation')}));
  await page.getByRole('button',{name:'Replay animation',exact:true}).click();
  await expect.poll(()=>progress(stage)).toBeLessThan(.1);
  await expect(stage).toHaveAttribute('data-playing','true');
  await expect(stage).toHaveAttribute('data-animation-phase','seated',{timeout:20000});
  await expect(stage).toHaveAttribute('data-playing','false');
  expect(await stage.evaluate(el=>({screw:el.getAttribute('data-screw-y'),leg:el.getAttribute('data-leg-y'),rotation:el.getAttribute('data-leg-rotation')}))).toEqual(endpoint);
  expect(await progress(stage)).toBe(1);
  await page.screenshot({path:`${evidence}/desktop-seated.png`,fullPage:true});
  expect(errors).toEqual([]);
});

test('part selection links sidebar and scene; switching steps resets playback',async({page})=>{
  const stage=await ready(page);
  await page.getByRole('button',{name:'Select Double-ended screws in 3D',exact:true}).click();
  await expect(page.getByRole('button',{name:'Select Double-ended screws in 3D',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.furn-model-panel')).toContainText('115980');
  await page.getByRole('button',{name:'Whole table',exact:true}).click();
  await expect(page.getByTestId('connection-viewport')).toHaveCount(0);
  await expect(page.locator('.furn-model-panel')).toContainText('Leg 1');
  await page.getByRole('button',{name:'Select Leg 1',exact:true}).click();
  await expect(page.getByRole('button',{name:'Select Leg 1',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:'Select Leg 2',exact:true})).toHaveAttribute('aria-pressed','false');
  await expect(page.getByRole('button',{name:'Select Legs in 3D',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Connection close-up',exact:true}).click();
  await page.getByLabel('Animation speed',{exact:true}).selectOption('0.5');
  await expect(page.getByLabel('Animation speed',{exact:true})).toHaveValue('0.5');
  await page.getByRole('button',{name:'Play animation',exact:true}).click();
  await expect.poll(()=>progress(stage)).toBeGreaterThan(.02);
  await page.getByRole('button',{name:/Step 2: Identify/}).click();
  await expect(page.getByTestId('connection-viewport')).toHaveCount(0);
  await expect(page.locator('.furn-model-panel')).toContainText('115980');
  await page.getByRole('button',{name:/Step 4: Turn/}).click();
  await page.getByRole('button',{name:'Connection close-up',exact:true}).click();
  await expect(stage).toHaveAttribute('data-playing','false');
  expect(await progress(stage)).toBe(0);
  await page.getByRole('button',{name:'Replay step',exact:false}).click();
  await expect(stage).toHaveAttribute('data-playing','true');
  await page.getByRole('button',{name:'Whole table',exact:true}).click();
  await page.getByRole('button',{name:'Connection close-up',exact:true}).click();
  await expect(stage).toHaveAttribute('data-playing','false');
  expect(await progress(stage)).toBe(0);
});

test('phone labels and manual reduced-motion playback; hiding the model pauses it',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  const stage=await ready(page);
  await expect(stage).toHaveAttribute('data-playing','false');
  await page.getByRole('slider',{name:'Assembly animation progress'}).focus();
  await page.keyboard.press('End');
  await expect(stage).toHaveAttribute('data-animation-phase','seated');
  await seek(page,35);
  const stageBox=(await stage.boundingBox())!;
  const labelBoxes=await page.locator('.connection-demo .connection-label').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
  for(const box of labelBoxes){expect(box.x).toBeGreaterThanOrEqual(stageBox.x);expect(box.right).toBeLessThanOrEqual(stageBox.x+stageBox.width);expect(box.y).toBeGreaterThanOrEqual(stageBox.y);expect(box.bottom).toBeLessThanOrEqual(stageBox.y+stageBox.height);}
  for(let i=0;i<labelBoxes.length;i++)for(let j=i+1;j<labelBoxes.length;j++){const a=labelBoxes[i],b=labelBoxes[j];expect(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y).toBeTruthy();}
  await page.screenshot({path:`${evidence}/phone-screw.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole('button',{name:'Play animation',exact:true}).click();
  await expect(stage).toHaveAttribute('data-playing','true');
  await page.getByRole('tab',{name:'Official diagram',exact:true}).click();
  await expect(stage).toHaveAttribute('data-playing','false');
  const paused=await progress(stage);await page.waitForTimeout(200);
  expect(await progress(stage)).toBe(paused);
  await page.getByRole('tab',{name:'3D illustration',exact:true}).click();
  await expect(stage).toHaveAttribute('data-playing','false');
});
