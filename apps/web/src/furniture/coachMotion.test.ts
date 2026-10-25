import {describe,it,expect} from 'vitest';
import {sampleCoachAction,type CoachSceneAction} from './coachMotion';
const action=(corner:number,kind:'screw'|'leg'):CoachSceneAction=>({id:`${kind}-${corner+1}`,kind,component_instances:[`${kind}-${corner+1}`],animation:{start:(corner+(kind==='leg'?.44:0))/4,end:(corner+(kind==='leg'?1:.44))/4}});
describe('coach action snapshots',()=>{
 for(let i=0;i<4;i++){
  it(`holds screw ${i+1} without introducing its leg`,()=>{const s=sampleCoachAction(action(i,'screw'),1);expect(s.parts.filter(p=>p.legVisible)).toHaveLength(i);expect(s.parts.filter(p=>p.screwVisible).map(p=>p.id)).toEqual([i+1]);expect(s.parts[i].screwY).toBe(45);});
  it(`seats leg ${i+1} without introducing another screw`,()=>{const s=sampleCoachAction(action(i,'leg'),1);expect(s.completed).toBe(i+1);expect(s.parts.filter(p=>p.screwVisible)).toHaveLength(0);expect(s.parts[i].legY).toBe(247.5);expect(s.parts.filter(p=>p.legVisible)).toHaveLength(i+1);});
 }
 it('restores deterministic immutable poses when seeking backwards',()=>{const a=action(2,'leg'),first=sampleCoachAction(a,.27);sampleCoachAction(a,1);expect(sampleCoachAction(a,.27)).toEqual(first);expect(Object.isFrozen(first.parts[0])).toBe(true);});
 it('keeps preparation empty and finish complete',()=>{for(const kind of ['prepare','finish'] as const){const s=sampleCoachAction({id:kind,kind,component_instances:[],animation:null},0);expect(s.parts.filter(p=>p.legVisible)).toHaveLength(kind==='finish'?4:0);expect(s.parts.filter(p=>p.screwVisible)).toHaveLength(0);}});
});
