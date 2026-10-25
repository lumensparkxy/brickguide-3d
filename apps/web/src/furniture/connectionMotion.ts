/** Authored explanatory motion, not measured screw pitch, insertion depth or turn count. */
export const CONNECTION_DURATION = 14;
export type ConnectionPhase = 'align-screw' | 'insert-screw' | 'align-leg' | 'turn-leg' | 'seated';
export const phaseCopy: Record<ConnectionPhase, {title: string; detail: string; component: string}> = {
  'align-screw': {title: '1 · Align the screw', detail: 'Bring screw 115980 to the tabletop attachment point.', component: 'screws'},
  'insert-screw': {title: '2 · Turn the screw into the tabletop', detail: 'Leave the other end available for the leg, as shown in the official diagram.', component: 'screws'},
  'align-leg': {title: '3 · Align the leg', detail: 'Bring the leg over the exposed end of the same screw.', component: 'legs'},
  'turn-leg': {title: '4 · Turn the leg onto the screw', detail: 'The curved arrows in the guide show a turning action.', component: 'legs'},
  seated: {title: 'Connection shown', detail: 'Repeat this connection for the other legs. Check the official diagram and actual fastenings.', component: 'legs'},
};
const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
export function sampleConnection(progress: number) {
  const t = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const alignScrew = smooth(t / .17);
  const insertScrew = smooth((t - .17) / .25);
  const alignLeg = smooth((t - .45) / .2);
  const turnLeg = smooth((t - .65) / .29);
  const phase: ConnectionPhase = t < .17 ? 'align-screw' : t < .45 ? 'insert-screw' : t < .65 ? 'align-leg' : t < .94 ? 'turn-leg' : 'seated';
  return Object.freeze({progress: t, phase,
    screwY: 105 - 25 * alignScrew - 48 * insertScrew,
    screwRotation: -Math.PI * 4 * insertScrew || 0,
    legX: 95 * (1 - alignLeg),
    legY: 230 - 85 * alignLeg - 60 * turnLeg,
    legRotation: -Math.PI * 3 * turnLeg || 0,
    // The leg is a 110 mm illustrative section. Bottom meets the 30 mm tabletop top.
    legOpacity: t < .42 ? .17 : 1,
    arrowVisible: phase === 'insert-screw' || phase === 'turn-leg',
  });
}
