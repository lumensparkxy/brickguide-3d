import {describe,it,expect} from 'vitest';
import {nandiFrame} from './NandiPet';
describe('Nandi expression choreography',()=>{
 it('blinks, perks ears and swishes its tail between rests',()=>{expect([0,2650,2750,2870,3100,5400,5600,8500,8700,10000].map(t=>nandiFrame(t,0))).toEqual([0,1,2,1,0,3,4,5,6,0]);});
 it('uses playback energy for mouth openness and returns to rest in silence',()=>{expect(nandiFrame(0,.1)).toBe(7);expect(nandiFrame(0,.7)).toBe(8);expect(nandiFrame(0,0)).toBe(0);});
 it('keeps all facial motion still for reduced motion',()=>{for(const t of [0,2700,5400,8600])for(const volume of [0,.1,.8])expect(nandiFrame(t,volume,true)).toBe(0);});
});
