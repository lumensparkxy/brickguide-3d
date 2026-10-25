import {parseFurnitureSource,type FurnitureSource,type FurnitureTutorial} from './contracts';
export interface CoachAction {id:string;kind:'prepare'|'identify'|'screw'|'leg'|'finish';title:string;instruction:string;component_instances:string[];animation:{start:number;end:number}|null;source:FurnitureSource;confirmation_label:string;help:{question:string;answer:string}[];warnings:string[];checks:string[]}
export interface CoachProgress {viewedActionId:string;confirmedActionIds:string[];checks:string[]}
export function parseCoachActions(value:unknown,t:Pick<FurnitureTutorial,'product'>):CoachAction[]{
 if(value==null)return [];if(!Array.isArray(value))throw Error('Invalid coach actions.');
 const text=(v:unknown)=>{if(typeof v!=='string'||!v.trim())throw Error('Incomplete coach action.');return v;};
 const texts=(v:unknown)=>{if(!Array.isArray(v))throw Error('Invalid coach list.');return v.map(text);};
 const ids=new Set(['tabletop',...Array.from({length:4},(_,i)=>`leg-${i+1}`),...Array.from({length:4},(_,i)=>`screw-${i+1}`)]);
 const result=value.map(raw=>{if(!raw||typeof raw!=='object')throw Error('Invalid coach action.');const a=raw as CoachAction;
 if(!['prepare','identify','screw','leg','finish'].includes(a.kind))throw Error('Unknown coach action.');
 const source=parseFurnitureSource(a.source,t.product);
 const instances=texts(a.component_instances);if(instances.some(id=>!ids.has(id)))throw Error('Unknown part instance.');
 let animation=null;if(a.animation!=null){const {start,end}=a.animation;if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>1||start>=end)throw Error('Invalid motion segment.');animation={start,end};}
 if((a.kind==='screw'||a.kind==='leg')!==!!animation)throw Error('Missing or unexpected motion segment.');
 if(!Array.isArray(a.help))throw Error('Invalid action help.');
 return {id:text(a.id),kind:a.kind,title:text(a.title),instruction:text(a.instruction),component_instances:instances,animation,source,confirmation_label:text(a.confirmation_label),help:a.help.map(h=>({question:text(h.question),answer:text(h.answer)})),warnings:texts(a.warnings),checks:texts(a.checks)};
 });
 if(new Set(result.map(a=>a.id)).size!==result.length)throw Error('Duplicate coach actions.');return result;
}
export function coachProgressKey(t:FurnitureTutorial){return `furniture:coach:v2:${t.product.article_number}:${t.source_sha256}:${t.revision}`;}
export function readCoachProgress(t:FurnitureTutorial):CoachProgress{
 const actions=t.coach_actions??[];const blank={viewedActionId:actions[0]?.id??'',confirmedActionIds:[],checks:[]};
 try{const raw=JSON.parse(localStorage.getItem(coachProgressKey(t))??'null');if(!raw||typeof raw!=='object')return blank;const ids=new Set(actions.map(a=>a.id));return {viewedActionId:ids.has(raw.viewedActionId)?raw.viewedActionId:blank.viewedActionId,confirmedActionIds:Array.isArray(raw.confirmedActionIds)?[...new Set<string>(raw.confirmedActionIds.filter((id:unknown)=>typeof id==='string'&&ids.has(id)))]:[],checks:Array.isArray(raw.checks)?raw.checks.filter((id:unknown)=>typeof id==='string'&&actions.some(a=>a.checks.some((_,i)=>`${a.id}:${i}`===id))):[]};}catch{return blank;}
}
export function saveCoachProgress(t:FurnitureTutorial,p:CoachProgress){try{localStorage.setItem(coachProgressKey(t),JSON.stringify(p));return true;}catch{return false;}}
