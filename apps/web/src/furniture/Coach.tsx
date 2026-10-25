import {Component,lazy,Suspense,useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {sourcePdfUrl,sourceImageUrl,type FurnitureProduct,type FurnitureTutorial} from './contracts';
import {readCoachProgress,saveCoachProgress,type CoachProgress} from './coachContracts';
import type {ViewerController} from './viewerController';
import './coach.css';
import VoiceCoach from './VoiceCoach';
import {parseVoiceControl,voiceContext} from './voiceContext';
import {applyVoiceProgress,sameProgress} from './voiceProgress';
const CoachScene=lazy(()=>import('./CoachScene'));
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="coach-scene-error" role="status">The 3D view could not load. Use the official diagram and written instruction.</div>:this.props.children;}}
const names=(id:string)=>id==='tabletop'?'Tabletop':id.startsWith('screw-')?`Screw ${id.split('-')[1]} · 115980`:`Leg ${id.split('-')[1]}`;
export default function Coach({tutorial:t,onExit,preview=false,variants=[],onVariant,variantNotice=''}:{tutorial:FurnitureTutorial;onExit:()=>void;preview?:boolean;variants?:FurnitureProduct[];onVariant?:(p:FurnitureProduct)=>void;variantNotice?:string}){
 const actions=t.coach_actions!;
 const [progress,setProgress]=useState<CoachProgress>(()=>{const p=readCoachProgress(t);const q=new URLSearchParams(location.search);const legacy:Record<string,string>={'attach-legs':'leg-1','insert-screws':'screw-1','identify-screws':'identify','finish':'final-checks'};const id=q.get('action')??legacy[q.get('step')??''];return id&&actions.some(a=>a.id===id)?{...p,viewedActionId:id}:p;});
 const [voiceChange,setVoiceChange]=useState(''),[voiceUndo,setVoiceUndo]=useState<{before:CoachProgress;after:CoachProgress}|null>(null);
 function clearVoiceUndo(){setVoiceUndo(null);setVoiceChange('');}
 const index=Math.max(0,actions.findIndex(a=>a.id===progress.viewedActionId));const action=actions[index];
 const [panel,setPanel]=useState<'source'|'parts'|'help'|'controls'|null>(null),[view,setView]=useState<'guided'|'whole'>('guided'),[selected,setSelected]=useState<string|null>(null),[saved,setSaved]=useState(true),[imageError,setImageError]=useState(false);
 const [controller,setController]=useState<(ViewerController&{actionId:string})|null>(null);
 const receive=useCallback((c:ViewerController|null)=>setController(c?{...c,actionId:action.id}:null),[action.id]);
 const current=controller?.actionId===action.id?controller:null;
 const surface=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null),instructions=useRef<HTMLDivElement>(null);
 const confirmed=new Set(progress.confirmedActionIds);const complete=actions.every(a=>confirmed.has(a.id));const checked=action.checks.every((_,i)=>progress.checks.includes(`${action.id}:${i}`));
 const priorMissing=action.kind==='finish'?actions.slice(0,-1).find(a=>!confirmed.has(a.id)):undefined;
 useEffect(()=>{if(!preview)setSaved(saveCoachProgress(t,progress));const url=new URL(location.href);url.searchParams.set('product',t.product.article_number);url.searchParams.set('action',progress.viewedActionId);url.searchParams.delete('step');history.replaceState(null,'',url);},[t,progress,preview]);
 useEffect(()=>{if(panel)dialog.current?.showModal();else dialog.current?.close();},[panel]);
 useEffect(()=>{setImageError(false);if(instructions.current)instructions.current.scrollTop=0;},[action.id]);
 function go(n:number){clearVoiceUndo();const next=Math.max(0,Math.min(actions.length-1,n));if(next===index)return;setProgress(p=>({...p,viewedActionId:actions[next].id}));setSelected(null);setView('guided');}
 function done(){clearVoiceUndo();if(priorMissing){go(actions.indexOf(priorMissing));return;}if(!checked)return;setProgress(p=>({...p,confirmedActionIds:[...new Set([...p.confirmedActionIds,action.id])],viewedActionId:actions[Math.min(actions.length-1,index+1)].id}));setSelected(null);setView('guided');}
 function replay(){if(current?.available&&current.animated)current.dispatch('replay');}
 useEffect(()=>{const keys=(e:KeyboardEvent)=>{const target=e.target as HTMLElement;if(panel||e.defaultPrevented||e.repeat||e.isComposing||e.ctrlKey||e.metaKey||e.shiftKey||target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="tab"],dialog,[data-voice-companion]'))return;if(e.altKey){if(e.key.toLowerCase()==='r'){e.preventDefault();replay();}return;}if(e.key==='ArrowLeft'){e.preventDefault();go(index-1);}else if(e.key==='ArrowRight'){e.preventDefault();go(index+1);}else if(e.code==='Space'&&target===surface.current&&current?.animated&&current.available){e.preventDefault();current.dispatch('toggle');}};window.addEventListener('keydown',keys);return()=>window.removeEventListener('keydown',keys);},[index,panel,current]);
 const voiceState=useRef({index,view,panel,current,progress});voiceState.current={index,view,panel,current,progress};
 function getVoiceContext(){const s=voiceState.current;return voiceContext(t,s.index,s.view,s.panel,s.current,s.progress);}
 function controlVoice(raw:unknown):Record<string,unknown>{
  const args=parseVoiceControl(raw);if(!args)return {ok:false,error:'Unsupported command or invalid arguments. Progress updates need an explicit user statement and exact current action/check fields.',confirmation_recorded:false,context:getVoiceContext()};
  const command=args.command,s=voiceState.current,n=s.index;
  if(args.command==='report_completed_legs'||args.command==='set_checklist'||args.command==='confirm_current'||args.command==='hands_free_done'){
   const result=applyVoiceProgress(actions,s.progress,args);if(!result.ok)return {...result,confirmation_recorded:false,context:getVoiceContext()};
   const next=result.progress,target=actions.findIndex(a=>a.id===next.viewedActionId),navigated=target!==n;
   if(!sameProgress(s.progress,next))setVoiceUndo({before:s.progress,after:next});setVoiceChange(result.message);
   voiceState.current={...s,index:target,progress:next,...(navigated?{view:'guided',panel:null,current:null}:{})};setProgress(next);
   if(navigated){setPanel(null);setSelected(null);setView('guided');}
   return {ok:true,...(navigated?{navigated:true}:{}),action_id:next.viewedActionId,message:result.message,physical_completion_changed:result.physical_completion_changed,confirmation_recorded:result.confirmation_recorded,context:getVoiceContext()};
  }
  if(command==='get_context')return {ok:true,context:getVoiceContext()};
  if(command==='go_to_step'||command==='next'||command==='previous'){
   const target=command==='go_to_step'?args.step!-1:Math.max(0,Math.min(actions.length-1,n+(command==='next'?1:-1)));
   const nextProgress={...s.progress,viewedActionId:actions[target].id};voiceState.current={index:target,view:'guided',panel:null,current:target===n?s.current:null,progress:nextProgress};setPanel(null);setProgress(nextProgress);setSelected(null);setView('guided');
   return {ok:true,navigated:true,action_id:actions[target].id,context:getVoiceContext(),physical_completion_changed:false};
  }
  if(command==='whole_table'||command==='look_closer'){const next=command==='whole_table'?'whole':'guided';voiceState.current={...s,view:next};setView(next);return {ok:true,context:getVoiceContext()};}
  if(command==='official_diagram'||command==='close_panel'){const next=command==='official_diagram'?'source':null;voiceState.current={...s,panel:next,current:s.current?{...s.current,playing:next?false:s.current.playing}:null};setPanel(next);return {ok:true,context:getVoiceContext()};}
  if(!s.current?.available||!s.current.animated)return {ok:false,error:'Playback is unavailable for this action or still loading.',context:getVoiceContext()};
  if(s.panel)return {ok:false,error:'Close the open panel before playback.',context:getVoiceContext()};
  s.current.dispatch(command as 'play'|'pause'|'replay');
  voiceState.current={...s,current:{...s.current,playing:command!=='pause',progress:command==='replay'?0:s.current.progress}};
  return {ok:true,command,action_id:action.id,physical_completion_changed:false};
 }
 const partText=action.kind==='identify'?'1 tabletop · 4 legs · 4 screws':action.kind==='finish'?'Your assembled table':action.component_instances.map(names).join(' + ');
 const warningSource=t.steps[0]?.secondary_source??{document_id:null,page_index:null,product_url:t.product.product_url};
 return <div className="coach-app" data-testid="coach-app">
  <header className="coach-header"><button className="coach-brand" onClick={onExit}>Furniture Assembly Assistant</button><div className="coach-product"><span>LACK · {t.product.display_article_number}</span><label className="coach-finish"><span className="finish-swatch" aria-hidden="true" style={{background:t.product.finish?.base_color}}/><select aria-label="Furniture finish" value={t.product.article_number} onChange={e=>{const p=variants.find(v=>v.article_number===e.target.value);if(p)onVariant?.(p);}}>{(variants.length?variants:[t.product]).filter(p=>!p.family_id||p.family_id===t.product.family_id).map(p=><option key={p.article_number} value={p.article_number}>{p.finish?.name??p.variant}</option>)}</select></label></div><span className="coach-save">{preview?'Design preview':saved?'Saved on this device':'Progress not saved'}</span></header>
  <div className="coach-safety"><span>{t.warnings.join(' ')}</span><a href={sourcePdfUrl(warningSource,t.product)} target="_blank" rel="noreferrer">Official warning</a></div>
  <main className="coach-main">
   <div className="coach-action" ref={instructions} tabIndex={0} role="region" aria-label="Current instruction and checklist">
    <div className="coach-step"><span>{action.kind==='screw'||action.kind==='leg'?`Connection ${action.id.split('-')[1]} of 4`:action.kind==='finish'?'FINAL CHECKS':'BEFORE YOU BUILD'}</span><span>Action {index+1} of {actions.length}</span></div>
    {voiceChange&&<div className="coach-confirmation-state" data-testid="voice-progress-change" role="status"><span>{voiceChange}</span>{voiceUndo&&sameProgress(progress,voiceUndo.after)&&<button onClick={()=>{if(!sameProgress(voiceState.current.progress,voiceUndo.after)){setVoiceUndo(null);return;}setProgress(voiceUndo.before);setVoiceUndo(null);setVoiceChange('Undid the last voice progress change.');}}>Undo voice progress</button>}</div>}
    <>{variantNotice&&<p className="coach-variant-notice" role="status">{variantNotice}</p>}</><h1>{complete&&action.kind==='finish'?'You’ve confirmed every action.':action.title}</h1>
    <p className="coach-instruction">{action.instruction}</p>
    <p className="coach-needed"><span>{action.kind==='finish'?'CHECK':'YOU NEED'}</span>{partText}</p>
    {action.checks.length>0&&<fieldset className="coach-checks"><legend>{action.kind==='finish'?'Before you finish':'Ready to continue?'}</legend>{action.checks.map((check,i)=><label key={`${action.id}:${i}`}><input type="checkbox" checked={progress.checks.includes(`${action.id}:${i}`)} onChange={e=>{clearVoiceUndo();const id=`${action.id}:${i}`;setProgress(p=>({...p,checks:e.target.checked?[...new Set([...p.checks,id])]:p.checks.filter(v=>v!==id),confirmedActionIds:e.target.checked?p.confirmedActionIds:p.confirmedActionIds.filter(v=>v!==action.id)}));}}/>{check}</label>)}</fieldset>}
    {action.kind==='finish'&&<p className="coach-finish-note">{complete?'Completion is your confirmation, not an inspection or certification of the table.':'Check the actual table before confirming. Watching the animation does not complete an action.'}</p>}
    <div className={`coach-confirmation-state ${confirmed.has(action.id)?'is-confirmed':''}`} role="status">{confirmed.has(action.id)?'You confirmed this action.':current?.animated&&current.progress===1?'Demonstration finished. Your turn—confirm when done.':action.animation?'Watch the motion, then do this action on your table.':'Confirm only after you have done the checks.'}</div>
   </div>
   <section className="coach-visual" aria-label="Assembly demonstration">
    <div className="coach-view-tools">{action.checks.length>0?<button className="coach-check-link" onClick={()=>{const field=instructions.current?.querySelector('fieldset');if(field&&instructions.current)instructions.current.scrollTo({top:field.offsetTop-instructions.current.offsetTop,behavior:'instant'});}}>Review checklist ↓</button>:<span>Schematic illustration</span>}<button aria-pressed={view==='whole'} onClick={()=>setView(v=>v==='guided'?'whole':'guided')}>{view==='guided'?'Whole table':'Look closer'}</button></div>
    <div className="coach-surface" ref={surface} tabIndex={0} role="group" aria-label="Assembly viewer. Space plays or pauses." onPointerDown={e=>{if(e.target instanceof HTMLCanvasElement)e.currentTarget.focus({preventScroll:true});}}>
     <SceneBoundary key={action.id}><Suspense fallback={<div className="coach-scene-error" role="status">Preparing this action…</div>}><CoachScene key={action.id} action={action} finish={t.product.finish} onController={receive} visible={!panel} view={view} selectedComponent={selected}/></Suspense></SceneBoundary>
    </div>
    <div className="coach-tools"><button onClick={()=>setPanel('source')}>Official diagram</button><button onClick={()=>setPanel('parts')}>Parts</button><button onClick={()=>setPanel('help')}>Need help?</button><button onClick={()=>setPanel('controls')}>More controls</button></div>
   </section>
  </main>
  <footer className="coach-dock">
   <div className="coach-progress"><span>{!saved?'Not saved · ':''}{confirmed.size} of {actions.length} actions confirmed by you</span><span className="coach-browse-hint">Arrow keys browse · Alt+R replay</span><progress max={actions.length} value={confirmed.size} aria-label="Actions confirmed by you"/></div>
   <nav aria-label="Assembly actions"><button onClick={()=>go(index-1)} aria-disabled={index===0}>Back</button><button disabled={!current?.animated||!current.available} onClick={()=>current?.dispatch('toggle')}>{current?.playing?'Pause':'Play'}</button><button disabled={!current?.animated||!current.available} onClick={replay}>Replay</button><button className="coach-next" aria-disabled={!priorMissing&&!checked} onClick={done}>{priorMissing?'Return to unfinished action':action.kind==='finish'?complete?'Confirmed':'Confirm final checks':'Done, next'}</button></nav>
   <p className="coach-independent">Independent assistant · Not affiliated with IKEA · Official instructions remain the reference</p>
  </footer>
  <VoiceCoach officialSourceUrl={sourcePdfUrl(action.source,t.product)} articleNumber={t.product.article_number} action={action} revision={t.revision} context={getVoiceContext} onControl={controlVoice}/>
  <span className="coach-sr" role="status" aria-live="polite">Action {index+1}: {action.title}</span>
  <dialog ref={dialog} className="coach-panel" onClose={()=>setPanel(null)} onCancel={()=>setPanel(null)} aria-labelledby="coach-panel-title">
   <header><h2 id="coach-panel-title">{panel==='source'?'Official diagram':panel==='parts'?'Parts for this action':panel==='controls'?'Playback and viewing':'Help with this action'}</h2><button aria-label="Close panel" onClick={()=>setPanel(null)}>Close</button></header>
   {panel==='source'&&<>{action.source.document_id?<><p>Source: {action.source.document_id}, page {(action.source.page_index??0)+1}. Coach actions are explanatory subdivisions.</p>{imageError?<p role="alert">The diagram could not load. <button onClick={()=>setImageError(false)}>Retry diagram</button></p>:<img src={sourceImageUrl(action.source,t.product)} alt={`Official diagram for ${action.title}`} onError={()=>setImageError(true)}/>}<a href={sourcePdfUrl(action.source,t.product)} target="_blank" rel="noreferrer">Open full official PDF</a><p>© Inter IKEA Systems B.V. Original notices remain in the document.</p></>:<><p>This action uses the care information on the official product page. No separate care diagram is linked for this finish.</p><a href={sourcePdfUrl(action.source,t.product)} target="_blank" rel="noreferrer">Official product and care information</a></>}</>}

   {panel==='parts'&&<><p>1 tabletop · 4 legs · 4 double-ended screws, IKEA hardware 115980.</p>{['tabletop',...Array.from({length:4},(_,i)=>`screw-${i+1}`),...Array.from({length:4},(_,i)=>`leg-${i+1}`)].map(id=><button className="coach-part-item" key={id} onClick={()=>{setSelected(id);setPanel(null);}}><strong>{names(id)}</strong><span>{action.component_instances.includes(id)?'Used in this action':'Other component'}</span></button>)}<p>Leg and screw instance numbers distinguish identical pieces; they are assistant labels.</p></>}
   {panel==='help'&&<>{action.help.map(h=><details key={h.question}><summary>{h.question}</summary><p>{h.answer}</p></details>)}{action.warnings.map(w=><p key={w}>{w}</p>)}<p>Finish colour and wood grain are approximate instructional appearances. Motion, dimensions and thread details are illustrative. Do not infer a turn count, insertion depth or torque.</p><a href={t.product.product_url} target="_blank" rel="noreferrer">Product support and official IKEA documents</a><details><summary>About this guide and review status</summary><p>Revision {t.revision}. Source-checked by an agent. Human review: {t.review.human_review}. Physical assembly: {t.review.physical_build}.</p><p>Your confirmations are stored only in this browser and do not change those review statuses.</p></details></>}
   {panel==='controls'&&<><label className="coach-control">Speed<select aria-label="Animation speed" disabled={!current?.animated} value={current?.speed??1} onChange={e=>current?.dispatch('speed',Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option></select></label><label className="coach-control">Inspect this action<input aria-label="Action progress" type="range" min={0} max={100} step={1} disabled={!current?.animated} defaultValue={(current?.progress??0)*100} onInput={e=>current?.dispatch('seek',Number(e.currentTarget.value)/100)}/></label><button disabled={!current?.available} onClick={()=>current?.dispatch('reset')}>Reset camera</button><p>Left/Right browse actions without confirming them. Alt+R replays. Space plays or pauses when the viewer has focus. Reduced-motion users start paused.</p><p>Closing a panel leaves playback paused. Press Play to continue.</p></>}
  </dialog>
 </div>;
}
