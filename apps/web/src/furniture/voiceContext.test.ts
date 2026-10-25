import {describe,it,expect} from 'vitest';
import {parseVoiceControl,voiceContext} from './voiceContext';
import type {FurnitureTutorial} from './contracts';
const actions=Array.from({length:4},(_,i)=>['screw','leg'].map(kind=>({id:`${kind}-${i+1}`,kind,title:kind,instruction:'Authored',component_instances:[`${kind}-${i+1}`],animation:{start:(i+(kind==='leg'?.44:0))/4,end:(i+(kind==='leg'?1:.44))/4},source:{document_id:'official',page_index:2},warnings:[],checks:[],help:[]}))).flat();
const tutorial={revision:'test',warnings:[],product:{documents:[{id:'official',title:'Assembly',url:'https://www.ikea.com/guide.pdf'}]},coach_actions:actions} as unknown as FurnitureTutorial;
describe('voice control boundaries and scene context',()=>{
 it('rejects unsafe commands, fractional and out of range steps, coercion and extra fields',()=>{for(const args of [null,{command:'done'},{command:'go_to_step',step:0},{command:'go_to_step',step:12},{command:'go_to_step',step:3.2},{command:'go_to_step',step:'3'},{command:'next',step:3},{command:'play',script:'x'}])expect(parseVoiceControl(args)).toBeNull();expect(parseVoiceControl({command:'go_to_step',step:3})).toEqual({command:'go_to_step',step:3});});
 it('derives clockwise animation for all eight connections from deterministic motion',()=>{for(let i=0;i<8;i++){const c=voiceContext(tutorial,i,'guided',null,null);expect(c.animation?.direction).toBe('clockwise');expect(c.animation?.viewpoint).toContain('toward the tabletop');expect(c.source.page_number).toBe(3);expect(c.screen.available).toBe(false);}});
});
