import {describe,it,expect} from 'vitest';
import {Box3,Vector3} from 'three';
import {approachFor,approachIsClear,checkedApproach} from './placement';
import evidence from '../../../config/placement-30669-alt-02-v3.json';
import type {SceneManifest,StepSnapshot} from './contracts';
const box=(lo:number[],hi:number[])=>new Box3(new Vector3(...lo),new Vector3(...hi));
describe('source-aware placement paths',()=>{
  const red=box([-20,-8,-40],[20,4,40]),wing=box([-60,0,-30],[60,12,30]);
  it('allows an underside approach only into the final contact envelope',()=>{
    expect(approachIsClear([red],[wing],new Vector3(0,-60,0))).toBe(true);
    expect(approachIsClear([red],[wing],new Vector3(0,60,0))).toBe(false);
  });
  it('rejects an obstacle between start and finish even when endpoints are clear',()=>{
    const end=box([-5,0,-5],[5,8,5]),barrier=box([-20,25,-20],[20,30,20]);
    expect(approachIsClear([end],[barrier],new Vector3(0,60,0))).toBe(false);
    expect(checkedApproach({mode:'translate',offset:new Vector3(0,60,0),reason:'above'},[end],[barrier]).mode).toBe('highlight');
  });
  it('rejects unsupported diagonal travel instead of guessing a path',()=>{
    expect(approachIsClear([red],[],new Vector3(10,60,0))).toBe(false);
  });
  it('pins authored instructions 5, 8 and 9 to underside approaches',()=>{
    const scene={revision:evidence.revision,source_sha256:evidence.source_sha256} as SceneManifest;
    for(const id of ['main-03-attach','main-04-attach','main-05']){
      const item=evidence.steps.find(s=>s.step_id===id)!;
      const step={step_id:id,source:item.source,active_instance_ids:item.instance_ids} as StepSnapshot;
      const plan=approachFor(scene,step);expect(plan.mode).toBe('translate');expect(plan.offset.y).toBe(-60);
      expect(approachFor({...scene,revision:'corrected-unreviewed'},step).mode).toBe('highlight');
      expect(approachFor(scene,{...step,active_instance_ids:['unknown']}).mode).toBe('highlight');
    }
  });
  it('rejects the whole moving group when one member has an obstruction',()=>{
    const left=box([-30,0,-5],[-20,8,5]),right=box([20,0,-5],[30,8,5]);
    const barrier=box([15,25,-10],[35,30,10]);const offset=new Vector3(0,60,0);
    expect(approachIsClear([left],[barrier],offset)).toBe(true);
    expect(checkedApproach({mode:'translate',offset,reason:'above'},[left,right],[barrier]).mode).toBe('highlight');
  });
});
