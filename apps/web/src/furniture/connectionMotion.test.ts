import {describe, expect, it} from 'vitest';
import {sampleConnection} from './connectionMotion';
describe('source-derived illustrative connection motion', () => {
  it('inserts the screw before lowering the leg onto it', () => {
    const screwSeated=sampleConnection(.45), legApproaching=sampleConnection(.65), end=sampleConnection(1);
    expect(screwSeated.screwY).toBe(32);
    expect(screwSeated.legY).toBe(230);
    expect(legApproaching.legY-55).toBeGreaterThan(screwSeated.screwY+30);
    expect(end.legY-55).toBe(30);
    expect(end.screwY).toBe(screwSeated.screwY);
  });
  it('seeking and replay always reconstruct identical poses without accumulated rotation', () => {
    const original=sampleConnection(.8);
    sampleConnection(1); sampleConnection(.1); sampleConnection(.6);
    expect(sampleConnection(.8)).toEqual(original);
    expect(sampleConnection(0).legRotation).toBe(0);
    expect(sampleConnection(0).screwRotation).toBe(0);
    expect(Object.isFrozen(original)).toBe(true);
  });
  it('clamps timeline boundaries and non-finite input safely', () => {
    expect(sampleConnection(-1)).toEqual(sampleConnection(0));
    expect(sampleConnection(2)).toEqual(sampleConnection(1));
    expect(sampleConnection(NaN)).toEqual(sampleConnection(0));
  });
  it('changes instructional phases at the authored boundaries', () => {
    expect([0,.2,.5,.7,1].map(t=>sampleConnection(t).phase)).toEqual(['align-screw','insert-screw','align-leg','turn-leg','seated']);
  });
});
