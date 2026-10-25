import type {FurnitureTutorial} from './contracts';
import type {ViewerController} from './viewerController';
import {sampleCoachAction} from './coachMotion';
import type {CoachProgress} from './coachContracts';

export const voiceCommands=['go_to_step','next','previous','play','pause','replay','whole_table','look_closer','official_diagram','close_panel','get_context','report_completed_legs','set_checklist','confirm_current','hands_free_done'] as const;
export type VoiceCommand=typeof voiceCommands[number];
export type VoiceProgressControl=
 |{command:'report_completed_legs';legs:number[];user_statement:string;advance:boolean}
 |{command:'set_checklist';action_id:string;checked:boolean;user_statement:string}
 |{command:'hands_free_done';action_id:string;user_statement:string;checks_confirmed:boolean}
 |{command:'confirm_current';action_id:string;user_statement:string;advance:boolean};
export type VoiceControl=VoiceProgressControl|{command:Exclude<VoiceCommand,VoiceProgressControl['command']>;step?:number};
export function parseVoiceControl(raw:unknown):VoiceControl|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const a=raw as Record<string,unknown>;
 if(!voiceCommands.includes(a.command as VoiceCommand))return null;
 const exact=(keys:string[])=>Object.keys(a).length===keys.length&&Object.keys(a).every(k=>keys.includes(k));
 const statement=()=>typeof a.user_statement==='string'&&a.user_statement.trim().length>0&&a.user_statement.length<=500;
 const target=()=>typeof a.action_id==='string'&&a.action_id.trim().length>0&&a.action_id.length<=100;
 if(a.command==='report_completed_legs'){
  if(!exact(['command','legs','user_statement','advance'])||!statement()||typeof a.advance!=='boolean'||!Array.isArray(a.legs)||a.legs.length<1||a.legs.length>4||a.legs.some(n=>!Number.isInteger(n)||n<1||n>4)||new Set(a.legs).size!==a.legs.length)return null;
  return {command:a.command,legs:[...a.legs],user_statement:a.user_statement as string,advance:a.advance};
 }
 if(a.command==='set_checklist'){
  if(!exact(['command','action_id','checked','user_statement'])||!target()||!statement()||typeof a.checked!=='boolean')return null;
  return {command:a.command,action_id:a.action_id as string,checked:a.checked,user_statement:a.user_statement as string};
 }
 if(a.command==='hands_free_done'){
  if(!exact(['command','action_id','user_statement','checks_confirmed'])||!target()||!statement()||typeof a.checks_confirmed!=='boolean')return null;
  return {command:a.command,action_id:a.action_id as string,user_statement:a.user_statement as string,checks_confirmed:a.checks_confirmed};
 }
 if(a.command==='confirm_current'){
  if(!exact(['command','action_id','user_statement','advance'])||!target()||!statement()||typeof a.advance!=='boolean')return null;
  return {command:a.command,action_id:a.action_id as string,user_statement:a.user_statement as string,advance:a.advance};
 }
 if(a.command==='go_to_step'){
  if(!exact(['command','step'])||!Number.isInteger(a.step)||Number(a.step)<1||Number(a.step)>11)return null;
  return {command:a.command,step:Number(a.step)};
 }
 if(!exact(['command']))return null;
 return {command:a.command as Exclude<VoiceCommand,VoiceProgressControl['command']>};
}
export function voiceContext(t:FurnitureTutorial,index:number,view:string,panel:string|null,controller:ViewerController|null,progress?:CoachProgress){
 const actions=t.coach_actions!,a=actions[index];
 const start=sampleCoachAction(a,0),end=sampleCoachAction(a,1);
 const active=Math.max(0,start.connection-1),key=a.kind==='leg'?'legRotation':'screwRotation';
 const delta=end.parts[active][key]-start.parts[active][key];
 return {product:{article_number:t.product.article_number,name:t.product.name,variant:t.product.variant,finish:t.product.finish,product_url:t.product.product_url},revision:t.revision,step:index+1,total_steps:actions.length,action_id:a.id,title:a.title,
  progress:{all_actions_confirmed:actions.every(v=>progress?.confirmedActionIds.includes(v.id)),viewed_action_id:progress?.viewedActionId??a.id,confirmed_action_ids:progress?.confirmedActionIds??[],checked_ids:progress?.checks??[],confirmed_count:progress?.confirmedActionIds.length??0,current_action_confirmed:progress?.confirmedActionIds.includes(a.id)??false,checks:a.checks.map((text,i)=>({id:`${a.id}:${i}`,text,checked:progress?.checks.includes(`${a.id}:${i}`)??false})),first_missing_prior_action_id:a.kind==='finish'?actions.slice(0,index).find(v=>!progress?.confirmedActionIds.includes(v.id))?.id??null:null,meaning:'User-reported progress, not human review or verified physical assembly.'},
  instruction:a.instruction,components:a.component_instances,help:a.help,warnings:[...t.warnings,...a.warnings],
  action_order:actions.map((v,i)=>({step:i+1,id:v.id,title:v.title})),
  animation_reference:actions.filter(v=>v.animation).map(v=>{const begin=sampleCoachAction(v,0),finish=sampleCoachAction(v,1),i=begin.connection-1,k=v.kind==='leg'?'legRotation':'screwRotation';return {action_id:v.id,direction:finish.parts[i][k]<begin.parts[i][k]?'clockwise':'anticlockwise',viewpoint:'From free end toward tabletop underside; schematic, not physical turn count'};}),
  source:{...a.source,page_number:a.source.page_index==null?null:a.source.page_index+1,document:t.product.documents.find(d=>d.id===a.source.document_id),meaning:'Official diagram reference; authored instruction/help describe it. Image pixels are not streamed.'},
  screen:{view,open_panel:panel,table_orientation:a.kind==='finish'?'upright':'underside up',available:controller?.available??false,playing:controller?.playing??false,progress:controller?.progress??0},
  animation:a.animation?{component:a.kind,direction:delta<0?'clockwise':delta>0?'anticlockwise':'none',viewpoint:'Looking from the free end of the screw or leg down its axis toward the tabletop underside (+Y toward -Y). Opposite viewpoints reverse apparent direction.',meaning:'Authored schematic animation, not a prescribed number of physical turns, pitch, torque or insertion depth.'}:null,
  limits:'Structured portal state, not live screen pixels or camera vision. Do not claim to inspect the physical table. Only the user confirms physical work.'};
}
