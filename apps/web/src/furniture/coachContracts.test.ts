import {afterEach,describe,expect,it,vi} from 'vitest';
import {parseTutorial,progressKey} from './contracts';
import {coachProgressKey,readCoachProgress,saveCoachProgress} from './coachContracts';
import source from '../../../../config/furniture/lack-30449908.json';
afterEach(()=>vi.unstubAllGlobals());
describe('coach confirmation storage',()=>{
 const t=parseTutorial(source);
 it('does not convert legacy viewing progress into confirmations',()=>{vi.stubGlobal('localStorage',{getItem:(key:string)=>key===progressKey(t)?'"finish"':null});expect(readCoachProgress(t)).toEqual({viewedActionId:'prepare',confirmedActionIds:[],checks:[]});expect(coachProgressKey(t)).not.toBe(progressKey(t));});
 it('keeps viewing separate from confirmation and isolates tutorial revisions',()=>{const data=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)});saveCoachProgress(t,{viewedActionId:'leg-4',confirmedActionIds:['prepare'],checks:['prepare:0']});expect(readCoachProgress(t).confirmedActionIds).toEqual(['prepare']);expect(readCoachProgress({...t,revision:'future'}).confirmedActionIds).toEqual([]);});
 it('recovers from malformed and blocked storage',()=>{vi.stubGlobal('localStorage',{getItem:()=>'{bad',setItem:()=>{throw Error('blocked');}});expect(readCoachProgress(t).viewedActionId).toBe('prepare');expect(saveCoachProgress(t,{viewedActionId:'prepare',confirmedActionIds:[],checks:[]})).toBe(false);});
 it('filters unknown actions and checks without inventing completion',()=>{vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({viewedActionId:'deleted',confirmedActionIds:['screw-1','deleted','screw-1'],checks:['deleted:0']})});expect(readCoachProgress(t)).toEqual({viewedActionId:'prepare',confirmedActionIds:['screw-1'],checks:[]});});
 it('rejects unsupported component, source and animation claims',()=>{for(const patch of [{component_instances:['made-up']},{source:{document_id:'unknown',page_index:0}},{animation:{start:.9,end:.2}}])expect(()=>parseTutorial({...source,coach_actions:[{...source.coach_actions[2],...patch}]})).toThrow();});
});
