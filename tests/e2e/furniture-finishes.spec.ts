import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const variants=[{article:'30449908',name:'White'},{article:'80104268',name:'Black-brown'},{article:'70319028',name:'White stained oak effect'}];
const evidenceRoot='var/evidence/furniture-finishes';
const stage=(page:Page)=>page.getByTestId('coach-viewport');
async function open(page:Page,article:string,action='prepare'){
 await page.goto(`/ikea?product=${article}&action=${action}`);
 await expect(page.getByTestId('coach-app')).toBeVisible();
 await expect(stage(page)).toHaveAttribute('data-action',action);
 const response=await page.request.get(`/api/v1/furniture/products/${article}`);const product=await response.json();
 await expect(stage(page)).toHaveAttribute('data-finish',product.finish.id);
 await expect(page.getByRole('combobox',{name:'Furniture finish'})).toHaveValue(article);
}
type FakeVoice={readyAuto:boolean;played:number;audioStopped:number;sent:unknown[];frame:()=>void;requests:number;stops:number;enabled:boolean;socketsClosed:number;mode:'allow'|'deny'|'pending';resolveMic:()=>void;emit:(event:unknown)=>void;hidden:()=>void};
const fake=(page:Page)=>page.evaluate(()=>{const v=(window as unknown as {__voice:FakeVoice}).__voice;return {requests:v.requests,stops:v.stops,enabled:v.enabled,socketsClosed:v.socketsClosed,played:v.played,audioStopped:v.audioStopped,sent:v.sent};});
async function setup(page:Page,initialUrl='/ikea?product=30449908&action=screw-1'){
 await page.route('**/api/v1/furniture/voice/status',r=>r.fulfill({json:{configured:true}}));
 await page.route('**/api/v1/furniture/voice/session',r=>r.fulfill({status:200,json:{token:'auth_tokens/mock-only',model:'gemini-3.8-live',setup:{model:'models/gemini-3.8-live',generationConfig:{responseModalities:['AUDIO']}}}}));
 await page.addInitScript(()=>{
  const state={readyAuto:true,played:0,audioStopped:0,sent:[] as unknown[],frame:()=>{},requests:0,stops:0,enabled:true,socketsClosed:0,mode:'allow',resolveMic:()=>{},emit:(_event:unknown)=>{},hidden:()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}};
  Object.assign(window,{__voice:state});
  const track={kind:'audio',get enabled(){return state.enabled;},set enabled(value:boolean){state.enabled=value;},stop(){state.stops++;}};
  const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
  const getUserMedia=()=>{state.requests++;if(state.mode==='deny')return Promise.reject(new DOMException('Denied','NotAllowedError'));if(state.mode==='pending')return new Promise(resolve=>{state.resolveMic=()=>resolve(stream);});return Promise.resolve(stream);};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia}});
  class Audio {
   state='running';sampleRate=16000;startedAt=Date.now();get currentTime(){return (Date.now()-this.startedAt)/1000;}destination={};audioWorklet={addModule:()=>Promise.resolve()};
   resume(){return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
   createMediaStreamSource(){return {connect(){},disconnect(){}};}createGain(){return {gain:{value:1},connect(){},disconnect(){}};}
   createBuffer(_channels:number,length:number,rate:number){return {duration:length/rate,getChannelData:()=>new Float32Array(length)};}
   createBufferSource(){const clock=this;let endTimer:ReturnType<typeof setTimeout>|undefined;const node={buffer:null as null|{duration:number},onended:null as null|(()=>void),connect(){},disconnect(){},start(when=clock.currentTime){state.played++;endTimer=setTimeout(()=>{endTimer=undefined;node.onended?.();},Math.max(0,when-clock.currentTime+(node.buffer?.duration??0))*1000);},stop(){if(endTimer!==undefined)clearTimeout(endTimer);endTimer=undefined;state.audioStopped++;}};return node;}
  }
  class Worklet {port={onmessage:null as null|((e:{data:Float32Array})=>void),close(){}};constructor(){state.frame=()=>this.port.onmessage?.({data:new Float32Array(128).fill(.1)});}connect(){}disconnect(){}}
  const RealSocket=window.WebSocket;
  class Socket {
   static OPEN=1;readyState=1;bufferedAmount=0;onopen:null|(()=>void)=null;onclose:null|(()=>void)=null;onerror:null|(()=>void)=null;onmessage:null|((e:{data:string})=>void)=null;
   constructor(url:string){if(!url.includes('generativelanguage.googleapis.com'))return new RealSocket(url) as unknown as Socket;state.emit=event=>this.onmessage?.({data:JSON.stringify(event)});queueMicrotask(()=>this.onopen?.());}
   send(value:string){const data=JSON.parse(value);state.sent.push(data);if(data.setup&&state.readyAuto)queueMicrotask(()=>state.emit({setupComplete:{}}));}
   close(){state.socketsClosed++;this.readyState=3;this.onclose?.();}
  }
  Object.defineProperty(window,'WebSocket',{configurable:true,value:Socket});Object.defineProperty(window,'AudioContext',{configurable:true,value:Audio});Object.defineProperty(window,'AudioWorkletNode',{configurable:true,value:Worklet});
 });
 await page.goto(initialUrl);await expect(page.getByTestId('coach-app')).toBeVisible();
}
async function details(page:Page){if(!await page.getByTestId('voice-panel').isVisible())await page.getByTestId('voice-launcher').click();await expect(page.getByTestId('voice-panel')).toBeVisible();}
async function dialog(page:Page){await details(page);await expect(page.getByRole('button',{name:'Start conversation'})).toBeEnabled();}
async function connect(page:Page){await page.getByRole('button',{name:'Start conversation'}).click();await expect(page.getByRole('button',{name:'Mute microphone',exact:true})).toBeEnabled();await details(page);await page.getByText('Conversation transcript',{exact:false}).click();}
async function emit(page:Page,event:unknown){await page.evaluate(event=>(window as unknown as {__voice:FakeVoice}).__voice.emit(event),event);}

test('real catalogue returns three identified finishes and rejects unsupported articles',async({request,page})=>{
 const response=await request.get('/api/v1/furniture/products?q=LACK');expect(response.ok()).toBeTruthy();
 const {products}=await response.json();expect(products.map((p:{article_number:string})=>p.article_number).sort()).toEqual(variants.map(v=>v.article).sort());
 for(const variant of variants){const r=await request.get(`/api/v1/furniture/products/${variant.article}/tutorial`);expect(r.ok()).toBeTruthy();const t=await r.json();expect(t.product.article_number).toBe(variant.article);expect(t.product.finish.name.toLowerCase()).toBe(variant.name.toLowerCase());expect(t.coach_actions).toHaveLength(11);}
 expect((await request.get('/api/v1/furniture/products/00000000/tutorial')).status()).toBe(404);
 await page.setViewportSize({width:1440,height:1000});await page.goto('/ikea');await page.getByLabel('Product name or IKEA article number').fill('LACK');await page.getByRole('button',{name:'Find furniture'}).click();await expect(page.getByRole('button',{name:'Open assembly guide'})).toHaveCount(3);await mkdir(evidenceRoot,{recursive:true});await page.screenshot({path:`${evidenceRoot}/catalogue-three-finishes.png`,fullPage:true});
});
test('switching finishes restores only each articles own confirmations and viewed action',async({page})=>{
 await open(page,'30449908','screw-1');await page.getByRole('button',{name:'Done, next',exact:true}).click();
 await expect(stage(page)).toHaveAttribute('data-action','leg-1');await expect(page.getByText('1 of 11 actions confirmed by you')).toBeVisible();
 const select=page.getByRole('combobox',{name:'Furniture finish'});await select.selectOption('80104268');
 await expect(stage(page)).toHaveAttribute('data-action','prepare');await expect(page).toHaveURL(/product=80104268/);await expect(page.getByText('0 of 11 actions confirmed by you')).toBeVisible();
 await page.getByRole('button',{name:'Back',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(stage(page)).toHaveAttribute('data-action','identify');
 await select.selectOption('70319028');await expect(stage(page)).toHaveAttribute('data-action','prepare');await expect(page.getByText('0 of 11 actions confirmed by you')).toBeVisible();
 await select.selectOption('30449908');await expect(stage(page)).toHaveAttribute('data-action','leg-1');await expect(page.getByText('1 of 11 actions confirmed by you')).toBeVisible();
 await page.reload();await expect(stage(page)).toHaveAttribute('data-action','leg-1');await expect(select).toHaveValue('30449908');
 await select.selectOption('80104268');await expect(stage(page)).toHaveAttribute('data-action','identify');await expect(page.getByText('0 of 11 actions confirmed by you')).toBeVisible();
});
test('variant switch releases active voice and binds new session to selected article',async({page})=>{
 const offers:unknown[]=[];page.on('request',r=>{if(r.url().endsWith('/voice/session'))offers.push(r.postDataJSON());});
 await setup(page);await dialog(page);await connect(page);await page.getByRole('button',{name:'Hide voice details'}).click();
 expect(offers[0]).toHaveProperty('article_number','30449908');
 await emit(page,{serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:'AAAA'.repeat(16000)}}]}}});
 await expect.poll(async()=>(await fake(page)).played).toBe(1);
 await page.getByRole('combobox',{name:'Furniture finish'}).selectOption('80104268');await expect(stage(page)).toHaveAttribute('data-action','prepare');
 expect((await fake(page)).stops).toBe(1);expect((await fake(page)).socketsClosed).toBe(1);expect((await fake(page)).audioStopped).toBe(1);
 await emit(page,{toolCall:{functionCalls:[{id:'stale',name:'portal_control',args:{command:'next'}}]}});await expect(stage(page)).toHaveAttribute('data-action','prepare');
 await dialog(page);await connect(page);expect(offers[1]).toHaveProperty('article_number','80104268');
 await page.getByRole('button',{name:'End conversation'}).click();expect((await fake(page)).stops).toBe(2);
});
test('variant document failure is recoverable without transferring confirmations',async({page})=>{
 let fail=true;await page.route('**/products/80104268/tutorial',r=>fail?r.fulfill({status:503,json:{detail:'source unavailable'}}):r.continue());
 await open(page,'30449908','screw-1');await page.getByRole('combobox',{name:'Furniture finish'}).selectOption('80104268');
 await expect(page.getByRole('alert')).toContainText('official documents');
 fail=false;await page.getByRole('button',{name:/Retry/}).click();await expect(stage(page)).toHaveAttribute('data-action','prepare');
 await expect(page.getByText('0 of 11 actions confirmed by you')).toBeVisible();await expect(page).toHaveURL(/product=80104268/);
});
test('initial variant deep link recovers missing documents and retains official product access',async({page})=>{
 let fail=true;await page.route('**/products/70319028/tutorial',r=>fail?r.fulfill({status:503,json:{detail:'source unavailable'}}):r.continue());
 await page.goto('/ikea?product=70319028&action=leg-1');await expect(page.getByRole('alert')).toContainText('official documents');
 await expect(page.getByRole('link',{name:/official product/i})).toHaveAttribute('href','https://www.ikea.com/ch/en/p/lack-side-table-white-stained-oak-effect-70319028/');
 fail=false;await page.getByRole('button',{name:'Retry guide'}).click();await expect(stage(page)).toHaveAttribute('data-action','prepare');
 await expect(page.getByRole('combobox',{name:'Furniture finish'})).toHaveValue('70319028');
});
for(const size of [{width:1440,height:900},{width:390,height:844}])for(const variant of variants)test(`source and visual evidence ${variant.article} ${size.width}x${size.height}`,async({page})=>{
 const evidence={consoleErrors:[] as string[],pageErrors:[] as string[],requestFailures:[] as string[],badResponses:[] as string[]};
 page.on('console',m=>{if(m.type()==='error')evidence.consoleErrors.push(m.text());});page.on('pageerror',e=>evidence.pageErrors.push(e.message));
 page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')evidence.requestFailures.push(`${r.url().split('?')[0]}: ${r.failure()?.errorText}`);});
 page.on('response',r=>{if(r.status()>=400)evidence.badResponses.push(`${r.status()} ${r.url().split('?')[0]}`);});
 await page.setViewportSize(size);await page.emulateMedia({reducedMotion:'reduce'});await mkdir(evidenceRoot,{recursive:true});
 for(const action of ['prepare','leg-1','final-checks']){
  await open(page,variant.article,action);await expect(stage(page).locator('canvas')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  const nav=await page.getByRole('navigation',{name:'Assembly actions'}).boundingBox();expect(nav).not.toBeNull();expect(nav!.y+nav!.height).toBeLessThanOrEqual(size.height+1);
  const contrasts=await page.locator('.coach-corner-label:visible').evaluateAll(labels=>labels.map(el=>{
   const style=getComputedStyle(el);const luminance=(color:string)=>{const channels=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};
   const foreground=luminance(style.color),background=luminance(style.backgroundColor);return (Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
  }));for(const ratio of contrasts)expect(ratio).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({path:`${evidenceRoot}/${variant.article}-${action}-${size.width}x${size.height}.png`,fullPage:true});
  await page.getByRole('button',{name:'Official diagram',exact:true}).click();
  const diagram=page.getByRole('img',{name:/Official diagram/});if(await diagram.count()){await expect(diagram).toBeVisible();await expect.poll(()=>diagram.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBeTruthy();}
  await page.getByRole('button',{name:'Close panel'}).click();
 }
 await writeFile(`${evidenceRoot}/runtime-${variant.article}-${size.width}x${size.height}.json`,JSON.stringify(evidence,null,2));
 expect(evidence).toEqual({consoleErrors:[],pageErrors:[],requestFailures:[],badResponses:[]});
});
test('long oak finish fits a 320px phone header with a 44px selector',async({page})=>{
 await page.setViewportSize({width:320,height:740});await page.emulateMedia({reducedMotion:'reduce'});await open(page,'70319028','leg-1');
 const selector=page.getByRole('combobox',{name:'Furniture finish'}),box=await selector.boundingBox();expect(box).not.toBeNull();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(320);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await mkdir(evidenceRoot,{recursive:true});await page.screenshot({path:`${evidenceRoot}/oak-narrow-320x740.png`,fullPage:true});
});
