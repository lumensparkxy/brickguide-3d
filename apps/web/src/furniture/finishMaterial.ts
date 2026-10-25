import * as THREE from 'three';

/** An instructional approximation, not a calibrated reproduction of IKEA finishes. */
export interface FurnitureFinishAppearance {id:string;name:string;base_color:string;wood_effect:boolean}
export const WHITE_FINISH:FurnitureFinishAppearance={id:'white',name:'White',base_color:'#f5f5f3',wood_effect:false};
export function finishTexture(finish:FurnitureFinishAppearance):THREE.CanvasTexture|null{
 if(!finish.wood_effect)return null;
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);
 // Deterministic, low-contrast grain. No external photography or geometry assets.
 for(let x=0;x<256;x+=2){ctx.strokeStyle=`rgba(60,48,32,${.025+(Math.sin(x*1.79)+1)*.018})`;ctx.lineWidth=1;ctx.beginPath();for(let y=0;y<=256;y+=8){const px=x+Math.sin(y*.025+x*.2)*2;if(!y)ctx.moveTo(px,y);else ctx.lineTo(px,y);}ctx.stroke();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;return texture;
}
