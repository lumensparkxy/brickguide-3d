import {FULL_TABLE_DURATION,sampleFullTable} from './fullTableMotion';
export interface CoachSceneAction {
 id:string; kind:'prepare'|'identify'|'screw'|'leg'|'finish';
 component_instances:string[]; animation:{start:number;end:number}|null;
}
export const clampProgress=(value:number)=>Number.isFinite(value)?Math.min(1,Math.max(0,value)):0;
export function sampleCoachAction(action:CoachSceneAction,value:number){
 const progress=clampProgress(value),segment=action.animation;
 const globalProgress=segment?segment.start+(segment.end-segment.start)*progress:action.kind==='finish'?1:0;
 const snapshot=sampleFullTable(globalProgress);
 const connection=segment?Math.min(4,Math.floor(segment.start*4+1e-8)+1):0;
 const parts=snapshot.parts.map((part,index)=>{
  const previous=index<connection-1,current=index===connection-1;
  const complete=action.kind==='finish';
  return Object.freeze({...part,
   legVisible:complete||previous||(current&&action.kind==='leg'),
   screwVisible:!complete&&current&&(action.kind==='screw'||action.kind==='leg'&&!part.seated),
  });
 });
 return Object.freeze({progress,globalProgress,connection,parts:Object.freeze(parts),
  completed:action.kind==='finish'?4:parts.filter(p=>p.legVisible&&p.seated).length,
  duration:segment?Math.max(.1,(segment.end-segment.start)*FULL_TABLE_DURATION):0});
}
