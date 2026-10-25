import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
test('floating voice coach drags without opening, stays onscreen, and resets',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/ikea?product=30449908&action=screw-1');
 const icon=page.getByTestId('voice-launcher'),bubble=page.locator('[data-voice-companion]');await expect(icon).toBeVisible();
 const before=(await icon.boundingBox())!;await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();await page.mouse.move(140,220,{steps:12});await page.mouse.up();
 await expect(page.getByTestId('voice-panel')).toHaveCount(0);const moved=(await icon.boundingBox())!;expect(moved.x).toBeLessThan(before.x-100);
 await icon.click();await expect(page.getByTestId('voice-panel')).toBeVisible();await expect(bubble).toHaveAttribute('data-phase','idle');
 const expanded=(await bubble.boundingBox())!;expect(expanded.y).toBeGreaterThanOrEqual(7);expect(expanded.x).toBeGreaterThanOrEqual(7);
 await page.getByRole('button',{name:'Hide voice details'}).click();await icon.focus();const preKey=(await icon.boundingBox())!;await page.keyboard.press('Shift+ArrowRight');expect((await icon.boundingBox())!.x).toBeGreaterThan(preKey.x);
 await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','screw-1');
 await page.setViewportSize({width:390,height:844});const resized=(await bubble.boundingBox())!;expect(resized.x+resized.width).toBeLessThanOrEqual(391);
 await icon.click();await page.getByRole('button',{name:'Reset position'}).click();await page.getByRole('button',{name:'Hide voice details'}).click();
 await mkdir('var/evidence/voice-floating',{recursive:true});await page.screenshot({path:'var/evidence/voice-floating/phone.png'});
 await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'var/evidence/voice-floating/desktop.png'});
});
test('touch can reposition the helper without opening it',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});const page=await context.newPage();await page.goto('/ikea?product=30449908&action=screw-1');const icon=page.getByTestId('voice-launcher');await expect(icon).toBeVisible();const box=(await icon.boundingBox())!;const client=await context.newCDPSession(page);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:300}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page.getByTestId('voice-panel')).toHaveCount(0);expect((await icon.boundingBox())!.x).toBeLessThan(150);await context.close();
});
