import {useEffect,useRef,useState} from 'react';

/** Registered character frames, driven by output audio rather than microphone input. */
export function nandiFrame(time:number,level:number,reduced=false){
 if(reduced)return 0;
 if(level>.025)return level>.12?8:7;
 const t=time%14000;
 if(t>=2600&&t<2920)return t<2680||t>=2840?1:2;
 if(t>=11200&&t<11440)return t<11260||t>=11380?1:2;
 if(t>=5300&&t<6100)return Math.floor((t-5300)/200)%2?4:3;
 if(t>=8400&&t<9600)return Math.floor((t-8400)/200)%2?6:5;
 return 0;
}
const expression=['rest','blink-half','blink','ears-up','ears-down','tail-out','tail-in','mouth-small','mouth-open'];
export default function NandiPet({getAudioLevel,paused=false}:{getAudioLevel:()=>number;paused?:boolean}){
 const latest=useRef({getAudioLevel,paused});latest.current={getAudioLevel,paused};
 const [frame,setFrame]=useState(0),[loaded,setLoaded]=useState(false);
 useEffect(()=>{let active=true;const atlas=new Image();atlas.onload=()=>{if(active)setLoaded(true);};atlas.src='/images/nandi/expressions.png';return()=>{active=false;};},[]);
 useEffect(()=>{const motion=matchMedia('(prefers-reduced-motion: reduce)');let start=performance.now();
  const update=()=>setFrame(document.hidden||latest.current.paused?0:nandiFrame(performance.now()-start,latest.current.getAudioLevel(),motion.matches));
  const visibility=()=>{start=performance.now();update();};motion.addEventListener('change',update);document.addEventListener('visibilitychange',visibility);const timer=setInterval(update,80);
  return()=>{clearInterval(timer);motion.removeEventListener('change',update);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 return <span className="voice-face nandi-pocket nandi-pet" data-testid="nandi-pet" data-ready={loaded} data-frame={loaded?frame:0} data-expression={loaded?expression[frame]:'rest'} aria-hidden="true" style={loaded?{backgroundImage:'url(/images/nandi/expressions.png)',backgroundSize:'300% 300%',backgroundPosition:`${frame%3*50}% ${Math.floor(frame/3)*50}%`}:{backgroundImage:'url(/images/nandi/pocket.png)',backgroundSize:'contain',backgroundPosition:'center'}}/>;
}
