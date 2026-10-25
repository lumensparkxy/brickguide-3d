import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const evidence='var/evidence/furniture-full-assembly';
const url='/ikea?experience=legacy&product=30449908&step=attach-legs';
async function seek(page:Page,value:number){
  await page.getByRole('slider',{name:'Full assembly progress',exact:true}).evaluate((el,value)=>{
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,String(value));
    el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
}
test('all four connections accumulate and playback remains controllable',async({page})=>{
  test.setTimeout(75000);
  mkdirSync(evidence,{recursive:true});
  const errors:string[]=[];const failures:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(url);
  const stage=page.getByTestId('full-table-viewport');
  await expect(stage.locator('canvas')).toBeVisible();
  await expect(stage).toHaveAttribute('data-playing','false');
  for(let i=1;i<=4;i++){
    await expect(page.getByRole('button',{name:`Select Leg ${i}`,exact:true})).toBeVisible();
  }
  const before=await stage.locator('canvas').screenshot();
  await page.getByRole('button',{name:'Play full assembly',exact:true}).click();
  await expect.poll(async()=>Number(await stage.getAttribute('data-animation-progress'))).toBeGreaterThan(.01);
  await page.getByRole('button',{name:'Pause full assembly',exact:true}).click();
  const paused=await stage.getAttribute('data-animation-progress');
  await page.waitForTimeout(200);
  expect(await stage.getAttribute('data-animation-progress')).toBe(paused);
  expect((await stage.locator('canvas').screenshot()).equals(before)).toBeFalsy();
  for(const [index,value] of [24,49,74,100].entries()){
    await seek(page,value);
    await expect(stage).toHaveAttribute('data-completed',String(index+1));
    await expect(stage).toHaveAttribute('data-visible-legs',String(index+1));
    const ys=(await stage.getAttribute('data-leg-y'))!.split(',').map(Number);
    expect(ys.slice(0,index+1)).toEqual(Array(index+1).fill(247.5));
    await expect(stage).toHaveAttribute('data-playing','false');
    await page.screenshot({path:`${evidence}/desktop-${value}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'Finished table',exact:true}).click();
  await expect(stage).toHaveAttribute('data-orientation','upright');
  await expect(stage).toHaveAttribute('data-completed','4');
  await page.screenshot({path:`${evidence}/finished-table.png`,fullPage:true});
  await page.getByRole('button',{name:'Select Leg 3',exact:true}).click();
  await expect(page.getByRole('button',{name:'Select Leg 3',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:'Select Leg 2',exact:true})).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'Replay full assembly',exact:true}).click();
  await expect.poll(async()=>Number(await stage.getAttribute('data-animation-progress'))).toBeLessThan(.1);
  await expect(stage).toHaveAttribute('data-playing','true');
  await expect(stage).toHaveAttribute('data-animation-progress','1.00000',{timeout:60000});
  await expect(stage).toHaveAttribute('data-playing','false');
  await expect(stage).toHaveAttribute('data-completed','4');
  await expect(stage).toHaveAttribute('data-leg-y','247.500,247.500,247.500,247.500');
  await page.getByRole('button',{name:/Step 5: Check/}).click();
  await expect(stage).toHaveAttribute('data-animation-progress','1.00000');
  await expect(stage).toHaveAttribute('data-playing','false');
  expect(errors).toEqual([]);expect(failures).toEqual([]);
  writeFileSync(`${evidence}/browser-errors.json`,JSON.stringify({errors,failures},null,2));
});
test('phone labels remain available, keyboard seeking and source pause work',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(url);
  const stage=page.getByTestId('full-table-viewport');
  await expect(stage.locator('canvas')).toBeVisible();
  await expect(stage).toHaveAttribute('data-playing','false');
  const slider=page.getByRole('slider',{name:'Full assembly progress',exact:true});
  await slider.focus();await page.keyboard.press('End');
  await expect(stage).toHaveAttribute('data-animation-progress','1.00000');
  await page.getByRole('button',{name:'Finished table',exact:true}).click();
  for(let i=1;i<=4;i++)await expect(page.getByRole('button',{name:`Select Leg ${i}`,exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:`${evidence}/phone-finished.png`,fullPage:true});
  await page.locator('#furn-model-panel').evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:`${evidence}/phone-finished-viewport.png`});
  await seek(page,35);
  await page.getByRole('button',{name:'Play full assembly',exact:true}).click();
  await page.getByRole('tab',{name:'Official diagram',exact:true}).click();
  await expect(stage).toHaveAttribute('data-playing','false');
  await page.getByRole('tab',{name:'3D illustration',exact:true}).click();
  await expect(stage).toHaveAttribute('data-playing','false');
  await page.screenshot({path:`${evidence}/phone-assembly.png`,fullPage:true});
});
test('full animation WebGL fallback keeps source instructions accessible',async({page})=>{
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){
      return type.includes('webgl')?null:Reflect.apply(original,this,[type,...args]);
    } as typeof original;
  });
  await page.goto(url);
  await expect(page.locator('.furn-model-panel')).toContainText(/3D.*unavailable/i);
  await expect(page.locator('.furn-guide-panel img')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Turn each leg onto its screw',exact:true})).toBeVisible();
});
