import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const evidence='var/evidence/furniture-workspace';
const url='/ikea?experience=legacy&product=30449908&step=attach-legs';
async function dimensions(page:Page){return page.locator('.furn-nav>button,.furn-model-panel canvas,.stable-viewer-controls').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));}
for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['landscape',844,390],['zoom-equivalent',720,450]] as const){
 test(`${name}: stable controls and canvas through every step`,async({page})=>{
  mkdirSync(evidence,{recursive:true});await page.setViewportSize({width,height});await page.goto(url);
  await expect(page.locator('.furn-model-panel canvas')).toBeVisible();
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const first=await dimensions(page);
  expect(first).toHaveLength(5);
  for(let i=1;i<=5;i++){
   const button=page.getByRole('button',{name:new RegExp(`^Step ${i}:`)});await button.click();
   await expect(page.locator('.furn-model-panel canvas')).toBeVisible();
   await expect(button).toBeFocused();
   const current=await dimensions(page);
   current.forEach((r,j)=>{for(const key of ['x','y','width','height'] as const)expect(Math.abs(r[key]-first[j][key]),`${i}/${j}/${key}`).toBeLessThanOrEqual(2);});
   const overflow=await page.evaluate(()=>({x:document.documentElement.scrollWidth>innerWidth,y:document.documentElement.scrollHeight>innerHeight,scrollY}));
   expect(overflow).toEqual({x:false,y:false,scrollY:0});
   const toolbar=await page.locator('.stable-viewer-controls').boundingBox();const nav=await page.locator('.furn-nav').boundingBox();
   expect(toolbar!.y+toolbar!.height).toBeLessThanOrEqual(nav!.y+1);
  }
  await page.screenshot({path:`${evidence}/${name}-finished.png`});
  if(width<=720){await page.getByRole('tab',{name:'Instructions',exact:true}).click();}
  await page.locator('.furn-help summary').first().click();
  await page.locator('.furn-evidence summary').click();
  const after=await page.locator('.furn-nav>button').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y};}));
  const original=first.slice(-3);
  after.forEach((r,j)=>{expect(Math.abs(r.x-original[j].x)).toBeLessThanOrEqual(2);expect(Math.abs(r.y-original[j].y)).toBeLessThanOrEqual(2);});
  await page.screenshot({path:`${evidence}/${name}-instructions.png`});
  expect(errors).toEqual([]);
 });
}
test('scoped shortcuts retain focus and preserve native controls',async({page})=>{
 await page.goto(url);const surface=page.getByTestId('furniture-viewer-surface');
 await expect(page.getByTestId('full-table-viewport')).toBeVisible();
 await surface.focus();await page.keyboard.press('Space');
 await expect(page.getByTestId('full-table-viewport')).toHaveAttribute('data-playing','true');
 await page.keyboard.press('Space');await expect(page.getByTestId('full-table-viewport')).toHaveAttribute('data-playing','false');
 await page.keyboard.press('ArrowLeft');await expect(page.getByRole('button',{name:/^Step 3:/})).toHaveAttribute('aria-current','step');await expect(surface).toBeFocused();
 await page.keyboard.press('ArrowRight');await expect(surface).toBeFocused();
 await page.keyboard.press('Alt+r');await expect(page.getByTestId('full-table-viewport')).toHaveAttribute('data-playing','true');
 await page.getByRole('button',{name:'Pause full assembly',exact:true}).click();
 const slider=page.getByRole('slider',{name:'Full assembly progress'});await slider.focus();await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('button',{name:/^Step 4:/})).toHaveAttribute('aria-current','step');
 await page.getByRole('button',{name:'Keyboard help',exact:true}).click();
 await page.keyboard.press('ArrowRight');await expect(page.getByRole('button',{name:/^Step 4:/})).toHaveAttribute('aria-current','step');await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Keyboard help',exact:true})).toBeFocused();
 await surface.focus();await surface.dispatchEvent('keydown',{key:'ArrowRight',code:'ArrowRight',repeat:true});await expect(page.getByRole('button',{name:/^Step 4:/})).toHaveAttribute('aria-current','step');
 await page.keyboard.press('Control+ArrowRight');await expect(page.getByRole('button',{name:/^Step 4:/})).toHaveAttribute('aria-current','step');
 await page.getByRole('button',{name:/^Step 1:/}).click();await page.keyboard.press('ArrowLeft');await expect(page.getByRole('button',{name:/^Step 1:/})).toHaveAttribute('aria-current','step');
 await page.getByRole('button',{name:/^Next step/}).click();await expect(page.getByRole('button',{name:/^Next step/})).toBeFocused();
});
test('phone tabs retain selection across steps and arrows navigate tabs only',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(url);
 await page.getByRole('tab',{name:'Instructions',exact:true}).click();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'3D illustration'})).toHaveAttribute('aria-selected','true');
 await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Official diagram'})).toHaveAttribute('aria-selected','true');
 await page.getByRole('button',{name:/^Next step/}).click();await expect(page.getByRole('tab',{name:'Official diagram'})).toHaveAttribute('aria-selected','true');
 await page.keyboard.press('Alt+r');await expect(page.getByRole('tab',{name:'3D illustration'})).toHaveAttribute('aria-selected','true');
});
test('source errors and WebGL failure retain the dock and viewer slots',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){return type.includes('webgl')?null:Reflect.apply(original,this,[type,...args]);} as typeof original;});
 await page.route('**/documents/*/pages/*',route=>route.fulfill({status:503,body:'unavailable'}));await page.goto(url);
 await expect(page.locator('.furn-model-panel')).toContainText('3D is unavailable');
 await expect(page.getByRole('button',{name:'Play full assembly',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:/^Next step/})).toBeVisible();
 await expect(page.locator('.furn-guide-panel')).toContainText('source image could not load');
 await page.screenshot({path:`${evidence}/errors.png`});
 writeFileSync(`${evidence}/error-state-checked.json`,JSON.stringify({webglFallback:true,sourceFailure:true}));
});
test('loading placeholder reserves viewer and control positions',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route(/\/FurnitureViewport(?:\.tsx(?:\?.*)?|-[^/]+\.js)$/,async route=>{await gate;await route.continue();});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await expect(page.getByText('Preparing the illustration…',{exact:true})).toBeVisible();
 const before=await page.locator('.stable-viewer,.stable-viewer-controls,.furn-nav').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
 release();await expect(page.getByTestId('full-table-viewport').locator('canvas')).toBeVisible();
 const after=await page.locator('.stable-viewer,.stable-viewer-controls,.furn-nav').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
 expect(after).toEqual(before);
});
