import {test,expect,type Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import fixture from '../fixtures/synthetic.scene.json';
import {selectSyntheticSet} from './synthetic-selection';

// Original synthetic transport/geometry fixture only; never pilot reconstruction evidence.
const geometry='0 Original synthetic playback fixture\n0 !LDRAW_ORG Part\n0 BFC CERTIFY CCW\n4 16 -10 0 -10 -10 0 10 10 0 10 10 0 -10\n4 16 -10 8 -10 10 8 -10 10 8 10 -10 8 10\n4 16 -10 0 -10 10 0 -10 10 8 -10 -10 8 -10\n4 16 10 0 -10 10 0 10 10 8 10 10 8 -10\n4 16 10 0 10 -10 0 10 -10 8 10 10 8 10\n4 16 -10 0 10 -10 0 -10 -10 8 -10 -10 8 10\n';
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
function gate(){let release!:()=>void;const promise=new Promise<void>(resolve=>{release=resolve;});return {promise,release};}

async function openChunkedFixture(page:Page) {
  const steps=fixture.steps.map(step=>({...step,section_id:'synthetic'}));
  const chunks=steps.map((step,index)=>{
    const body=JSON.stringify({steps:[step]});
    return {body,index,path:`chunks/${index}.json`,sha256:createHash('sha256').update(body).digest('hex'),bytes:Buffer.byteLength(body),step_ids:[step.step_id]};
  });
  const manifest={...fixture,schema_version:'2.0',release_sha256:'a'.repeat(64),
    sources:[{guide_id:'synthetic',source_sha256:fixture.source_sha256,official_url:'https://www.lego.com/test.pdf',page_count:1}],
    sections:[{section_id:'synthetic',source_sha256:fixture.source_sha256,label:'Synthetic transport test'}],
    step_index:steps.map(({poses,visible_instance_ids,active_instance_ids,...step},chunk_index)=>({...step,chunk_index,
      visible_instance_count:visible_instance_ids.length,active_instance_count:active_instance_ids.length})),
    chunks:chunks.map(({body,...chunk})=>chunk),asset_base_url:'/published-assets/playback-fixture/',
    geometry_base_url:'/published-assets/playback-fixture/ldraw/'};
  const holds=new Map<number,ReturnType<typeof gate>>();
  const failures=new Set<number>();
  const requests:number[]=[];
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/api/v1/config',route=>route.fulfill({json:{mode:'public',source_images:false,requests_enabled:false}}));
  await page.route('**/api/v1/sets/99999',route=>route.fulfill({json:{set_number:'99999',name:'Synthetic playback fixture',official_page:'https://www.lego.com/',
    guides:[{guide_id:'synthetic',label:'Synthetic playback fixture',pdf_url:'https://www.lego.com/test.pdf',expected_main_steps:3,tutorial_available:true}]}}));
  await page.route('**/api/v1/sets/99999/guides/synthetic/release',route=>route.fulfill({json:manifest}));
  await page.route('**/published-assets/playback-fixture/chunks/*.json',async route=>{
    const index=Number(route.request().url().split('/').at(-1)!.split('.')[0]);requests.push(index);
    if(holds.has(index))await holds.get(index)!.promise;
    if(failures.delete(index)){await route.fulfill({status:503,body:'Synthetic temporary chunk failure'});return;}
    await route.fulfill({body:chunks[index].body,contentType:'application/json'});
  });
  await page.route('**/published-assets/playback-fixture/ldraw/provenance.json',route=>route.fulfill({json:{
    resources:{'parts/synthetic.dat':{dependencies:[]}},file_map:{'synthetic.dat':'parts/synthetic.dat'}}}));
  await page.route('**/published-assets/playback-fixture/ldraw/LDConfig.ldr',route=>route.fulfill({body:'0 !COLOUR White CODE 15 VALUE #FFFFFF EDGE #333333\n'}));
  await page.route('**/published-assets/playback-fixture/ldraw/parts/synthetic.dat',route=>route.fulfill({body:geometry}));
  await page.goto('/');await selectSyntheticSet(page);
  await button(page,'Find my set').click();await button(page,'Open tutorial').click();
  await expect(button(page,'Play full build')).toBeEnabled();
  return {holds,failures,requests};
}

test('chunked playback preserves intent through restart/loading, pause, stop and manual seek',async({page})=>{
  test.setTimeout(45000);
  const control=await openChunkedFixture(page);
  const seek=page.getByLabel('Jump to instruction');
  await seek.selectOption('2');await expect(page.locator('.viewport')).toHaveAttribute('data-step-id','s3');
  await expect(button(page,'Play full build')).toBeEnabled();
  const restart=gate();control.holds.set(0,restart);
  const later=gate();control.holds.set(2,later);
  try {
    await button(page,'Play full build').click();
    await expect(page.getByText('Loading this instruction…',{exact:true})).toBeVisible();
    await expect(button(page,'Pause build')).toBeVisible();
    await button(page,'Pause build').click();await expect(button(page,'Resume build')).toBeVisible();
    restart.release();await expect(button(page,'Replay')).toBeEnabled();
    await page.waitForTimeout(1200);await expect(seek).toHaveValue('0');
    await expect(button(page,'Resume build')).toBeVisible();
    await button(page,'Resume build').click();
    await expect(seek).toHaveValue('2',{timeout:6000});
    await expect(page.getByText('Loading this instruction…',{exact:true})).toBeVisible();
    await expect(page.locator('.viewport')).toHaveCount(0);
    await expect(button(page,'Pause build')).toBeVisible();
    await expect(page.getByText('Playback complete · all instructions shown',{exact:true})).toHaveCount(0);
    await button(page,'Stop build').click();later.release();
    await expect(button(page,'Play full build')).toBeEnabled();
    await page.waitForTimeout(1200);await expect(seek).toHaveValue('2');
    await button(page,'Play full build').click();await expect(button(page,'Pause build')).toBeVisible();
    await seek.selectOption('1');await expect(button(page,'Pause build')).toHaveCount(0);
    await page.waitForTimeout(1200);await expect(seek).toHaveValue('1');
    await expect(button(page,'Play full build')).toBeEnabled();
    await button(page,'Play full build').click();
    await expect(page.getByText('Playback complete · all instructions shown',{exact:true})).toBeVisible({timeout:8000});
    await expect(page.locator('.viewport')).toHaveAttribute('data-step-id','s3');
    expect(control.requests.filter(index=>index===0).length).toBeGreaterThan(1);
    expect(control.requests.filter(index=>index===2).length).toBeGreaterThan(1);
  } finally {restart.release();later.release();}
});

test('failed playback chunk pauses with visible retry and resumes without false completion',async({page})=>{
  const control=await openChunkedFixture(page);control.failures.add(2);
  await button(page,'Play full build').click();
  await expect(page.getByRole('alert')).toContainText('This instruction could not be loaded. Please retry.');
  await expect(button(page,'Resume build')).toBeDisabled();
  await expect(button(page,'Stop build')).toBeEnabled();
  await expect(page.getByText('Playback complete · all instructions shown',{exact:true})).toHaveCount(0);
  await button(page,'Retry instruction').click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(button(page,'Replay')).toBeEnabled();
  await expect(button(page,'Resume build')).toBeEnabled();
  await button(page,'Resume build').click();
  await expect(page.getByText('Playback complete · all instructions shown',{exact:true})).toBeVisible({timeout:6000});
  await expect(page.locator('.viewport')).toHaveAttribute('data-step-id','s3');
});
