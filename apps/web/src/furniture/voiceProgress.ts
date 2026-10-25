import type {CoachAction,CoachProgress} from './coachContracts';
import type {VoiceProgressControl} from './voiceContext';
export type VoiceProgressResult={ok:true;progress:CoachProgress;message:string;physical_completion_changed:boolean;confirmation_recorded:boolean}|{ok:false;error:string};
export const sameProgress=(a:CoachProgress,b:CoachProgress)=>a.viewedActionId===b.viewedActionId&&a.checks.length===b.checks.length&&a.checks.every((v,i)=>v===b.checks[i])&&a.confirmedActionIds.length===b.confirmedActionIds.length&&a.confirmedActionIds.every((v,i)=>v===b.confirmedActionIds[i]);
/** Only explicit validated user statements reach this reducer. No inferred completion. */
export function applyVoiceProgress(actions:CoachAction[],previous:CoachProgress,args:VoiceProgressControl):VoiceProgressResult{
 const index=actions.findIndex(a=>a.id===previous.viewedActionId),action=actions[index];if(!action)return {ok:false,error:'The current action is unavailable.'};
 const next:CoachProgress={viewedActionId:previous.viewedActionId,confirmedActionIds:[...previous.confirmedActionIds],checks:[...previous.checks]};
 if(args.command==='report_completed_legs'){
  const add=args.legs.flatMap(n=>[`screw-${n}`,`leg-${n}`]);if(add.some(id=>!actions.some(a=>a.id===id)))return {ok:false,error:'A reported leg is not in this tutorial.'};
  next.confirmedActionIds=[...new Set([...next.confirmedActionIds,...add])];
  if(args.advance){const missing=[1,2,3,4].find(n=>!next.confirmedActionIds.includes(`screw-${n}`)||!next.confirmedActionIds.includes(`leg-${n}`));const target=missing?(next.confirmedActionIds.includes(`screw-${missing}`)?`leg-${missing}`:`screw-${missing}`):actions.find(a=>a.kind==='finish')?.id;if(target)next.viewedActionId=target;}
  return {ok:true,progress:next,message:`Recorded your report: ${args.legs.length===1?'leg':'legs'} ${args.legs.join(', ')} assembled. Preparation and final checks are unchanged.`,confirmation_recorded:next.confirmedActionIds.length>previous.confirmedActionIds.length,physical_completion_changed:next.confirmedActionIds.length!==previous.confirmedActionIds.length};
 }
 if(args.action_id!==action.id)return {ok:false,error:'Stale action: confirm or check only the action currently shown.'};
 if(args.command==='set_checklist'){
  if(!action.checks.length)return {ok:false,error:'This action has no checklist.'};
  const ids=action.checks.map((_,i)=>`${action.id}:${i}`);
  next.checks=args.checked?[...new Set([...next.checks,...ids])]:next.checks.filter(id=>!ids.includes(id));
  if(!args.checked)next.confirmedActionIds=next.confirmedActionIds.filter(id=>id!==action.id);
  return {ok:true,progress:next,message:`${args.checked?'Checked':'Cleared'} the checklist for “${action.title}” from your statement.${args.checked?' The action still needs confirmation.':''}`,confirmation_recorded:false,physical_completion_changed:!args.checked&&previous.confirmedActionIds.includes(action.id)};
 }
 const missing=action.kind==='finish'?actions.slice(0,index).find(a=>!next.confirmedActionIds.includes(a.id)):null;
 if(missing){next.viewedActionId=missing.id;return {ok:true,progress:next,message:`Final checks were not confirmed. Complete “${missing.title}” first.`,confirmation_recorded:false,physical_completion_changed:false};}
 if(args.command==='hands_free_done'&&action.checks.length){
  if(!args.checks_confirmed)return {ok:false,error:'Read and confirm every listed check before saying done for this checklist action.'};
  next.checks=[...new Set([...next.checks,...action.checks.map((_,i)=>`${action.id}:${i}`)])];
 }
 if(action.checks.some((_,i)=>!next.checks.includes(`${action.id}:${i}`)))return {ok:false,error:'Complete the visible checklist before confirming this action. Confirmation does not tick checks.'};
 next.confirmedActionIds=[...new Set([...next.confirmedActionIds,action.id])];if(args.command==='hands_free_done'){
  const unconfirmed=(a:CoachAction)=>!next.confirmedActionIds.includes(a.id);
  const target=actions.slice(index+1).find(a=>a.kind!=='finish'&&unconfirmed(a))??actions.find(a=>a.kind!=='finish'&&unconfirmed(a))??actions.find(unconfirmed);
  if(target)next.viewedActionId=target.id;
 }else if(args.advance)next.viewedActionId=actions[Math.min(actions.length-1,index+1)].id;
 return {ok:true,progress:next,message:previous.confirmedActionIds.includes(action.id)?`Already confirmed: “${action.title}”. No additional confirmation was recorded.`:`Recorded your confirmation: “${action.title}”.`,confirmation_recorded:!previous.confirmedActionIds.includes(action.id),physical_completion_changed:!previous.confirmedActionIds.includes(action.id)};
}
