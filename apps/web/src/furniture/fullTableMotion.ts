/** Schematic repeated connection sequence; turns and travel are illustrative. */
export const FULL_TABLE_DURATION = 48;
export type FullPhase = 'align-screw'|'turn-screw'|'align-leg'|'turn-leg'|'complete';
export const CORNERS = Object.freeze([[-235,235],[235,235],[235,-235],[-235,-235]] as const);
const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
export function sampleFullTable(value:number){
  const progress=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
  const connection=Math.min(3,Math.floor(progress*4));
  const local=progress===1?1:progress*4-connection;
  const phase:FullPhase=progress===1?'complete':local<.18?'align-screw':local<.44?'turn-screw':local<.65?'align-leg':'turn-leg';
  const parts=CORNERS.map(([x,z],index)=>{
    const t=index<connection?1:index===connection?local:0;
    const introduced=index<=connection;
    const screwIn=smooth((t-.18)/.23),legAlign=smooth((t-.44)/.21),legTurn=smooth((t-.65)/.3);
    return Object.freeze({id:index+1,x,z,introduced,seated:t>=.95,
      screwY:125-25*smooth(t/.18)-55*screwIn,screwRotation:-Math.PI*4*screwIn,
      legX:x+Math.sign(x)*95*(1-legAlign),legY:610-240*legAlign-122.5*legTurn,
      legRotation:-Math.PI*4*legTurn,legVisible:introduced&&t>=.44,
      screwVisible:introduced&&t<.95});
  });
  return Object.freeze({progress,connection:connection+1,local,phase,completed:parts.filter(p=>p.seated).length,parts:Object.freeze(parts)});
}
