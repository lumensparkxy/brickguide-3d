#!/usr/bin/env node
/** Actual Three.js candidate rendering, with an isolated transport fixture. Not software E2E or publication. */
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,stat,realpath} from 'node:fs/promises';
import {resolve,dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {chromium} from '@playwright/test';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=value=>createHash('sha256').update(value).digest('hex');
const usage='node tools/render_candidate.mjs --scene PATH --geometry-root PATH --output NEW_DIR [--from 1 --to N] [--width 1440 --height 900 --timeout-ms 60000]';
const flags=new Map();
for(let index=2;index<process.argv.length;index+=2){const key=process.argv[index];if(key==='--help'){console.log(usage);process.exit(0);}if(!['--scene','--geometry-root','--output','--from','--to','--width','--height','--timeout-ms'].includes(key)||!process.argv[index+1]||flags.has(key))throw new Error(usage);flags.set(key,process.argv[index+1]);}
for(const key of ['--scene','--geometry-root','--output'])if(!flags.has(key))throw new Error(usage);
const integer=(key,fallback,min,max)=>{const value=Number(flags.get(key)??fallback);if(!Number.isInteger(value)||value<min||value>max)throw new Error(`Invalid ${key}`);return value;};
const input=resolve(flags.get('--scene')),geometry=await realpath(resolve(flags.get('--geometry-root'))),output=resolve(flags.get('--output'));
const width=integer('--width',1440,320,3840),height=integer('--height',900,600,2160),timeout=integer('--timeout-ms',60000,1000,300000);
const inputStat=await stat(input);if(!inputStat.isFile()||inputStat.size>256_000_000)throw new Error('Candidate input exceeds256MB bound');
const original=await readFile(input);
// Use canonical Python contracts/hash, avoiding JSON float normalization drift between runtimes.
const normalize=spawnSync(join(ROOT,'.venv/bin/python'),['-c',`
import json,sys
from pathlib import Path
from guide2build.core.models import SceneManifest
from guide2build.releases.models import SceneV2,adapt_v1,digest
raw=json.load(sys.stdin)
if raw.get('schema_version')=='1.0':
    entries=json.loads(Path('config/sets.json').read_text())['sets']
    guide=next(g for s in entries if s['set_number']==raw['set_number'] for g in s['guides'] if g['guide_id']==raw['guide_id'])
    scene=adapt_v1(SceneManifest.model_validate(raw),guide['pdf_url'],guide['expected_page_count'])
else:
    scene=SceneV2.model_validate(raw)
print(json.dumps({'scene':scene.model_dump(mode='json'),'scene_sha256':digest(scene)}))
`],{cwd:ROOT,input:original,encoding:'utf8',env:{...process.env,PYTHONPATH:join(ROOT,'apps/api/src')},maxBuffer:512_000_000});
if(normalize.status!==0)throw new Error(`Candidate contract validation failed: ${normalize.stderr.slice(-2000)}`);
const normalized=JSON.parse(normalize.stdout),scene=normalized.scene;
const from=integer('--from',1,1,scene.steps.length),to=integer('--to',scene.steps.length,from,scene.steps.length);
const provenanceBytes=await readFile(join(geometry,'provenance.json'));if(provenanceBytes.length>32_000_000)throw new Error('Geometry provenance exceeds limit');
const provenance=JSON.parse(provenanceBytes),objects=new Map(),selected=new Set(),visiting=new Set();let geometryBytes=0;
const safePath=/^(?:parts\/(?:s\/)?|p\/(?:8\/|48\/)?)?[a-zA-Z0-9_.-]+\.(?:dat|ldr)$/;
async function geometryFile(path,record){
  if(!safePath.test(path)||path.includes('..'))throw new Error(`Unsafe geometry path: ${path}`);
  const file=await realpath(join(geometry,path));if(!file.startsWith(geometry+'/'))throw new Error('Geometry escapes selected directory');
  const info=await stat(file);if(info.size>1_000_000)throw new Error('Geometry file exceeds1MB bound');
  const bytes=await readFile(file);if(record?.url!=='https://library.ldraw.org/library/official/'+path)throw new Error(`Unexpected individual geometry origin: ${path}`);if(path!=='LDConfig.ldr'){const category=bytes.toString('utf8').match(/^0 !LDRAW_ORG (\S+)/m)?.[1];if(!['Part','Subpart','Primitive','48_Primitive','8_Primitive'].includes(category)||record.classification!==category)throw new Error(`Non-individual or unclassified geometry: ${path}`);if(!/^0 !LICENSE /m.test(bytes.toString('utf8')))throw new Error(`Geometry licence missing: ${path}`);}if(!record||sha(bytes)!==record.sha256)throw new Error(`Geometry checksum mismatch: ${path}`);
  geometryBytes+=bytes.length;if(geometryBytes>256_000_000)throw new Error('Geometry exceeds256MB closure bound');objects.set('/render-geometry/'+path,{bytes,type:'text/plain'});
}
async function closure(path,depth=0){if(depth>40||visiting.has(path))throw new Error('Cyclic/deep geometry closure');if(selected.has(path))return;if(selected.size>=20000)throw new Error('Geometry resource bound');const record=provenance.resources?.[path];if(!record||!Array.isArray(record.dependencies))throw new Error(`Missing geometry provenance: ${path}`);visiting.add(path);await geometryFile(path,record);for(const child of record.dependencies)await closure(child,depth+1);visiting.delete(path);selected.add(path);}
for(const part of scene.instances)await closure(part.geometry_ref);
await geometryFile('LDConfig.ldr',provenance.materials?.['LDConfig.ldr']);
const filtered={resources:Object.fromEntries([...selected].map(p=>[p,provenance.resources[p]])),file_map:Object.fromEntries(Object.entries(provenance.file_map??{}).filter(([,p])=>selected.has(p))),materials:provenance.materials};
const publicProvenance=Buffer.from(JSON.stringify(filtered));objects.set('/render-geometry/provenance.json',{bytes:publicProvenance,type:'application/json'});
const manifest={...scene,reviews:[],step_index:[],chunks:[],asset_base_url:'/render-chunks/',geometry_base_url:'/render-chunks/ldraw/'};delete manifest.steps;
for(let offset=0;offset<scene.steps.length;offset+=8){const index=offset/8,steps=scene.steps.slice(offset,offset+8),path=`chunks/${String(index).padStart(5,'0')}.json`,bytes=Buffer.from(JSON.stringify({steps}));objects.set('/render-chunks/'+path,{bytes,type:'application/json'});manifest.chunks.push({index,path,sha256:sha(bytes),bytes:bytes.length,step_ids:steps.map(s=>s.step_id)});manifest.step_index.push(...steps.map(({poses,visible_instance_ids,active_instance_ids,...s})=>({...s,chunk_index:index,visible_instance_count:visible_instance_ids.length,active_instance_count:active_instance_ids.length})));}
// A private render-session transport ID, deliberately not a publication/approval certificate.
manifest.release_sha256=sha(Buffer.from(JSON.stringify(manifest)));
for(const [path,item] of [...objects])if(path.startsWith('/render-geometry/'))objects.set(path.replace('/render-geometry/','/render-chunks/ldraw/'),item);
const official=scene.sources[0].official_url,guide={guide_id:scene.guide_id,label:'Local candidate render',pdf_url:official,expected_main_steps:null,tutorial_available:true};
const api=new Map([
 ['/api/v1/config',{mode:'preview',source_images:false,requests_enabled:false}],
 [`/api/v1/sets/${scene.set_number}`,{set_number:scene.set_number,name:'Local candidate render',official_page:official,guides:[guide]}],
 [`/api/v1/sets/${scene.set_number}/guides/${scene.guide_id}/release`,manifest],
]);
const dist=await realpath(join(ROOT,'apps/web/dist'));await stat(join(dist,'index.html'));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{
  if(req.method!=='GET'){res.writeHead(405).end();return;}
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(api.has(path)){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(api.get(path)));return;}
  if(objects.has(path)){const item=objects.get(path);res.setHeader('Content-Type',item.type);res.end(item.bytes);return;}
  if(path==='/'||path.startsWith('/assets/')||path.startsWith('/images/')){const file=await realpath(join(dist,path==='/'?'index.html':path.slice(1)));if(!file.startsWith(dist+'/'))throw new Error('Asset escapes builtfrontend');const info=await stat(file);if(info.size>16_000_000)throw new Error('Asset size bound');res.setHeader('Content-Type',types[extname(file)]??'application/octet-stream');res.end(await readFile(file));return;}
  res.writeHead(404).end('Not available in candidate renderer');
}catch{res.writeHead(404).end('Not available in candidate renderer');}});
await mkdir(output,{recursive:false}); // Deliberately reject existing evidence directories.
const report={schema_version:'1.0',artifact_kind:'candidate_render_evidence',generated_at:new Date().toISOString(),input_sha256:sha(original),scene_sha256:normalized.scene_sha256,set_number:scene.set_number,guide_id:scene.guide_id,revision:scene.revision,source_sha256:scene.source_sha256,input_path:input,geometry_provenance_sha256:sha(provenanceBytes),served_geometry_provenance_sha256:sha(publicProvenance),geometry_resource_count:selected.size,geometry_bytes:geometryBytes,viewer_build_sha256:sha(await readFile(join(dist,'index.html'))),range:{from,to,total_steps:scene.steps.length},viewport:{width,height},steps:[],console_errors:[],status:'running',limitations:['Actual existing Three.js viewer with isolated candidate API fixture; not software E2E or publication.','Image correspondence, connector validity, strength, human review and physical construction are not certified.','Frame samples are on-demand draw submissions, not sustained interactive FPS or GPU utilization.'],physical_build:'not_run',human_review:'not_run'};
let browser,cancelled=false;
const cancel=()=>{cancelled=true;void browser?.close();server.close();};
process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes);});const origin=`http://127.0.0.1:${server.address().port}`;
 if(cancelled)throw new Error('Rendering cancelled');
 browser=await chromium.launch({headless:true});if(cancelled)throw new Error('Rendering cancelled');const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(timeout);
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort('blockedbyclient'));
 page.on('pageerror',error=>report.console_errors.push(error.message));
 await page.goto(origin+'/?benchmark=1');await page.getByLabel('Your set number').fill(scene.set_number);await page.getByRole('button',{name:'Find my set',exact:true}).click();await page.getByRole('button',{name:'Open tutorial',exact:true}).click();
 const loaded=async()=>{const result=await page.waitForFunction(()=>{const failure=[...document.querySelectorAll('[role=alert]')].filter(el=>el.getClientRects().length).map(el=>el.textContent).join(' ');if(failure)return {error:failure};const replay=document.querySelector('button.replay');return replay&&!replay.disabled?{ready:true}:false;},{},{timeout});const state=await result.jsonValue();if(state.error)throw new Error(state.error);};
 await loaded();
 for(let index=from-1;index<to;index++){
  if(cancelled)throw new Error('Rendering cancelled');
  const started=performance.now();await page.getByLabel('Jump to instruction').selectOption(String(index));await page.waitForFunction(expected=>document.querySelector('.viewport')?.dataset.stepId===expected,scene.steps[index].step_id);await page.locator('.viewport canvas').waitFor({state:'visible'});await loaded();await page.getByRole('button',{name:'Reset view',exact:true}).click();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const file=`step-${String(index+1).padStart(4,'0')}.png`;const png=await page.locator('.viewport canvas').screenshot({path:join(output,file),animations:'disabled'});
  const metrics=await page.evaluate(()=>{const audits=window.__guide2buildRendererAudits??[];const audit=audits.at(-1);const viewport=document.querySelector('.viewport');return {hardware:audit?.hardware??null,samples:audit?.samples.filter(s=>s.phase==='viewport'&&s.stepId===viewport?.dataset.stepId).slice(-20)??[],gpu_ms:audit?.gpuMs??[],gpu_discarded:audit?.gpuDiscarded??0,camera_frame:viewport?.dataset.cameraFrame,geometry_count:Number(viewport?.dataset.geometryCount??0),draw_calls:Number(viewport?.dataset.drawCalls??0)};});
  const step=scene.steps[index];report.steps.push({index:index+1,step_id:step.step_id,section_id:step.section_id,main_step_number:step.main_step_number,source:step.source,visible_instance_count:step.visible_instance_ids.length,active_instance_ids:step.active_instance_ids,screenshot:file,png_sha256:sha(png),capture_elapsed_ms:performance.now()-started,...metrics});
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 }
 report.status='rendered';
}catch(error){report.status=cancelled?'cancelled':'failed';report.error=String(error.message??error);process.exitCode=1;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,scene_sha256:report.scene_sha256,rendered_steps:report.steps.length,report:join(output,'report.json'),error:report.error??null}));
