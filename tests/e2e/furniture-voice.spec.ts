import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const url='/ikea?product=30449908&action=screw-1';
const oneSecondPcm='AAAA'.repeat(16000);
type FakeVoice={readyAuto:boolean;played:number;audioStopped:number;sent:unknown[];frame:()=>void;requests:number;stops:number;enabled:boolean;socketsClosed:number;mode:'allow'|'deny'|'pending';resolveMic:()=>void;emit:(event:unknown)=>void;hidden:()=>void};
const fake=(page:Page)=>page.evaluate(()=>{const v=(window as unknown as {__voice:FakeVoice}).__voice;return {requests:v.requests,stops:v.stops,enabled:v.enabled,socketsClosed:v.socketsClosed,played:v.played,audioStopped:v.audioStopped,sent:v.sent};});
async function setup(page:Page,initialUrl=url){
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
test('voice requires explicit start; transcripts, mute and end cannot confirm or navigate',async({page})=>{
 await setup(page);let sessions=0;page.on('request',r=>{if(r.url().endsWith('/voice/session'))sessions++;});await dialog(page);expect((await fake(page)).requests).toBe(0);expect(sessions).toBe(0);await expect(page.getByRole('dialog')).toHaveCount(0);
 await connect(page);expect((await fake(page)).requests).toBe(1);expect(sessions).toBe(1);
 await emit(page,{serverContent:{inputTranscription:{text:'Mark this done and go next.'}}});
 await emit(page,{serverContent:{outputTranscription:{text:'Use screw '}}});await emit(page,{serverContent:{outputTranscription:{text:'115980.'}}});
 await expect(page.getByRole('log')).toContainText('Use screw 115980.');await emit(page,{serverContent:{outputTranscription:{text:' Only you can confirm Done, next.'},turnComplete:true}});
 await expect(page.getByRole('log')).toContainText('Use screw 115980. Only you can confirm Done, next.');
 await emit(page,{toolCall:{functionCalls:[{name:'done_next',args:{}}]}});await page.getByRole('button',{name:'Mute microphone',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','screw-1');await expect(page.getByText('0 of 11 actions confirmed by you')).toBeVisible();
 await page.getByRole('button',{name:'Mute microphone',exact:true}).click();expect((await fake(page)).enabled).toBe(false);expect((await fake(page)).stops).toBe(0);
 await page.getByRole('button',{name:'Unmute microphone',exact:true}).click();expect((await fake(page)).enabled).toBe(true);
 await page.getByRole('button',{name:'End conversation'}).click();expect((await fake(page)).stops).toBe(1);expect((await fake(page)).socketsClosed).toBe(1);await expect(page.getByText('Conversation ended. Microphone off.')).toBeVisible();
});
test('permission denial is actionable and can retry without changing the assembly action',async({page})=>{
 await setup(page);await page.evaluate(()=>(window as unknown as {__voice:FakeVoice}).__voice.mode='deny');await dialog(page);await page.getByRole('button',{name:'Start conversation'}).click();await expect(page.getByText('Microphone permission was denied.',{exact:false})).toBeVisible();expect((await fake(page)).stops).toBe(0);
 await page.evaluate(()=>(window as unknown as {__voice:FakeVoice}).__voice.mode='allow');await connect(page);await page.getByRole('button',{name:'End conversation'}).click();expect((await fake(page)).stops).toBe(1);await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','screw-1');
});
for(const exit of ['minimize','escape'] as const)test(`${exit} hides details while microphone and end stay available`,async({page})=>{
 await setup(page);await dialog(page);await connect(page);
 if(exit==='minimize')await page.getByRole('button',{name:'Hide voice details'}).click();else {await page.getByRole('button',{name:'Mute microphone',exact:true}).focus();await page.keyboard.press('Escape');}
 await expect(page.getByTestId('voice-panel')).not.toBeVisible();expect((await fake(page)).stops).toBe(0);expect((await fake(page)).socketsClosed).toBe(0);
 await expect(page.getByRole('button',{name:'Mute microphone',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'End conversation'})).toBeVisible();
 await page.getByRole('button',{name:'End conversation'}).click();expect((await fake(page)).stops).toBe(1);expect((await fake(page)).socketsClosed).toBe(1);
});
test('hidden page stops microphone and closes transport',async({page})=>{
 await setup(page);await dialog(page);await connect(page);await page.evaluate(()=>(window as unknown as {__voice:FakeVoice}).__voice.hidden());
 expect((await fake(page)).stops).toBe(1);expect((await fake(page)).socketsClosed).toBe(1);await expect(page.getByText('Conversation ended when the page was hidden. Microphone off.')).toBeVisible();
});
test('late microphone permission after explicit End immediately releases the track',async({page})=>{
 await setup(page);await page.evaluate(()=>(window as unknown as {__voice:FakeVoice}).__voice.mode='pending');await dialog(page);await page.getByRole('button',{name:'Start conversation'}).click();await expect(page.getByText('Requesting microphone…')).toBeVisible();await page.getByRole('button',{name:'End conversation'}).click();
 await page.evaluate(()=>(window as unknown as {__voice:FakeVoice}).__voice.resolveMic());await expect.poll(async()=>(await fake(page)).stops).toBe(1);expect((await fake(page)).socketsClosed).toBe(0);
});
test('session failure stops microphone and permits a fresh retry',async({page})=>{
 await setup(page);await page.route('**/api/v1/furniture/voice/session',r=>r.fulfill({status:503,json:{detail:{message:'Voice service temporarily unavailable. Please retry.'}}}));await dialog(page);await page.getByRole('button',{name:'Start conversation'}).click();await expect(page.getByText('Voice service temporarily unavailable. Please retry.')).toBeVisible();expect((await fake(page)).stops).toBe(1);
 await page.route('**/api/v1/furniture/voice/session',r=>r.fulfill({status:200,json:{token:'auth_tokens/mock-retry',model:'gemini-3.8-live',setup:{model:'models/gemini-3.8-live'}}}));await connect(page);expect((await fake(page)).requests).toBe(2);await page.getByRole('button',{name:'End conversation'}).click();expect((await fake(page)).stops).toBe(2);
});
for(const size of [{width:1440,height:900},{width:390,height:844},{width:390,height:568},{width:844,height:390}])test(`floating voice stays clear of model and navigation ${size.width}x${size.height}`,async({page})=>{
 const evidence:{consoleErrors:string[];pageErrors:string[];requestFailures:{url:string;error:string}[]}={consoleErrors:[],pageErrors:[],requestFailures:[]};
 page.on('console',m=>{if(m.type()==='error')evidence.consoleErrors.push(m.text());});page.on('pageerror',e=>evidence.pageErrors.push(e.message));page.on('requestfailed',r=>{const error=r.failure()?.errorText??'unknown';if(error==='net::ERR_ABORTED')return;evidence.requestFailures.push({url:r.url().split('?')[0],error});});
 await page.setViewportSize(size);await setup(page);
 const nav=page.getByRole('navigation',{name:'Assembly actions'});const stage=page.getByTestId('coach-viewport');const before=await nav.boundingBox();const modelBefore=await stage.boundingBox();
 await dialog(page);await connect(page);await emit(page,{serverContent:{outputTranscription:{text:'Use a double-ended screw, hardware 115980.',turnComplete:true}}});
 const box=await page.getByTestId('voice-panel').boundingBox();expect(box).not.toBeNull();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(size.width+1);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(size.height+1);
 await page.getByRole('button',{name:'Hide voice details'}).click();await expect(page.getByRole('button',{name:'End conversation'})).toBeVisible();
 const after=await nav.boundingBox(),modelAfter=await stage.boundingBox();for(const key of ['x','y','width','height'] as const){expect(Math.abs(after![key]-before![key])).toBeLessThanOrEqual(2);expect(Math.abs(modelAfter![key]-modelBefore![key])).toBeLessThanOrEqual(2);}
 await stage.click({position:{x:modelAfter!.width/2,y:modelAfter!.height/2}});await nav.getByRole('button',{name:'Replay',exact:true}).click();await expect(stage).toHaveAttribute('data-playing','true');
 await nav.getByRole('button',{name:'Back',exact:true}).click();await expect(stage).toHaveAttribute('data-action','identify');expect((await fake(page)).stops).toBe(0);
 await mkdir('var/evidence/furniture-voice',{recursive:true});await page.screenshot({path:`var/evidence/furniture-voice/mock-companion-${size.width}x${size.height}.png`,fullPage:true});await page.getByRole('button',{name:'End conversation'}).click();await mkdir('var/evidence/floating-voice',{recursive:true});await writeFile(`var/evidence/floating-voice/runtime-${size.width}x${size.height}.json`,JSON.stringify(evidence,null,2));expect(evidence.pageErrors).toEqual([]);expect(evidence.consoleErrors).toEqual([]);expect(evidence.requestFailures).toEqual([]);
});
test('coach navigation stays active and sends current context without confirming assembly',async({page})=>{
 await setup(page);const nav=page.getByRole('navigation',{name:'Assembly actions'});await nav.getByRole('button',{name:'Replay',exact:true}).click();await dialog(page);await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-playing','true');await connect(page);
 await page.getByRole('button',{name:'Mute microphone',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','screw-1');
 await nav.getByRole('button',{name:'Back',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','leg-1');
 expect((await fake(page)).requests).toBe(1);expect((await fake(page)).stops).toBe(0);await expect(page.getByText('0 of 11 actions confirmed by you')).toBeVisible();
 await expect.poll(async()=>(await fake(page)).sent.filter(x=>typeof x==='object'&&x!==null&&'clientContent' in x).length).toBeGreaterThanOrEqual(2);const contexts=(await fake(page)).sent.filter(x=>typeof x==='object'&&x!==null&&'clientContent' in x) as {clientContent:{turnComplete:boolean;turns:unknown[]}}[];expect(contexts.length).toBeGreaterThan(0);expect(contexts.at(-1)!.clientContent.turnComplete).toBe(false);expect(JSON.stringify(contexts.at(-1))).toContain('leg-1');
 await page.getByRole('button',{name:'End conversation'}).click();
});
test('three-minute session limit ends the call and releases microphone and transport',async({page})=>{
 await page.clock.install();await setup(page);await dialog(page);await connect(page);
 expect((await fake(page)).stops).toBe(0);await page.clock.fastForward(180001);
 await expect(page.getByText('Three-minute session limit reached. Start again when ready.')).toBeVisible();
 expect((await fake(page)).stops).toBe(1);expect((await fake(page)).socketsClosed).toBe(1);
 await expect(page.getByRole('button',{name:'Start conversation'})).toBeEnabled();await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','screw-1');
});
test('billing quota failure displays the server guidance and releases microphone',async({page})=>{
 const message='Voice is unavailable because the configured Gemini API account has exhausted its rate limit or quota. Check API quota, then start again.';
 await setup(page);await page.route('**/api/v1/furniture/voice/session',r=>r.fulfill({status:503,json:{detail:{code:'voice_credits_unavailable',message}}}));
 await dialog(page);await page.getByRole('button',{name:'Start conversation'}).click();await expect(page.getByText(message,{exact:true})).toBeVisible();
 expect((await fake(page)).stops).toBe(1);expect((await fake(page)).socketsClosed).toBe(0);await expect(page.getByRole('button',{name:'Start conversation'})).toBeEnabled();
 await expect(page.getByText('0 of 11 actions confirmed by you')).toBeVisible();
});
test('Gemini waits for setupComplete, sends16k PCM, and interrupts24k playback',async({page})=>{
 await setup(page);await page.evaluate(()=>(window as unknown as {__voice:FakeVoice}).__voice.readyAuto=false);await dialog(page);await page.getByRole('button',{name:'Start conversation'}).click();
 await expect(page.getByText('Connecting to voice coach…')).toBeVisible();await expect(page.getByRole('button',{name:'Mute microphone',exact:true})).toBeDisabled();
 await expect.poll(async()=>(await fake(page)).sent.length).toBe(1);expect((await fake(page)).sent[0]).toHaveProperty('setup.model','models/gemini-3.8-live');
 await emit(page,{setupComplete:{}});await expect(page.getByRole('button',{name:'Mute microphone',exact:true})).toBeEnabled();await details(page);await expect(page.getByText('Listening — ask about this action.')).toBeVisible();
 await expect.poll(async()=>(await fake(page)).sent.filter(x=>typeof x==='object'&&x!==null&&'clientContent' in x).length).toBe(1);
 await page.evaluate(()=>(window as unknown as {__voice:FakeVoice}).__voice.frame());await expect.poll(async()=>(await fake(page)).sent.length).toBe(3);expect((await fake(page)).sent[2]).toHaveProperty('realtimeInput.audio.mimeType','audio/pcm;rate=16000');
 await emit(page,{serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:oneSecondPcm}}]}}});await expect.poll(async()=>(await fake(page)).played).toBe(1);await expect(page.locator('[data-voice-companion]')).toHaveAttribute('data-voice-state','speaking');
 await emit(page,{serverContent:{interrupted:true}});await expect.poll(async()=>(await fake(page)).audioStopped).toBe(1);await expect(page.locator('[data-voice-companion]')).toHaveAttribute('data-voice-state','listening');
 await page.getByRole('button',{name:'Mute microphone',exact:true}).click();await page.evaluate(()=>(window as unknown as {__voice:FakeVoice}).__voice.frame());expect((await fake(page)).sent).toHaveLength(3);await page.getByRole('button',{name:'End conversation'}).click();
});
test('leaving the tutorial unmounts the companion and releases microphone',async({page})=>{
 await setup(page);await dialog(page);await connect(page);await page.getByRole('button',{name:'Hide voice details'}).click();
 await page.getByRole('button',{name:'Furniture Assembly Assistant',exact:true}).click();
 await expect(page.getByTestId('coach-app')).not.toBeVisible();expect((await fake(page)).stops).toBe(1);expect((await fake(page)).socketsClosed).toBe(1);
});
test('changing action discards old in-flight speech until its response boundary',async({page})=>{
 await setup(page);await dialog(page);await connect(page);
 const chunk={serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:oneSecondPcm}}]}}};
 await emit(page,chunk);await expect.poll(async()=>(await fake(page)).played).toBe(1);
 await page.getByRole('navigation',{name:'Assembly actions'}).getByRole('button',{name:'Back',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','leg-1');
 await expect.poll(async()=>(await fake(page)).audioStopped).toBe(1);await emit(page,chunk);
 // Let queued websocket parsing settle; the following boundary shares that ordered queue.
 await emit(page,{serverContent:{turnComplete:true}});await expect(page.getByText('Listening — ask another question.')).toBeVisible();expect((await fake(page)).played).toBe(1);
 await emit(page,chunk);await expect.poll(async()=>(await fake(page)).played).toBe(2);
 expect((await fake(page)).requests).toBe(1);await expect(page.getByText('0 of 11 actions confirmed by you')).toBeVisible();await page.getByRole('button',{name:'End conversation'}).click();
});
test('changing action suppresses a pending reply before its first audio output',async({page})=>{
 await setup(page);await dialog(page);await connect(page);
 await emit(page,{serverContent:{inputTranscription:{text:'How do I insert this screw?'}}});await expect(page.getByRole('log')).toContainText('How do I insert this screw?');
 await page.getByRole('navigation',{name:'Assembly actions'}).getByRole('button',{name:'Back',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','leg-1');
 const chunk={serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:oneSecondPcm}}]}}};
 await emit(page,chunk);await emit(page,{serverContent:{turnComplete:true}});await expect(page.getByText('Listening — ask another question.')).toBeVisible();expect((await fake(page)).played).toBe(0);
 await emit(page,chunk);await expect.poll(async()=>(await fake(page)).played).toBe(1);
 expect((await fake(page)).requests).toBe(1);await expect(page.getByText('0 of 11 actions confirmed by you')).toBeVisible();await page.getByRole('button',{name:'End conversation'}).click();
});

type PortalReply={id:string;name:string;response:Record<string,unknown>};
async function toolReply(page:Page,id:string){
 const replies=()=>fake(page).then(v=>v.sent.flatMap(message=>(message as {toolResponse?:{functionResponses?:PortalReply[]}}).toolResponse?.functionResponses??[]));
 await expect.poll(async()=>(await replies()).some(reply=>reply.id===id)).toBe(true);
 return (await replies()).find(reply=>reply.id===id)!;
}
async function portalCommand(page:Page,id:string,command:string,extra:Record<string,unknown>={}){
 const call=command==='hands_free_done'?{id,name:'hands_free_done',args:extra}:{id,name:'portal_control',args:{command,...extra}};
 await emit(page,{toolCall:{functionCalls:[call]}});
 const reply=await toolReply(page,id);expect(reply.name).toBe(call.name);return reply.response;
}
async function expectUnconfirmed(page:Page){await expect(page.getByText('0 of 11 actions confirmed by you')).toBeVisible();}

test('voice portal tools address numbered actions without confirming physical work',async({page})=>{
 const runtime={consoleErrors:[] as string[],pageErrors:[] as string[],httpFailures:[] as {status:number;url:string}[]};
 page.on('console',m=>{if(m.type()==='error')runtime.consoleErrors.push(m.text());});page.on('pageerror',e=>runtime.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)runtime.httpFailures.push({status:r.status(),url:r.url().split('?')[0]});});
 await setup(page);await dialog(page);await connect(page);
 const stage=page.getByTestId('coach-viewport');
 let reply=await portalCommand(page,'step-four','go_to_step',{step:4});
 expect(reply).toMatchObject({ok:true,navigated:true,action_id:'leg-1'});expect(reply.context).toBeTruthy();
 await expect(stage).toHaveAttribute('data-action','leg-1');await expectUnconfirmed(page);
 await page.getByRole('button',{name:'Hide voice details'}).click();await mkdir('var/evidence/voice-actions',{recursive:true});await page.screenshot({path:'var/evidence/voice-actions/mock-step4.png'});
 reply=await portalCommand(page,'step-three','go_to_step',{step:3});
 expect(reply).toMatchObject({ok:true,navigated:true,action_id:'screw-1'});
 await expect(stage).toHaveAttribute('data-action','screw-1');await expectUnconfirmed(page);
 await portalCommand(page,'next-one','next');await expect(stage).toHaveAttribute('data-action','leg-1');
 await portalCommand(page,'previous-one','previous');await expect(stage).toHaveAttribute('data-action','screw-1');
 await expectUnconfirmed(page);await page.getByRole('button',{name:'End conversation'}).click();
 await writeFile('var/evidence/voice-actions/runtime.json',JSON.stringify(runtime,null,2));expect(runtime).toEqual({consoleErrors:[],pageErrors:[],httpFailures:[]});
});

test('voice playback tools control only the current animation',async({page})=>{
 await setup(page);await dialog(page);await connect(page);const stage=page.getByTestId('coach-viewport');
 expect(await portalCommand(page,'pause-one','pause')).toMatchObject({ok:true});await expect(stage).toHaveAttribute('data-playing','false');
 expect(await portalCommand(page,'play-one','play')).toMatchObject({ok:true});await expect(stage).toHaveAttribute('data-playing','true');
 await expect.poll(async()=>Number(await stage.getAttribute('data-progress'))).toBeGreaterThan(.02);
 expect(await portalCommand(page,'replay-one','replay')).toMatchObject({ok:true});await expect(stage).toHaveAttribute('data-playing','true');
 await expect.poll(async()=>Number(await stage.getAttribute('data-progress'))).toBeLessThan(.15);
 await portalCommand(page,'pause-two','pause');await expect(stage).toHaveAttribute('data-playing','false');
 await expect(stage).toHaveAttribute('data-action','screw-1');await expectUnconfirmed(page);await page.getByRole('button',{name:'End conversation'}).click();
});

test('invalid voice commands never navigate or confirm an action',async({page})=>{
 await setup(page);await dialog(page);await connect(page);const stage=page.getByTestId('coach-viewport');
 for(const [id,command,extra] of [['unknown','confirm_done',{}],['too-low','go_to_step',{step:0}],['too-high','go_to_step',{step:12}],['fraction','go_to_step',{step:3.5}],['bad-type','go_to_step',{step:'4'}]] as const){
  expect(await portalCommand(page,id,command,extra)).toMatchObject({ok:false});
  await expect(stage).toHaveAttribute('data-action','screw-1');await expectUnconfirmed(page);
 }
 await page.getByRole('button',{name:'End conversation'}).click();
});

test('duplicate tool IDs cannot repeat navigation and batched next uses each current target',async({page})=>{
 await setup(page);await dialog(page);await connect(page);const stage=page.getByTestId('coach-viewport');
 const first=await portalCommand(page,'dedupe-next','next');expect(first).toMatchObject({ok:true,navigated:true,action_id:'leg-1'});await expect(stage).toHaveAttribute('data-action','leg-1');
 // A subsequent get_context response is a barrier after the replayed ID in the ordered message queue.
 await emit(page,{toolCall:{functionCalls:[{id:'dedupe-next',name:'portal_control',args:{command:'next'}},{id:'after-duplicate',name:'portal_control',args:{command:'get_context'}}]}});
 await toolReply(page,'after-duplicate');await expect(stage).toHaveAttribute('data-action','leg-1');await expectUnconfirmed(page);
 await portalCommand(page,'reset-step','go_to_step',{step:3});await expect(stage).toHaveAttribute('data-action','screw-1');
 await emit(page,{toolCall:{functionCalls:[{id:'batch-next-a',name:'portal_control',args:{command:'next'}},{id:'batch-next-b',name:'portal_control',args:{command:'next'}}]}});
 expect((await toolReply(page,'batch-next-a')).response).toMatchObject({ok:true,navigated:true,action_id:'leg-1'});
 expect((await toolReply(page,'batch-next-b')).response).toMatchObject({ok:true,navigated:true,action_id:'screw-2'});
 await expect(stage).toHaveAttribute('data-action','screw-2');await expectUnconfirmed(page);expect((await fake(page)).requests).toBe(1);
 await page.getByRole('button',{name:'End conversation'}).click();
});

test('voice receives source-backed numbered context and rendered animation direction',async({page})=>{
 await setup(page);await dialog(page);await connect(page);
 const initial=(await fake(page)).sent.filter(x=>typeof x==='object'&&x!==null&&'clientContent' in x);
 expect(initial).toHaveLength(1);expect(JSON.stringify(initial[0])).toContain('action_order');expect(JSON.stringify(initial[0])).toContain('screw-1');
 await portalCommand(page,'context-pause','pause');
 const reply=await portalCommand(page,'context-screw','get_context');expect(reply.ok).toBe(true);
 const context=reply.context as {action_order:{step:number;id:string;title:string}[]};
 expect(context).toMatchObject({step:3,total_steps:11,action_id:'screw-1',components:['tabletop','screw-1'],source:{document_id:'AA-2606170-1',page_index:0,page_number:1,document:{id:'AA-2606170-1'}},screen:{playing:false},animation:{component:'screw',direction:'clockwise'}});
 expect(context.action_order).toHaveLength(11);expect(context.action_order[2]).toMatchObject({step:3,id:'screw-1'});expect(context.action_order[3]).toMatchObject({step:4,id:'leg-1'});
 expect(context).toHaveProperty('animation.viewpoint',expect.stringContaining('toward the tabletop'));
 expect(context).toHaveProperty('animation.meaning',expect.stringContaining('not a prescribed number'));
 expect(context).toHaveProperty('limits',expect.stringContaining('Only the user confirms'));
 await portalCommand(page,'context-leg-nav','go_to_step',{step:4});
 const leg=await portalCommand(page,'context-leg','get_context');expect(leg.context).toMatchObject({step:4,action_id:'leg-1',animation:{component:'leg',direction:'clockwise'}});
 await expectUnconfirmed(page);await page.getByRole('button',{name:'End conversation'}).click();
});

test('batched voice view panel and playback commands report current state',async({page})=>{
 await setup(page);await dialog(page);await connect(page);const stage=page.getByTestId('coach-viewport');
 async function batch(calls:{id:string;command:string}[]){
  await emit(page,{toolCall:{functionCalls:calls.map(({id,command})=>({id,name:'portal_control',args:{command}}))}});
  return Promise.all(calls.map(async({id})=>(await toolReply(page,id)).response));
 }
 let replies=await batch([{id:'whole-batch',command:'whole_table'},{id:'whole-context',command:'get_context'}]);
 expect(replies[0]).toMatchObject({ok:true});expect(replies[1]).toMatchObject({ok:true,context:{screen:{view:'whole'}}});
 await expect(page.getByRole('button',{name:'Look closer',exact:true})).toHaveAttribute('aria-pressed','true');
 replies=await batch([{id:'open-source-batch',command:'official_diagram'},{id:'blocked-play-batch',command:'play'}]);
 expect(replies[0]).toMatchObject({ok:true});expect(replies[1]).toMatchObject({ok:false,context:{screen:{open_panel:'source'}}});
 await expect(page.getByRole('dialog',{name:'Official diagram',exact:true})).toBeVisible();await expect(stage).toHaveAttribute('data-playing','false');
 replies=await batch([{id:'close-source-batch',command:'close_panel'},{id:'resume-play-batch',command:'play'},{id:'resume-context',command:'get_context'}]);
 expect(replies[0]).toMatchObject({ok:true});expect(replies[1]).toMatchObject({ok:true});expect(replies[2]).toMatchObject({ok:true,context:{screen:{open_panel:null,playing:true}}});
 await expect(page.getByRole('dialog',{name:'Official diagram',exact:true})).not.toBeVisible();await expect(stage).toHaveAttribute('data-playing','true');
 replies=await batch([{id:'pause-batch',command:'pause'},{id:'pause-context',command:'get_context'}]);
 expect(replies[0]).toMatchObject({ok:true});expect(replies[1]).toMatchObject({ok:true,context:{screen:{playing:false}}});
 await expect(stage).toHaveAttribute('data-playing','false');await expectUnconfirmed(page);await page.getByRole('button',{name:'End conversation'}).click();
});

test('manual action change rejects stale tool navigation until the response ends',async({page})=>{
 await setup(page);await dialog(page);await connect(page);const stage=page.getByTestId('coach-viewport');
 await emit(page,{serverContent:{inputTranscription:{text:'Please show the next action.'}}});await expect(page.getByRole('log')).toContainText('Please show the next action.');
 await page.getByRole('navigation',{name:'Assembly actions'}).getByRole('button',{name:'Back',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(stage).toHaveAttribute('data-action','leg-1');
 const stale=await portalCommand(page,'stale-next','next');expect(stale).toMatchObject({ok:false});expect(stale.error).toEqual(expect.stringContaining('Stale request'));
 await expect(stage).toHaveAttribute('data-action','leg-1');await expectUnconfirmed(page);
 await emit(page,{serverContent:{turnComplete:true}});await expect(page.getByText('Listening — ask another question.')).toBeVisible();
 const fresh=await portalCommand(page,'fresh-next','next');expect(fresh).toMatchObject({ok:true,navigated:true,action_id:'screw-2'});
 await expect(stage).toHaveAttribute('data-action','screw-2');await expectUnconfirmed(page);expect((await fake(page)).requests).toBe(1);
 await page.getByRole('button',{name:'End conversation'}).click();
});

type SavedCoachProgress={viewedActionId:string;confirmedActionIds:string[];checks:string[]};
async function savedCoachProgress(page:Page):Promise<SavedCoachProgress>{
 return page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('furniture:coach:v2:'));if(!key)throw Error('Coach progress missing');return JSON.parse(localStorage.getItem(key)!);});
}

test('explicit completed-leg report advances to the remaining connection, persists and can be undone',async({page})=>{
 const runtime={consoleErrors:[] as string[],pageErrors:[] as string[],httpFailures:[] as {status:number;url:string}[]};
 page.on('console',m=>{if(m.type()==='error')runtime.consoleErrors.push(m.text());});page.on('pageerror',e=>runtime.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)runtime.httpFailures.push({status:r.status(),url:r.url().split('?')[0]});});
 await setup(page);await dialog(page);await connect(page);const stage=page.getByTestId('coach-viewport');
 await portalCommand(page,'report-start-six','go_to_step',{step:6});await expect(stage).toHaveAttribute('data-action','leg-2');
 const before=await savedCoachProgress(page);
 const args={legs:[1,2,3],user_statement:'I completed the first three legs, move next',advance:true};
 expect(await portalCommand(page,'report-three','report_completed_legs',args)).toMatchObject({ok:true});
 await expect(stage).toHaveAttribute('data-action','screw-4');await expect(page.getByText('6 of 11 actions confirmed by you')).toBeVisible();
 const expected=['screw-1','leg-1','screw-2','leg-2','screw-3','leg-3'].sort();
 expect((await savedCoachProgress(page)).confirmedActionIds.slice().sort()).toEqual(expected);
 await page.getByRole('button',{name:'Hide voice details'}).click();await page.getByRole('button',{name:/Undo voice progress/i}).scrollIntoViewIfNeeded();
 await mkdir('var/evidence/voice-progress',{recursive:true});await page.screenshot({path:'var/evidence/voice-progress/mock-action9-six-confirmed.png'});
 await page.getByRole('button',{name:/Undo voice progress/i}).click();
 await expect(stage).toHaveAttribute('data-action','leg-2');await expectUnconfirmed(page);expect(await savedCoachProgress(page)).toEqual(before);
 expect(await portalCommand(page,'report-three-again','report_completed_legs',args)).toMatchObject({ok:true});await expect(stage).toHaveAttribute('data-action','screw-4');
 await page.reload();await expect(stage).toHaveAttribute('data-action','screw-4');expect((await savedCoachProgress(page)).confirmedActionIds.slice().sort()).toEqual(expected);
 await expect(page.getByText('6 of 11 actions confirmed by you')).toBeVisible();expect((await fake(page)).requests).toBe(0);
 await writeFile('var/evidence/voice-progress/runtime.json',JSON.stringify(runtime,null,2));expect(runtime).toEqual({consoleErrors:[],pageErrors:[],httpFailures:[]});
});

test('explicit current checklist and confirmation persist while stale action IDs are rejected',async({page})=>{
 await setup(page);await dialog(page);await connect(page);const stage=page.getByTestId('coach-viewport');
 await portalCommand(page,'checks-prepare','go_to_step',{step:1});await expect(stage).toHaveAttribute('data-action','prepare');
 expect(await portalCommand(page,'checks-set','set_checklist',{action_id:'prepare',checked:true,user_statement:'Check these boxes done'})).toMatchObject({ok:true});
 const boxes=page.getByRole('checkbox');await expect(boxes).toHaveCount(2);for(const box of await boxes.all())await expect(box).toBeChecked();
 await page.getByRole('button',{name:'Hide voice details'}).click();await page.getByRole('button',{name:'Review checklist ↓',exact:true}).click();await mkdir('var/evidence/voice-progress',{recursive:true});await page.screenshot({path:'var/evidence/voice-progress/mock-checklist-checked.png'});
 await expectUnconfirmed(page);
 expect(await portalCommand(page,'checks-confirm','confirm_current',{action_id:'prepare',user_statement:'I finished these preparation checks, move next',advance:true})).toMatchObject({ok:true});
 await expect(stage).toHaveAttribute('data-action','identify');await expect(page.getByText('1 of 11 actions confirmed by you')).toBeVisible();
 for(const command of ['set_checklist','confirm_current']){
  const extra=command==='set_checklist'?{checked:true}:{advance:true};
  expect(await portalCommand(page,`stale-progress-${command}`,command,{action_id:'prepare',user_statement:'Mark that action done',...extra})).toMatchObject({ok:false});
  await expect(stage).toHaveAttribute('data-action','identify');
 }
 const saved=await savedCoachProgress(page);expect(saved.confirmedActionIds).toEqual(['prepare']);expect(saved.checks.slice().sort()).toEqual(['prepare:0','prepare:1']);
 await page.reload();await expect(stage).toHaveAttribute('data-action','identify');expect(await savedCoachProgress(page)).toEqual(saved);
 await page.getByRole('navigation',{name:'Assembly actions'}).getByRole('button',{name:'Back',exact:true}).click();await expect(stage).toHaveAttribute('data-action','prepare');
 for(const box of await page.getByRole('checkbox').all())await expect(box).toBeChecked();
});

test('progress tools reject missing statements and invalid arguments without saving confirmations',async({page})=>{
 await setup(page);await dialog(page);await connect(page);const stage=page.getByTestId('coach-viewport');const before=await savedCoachProgress(page);
 const cases:[string,Record<string,unknown>][]=[
  ['report_completed_legs',{legs:[1,2,3],advance:true}],
  ['report_completed_legs',{legs:[1],advance:true,user_statement:'   '}],
  ['report_completed_legs',{legs:[0,5],advance:true,user_statement:'I completed those legs'}],
  ['set_checklist',{action_id:'screw-1',checked:true}],
  ['set_checklist',{action_id:'screw-1',checked:true,user_statement:42}],
  ['confirm_current',{action_id:'screw-1',advance:true}],
  ['confirm_current',{action_id:'screw-1',advance:true,user_statement:''}],
 ];
 for(const [i,[command,args]] of cases.entries()){
  expect(await portalCommand(page,`invalid-progress-${i}`,command,args)).toMatchObject({ok:false});await expect(stage).toHaveAttribute('data-action','screw-1');await expectUnconfirmed(page);
 }
 expect(await savedCoachProgress(page)).toEqual(before);await page.getByRole('button',{name:'End conversation'}).click();
});

test('voice final checklist cannot confirm completion while earlier actions remain unfinished',async({page})=>{
 await setup(page);await dialog(page);await connect(page);const stage=page.getByTestId('coach-viewport');
 await portalCommand(page,'final-go','go_to_step',{step:11});await expect(stage).toHaveAttribute('data-action','final-checks');
 expect(await portalCommand(page,'final-tick','set_checklist',{action_id:'final-checks',checked:true,user_statement:'I checked all these final checklist boxes'})).toMatchObject({ok:true});
 const boxes=page.getByRole('checkbox');await expect(boxes).toHaveCount(4);for(const box of await boxes.all())await expect(box).toBeChecked();
 expect(await portalCommand(page,'final-confirm','confirm_current',{action_id:'final-checks',user_statement:'Confirm my final checks',advance:true})).toMatchObject({ok:true,physical_completion_changed:false});
 await expect(stage).toHaveAttribute('data-action','prepare');
 expect((await savedCoachProgress(page)).confirmedActionIds).toEqual([]);await expectUnconfirmed(page);await page.getByRole('button',{name:'End conversation'}).click();
});

const coachActionOrder=['prepare','identify','screw-1','leg-1','screw-2','leg-2','screw-3','leg-3','screw-4','leg-4','final-checks'];
async function startHandsFree(page:Page){
 await details(page);await page.getByRole('button',{name:'Start hands-free assembly',exact:true}).click();
 await expect(page.getByRole('button',{name:'Mute microphone',exact:true})).toBeEnabled();await details(page);
}
async function narrationEnded(page:Page,id:string,advanceClock=false){
 await emit(page,{serverContent:{outputTranscription:{text:'Follow the current instruction and complete its checks. Tell me when done.'},modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:'AAAAAA=='}}]},turnComplete:true}});
 await portalCommand(page,`narration-barrier-${id}`,'get_context');
 if(advanceClock)await page.clock.runFor(100);
 await expect(page.locator('[data-voice-companion]')).toHaveAttribute('data-hands-free-ready','true');
}
async function spokenHandsFreeDone(page:Page,id:string,actionId:string,checks=true){
 const statement='I have completed this action and its checks. Done.';
 await emit(page,{serverContent:{inputTranscription:{text:statement}}});
 return portalCommand(page,id,'hands_free_done',{action_id:actionId,user_statement:statement,checks_confirmed:checks});
}

test('hands-free explains and confirms all eleven authored actions only after explicit done',async({page})=>{
 const runtime={consoleErrors:[] as string[],pageErrors:[] as string[],httpFailures:[] as {status:number;url:string}[]};
 page.on('console',m=>{if(m.type()==='error')runtime.consoleErrors.push(m.text());});page.on('pageerror',e=>runtime.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400)runtime.httpFailures.push({status:r.status(),url:r.url().split('?')[0]});});
 await setup(page,'/ikea?product=30449908&action=prepare');await startHandsFree(page);const stage=page.getByTestId('coach-viewport');
 await expectUnconfirmed(page);await expect(stage).toHaveAttribute('data-action','prepare');
 const messages=(await fake(page)).sent as {clientContent?:{turnComplete?:boolean;turns?:unknown[]}}[];
 expect(messages.some(m=>m.clientContent?.turnComplete===true&&JSON.stringify(m).includes('prepare'))).toBe(true);
 for(const [i,actionId] of coachActionOrder.entries()){
  await expect(stage).toHaveAttribute('data-action',actionId);
  await narrationEnded(page,actionId);
  if(i===5){if(await page.getByTestId('voice-panel').isVisible())await page.getByRole('button',{name:'Hide voice details'}).click();await mkdir('var/evidence/hands-free',{recursive:true});await page.screenshot({path:'var/evidence/hands-free/mock-waiting-action6.png'});}
  expect((await savedCoachProgress(page)).confirmedActionIds).toHaveLength(i);
  const reply=await spokenHandsFreeDone(page,`handsfree-done-${actionId}`,actionId);expect(reply).toMatchObject({ok:true});
  const next=coachActionOrder[Math.min(i+1,coachActionOrder.length-1)];await expect(stage).toHaveAttribute('data-action',next);
  await expect(page.getByText(`${i+1} of 11 actions confirmed by you`)).toBeVisible();
  await emit(page,{serverContent:{turnComplete:true}});
 }
 const saved=await savedCoachProgress(page);expect(saved.confirmedActionIds.slice().sort()).toEqual(coachActionOrder.slice().sort());
 expect(saved.checks.slice().sort()).toEqual(['prepare:0','prepare:1','identify:0','final-checks:0','final-checks:1','final-checks:2','final-checks:3'].sort());
 await expect(page.getByRole('heading',{name:'You’ve confirmed every action.'})).toBeVisible();await page.screenshot({path:'var/evidence/hands-free/mock-all-actions-confirmed.png'});await page.getByRole('button',{name:'End conversation'}).click();expect((await fake(page)).stops).toBe(1);
 await writeFile('var/evidence/hands-free/runtime.json',JSON.stringify(runtime,null,2));expect(runtime).toEqual({consoleErrors:[],pageErrors:[],httpFailures:[]});
});

test('hands-free rejects premature done and animation completion never advances',async({page})=>{
 await page.clock.install();await setup(page);await startHandsFree(page);const stage=page.getByTestId('coach-viewport');
 await expect(stage).toHaveAttribute('data-playing','true');
 expect(await spokenHandsFreeDone(page,'premature-done','screw-1')).toMatchObject({ok:false});
 await page.clock.runFor(7000);await expect(stage).toHaveAttribute('data-progress','1.00000');await expect(stage).toHaveAttribute('data-action','screw-1');await expectUnconfirmed(page);
 await narrationEnded(page,'ready-after-animation',true);expect(await spokenHandsFreeDone(page,'ready-done','screw-1')).toMatchObject({ok:true});
 await expect(stage).toHaveAttribute('data-action','leg-1');await expect(page.getByText('1 of 11 actions confirmed by you')).toBeVisible();
 await page.getByRole('button',{name:'End conversation'}).click();
});

test('hands-free duplicate and multiple same-turn done cannot skip an action',async({page})=>{
 await setup(page);await startHandsFree(page);const stage=page.getByTestId('coach-viewport');await narrationEnded(page,'same-turn');
 const statement='Done with this screw.';await emit(page,{serverContent:{inputTranscription:{text:statement}}});
 await emit(page,{toolCall:{functionCalls:[
  {id:'same-turn-done',name:'hands_free_done',args:{action_id:'screw-1',user_statement:statement,checks_confirmed:true}},
  {id:'same-turn-extra',name:'hands_free_done',args:{action_id:'leg-1',user_statement:statement,checks_confirmed:true}},
 ]}});
 expect((await toolReply(page,'same-turn-done')).response).toMatchObject({ok:true});expect((await toolReply(page,'same-turn-extra')).response).toMatchObject({ok:false});
 await emit(page,{toolCall:{functionCalls:[{id:'same-turn-done',name:'hands_free_done',args:{action_id:'screw-1',user_statement:statement,checks_confirmed:true}},{id:'same-turn-barrier',name:'portal_control',args:{command:'get_context'}}]}});
 await toolReply(page,'same-turn-barrier');await expect(stage).toHaveAttribute('data-action','leg-1');expect((await savedCoachProgress(page)).confirmedActionIds).toEqual(['screw-1']);
 await page.getByRole('button',{name:'End conversation'}).click();
});

test('hands-free pause resume and stop control the mode without confirming work',async({page})=>{
 await setup(page);await startHandsFree(page);const stage=page.getByTestId('coach-viewport');await narrationEnded(page,'pause-ready');
 expect(await portalCommand(page,'mode-pause','hands_free_pause')).toMatchObject({ok:true});
 expect(await spokenHandsFreeDone(page,'paused-done','screw-1')).toMatchObject({ok:false});await expect(stage).toHaveAttribute('data-action','screw-1');await expectUnconfirmed(page);
 await emit(page,{serverContent:{turnComplete:true}});
 expect(await portalCommand(page,'mode-resume','hands_free_resume')).toMatchObject({ok:true});await narrationEnded(page,'resume-ready');
 expect(await spokenHandsFreeDone(page,'resumed-done','screw-1')).toMatchObject({ok:true});await expect(stage).toHaveAttribute('data-action','leg-1');
 await emit(page,{serverContent:{turnComplete:true}});expect(await portalCommand(page,'mode-stop','hands_free_stop')).toMatchObject({ok:true});
 expect(await spokenHandsFreeDone(page,'stopped-done','leg-1')).toMatchObject({ok:false});expect((await savedCoachProgress(page)).confirmedActionIds).toEqual(['screw-1']);
 await emit(page,{serverContent:{turnComplete:true}});expect(await portalCommand(page,'mode-start-again','hands_free_start')).toMatchObject({ok:true});
 await expect(stage).toHaveAttribute('data-action','leg-1');expect((await fake(page)).requests).toBe(1);
 expect(await portalCommand(page,'mode-end-call','end_conversation')).toMatchObject({ok:true});await expect(page.locator('[data-voice-companion]')).toHaveAttribute('data-phase','idle');expect((await fake(page)).stops).toBe(1);expect((await fake(page)).socketsClosed).toBe(1);
});

test('hands-free follows manual navigation and respects reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await setup(page);await startHandsFree(page);const stage=page.getByTestId('coach-viewport');
 await expect(stage).toHaveAttribute('data-playing','false');await narrationEnded(page,'manual-before');
 await page.getByRole('navigation',{name:'Assembly actions'}).getByRole('button',{name:'Back',exact:true}).focus();await page.keyboard.press('ArrowRight');
 await expect(stage).toHaveAttribute('data-action','leg-1');await expect(stage).toHaveAttribute('data-playing','false');
 const context=await portalCommand(page,'manual-new-context','get_context');expect(context).toMatchObject({ok:true,context:{action_id:'leg-1'}});
 await expect.poll(async()=>JSON.stringify((await fake(page)).sent.filter(v=>typeof v==='object'&&v!==null&&'clientContent' in v).at(-1))).toContain('leg-1');
 await expectUnconfirmed(page);await narrationEnded(page,'manual-after');
 expect(await spokenHandsFreeDone(page,'manual-done','leg-1')).toMatchObject({ok:true});await expect(stage).toHaveAttribute('data-action','screw-2');await expect(stage).toHaveAttribute('data-playing','false');
 expect((await savedCoachProgress(page)).confirmedActionIds).toEqual(['leg-1']);await page.getByRole('button',{name:'End conversation'}).click();
});

test('hands-free cannot confirm required checklist without the user confirming the checks',async({page})=>{
 await setup(page,'/ikea?product=30449908&action=prepare');await startHandsFree(page);await narrationEnded(page,'checks-ready');
 expect(await spokenHandsFreeDone(page,'unchecked-done','prepare',false)).toMatchObject({ok:false});await expectUnconfirmed(page);
 expect((await savedCoachProgress(page)).checks).toEqual([]);await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','prepare');
 await expect(page.locator('[data-voice-companion]')).toHaveAttribute('data-hands-free-ready','false');await narrationEnded(page,'checks-repaired');
 expect(await spokenHandsFreeDone(page,'checks-repaired-done','prepare',true)).toMatchObject({ok:true});await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','identify');await expect(page.getByText('1 of 11 actions confirmed by you')).toBeVisible();
 await page.getByRole('button',{name:'End conversation'}).click();
});

test('hands-free renews once with the same microphone and retains its original thirty-minute deadline',async({page})=>{
 await page.clock.install();await setup(page);await startHandsFree(page);const companion=page.locator('[data-voice-companion]');
 await expect(companion).toHaveAttribute('data-hands-free-mode','active');
 await emit(page,{serverContent:{inputTranscription:{text:'I assembled the first leg'}}});
 await portalCommand(page,'renew-record-leg','report_completed_legs',{legs:[1],user_statement:'I assembled the first leg',advance:true});await portalCommand(page,'renew-view-six','go_to_step',{step:6});
 await expect(page.getByTestId('coach-viewport')).toHaveAttribute('data-action','leg-2');const saved=await savedCoachProgress(page);expect(saved.confirmedActionIds).toHaveLength(2);
 await page.clock.fastForward(180001);
 await expect(companion).toHaveAttribute('data-phase','connected');expect((await fake(page)).stops).toBe(0);expect((await fake(page)).socketsClosed).toBe(0);
 await emit(page,{goAway:{timeLeft:'1s'}});await expect.poll(async()=>(await fake(page)).sent.filter(v=>typeof v==='object'&&v!==null&&'setup' in v).length).toBe(2);
 await expect(companion).toHaveAttribute('data-phase','connected');expect((await fake(page)).requests).toBe(1);expect((await fake(page)).stops).toBe(0);expect((await fake(page)).socketsClosed).toBe(1);expect(await savedCoachProgress(page)).toEqual(saved);
 await page.clock.fastForward(27*60*1000);await expect(companion).toHaveAttribute('data-phase','idle');
 expect((await fake(page)).stops).toBe(1);expect((await fake(page)).socketsClosed).toBe(2);expect(await savedCoachProgress(page)).toEqual(saved);
});

test('hidden page stops hands-free microphone and transport without confirming progress',async({page})=>{
 await setup(page);await startHandsFree(page);await narrationEnded(page,'hidden-handsfree');
 await page.evaluate(()=>(window as unknown as {__voice:FakeVoice}).__voice.hidden());
 await expect(page.locator('[data-voice-companion]')).toHaveAttribute('data-phase','idle');
 expect((await fake(page)).stops).toBe(1);expect((await fake(page)).socketsClosed).toBe(1);await expectUnconfirmed(page);
});

for(const exit of ['end','hidden'] as const)test(`hands-free ${exit} during renewal cancels without reopening microphone or transport`,async({page})=>{
 await setup(page);let sessions=0;let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let finished!:()=>void;const handled=new Promise<void>(resolve=>{finished=resolve;});
 await page.route('**/api/v1/furniture/voice/session',async route=>{
  sessions++;const renewing=sessions===2;if(renewing)await gate;
  try{await route.fulfill({status:200,json:{token:'auth_tokens/mock-renewal',model:'gemini-3.8-live',setup:{model:'models/gemini-3.8-live'}}});}catch{if(!renewing)throw Error('Initial mock voice session failed.');}finally{if(renewing)finished();}
 });
 await startHandsFree(page);await emit(page,{goAway:{timeLeft:'1s'}});await expect.poll(()=>sessions).toBe(2);
 if(exit==='end')await page.getByRole('button',{name:'End conversation'}).click();else await page.evaluate(()=>(window as unknown as {__voice:FakeVoice}).__voice.hidden());
 await expect(page.locator('[data-voice-companion]')).toHaveAttribute('data-phase','idle');release();await handled;
 await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,50)));
 expect((await fake(page)).requests).toBe(1);expect((await fake(page)).stops).toBe(1);expect((await fake(page)).socketsClosed).toBe(1);
 expect((await fake(page)).sent.filter(v=>typeof v==='object'&&v!==null&&'setup' in v)).toHaveLength(1);await expectUnconfirmed(page);
});

test('hands-free transport renewal is capped at three refreshes',async({page})=>{
 await setup(page);await startHandsFree(page);const companion=page.locator('[data-voice-companion]');
 for(let i=0;i<3;i++){
  await emit(page,{goAway:{timeLeft:'1s'}});await expect.poll(async()=>(await fake(page)).sent.filter(v=>typeof v==='object'&&v!==null&&'setup' in v).length).toBe(i+2);
  await expect(companion).toHaveAttribute('data-phase','connected');expect((await fake(page)).requests).toBe(1);expect((await fake(page)).stops).toBe(0);
 }
 await emit(page,{goAway:{timeLeft:'1s'}});await expect(companion).toHaveAttribute('data-phase','idle');
 expect((await fake(page)).sent.filter(v=>typeof v==='object'&&v!==null&&'setup' in v)).toHaveLength(4);expect((await fake(page)).stops).toBe(1);expect((await fake(page)).socketsClosed).toBe(4);await expectUnconfirmed(page);
});

test('hands-free waits for audible narration drain and legacy confirmation cannot bypass it',async({page})=>{
 await page.clock.install();await setup(page);await startHandsFree(page);const companion=page.locator('[data-voice-companion]');const stage=page.getByTestId('coach-viewport');
 await emit(page,{serverContent:{outputTranscription:{text:'Listen to this complete instruction before doing the action.'},modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:oneSecondPcm}}]},turnComplete:true}});
 await portalCommand(page,'drain-context','get_context');await expect(companion).toHaveAttribute('data-hands-free-ready','false');
 expect(await portalCommand(page,'legacy-confirm-bypass','confirm_current',{action_id:'screw-1',user_statement:'I am done',advance:true})).toMatchObject({ok:false});
 expect(await spokenHandsFreeDone(page,'done-before-drain','screw-1')).toMatchObject({ok:false});await expectUnconfirmed(page);await expect(stage).toHaveAttribute('data-action','screw-1');
 await emit(page,{serverContent:{outputTranscription:{text:'Here is the complete action and checklist again.'},modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:oneSecondPcm}}]},turnComplete:true}});await page.clock.runFor(1200);await expect(companion).toHaveAttribute('data-hands-free-ready','true');
 expect(await spokenHandsFreeDone(page,'done-after-drain','screw-1')).toMatchObject({ok:true});await expect(stage).toHaveAttribute('data-action','leg-1');await expect(page.getByText('1 of 11 actions confirmed by you')).toBeVisible();
 await page.getByRole('button',{name:'End conversation'}).click();
});

test('hands-free malformed done re-explains the complete action before accepting a fresh confirmation',async({page})=>{
 await setup(page,'/ikea?product=30449908&action=prepare');await startHandsFree(page);const companion=page.locator('[data-voice-companion]'),stage=page.getByTestId('coach-viewport');
 await narrationEnded(page,'malformed-before');
 await emit(page,{serverContent:{inputTranscription:{text:'I completed this preparation and its checks.'}}});
 const rejected=await portalCommand(page,'malformed-missing-checks','hands_free_done',{action_id:'prepare',user_statement:'I completed this preparation and its checks.'});
 expect(rejected).toMatchObject({ok:false,explain_current_action:true,wait_for_user_done:true,confirmation_recorded:false,physical_completion_changed:false});
 await expect(companion).toHaveAttribute('data-hands-free-ready','false');await expect(stage).toHaveAttribute('data-action','prepare');await expectUnconfirmed(page);expect((await savedCoachProgress(page)).checks).toEqual([]);
 // A textual repair acknowledgement is not an audible replacement explanation.
 await emit(page,{serverContent:{outputTranscription:{text:'Let me explain the action and checks again.'},turnComplete:true}});await portalCommand(page,'malformed-text-barrier','get_context');await expect(companion).toHaveAttribute('data-hands-free-ready','false');
 await narrationEnded(page,'malformed-repaired');expect(await spokenHandsFreeDone(page,'malformed-fresh-done','prepare')).toMatchObject({ok:true});
 await expect(stage).toHaveAttribute('data-action','identify');await expect(page.getByText('1 of 11 actions confirmed by you')).toBeVisible();
 expect((await savedCoachProgress(page)).checks.slice().sort()).toEqual(['prepare:0','prepare:1']);expect((await savedCoachProgress(page)).confirmedActionIds).toEqual(['prepare']);
 await page.getByRole('button',{name:'End conversation'}).click();
});

test('Nandi expressions follow output sound, silence, interruption and reduced motion',async({page})=>{
 await setup(page);const pet=page.getByTestId('nandi-pet');await expect(pet).toHaveAttribute('data-ready','true');await dialog(page);await connect(page);
 const pcm=Buffer.from(new Int16Array(48000).fill(7000).buffer).toString('base64');
 const speech={serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:pcm}}]}}};
 await emit(page,speech);await expect(pet).toHaveAttribute('data-expression','mouth-open');
 await mkdir('var/evidence/nandi-expressions',{recursive:true});await page.screenshot({path:'var/evidence/nandi-expressions/speaking-desktop.png'});
 await emit(page,{serverContent:{interrupted:true}});await expect(pet).not.toHaveAttribute('data-expression',/mouth/);
 await emit(page,{serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:oneSecondPcm}}]}}});await expect(pet).not.toHaveAttribute('data-expression',/mouth/);
 await page.emulateMedia({reducedMotion:'reduce'});await emit(page,speech);await expect(pet).toHaveAttribute('data-frame','0');
 await page.getByRole('button',{name:'End conversation'}).click();
});
test('Nandi blinks, wiggles ears and swishes tail while idle',async({page})=>{
 await page.clock.install();await setup(page);const pet=page.getByTestId('nandi-pet');await expect(pet).toHaveAttribute('data-ready','true');const frames=new Set<string>();
 for(let i=0;i<150;i++){await page.clock.runFor(80);frames.add(await pet.getAttribute('data-expression')??'');}
 for(const frame of ['blink','ears-up','ears-down','tail-out','tail-in'])expect(frames.has(frame)).toBe(true);
 await page.setViewportSize({width:390,height:844});await mkdir('var/evidence/nandi-expressions',{recursive:true});await page.screenshot({path:'var/evidence/nandi-expressions/idle-phone.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(3000);await expect(pet).toHaveAttribute('data-frame','0');
});
