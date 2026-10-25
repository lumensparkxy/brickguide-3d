import {useEffect,useState} from 'react';
import type {ViewerController} from './viewerController';
export default function ViewerControls({controller}:{controller:ViewerController|null}){
 const animated=!!controller?.animated,available=!!controller?.available,full=controller?.mode==='full';
 const playName=full?'full assembly':'animation';
 const [progress,setProgress]=useState(controller?.progress??0),[speed,setSpeed]=useState(controller?.speed??1);
 useEffect(()=>{setProgress(controller?.progress??0);},[controller?.progress,controller?.mode]);
 useEffect(()=>{setSpeed(controller?.speed??1);},[controller?.speed,controller?.mode]);
 const seek=(value:number)=>{setProgress(value);controller?.dispatch('seek',value);};
 const changeSpeed=(value:number)=>{setSpeed(value);controller?.dispatch('speed',value);};
 return <div className="stable-viewer-controls" aria-label="Viewer playback controls">
  <div className="stable-viewer-buttons">
   <button disabled={!available||!animated} aria-label={`${controller?.playing?'Pause':'Play'} ${playName}`} onClick={()=>controller?.dispatch('toggle')}>{controller?.playing?'Pause':'Play'}</button>
   <button disabled={!available||!animated} aria-label={full?'Replay full assembly':'Replay animation'} onClick={()=>controller?.dispatch('replay')}>Replay</button>
   <button disabled={!available} aria-label="Reset view" onClick={()=>controller?.dispatch('reset')}>Reset view</button>
   <label><span>Speed</span><select aria-label={full?'Full assembly speed':'Animation speed'} disabled={!available||!animated} value={speed} onChange={e=>changeSpeed(Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option></select></label>
  </div>
  <div className="stable-viewer-timeline"><input type="range" min="0" max="100" step=".1" aria-label={full?'Full assembly progress':'Assembly animation progress'} value={progress*100} disabled={!available||!animated} onChange={e=>seek(Number(e.target.value)/100)}/><output>{animated?`${Math.round(progress*100)}%`:'Static view'}</output></div>
 </div>;
}
