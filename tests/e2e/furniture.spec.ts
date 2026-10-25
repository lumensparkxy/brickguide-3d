import {test, expect, type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const evidence = 'var/evidence/furniture';
async function openTutorial(page: Page) {
  await page.goto('/ikea?experience=legacy');
  await page.getByLabel('Product name or IKEA article number').fill('304.499.08');
  await page.getByRole('button', {name: 'Find furniture'}).click();
  await expect(page.getByRole('heading', {name: 'Your supported furniture'})).toBeVisible();
  await page.getByRole('button', {name: 'Open assembly guide'}).click();
  await expect(page.locator('.furn-workspace')).toBeVisible();
}

test('real-source furniture tutorial: complete sequence, navigation, source, resume and keyboard', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
  await page.setViewportSize({width:1440,height:1000});
  mkdirSync(evidence, {recursive:true});
  await page.goto('/ikea?experience=legacy');
  await expect(page).toHaveTitle('Furniture Assembly Assistant');
  await page.screenshot({path:`${evidence}/desktop-landing.png`,fullPage:true});
  await openTutorial(page);
  const response = await page.request.get('/api/v1/furniture/products/30449908/tutorial');
  expect(response.ok()).toBeTruthy();
  const tutorial = await response.json();
  expect(tutorial.review.agent_review).toBe('source_checked');
  expect(tutorial.review.human_review).toBe('not_run');
  expect(tutorial.review.physical_build).toBe('not_run');
  const canvas = page.locator('.furn-model-panel canvas');
  const initialView = await canvas.screenshot();
  await page.getByRole('button', {name:'Rotate left',exact:true}).click();
  expect((await canvas.screenshot()).equals(initialView)).toBeFalsy();
  await page.getByRole('button', {name:'Zoom in',exact:true}).click();
  await page.getByRole('button', {name:'Reset view',exact:true}).click();
  const help = page.locator('.furn-help details').first();
  await help.locator('summary').click();
  await expect(help.locator('p')).toBeVisible();
  await help.locator('summary').click();
  for (let i = 0; i < tutorial.steps.length; i++) {
    const step = tutorial.steps[i];
    await expect(page.locator('.furn-instruction h2')).toHaveText(step.title);
    const img = page.locator('.furn-guide-panel img');
    await expect(img).toHaveAttribute('src', `/api/v1/furniture/documents/${step.source.document_id}/pages/${step.source.page_index}?article_number=${tutorial.product.article_number}`);
    await expect.poll(() => img.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBeTruthy();
    await expect(page.locator('.furn-model-panel canvas')).toBeVisible();
    await page.getByRole('button', {name:'Replay step'}).click();
    await expect(page.locator('.furn-instruction h2')).toHaveText(step.title);
    await page.screenshot({path:`${evidence}/desktop-step-${i+1}.png`,fullPage:true});
    if (i < tutorial.steps.length-1) await page.getByRole('button', {name:'Next step'}).click();
  }
  await expect(page.getByText('You’ve reached the end of the guide.')).toBeVisible();
  await page.getByRole('button', {name:'Previous'}).click();
  const previous = tutorial.steps[tutorial.steps.length-2].title;
  await expect(page.locator('.furn-instruction h2')).toHaveText(previous);
  await page.reload();
  await expect(page).toHaveURL(/product=30449908/);
  await expect(page.locator('.furn-instruction h2')).toHaveText(previous);
  await page.getByRole('button', {name:`Step 1: ${tutorial.steps[0].title}`,exact:true}).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.furn-instruction h2')).toHaveText(tutorial.steps[0].title);
  await expect(page.getByRole('button', {name:`Step 1: ${tutorial.steps[0].title}`,exact:true})).toBeFocused();
  expect(errors).toEqual([]);
});

test('phone layout, source tab and reduced motion remain usable', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await openTutorial(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('button', {name:'Next step'}).click();
  await page.getByRole('tab', {name:'Official diagram'}).click();
  await expect(page.locator('.furn-guide-panel img')).toBeVisible();
  await page.screenshot({path:`${evidence}/phone-source.png`,fullPage:true});
  await page.getByRole('tab', {name:'Official diagram'}).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', {name:'3D illustration'})).toHaveAttribute('aria-selected','true');
  await page.getByRole('button', {name:'Replay step'}).click();
  await expect(page.locator('.furn-model-panel canvas')).toBeVisible();
  await page.screenshot({path:`${evidence}/phone-model.png`,fullPage:true});
});

test('unknown product and a failed source image expose recovery', async ({page}) => {
  await page.goto('/ikea?experience=legacy');
  await page.getByLabel('Product name or IKEA article number').fill('BILLY');
  await page.getByRole('button', {name:'Find furniture'}).click();
  await expect(page.getByRole('heading', {name:'No supported product found'})).toBeVisible();
  await page.route('**/api/v1/furniture/documents/*/pages/*', route => route.fulfill({status:503,body:'Unavailable'}));
  await openTutorial(page);
  await expect(page.getByRole('alert')).toContainText('source image could not load');
  await expect(page.getByRole('link', {name:'Open full PDF'})).toHaveAttribute('href', /\/pdf\?article_number=30449908#page=/);
  await page.unroute('**/api/v1/furniture/documents/*/pages/*');
  await page.getByRole('button', {name:'retry image'}).click();
  await expect.poll(() => page.locator('.furn-guide-panel img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
});

test('WebGL failure preserves the instructions and official diagram', async ({page}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null;
      return Reflect.apply(getContext,this,[type,...args]);
    } as typeof getContext;
  });
  await openTutorial(page);
  await expect(page.locator('.furn-model-panel')).toContainText(/WebGL|3D.*unavailable/i);
  await page.getByRole('button', {name:'Next step'}).click();
  await expect(page.locator('.furn-instruction h2')).toBeVisible();
  await expect(page.locator('.furn-guide-panel img')).toBeVisible();
});

test('unavailable tutorial retries the guide without losing the product', async ({page}) => {
  await page.route('**/api/v1/furniture/products/30449908/tutorial', route => route.fulfill({status:503, json:{detail:{message:'Unavailable'}}}));
  await page.goto('/ikea?experience=legacy');
  await page.getByLabel('Product name or IKEA article number').fill('LACK');
  await page.getByRole('button', {name:'Find furniture'}).click();
  await page.getByRole('article').filter({hasText:'304.499.08'}).getByRole('button', {name:'Open assembly guide'}).click();
  await expect(page.getByRole('alert')).toContainText('not prepared');
  await page.unroute('**/api/v1/furniture/products/30449908/tutorial');
  await page.getByRole('button', {name:'Retry guide'}).click();
  await expect(page.locator('.furn-workspace')).toBeVisible();
});
