import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const evidence='var/evidence/project-home';
async function ready(page:Page){
 await expect(page.locator('.project-home')).toBeVisible();
 await expect(page.locator('main h1')).toBeVisible();
 await expect.poll(()=>page.locator('main img').evaluateAll(imgs=>imgs.length>=2&&imgs.every(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0))).toBe(true);
}
test('root is an independent lightweight project showcase with two working demo entrances',async({page})=>{
 const requests:string[]=[],errors:string[]=[];
 page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await ready(page);await expect(page).toHaveURL(/\/$/);
 await expect(page.locator('canvas')).toHaveCount(0);
 expect(requests.filter(url=>/\/api\/|\/src\/(App\.tsx|furniture\/)|three(?:\.js|\.module)|gemini/i.test(url))).toEqual([]);
 await expect(page.getByRole('link',{name:/Open IKEA experience/})).toHaveAttribute('href','/ikea');
 await expect(page.getByRole('link',{name:/Open LEGO experience/})).toHaveAttribute('href','/lego');
 await page.getByRole('link',{name:/Open IKEA experience/}).click();await expect(page.getByLabel('Product name or IKEA article number')).toBeVisible();
 await page.getByRole('link',{name:'Project home',exact:true}).click();await ready(page);
 await page.getByRole('link',{name:/Open LEGO experience/}).click();await expect(page.getByLabel('Your set number')).toBeVisible();
 await page.getByRole('link',{name:'Project home',exact:true}).click();await ready(page);await page.reload();await ready(page);
 expect(errors).toEqual([]);
});
for(const path of ['/furniture','/furniture?product=30449908&action=screw-1','/not-a-product'])test(`unknown route remains a clear not-found page: ${path}`,async({page})=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));await page.goto(path);
 await expect(page.getByRole('heading',{level:1})).toContainText(/not found/i);
 expect(new URL(page.url()).pathname).toBe(path.split('?')[0]);
 await expect(page.locator('a[href="/"]')).not.toHaveCount(0);await expect(page.locator('a[href="/ikea"]')).not.toHaveCount(0);await expect(page.locator('a[href="/lego"]')).not.toHaveCount(0);
 expect(requests.filter(url=>url.includes('/api/'))).toEqual([]);
});
test('explicit IKEA deep links preserve article, action, confirmations and resume through project home',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/ikea?product=80104268&action=screw-1#reference');
 await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','screw-1');
 await expect(page.getByRole('combobox',{name:'Furniture finish'})).toHaveValue('80104268');
 expect(new URL(page.url()).hash).toBe('#reference');await page.getByRole('button',{name:'Done, next',exact:true}).click();
 await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','leg-1');
 await expect(page.getByText('1 of 11 actions confirmed by you')).toBeVisible();
 await page.goto('/');await ready(page);await page.goto('/ikea?product=80104268');
 await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','leg-1');await expect(page.getByText('1 of 11 actions confirmed by you')).toBeVisible();
 await page.reload();await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','leg-1');
});
for(const size of [{width:1440,height:1000},{width:390,height:844},{width:720,height:450}])test(`project homepage layout and evidence ${size.width}x${size.height}`,async({page})=>{
 const events={pageErrors:[] as string[],consoleErrors:[] as string[],failedRequests:[] as string[]};page.on('pageerror',e=>events.pageErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')events.consoleErrors.push(m.text());});page.on('requestfailed',r=>events.failedRequests.push(r.url()));
 await page.setViewportSize(size);await page.goto('/');await ready(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('footer').scrollIntoViewIfNeeded();await expect(page.locator('footer')).toBeVisible();
 await page.evaluate(()=>scrollTo(0,0));await mkdir(evidence,{recursive:true});await page.screenshot({path:`${evidence}/home-${size.width}x${size.height}.png`,fullPage:true});
 await writeFile(`${evidence}/runtime-${size.width}x${size.height}.json`,JSON.stringify(events,null,2));expect(events).toEqual({pageErrors:[],consoleErrors:[],failedRequests:[]});
});
test('homepage demo entrance is keyboard reachable with visible focus',async({page})=>{
 await page.goto('/');await ready(page);let found=false;
 for(let n=0;n<20;n++){await page.keyboard.press('Tab');if(await page.evaluate(()=>document.activeElement?.getAttribute('href')==='/ikea')){found=true;break;}}
 expect(found).toBe(true);const focus=page.locator(':focus');expect(await focus.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');await page.keyboard.press('Enter');await expect(page.getByLabel('Product name or IKEA article number')).toBeVisible();
});
