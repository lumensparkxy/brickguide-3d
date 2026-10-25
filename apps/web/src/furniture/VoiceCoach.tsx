import {useEffect,useLayoutEffect,useRef,useState,type PointerEvent} from 'react';
import {flushSync} from 'react-dom';
import type {CoachAction} from './coachContracts';
import {GeminiAudio} from './geminiAudio';
import './voiceCoach.css';
import NandiPet from './NandiPet';
type HandsFreeMode='off'|'active'|'paused';
type Line={id:string;who:'You'|'Coach';text:string};
export default function VoiceCoach({articleNumber='30449908',officialSourceUrl,action,revision,context,onControl}:{articleNumber?:string;officialSourceUrl?:string;action:CoachAction;revision:string;context:()=>Record<string,unknown>;onControl:(args:unknown)=>Record<string,unknown>}){
 const companion=useRef<HTMLElement>(null),drag=useRef<{id:number;x:number;y:number;left:number;bottom:number;moved:boolean}|null>(null),suppressClick=useRef(false);
 const [position,setPosition]=useState<{x:number;y:number}|null>(null),[dragging,setDragging]=useState(false);
 function bounded(x:number,y:number){const box=companion.current?.getBoundingClientRect();return {x:Math.max(8,Math.min(innerWidth-(box?.width??72)-8,x)),y:Math.max((box?.height??72)+8,Math.min(innerHeight-8,y))};}
 function beginDrag(e:PointerEvent<HTMLButtonElement>){if(e.button!==0)return;const box=companion.current?.getBoundingClientRect();if(!box)return;suppressClick.current=false;drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,left:box.left,bottom:box.bottom,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}
 function moveDrag(e:PointerEvent<HTMLButtonElement>){const d=drag.current;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.moved&&Math.hypot(dx,dy)<6)return;d.moved=true;suppressClick.current=true;setDragging(true);setPosition(bounded(d.left+dx,d.bottom+dy));}
 function endDrag(e:PointerEvent<HTMLButtonElement>){if(drag.current?.id!==e.pointerId)return;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);drag.current=null;setDragging(false);}
 useEffect(()=>{const el=companion.current;if(!el)return;const clamp=()=>setPosition(p=>{if(!p)return p;const next=bounded(p.x,p.y);return next.x===p.x&&next.y===p.y?p:next;});const observer=new ResizeObserver(clamp);observer.observe(el);window.addEventListener('resize',clamp);return()=>{observer.disconnect();window.removeEventListener('resize',clamp);};},[]);
 const launcher=useRef<HTMLButtonElement>(null),panelTitle=useRef<HTMLHeadingElement>(null),audio=useRef<GeminiAudio|null>(null),latest=useRef({articleNumber,action,revision,context,onControl}),readyRef=useRef(false),responseActive=useRef(false),suppressPriorResponse=useRef(false),sentContext=useRef('');latest.current={articleNumber,action,revision,context,onControl};
 const [expanded,setExpanded]=useState(false),[handsFreeMode,setHandsFreeMode]=useState<HandsFreeMode>('off'),[handsFreeReady,setHandsFreeReady]=useState(false);
 useLayoutEffect(()=>{setPosition(p=>{if(!p)return p;const next=bounded(p.x,p.y);return next.x===p.x&&next.y===p.y?p:next;});},[expanded]);
 const readyTimer=useRef<ReturnType<typeof setTimeout>|null>(null),explanationVersion=useRef(0);
 const handsFree=useRef({mode:'off' as HandsFreeMode,ready:false,pending:false,audioSeen:false,actionId:'',userTurn:0,consumedTurn:0,readyAfterTurn:0,inputOpen:false}),connectedAt=useRef(0),longSession=useRef(false),connectionTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{if(expanded)panelTitle.current?.focus({preventScroll:true});},[expanded]);
 const socket=useRef<WebSocket|null>(null),stream=useRef<MediaStream|null>(null),abort=useRef<AbortController|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),generation=useRef(0),mutedRef=useRef(false);
 const [phase,setPhase]=useState<'idle'|'connecting'|'connected'>('idle'),[status,setStatus]=useState('Ready when you are.'),[configured,setConfigured]=useState<boolean|null>(null),[muted,setMuted]=useState(false),[lines,setLines]=useState<Line[]>([]),[audioBlocked,setAudioBlocked]=useState(false);
 const cleanup=()=>{cancelPendingReady();generation.current++;handsFree.current={mode:'off',ready:false,pending:false,audioSeen:false,actionId:'',userTurn:0,consumedTurn:0,readyAfterTurn:0,inputOpen:false};connectedAt.current=0;longSession.current=false;if(connectionTimer.current)clearTimeout(connectionTimer.current);connectionTimer.current=null;readyRef.current=false;responseActive.current=false;suppressPriorResponse.current=false;sentContext.current='';abort.current?.abort();abort.current=null;if(timer.current)clearTimeout(timer.current);timer.current=null;const ws=socket.current;socket.current=null;if(ws){ws.onopen=null;ws.onmessage=null;ws.onclose=null;ws.onerror=null;ws.close();}stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;audio.current?.close();audio.current=null;mutedRef.current=false;};
 const stop=(message='Conversation ended. Microphone off.')=>{cleanup();setHandsFreeMode('off');setHandsFreeReady(false);setPhase('idle');setMuted(false);setStatus(message);};
 useEffect(()=>{const c=new AbortController();fetch('/api/v1/furniture/voice/status',{signal:c.signal}).then(async r=>{if(!r.ok)throw Error();const data=await r.json();setConfigured(data.configured===true);if(!data.configured)setStatus(data.reason==='disabled_for_release'?'Voice is not enabled in this release. You can continue with the on-screen guide.':'Voice is unavailable: the local server needs its API configuration.');}).catch(()=>{if(!c.signal.aborted){setConfigured(false);setStatus('Voice service unavailable. You can continue with written help.');}});const hide=()=>{if(document.hidden)stop('Conversation ended when the page was hidden. Microphone off.');};document.addEventListener('visibilitychange',hide);return()=>{c.abort();cleanup();document.removeEventListener('visibilitychange',hide);};},[]);
 function cancelPendingReady(){if(readyTimer.current)clearTimeout(readyTimer.current);readyTimer.current=null;explanationVersion.current++;}
 function prepareExplanation(actionId=latest.current.action.id){cancelPendingReady();const h=handsFree.current;h.ready=false;h.pending=true;h.audioSeen=false;h.actionId=actionId;h.readyAfterTurn=h.userTurn;setHandsFreeReady(false);}
 function waitForAudibleExplanation(){
  if(readyTimer.current)clearTimeout(readyTimer.current);
  const run=generation.current,version=explanationVersion.current,actionId=handsFree.current.actionId,sound=audio.current;
  const deadline=connectedAt.current+(longSession.current?1800000:180000);
  const poll=()=>{
   readyTimer.current=null;const h=handsFree.current;
   if(run!==generation.current||version!==explanationVersion.current||!readyRef.current||h.mode!=='active'||!h.pending||!h.audioSeen||h.actionId!==actionId||latest.current.action.id!==actionId||sound!==audio.current||Date.now()>=deadline)return;
   if(sound?.playbackIdle){h.pending=false;h.ready=true;h.readyAfterTurn=h.userTurn;setHandsFreeReady(true);setStatus('Waiting for your Done. Complete the action and checks first.');return;}
   readyTimer.current=setTimeout(poll,100);
  };
  poll();
 }
 function playHandsFreeAnimation(){if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){try{latest.current.onControl({command:'play'});}catch{/* Static or loading views do not need playback. */}}}
 function handsFreeContext(actionId=latest.current.action.id){const h=handsFree.current;return {mode:h.mode,stage:h.mode==='off'?'off':h.mode==='paused'?'paused':h.ready?'waiting_for_done':'explaining',ready_for_done:h.ready,current_action_id:actionId,session_limit_minutes:longSession.current?30:3,
  instruction:h.mode==='active'?(h.ready?'Wait for the user to explicitly say this action is done. Do not infer completion.':'Explain the current authored action, applicable warnings, and EVERY checklist item. Then ask the user to say Done only after doing the action and checks. Stop speaking and WAIT. Use hands_free_done only on a fresh explicit user statement for this exact action.'):'Hands-free guidance is not active. Do not advance physical progress automatically.'};}
 function currentContext(base?:Record<string,unknown>){return {...(base??latest.current.context()),hands_free:handsFreeContext(typeof base?.action_id==='string'?base.action_id:latest.current.action.id)};}
 function armSessionLimit(){if(!connectedAt.current)return;if(timer.current)clearTimeout(timer.current);const limit=longSession.current?1800000:180000;timer.current=setTimeout(()=>stop(longSession.current?'Thirty-minute hands-free session limit reached. Start again when ready.':'Three-minute session limit reached. Start again when ready.'),Math.max(0,connectedAt.current+limit-Date.now()));}
 function changeHandsFree(mode:HandsFreeMode){
  handsFree.current.mode=mode;setHandsFreeMode(mode);handsFree.current.ready=false;setHandsFreeReady(false);
  if(mode==='active'){longSession.current=true;prepareExplanation();armSessionLimit();playHandsFreeAnimation();}
  else{cancelPendingReady();handsFree.current.pending=false;handsFree.current.audioSeen=false;audio.current?.interrupt();if(mode==='paused'){try{latest.current.onControl({command:'pause'});}catch{/* The scene may not offer playback. */}}}
 }
 function handsFreeButton(mode:HandsFreeMode){changeHandsFree(mode);sendCurrentContext(true);if(mode!=='active')setStatus(mode==='paused'?'Hands-free paused. Say resume when ready.':'Hands-free stopped. You can still ask questions.');}
 function repairHandsFreeExplanation(error:string,result:Record<string,unknown>={}){
  audio.current?.interrupt();prepareExplanation();setStatus('Listen to the full action and checklist again, then say Done.');
  return {...result,ok:false,error,confirmation_recorded:false,physical_completion_changed:false,explain_current_action:true,wait_for_user_done:true,
   repair_instruction:'No confirmation was recorded. Re-explain the current authored instruction, applicable warnings, and EVERY checklist item. Then ask for a fresh explicit Done statement and WAIT until the user has heard the full explanation.',context:currentContext()};
 }
 function controlWithHandsFree(raw:unknown):Record<string,unknown>{
  const args=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:null,command=args?.command,h=handsFree.current;
  if(command==='end_conversation'){if(!args||Object.keys(args).length!==1)return {ok:false,error:'End conversation accepts only command.'};return {ok:true,end_conversation:true,message:'Conversation ended. Microphone off.'};}
  if(typeof command==='string'&&['hands_free_start','hands_free_pause','hands_free_resume','hands_free_stop'].includes(command)){
   if(!args||Object.keys(args).length!==1)return {ok:false,error:'Hands-free mode commands accept only command.'};
   if(command==='hands_free_start'){if(h.mode!=='active')changeHandsFree('active');}
   if(command==='hands_free_resume'){if(h.mode!=='paused')return {ok:false,error:'Hands-free is not paused.'};changeHandsFree('active');}
   if(command==='hands_free_pause'){if(h.mode==='off')return {ok:false,error:'Hands-free is not active.'};changeHandsFree('paused');}
   if(command==='hands_free_stop')changeHandsFree('off');
   return {ok:true,context:currentContext(),explain_current_action:h.mode==='active'&&!h.ready,wait_for_user_done:h.mode==='active',physical_completion_changed:false};
  }
  if(command==='confirm_current'&&h.mode!=='off')return {ok:false,error:'Use hands_free_done after the current explanation and a fresh explicit Done statement. Pause does not bypass that gate.'};
  if(command==='report_completed_legs'&&h.mode==='paused')return {ok:false,error:'Resume hands-free before reporting completed legs.'};
  if(command==='report_completed_legs'&&h.mode==='active'){
   if(h.userTurn<=h.consumedTurn)return {ok:false,error:'Give a fresh explicit spoken report of the completed legs. This user turn was already used.'};
   const result=latest.current.onControl(raw);
   if(result.ok===true)h.consumedTurn=h.userTurn;
   return result;
  }
  if(command==='hands_free_done'){
   if(h.mode!=='active')return {ok:false,error:'Hands-free must be active before recording Done.'};
   if(typeof args?.action_id==='string'&&args.action_id!==latest.current.action.id)return {ok:false,error:'Stale action: Done must refer to the current action.'};
   if(!args||Object.keys(args).length!==4||Object.keys(args).some(k=>!['command','action_id','user_statement','checks_confirmed'].includes(k))||typeof args.action_id!=='string'||typeof args.user_statement!=='string'||!args.user_statement.trim()||args.user_statement.length>500||typeof args.checks_confirmed!=='boolean')return repairHandsFreeExplanation('Invalid explicit Done statement.');
   if(!h.ready||h.actionId!==args.action_id)return repairHandsFreeExplanation('The current explanation and checklist have not finished audibly.');
   if(h.userTurn<=Math.max(h.consumedTurn,h.readyAfterTurn))return {ok:false,error:'This spoken turn was already used or preceded the explanation. Wait, then give a new explicit Done statement.'};
   h.consumedTurn=h.userTurn;
   let result:Record<string,unknown>;try{result=latest.current.onControl(raw);}catch{return repairHandsFreeExplanation('The confirmation could not be recorded.');}
   if(!result||typeof result!=='object'||Array.isArray(result))return repairHandsFreeExplanation('The portal returned an invalid confirmation result.');
   if(result.ok===true){
    const c=result.context as Record<string,any>|undefined;
    if(c?.progress?.all_actions_confirmed===true){changeHandsFree('off');setStatus('You confirmed every action. Voice remains available.');}
    else prepareExplanation(typeof result.action_id==='string'?result.action_id:latest.current.action.id);
    return {...result,explain_current_action:h.mode==='active',wait_for_user_done:h.mode==='active',context:currentContext(c)};
   }
   return repairHandsFreeExplanation(typeof result.error==='string'?result.error:'The confirmation could not be recorded.',result);
  }
  return latest.current.onControl(raw);
 }
 function sendCurrentContext(force=false){
  const current=latest.current,key=`${current.revision}:${current.action.id}`,ws=socket.current;
  if(!readyRef.current||ws?.readyState!==WebSocket.OPEN||(!force&&sentContext.current===key))return;
  const a=current.action;if(handsFree.current.mode==='active')prepareExplanation();
  try{if(responseActive.current)suppressPriorResponse.current=true;audio.current?.interrupt();ws.send(JSON.stringify({clientContent:{turns:[{role:'user',parts:[{text:`Portal current action now: ${a.id} — ${a.title}. Instruction: ${a.instruction}. Components: ${a.component_instances.join(', ')}. Source: ${a.source.document_id?`${a.source.document_id}, page ${(a.source.page_index??0)+1}`:a.source.product_url}. Warnings: ${a.warnings.join(' ')}. Structured portal context: ${JSON.stringify(currentContext())}. This is portal context, not physical completion. ${handsFree.current.mode==='active'?'Hands-free was explicitly enabled. Explain this current action and all its checklist items now, ask for Done, then WAIT.':'Wait for the next spoken question; do not respond to this context update.'}`}]}],turnComplete:handsFree.current.mode==='active'}}));sentContext.current=key;}catch{stop('Voice connection lost. Microphone off.');}
 }
 useEffect(()=>{sendCurrentContext();},[action.id,revision]);
 function minimize(){setExpanded(false);launcher.current?.focus({preventScroll:true});}
 function toggleMute(){const next=!mutedRef.current;mutedRef.current=next;stream.current?.getAudioTracks().forEach(t=>{t.enabled=!next;});setMuted(next);}
 function transcript(id:string,who:Line['who'],text:string){if(!text)return;setLines(old=>{const found=old.find(x=>x.id===id);const next={id,who,text:((found?.text??'')+text).slice(-12000)};return [...old.filter(x=>x.id!==id),next].slice(-30);});}
 async function start(optedHandsFree=false){
  if(phase!=='idle'||!configured)return;
  cleanup();handsFree.current.mode=optedHandsFree?'active':'off';longSession.current=optedHandsFree;setHandsFreeMode(handsFree.current.mode);setHandsFreeReady(false);const run=generation.current;setLines([]);setAudioBlocked(false);setPhase('connecting');setStatus('Requesting microphone…');setMuted(false);
  connectionTimer.current=setTimeout(()=>stop('Connection timed out. Please try again.'),30000);
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.AudioContext||!window.AudioWorkletNode||!window.WebSocket)throw Error('This browser cannot use voice. Try a recent browser on localhost or HTTPS.');
   const sound=new GeminiAudio();audio.current=sound;void sound.resume().catch(()=>{if(run===generation.current)setAudioBlocked(true);});
   const mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1},video:false});
   if(run!==generation.current){mic.getTracks().forEach(t=>t.stop());return;}stream.current=mic;
   let turn=0,renewals=0,micAttached=false;
   // Never evict executed IDs: a replay must not repeat a portal action.
   const handledCalls=new Map<string,{id:string;name:string;response:Record<string,unknown>}>(),cancelledCalls=new Set<string>();let toolsExhausted=false;
   const validIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=256;
   async function connectTransport(){
   setStatus('Connecting to voice coach…');const requested=latest.current;const controller=new AbortController();abort.current=controller;
   const response=await fetch('/api/v1/furniture/voice/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({article_number:requested.articleNumber,action_id:requested.action.id,revision:requested.revision}),signal:controller.signal});
   if(!response.ok){let message='Could not connect to voice. Please try again.';try{const body=await response.json();if(typeof body.detail?.message==='string')message=body.detail.message;}catch{}throw Error(message);}
   const session=await response.json();if(run!==generation.current)return;
   if(typeof session.token!=='string'||!session.token||typeof session.model!=='string'||!session.setup||typeof session.setup!=='object')throw Error('Invalid voice session. Please try again.');
   const ws=new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(session.token)}`);socket.current=ws;
   let ready=false;let messages=Promise.resolve();
   function handleTools(event:Record<string,any>){
    const cancellations=event.toolCallCancellation?.ids;
    if(Array.isArray(cancellations))for(const id of cancellations.slice(0,256)){if(!validIdentifier(id))continue;if(cancelledCalls.size>=256&&!cancelledCalls.has(id)){toolsExhausted=true;break;}cancelledCalls.add(id);}
    if(Array.isArray(cancellations)&&cancellations.length>256)toolsExhausted=true;
    const calls=event.toolCall?.functionCalls;if(!Array.isArray(calls))return;
    const responses:{id:string;name:string;response:Record<string,unknown>}[]=[];let endRequested=false;
    for(const call of calls.slice(0,8)){
     if(!call||typeof call!=='object'||!validIdentifier(call.id)||!validIdentifier(call.name)||cancelledCalls.has(call.id))continue;
     const cached=handledCalls.get(call.id);
     if(cached){responses.push(cached.name===call.name?cached:{id:call.id,name:call.name,response:{ok:false,error:'Tool call ID was already used.'}});continue;}
     let response:Record<string,unknown>={ok:false,error:'The portal action could not be completed.'};
     if(calls.length>8)response={ok:false,error:'Too many tool calls in one batch.'};
     else if(toolsExhausted||handledCalls.size>=256)response={ok:false,error:'Session tool-call limit reached.'};
     else if(call.name!=='portal_control'&&call.name!=='hands_free_done')response={ok:false,error:'Unknown portal tool.'};
     else if(endRequested)response={ok:false,error:'The conversation is ending.'};
     else if(suppressPriorResponse.current&&!(call.name==='portal_control'&&call.args?.command==='end_conversation'))response={ok:false,error:'Stale request: the portal action changed while this response was pending. Ask again for the current action.'};
     else{
      try{flushSync(()=>{
       if(call.name==='hands_free_done'){
        const args=call.args;
        const valid=args&&typeof args==='object'&&!Array.isArray(args)&&Object.keys(args).length===3&&Object.keys(args).every(k=>['action_id','user_statement','checks_confirmed'].includes(k));
        if(!valid){
         const stale=typeof args?.action_id==='string'&&args.action_id!==latest.current.action.id;
         response=handsFree.current.mode==='active'&&!stale?repairHandsFreeExplanation('The hands_free_done tool requires exactly action_id, user_statement, and checks_confirmed; command is not an argument.'):{ok:false,error:'Invalid or stale hands_free_done arguments.'};
        }else response=controlWithHandsFree({...args,command:'hands_free_done'});
       }else response=controlWithHandsFree(call.args);
       if(!response||typeof response!=='object'||Array.isArray(response)){response={ok:false,error:'Portal returned an invalid result.'};return;}
       if(response.ok===true&&response.navigated===true&&typeof response.action_id==='string'){
        audio.current?.interrupt();if(handsFree.current.mode==='active')prepareExplanation(response.action_id);
        // Mark the target before React commits and runs its action effect.
        // The tool response already carries this context; sending it again
        // as a user turn would interrupt the spoken acknowledgement.
        sentContext.current=`${latest.current.revision}:${response.action_id}`;
       }
      });}
      catch{response={ok:false,error:'The portal action could not be completed.'};}
     }
     if(response.ok===true&&response.end_conversation===true)endRequested=true;
     response={...response,context:currentContext(response.context&&typeof response.context==='object'&&!Array.isArray(response.context)?response.context as Record<string,unknown>:undefined)};
     const result={id:call.id,name:call.name,response};if(handledCalls.size<256)handledCalls.set(call.id,result);responses.push(result);
    }
    if(responses.length&&run===generation.current&&ws.readyState===WebSocket.OPEN){ws.send(JSON.stringify({toolResponse:{functionResponses:responses}}));if(endRequested)queueMicrotask(()=>{if(run===generation.current&&socket.current===ws)stop();});}
   }
   ws.onopen=()=>{if(run===generation.current&&socket.current===ws)ws.send(JSON.stringify({setup:session.setup}));};
   const renew=()=>{
    if(run!==generation.current||socket.current!==ws)return;
    const eligible=handsFree.current.mode!=='off'&&!document.hidden&&connectedAt.current>0&&Date.now()<connectedAt.current+1800000&&renewals<3;
    if(!eligible){stop('Connection closed. Microphone off.');return;}
    renewals++;cancelPendingReady();readyRef.current=false;responseActive.current=false;suppressPriorResponse.current=false;handsFree.current.ready=false;handsFree.current.inputOpen=false;setHandsFreeReady(false);audio.current?.interrupt();
    ws.onopen=null;ws.onmessage=null;ws.onclose=null;ws.onerror=null;socket.current=null;ws.close();setPhase('connecting');setStatus('Refreshing hands-free connection…');
    if(connectionTimer.current)clearTimeout(connectionTimer.current);connectionTimer.current=setTimeout(()=>stop('Connection timed out. Please try again.'),30000);
    void connectTransport().catch(()=>{if(run===generation.current)stop('Voice renewal failed. Please start again.');});
   };
   ws.onclose=event=>{if(run!==generation.current||socket.current!==ws)return;if(event.code===1000||event.code===1001)renew();else stop('Connection closed. Microphone off.');};
   ws.onerror=()=>{if(run===generation.current&&socket.current===ws)stop('Voice connection failed. Please try again.');};
   ws.onmessage=message=>{messages=messages.then(async()=>{
    if(run!==generation.current||socket.current!==ws)return;
    const raw=message.data instanceof Blob?await message.data.text():message.data;if(run!==generation.current||socket.current!==ws)return;
    let event;try{event=JSON.parse(raw);}catch{return;}
    if(event.goAway){renew();return;}
    if(event.error){stop('The voice service encountered an error. Please reconnect.');return;}
    if(event.setupComplete&&!ready){
     ready=true;if(!micAttached){await sound.attachMic(mic,data=>{const activeSocket=socket.current;if(run===generation.current&&readyRef.current&&!mutedRef.current&&activeSocket?.readyState===WebSocket.OPEN&&activeSocket.bufferedAmount<65536)activeSocket.send(JSON.stringify({realtimeInput:{audio:{data,mimeType:'audio/pcm;rate=16000'}}}));});micAttached=true;}
     if(run!==generation.current||socket.current!==ws)return;if(connectionTimer.current)clearTimeout(connectionTimer.current);connectionTimer.current=null;readyRef.current=true;if(!connectedAt.current)connectedAt.current=Date.now();sendCurrentContext(true);if(handsFree.current.mode==='active')playHandsFreeAnimation();setPhase('connected');minimize();setStatus(handsFree.current.mode==='active'?'Hands-free coach is explaining this action.':'Listening — ask about this action.');armSessionLimit();
    }
    const content=event.serverContent;
    if(ready&&typeof content?.inputTranscription?.text==='string'){const h=handsFree.current;if(content.inputTranscription.text.trim()&&!h.inputOpen){h.userTurn++;h.inputOpen=true;}responseActive.current=true;transcript(`you-${turn}`,'You',content.inputTranscription.text);}
    if(ready)handleTools(event);
    if(!content||!ready)return;
    // A navigation context update can race already-in-flight chunks. Keep dropping
    // the old response until its protocol boundary, not just its queued PCM.
    const discardOutput=suppressPriorResponse.current||Boolean(content.interrupted)||handsFree.current.mode==='paused';
    if(content.interrupted){cancelPendingReady();handsFree.current.ready=false;handsFree.current.pending=suppressPriorResponse.current&&handsFree.current.mode==='active';handsFree.current.audioSeen=false;setHandsFreeReady(false);sound.interrupt();turn++;setStatus('Listening…');}
    if(!discardOutput){
     if(typeof content.outputTranscription?.text==='string'){responseActive.current=true;transcript(`coach-${turn}`,'Coach',content.outputTranscription.text);}
     if(content.modelTurn?.parts?.length)responseActive.current=true;
     for(const part of content.modelTurn?.parts??[]){const data=part.inlineData;if(typeof data?.data==='string'&&typeof data.mimeType==='string'&&data.mimeType.startsWith('audio/pcm')){const rate=Number(/rate=(\d+)/.exec(data.mimeType)?.[1]??24000);if(rate===24000){sound.play(data.data,rate);if(handsFree.current.mode==='active'&&handsFree.current.pending)handsFree.current.audioSeen=true;}setStatus('Coach is responding…');}}
    }
    if(content.turnComplete){
     if(!content.interrupted)turn++;const h=handsFree.current;h.inputOpen=false;
     if(!discardOutput&&h.mode==='active'&&h.pending&&h.audioSeen&&h.actionId===latest.current.action.id)waitForAudibleExplanation();
     setStatus(h.mode==='active'?(h.ready?'Waiting for your Done. Complete the action and checks first.':'Hands-free coach is explaining this action.'):'Listening — ask another question.');
    }
    if(content.interrupted||content.turnComplete){responseActive.current=false;suppressPriorResponse.current=false;}

   }).catch(()=>{if(run===generation.current&&socket.current===ws)stop('Audio connection interrupted. Please try again.');});};
   }
   await connectTransport();
  }catch(e){if(run!==generation.current)return;stop(e instanceof DOMException&&e.name==='NotAllowedError'?'Microphone permission was denied. Allow it in your browser, then try again.':e instanceof Error?e.message:'Unable to start voice. Please try again.');}
 }
 const [speaking,setSpeaking]=useState(false);
 useEffect(()=>{if(phase!=='connected'){setSpeaking(false);return;}const timer=setInterval(()=>setSpeaking(!!audio.current&&!audio.current.playbackIdle),120);return()=>clearInterval(timer);},[phase]);
 const live=phase==='connected';
 const shortStatus=phase==='connecting'?'Connecting…':live?(muted?'Mic muted':handsFreeMode==='paused'?'Hands-free paused':handsFreeMode==='active'?(handsFreeReady?'Waiting for done':'Hands-free'):'Mic on'):'Ask Nandi';
 return <aside ref={companion} style={position?{left:position.x,right:'auto',bottom:`calc(100dvh - ${position.y}px)`}:undefined} className={`voice-companion ${dragging?'is-dragging':''}`} data-voice-companion aria-label="Voice coach" data-phase={phase} data-voice-state={speaking?'speaking':phase==='connected'?(muted?'muted':'listening'):phase} data-hands-free-mode={handsFreeMode} data-hands-free-ready={handsFreeReady} onKeyDown={e=>{if(e.key==='Escape'&&expanded){e.preventDefault();e.stopPropagation();minimize();}}}>
  {expanded&&<section className="voice-popover" data-testid="voice-panel" aria-labelledby="voice-title">
   <header><div><span className="voice-eyebrow">HERE TO HELP</span><h2 id="voice-title" ref={panelTitle} tabIndex={-1}>Nandi · your assembly coach</h2></div><button className="voice-hide" onClick={minimize} aria-label="Hide voice details">−</button></header>
   <p className="voice-action">{action.title}</p><p className="voice-move-hint">Drag the colourful icon to move it, or focus it and use Shift + arrow keys. <button className="voice-reset-position" onClick={()=>setPosition(null)}>Reset position</button></p>
   <p role="status" aria-live="polite" className="voice-status">{muted?'Microphone muted. You can still hear the coach.':status}</p>
   {phase==='idle'?<>
    <p className="voice-disclosure">Nandi is your AI assembly companion. Starting sends microphone audio to Google Gemini. This app keeps no audio recording; transcripts stay in this page until you leave or start again. API usage is billed to the configured account.</p>
    <button className="voice-start" disabled={configured!==true} onClick={()=>void start()}>{configured===null?'Checking voice…':'Start conversation'}</button>
    <button className="voice-handsfree-start" disabled={configured!==true} onClick={()=>void start(true)}>Start hands-free assembly</button>
    <p className="voice-disclosure">Hands-free explains each action and all checks, then waits for your explicit Done. Up to 30 minutes with bounded connection renewal. Ordinary conversations last 3 minutes.</p>
   </>:<p className="voice-disclosure">Google Gemini · {muted?'Microphone muted':'Microphone on'}. You can keep assembling while we talk.</p>}
   {live&&<div className="voice-handsfree-controls">{handsFreeMode==='off'?<button onClick={()=>handsFreeButton('active')}>Start hands-free assembly</button>:<><button onClick={()=>handsFreeButton(handsFreeMode==='active'?'paused':'active')}>{handsFreeMode==='active'?'Pause hands-free':'Resume hands-free'}</button><button onClick={()=>handsFreeButton('off')}>Stop hands-free</button></>}<p>Current call limit: {longSession.current?30:3} minutes. Pausing guidance keeps the microphone available.</p></div>}
   {audioBlocked&&<button onClick={()=>void audio.current?.resume().then(()=>setAudioBlocked(false)).catch(()=>setStatus('Audio playback is blocked. Check browser sound settings.'))}>Enable spoken replies</button>}
   <details className="voice-transcript-details"><summary>Conversation transcript{lines.length?` · ${lines.length}`:''}</summary><div className="voice-transcript" role="log" aria-label="Conversation transcript" aria-live="polite" tabIndex={0}>{lines.length?lines.map(l=><p key={l.id}><strong>{l.who}</strong> {l.text}</p>):<p>Try “Take me to step 3”, “Replay”, or “Which way does Leg 1 turn?”</p>}</div></details>
   <p className="voice-limits">No camera access. The coach cannot inspect or certify your table. Check the <a href={officialSourceUrl??`/api/v1/furniture/documents/${action.source.document_id}/pdf?article_number=${articleNumber}#page=${(action.source.page_index??0)+1}`} target="_blank" rel="noreferrer">official instructions</a>. You can confirm work aloud or with Done, next. The coach records your report; it cannot verify it. Ordinary calls end after 3 minutes; opted-in hands-free calls have a 30-minute total limit and up to 3 connection renewals. Leaving or hiding the page ends the call. There is no automatic microphone restart. Say “end conversation” or use End to turn the microphone off. Minimizing keeps your call active.</p>
  </section>}
  <div className={`voice-bubble ${live?'is-live':''}`}>
   <button className="voice-launcher" data-testid="voice-launcher" ref={launcher} title="Nandi · Drag to move · Shift + arrow keys to reposition" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={()=>{drag.current=null;setDragging(false);}} onKeyDown={e=>{if(e.shiftKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();const box=companion.current?.getBoundingClientRect();if(box)setPosition(bounded(box.left+(e.key==='ArrowLeft'?-24:e.key==='ArrowRight'?24:0),box.bottom+(e.key==='ArrowUp'?-24:e.key==='ArrowDown'?24:0)));}}} aria-label={expanded?'Minimize voice coach':'Open voice coach'} aria-expanded={expanded} onClick={()=>{if(suppressClick.current){suppressClick.current=false;return;}if(expanded)minimize();else setExpanded(true);}}>
    <NandiPet getAudioLevel={()=>audio.current?.outputLevel??0} paused={dragging}/>
    <span className="voice-bubble-label"><strong>{shortStatus}</strong><small>{live?'Google Gemini':phase==='connecting'?'Starting voice':'Voice companion'}</small></span>
   </button>
   {phase!=='idle'&&<div className="voice-quick-controls"><button className="voice-mute" disabled={!live} aria-pressed={muted} aria-label={muted?'Unmute microphone':'Mute microphone'} onClick={toggleMute}>{muted?'Unmute':'Mute'}</button><button className="voice-end" aria-label="End conversation" onClick={()=>stop()}>End</button></div>}
  </div>
  {!expanded&&phase==='idle'&&status!=='Ready when you are.'&&<p className="voice-mini-status" role="status">{status}</p>}
 </aside>;
}
