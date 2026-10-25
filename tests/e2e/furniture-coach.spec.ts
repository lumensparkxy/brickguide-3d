import {expect,test,type Page} from '@playwright/test';
const base='/ikea?product=30449908';
const ids=['prepare','identify',...Array.from({length:4},(_,i)=>[`screw-${i+1}`,`leg-${i+1}`]).flat(),'final-checks'];
const viewport=(page:Page)=>page.getByTestId('coach-viewport');
async function open(page:Page,id='prepare'){await page.goto(`${base}&action=${id}`);await expect(page.getByTestId('coach-app')).toBeVisible();await expect(viewport(page)).toHaveAttribute('data-action',id);}
async function checkAll(page:Page){for(const box of await page.locator('.coach-checks input').all())await box.check();}
async function stored(page:Page){return page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('furniture:coach:v2:'));return key?JSON.parse(localStorage.getItem(key)!):null;});}
test.beforeEach(async({page})=>{await page.goto(base);await page.evaluate(()=>localStorage.clear());});
test('autoplay stops at the current action and never confirms physical work',async({page})=>{
 await open(page,'screw-1');await expect(viewport(page)).toHaveAttribute('data-playing','true');
 await expect(viewport(page)).toHaveAttribute('data-progress','1.00000',{timeout:10000});
 await expect(viewport(page)).toHaveAttribute('data-playing','false');await expect(viewport(page)).toHaveAttribute('data-visible-legs','0');
 await expect(page.getByText('0 of 11 actions confirmed by you')).toBeVisible();expect((await stored(page)).confirmedActionIds).toEqual([]);
 await page.getByRole('button',{name:'Replay',exact:true}).click();await expect(viewport(page)).toHaveAttribute('data-playing','true');
 await expect.poll(async()=>Number(await viewport(page).getAttribute('data-progress'))).toBeLessThan(.5);
});
test('arrows browse without confirming, ignore held keys and preserve focused controls',async({page})=>{
 await open(page);const back=page.getByRole('button',{name:'Back',exact:true});await back.focus();await page.keyboard.press('ArrowLeft');await expect(viewport(page)).toHaveAttribute('data-action','prepare');
 await page.keyboard.press('ArrowRight');await expect(viewport(page)).toHaveAttribute('data-action','identify');await expect(back).toBeFocused();
 await back.dispatchEvent('keydown',{key:'ArrowRight',repeat:true,bubbles:true});await expect(viewport(page)).toHaveAttribute('data-action','identify');
 await page.keyboard.press('Control+ArrowRight');await expect(viewport(page)).toHaveAttribute('data-action','identify');
 await page.keyboard.press('ArrowRight');await expect(viewport(page)).toHaveAttribute('data-action','screw-1');await expect(page.getByText('0 of 11 actions confirmed by you')).toBeVisible();
 await page.getByRole('button',{name:'Pause',exact:true}).focus();await page.keyboard.press('Space');await expect(viewport(page)).toHaveAttribute('data-playing','false');
 const surface=page.getByRole('group',{name:'Assembly viewer. Space plays or pauses.'});await surface.focus();await page.keyboard.press('Space');await expect(viewport(page)).toHaveAttribute('data-playing','true');await page.keyboard.press('Space');await expect(viewport(page)).toHaveAttribute('data-playing','false');
 await page.keyboard.press('Alt+r');await expect(viewport(page)).toHaveAttribute('data-playing','true');
 expect(await page.evaluate(()=>scrollY)).toBe(0);
});
test('checks and explicit Done traverse all actions, resume is separate from confirmation',async({page})=>{
 await open(page);await expect(page.getByRole('button',{name:'Done, next'})).toBeDisabled();
 for(let index=0;index<ids.length;index++){
  await expect(viewport(page)).toHaveAttribute('data-action',ids[index]);await checkAll(page);
  if(index===ids.length-1){await page.getByRole('button',{name:'Confirm final checks',exact:true}).click();}
  else await page.getByRole('button',{name:'Done, next',exact:true}).click();
 }
 await expect(page.getByText('11 of 11 actions confirmed by you')).toBeVisible();await expect(viewport(page)).toHaveAttribute('data-orientation','upright');
 await expect(page.getByRole('heading',{name:'You’ve confirmed every action.'})).toBeVisible();expect((await stored(page)).confirmedActionIds).toEqual(ids);
 await page.getByRole('button',{name:'Back',exact:true}).click();await expect(viewport(page)).toHaveAttribute('data-action','leg-4');await page.reload();
 await expect(viewport(page)).toHaveAttribute('data-action','leg-4');await expect(page.getByText('11 of 11 actions confirmed by you')).toBeVisible();
});
test('skipping to final checks cannot imply completion',async({page})=>{
 await open(page,'final-checks');await page.getByRole('button',{name:'Return to unfinished action'}).click();await expect(viewport(page)).toHaveAttribute('data-action','prepare');expect((await stored(page)).confirmedActionIds).toEqual([]);
});
test('reduced motion starts paused; dialogs pause and retain native input keys',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await open(page,'leg-2');await expect(viewport(page)).toHaveAttribute('data-playing','false');await expect(viewport(page)).toHaveAttribute('data-progress','0.00000');
 await page.getByRole('button',{name:'Play',exact:true}).click();await expect(viewport(page)).toHaveAttribute('data-playing','true');
 await page.getByRole('button',{name:'More controls'}).click();await expect(viewport(page)).toHaveAttribute('data-playing','false');
 const slider=page.getByRole('slider',{name:'Action progress'});await slider.fill('50');await slider.focus();await page.keyboard.press('ArrowRight');await expect(viewport(page)).toHaveAttribute('data-action','leg-2');
 const speed=page.getByRole('combobox',{name:'Animation speed'});await speed.focus();await page.keyboard.press('ArrowDown');await expect(viewport(page)).toHaveAttribute('data-action','leg-2');
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(viewport(page)).toHaveAttribute('data-playing','false');
 await page.getByRole('button',{name:'Need help?'}).click();await page.keyboard.press('ArrowRight');await expect(viewport(page)).toHaveAttribute('data-action','leg-2');
});
test('WebGL failure retains instructions, source route and navigation',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind:string,...args:unknown[]){if(kind.includes('webgl'))return null;return original.apply(this,[kind,...args] as never);} as typeof original;});
 await open(page,'screw-1');await expect(page.getByText('3D is unavailable.',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Play',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Official diagram',exact:true}).click();await expect(page.getByRole('link',{name:'Open full official PDF'})).toBeVisible();await page.getByRole('button',{name:'Close panel'}).click();
 await page.keyboard.press('ArrowRight');await expect(viewport(page)).toHaveAttribute('data-action','leg-1');
});
for(const size of [{width:1440,height:900},{width:390,height:844},{width:844,height:390},{width:390,height:568},{width:720,height:450}])test(`stable dock and canvas across every action at ${size.width}x${size.height}`,async({page})=>{
 await page.setViewportSize(size);await page.emulateMedia({reducedMotion:'reduce'});await open(page);
 const locators=[page.locator('.coach-dock nav'),page.locator('.coach-surface')];const initial=await Promise.all(locators.map(l=>l.boundingBox()));
 await page.getByRole('button',{name:'Back',exact:true}).focus();
 for(const id of ids){await expect(viewport(page)).toHaveAttribute('data-action',id);for(let i=0;i<locators.length;i++){const box=await locators[i].boundingBox();expect(box).not.toBeNull();for(const key of ['x','y','width','height'] as const)expect(Math.abs(box![key]-initial[i]![key])).toBeLessThanOrEqual(2);}await page.keyboard.press('ArrowRight');}
 expect(await page.evaluate(()=>({x:scrollX,y:scrollY,overflow:document.documentElement.scrollWidth>innerWidth}))).toEqual({x:0,y:0,overflow:false});
});
test('source failure retries without shifting dock or losing official PDF access',async({page})=>{
 let fail=true;await page.route('**/documents/*/pages/*',r=>fail?r.fulfill({status:503,body:'unavailable'}):r.continue());await open(page,'leg-1');const before=await page.locator('.coach-dock').boundingBox();
 await page.getByRole('button',{name:'Official diagram',exact:true}).click();await expect(page.getByRole('alert')).toContainText('diagram could not load');await expect(page.getByRole('link',{name:'Open full official PDF'})).toBeVisible();fail=false;await page.getByRole('button',{name:'Retry diagram'}).click();await expect(page.getByRole('img',{name:/Official diagram/})).toBeVisible();await page.keyboard.press('Escape');expect(await page.locator('.coach-dock').boundingBox()).toEqual(before);
});
test('blocked local storage allows assembly and explains missing persistence',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw Error('blocked');};});await open(page,'screw-1');await expect(page.getByText('Progress not saved',{exact:true})).toBeAttached();await page.getByRole('button',{name:'Done, next'}).click();await expect(viewport(page)).toHaveAttribute('data-action','leg-1');await expect(page.getByText('1 of 11 actions confirmed by you')).toBeVisible();
});
test('loading scene preserves canvas and dock slots',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});await page.route('**/CoachScene.tsx*',async r=>{await gate;await r.continue();});await page.goto(`${base}&action=screw-1`,{waitUntil:'domcontentloaded'});await expect(page.getByText('Preparing this action…')).toBeVisible();const rects=()=>page.locator('.coach-surface,.coach-dock').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));const before=await rects();release();await expect(viewport(page).locator('canvas')).toBeVisible();expect(await rects()).toEqual(before);
});
