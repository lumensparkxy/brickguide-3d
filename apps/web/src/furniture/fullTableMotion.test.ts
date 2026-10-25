import {describe,it,expect} from 'vitest';
import {sampleFullTable} from './fullTableMotion';
describe('full table motion',()=>{
 it('introduces exactly four persistent connections cumulatively',()=>{
  for(let i=0;i<4;i++){const p=sampleFullTable(i/4);expect(p.connection).toBe(i+1);expect(p.completed).toBe(i);expect(p.parts.filter(x=>x.introduced)).toHaveLength(i+1);}
  const end=sampleFullTable(1);expect(end.completed).toBe(4);expect(end.parts.every(x=>x.legVisible&&!x.screwVisible&&x.legY===247.5)).toBe(true);
 });
 it('moves only the active connection and preserves preceding seated poses',()=>{
  const a=sampleFullTable(.2),b=sampleFullTable(.45);expect(a.parts[0].legY).not.toBe(b.parts[0].legY);
  const before=sampleFullTable(.3).parts[0],after=sampleFullTable(.9).parts[0];expect(before).toEqual(after);
 });
 it('seeks deterministically and clamps invalid inputs',()=>{
  const p=sampleFullTable(.72);sampleFullTable(1);sampleFullTable(0);expect(sampleFullTable(.72)).toEqual(p);
  expect(sampleFullTable(NaN)).toEqual(sampleFullTable(0));expect(sampleFullTable(-2)).toEqual(sampleFullTable(0));expect(sampleFullTable(9)).toEqual(sampleFullTable(1));expect(Object.isFrozen(p.parts)).toBe(true);
 });
});
