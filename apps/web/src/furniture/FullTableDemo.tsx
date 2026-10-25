import {finishTexture,WHITE_FINISH,type FurnitureFinishAppearance} from './finishMaterial';
import {useCallback,useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {CORNERS,FULL_TABLE_DURATION,sampleFullTable} from './fullTableMotion';
import './fullTable.css';
import type {ControlledViewerProps,ViewerAction} from './viewerController';
interface Props extends ControlledViewerProps {finish?:FurnitureFinishAppearance;replay:number;selectedComponent?:string|null;onSelectComponent?:(id:string)=>void;visible?:boolean;initialFinished?:boolean}
export default function FullTableDemo({finish=WHITE_FINISH,replay,selectedComponent,onSelectComponent,visible=true,initialFinished=false,onController}:Props){
 const host=useRef<HTMLDivElement>(null),seenReplay=useRef(replay);
 const markerLines=useRef<Record<number,SVGLineElement|null>>({});
 const [progress,setProgress]=useState(initialFinished?1:0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[upright,setUpright]=useState(initialFinished),[error,setError]=useState('');
 const state=useRef({progress:initialFinished?1:0,playing:false,speed:1,upright:initialFinished});
 const selected=useRef(selectedComponent);selected.current=selectedComponent;const shown=useRef(visible);shown.current=visible;
 const command=useRef<(action:string,value?:number)=>void>(()=>{}),redraw=useRef(()=>{});
 const pose=sampleFullTable(progress);
 useEffect(()=>{
  if(!host.current)return;const el:HTMLDivElement=host.current;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{setError('3D is unavailable in this browser. Continue with the official diagram and written instructions.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#eef1f5');renderer.shadowMap.enabled=true;renderer.domElement.setAttribute('aria-label','Full table assembly. Drag to rotate and scroll to zoom.');el.append(renderer.domElement);
  const scene=new THREE.Scene(),assembly=new THREE.Group();scene.add(assembly);
  const camera=new THREE.PerspectiveCamera(38,1,1,6000),controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=650;controls.maxDistance=2600;controls.maxPolarAngle=Math.PI*.86;
  const gs:THREE.BufferGeometry[]=[],ms:THREE.Material[]=[];
  const geo=<T extends THREE.BufferGeometry>(g:T)=>{gs.push(g);return g;};
  const mat=(color:string,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness:.6});ms.push(m);return m;};
  const protectiveMat=mat('#c9d0da');const protective=new THREE.Mesh(geo(new THREE.BoxGeometry(610,3,610)),protectiveMat);protective.position.y=-2;scene.add(protective);
  const texture=finishTexture(finish);const topMat=mat(finish.base_color);topMat.map=texture;const top=new THREE.Mesh(geo(new THREE.BoxGeometry(550,45,550)),topMat);top.position.y=22.5;top.receiveShadow=true;top.castShadow=true;assembly.add(top);
  function edges(mesh:THREE.Mesh){const m=new THREE.LineBasicMaterial({color:'#8793a3',transparent:true,opacity:.6});ms.push(m);mesh.add(new THREE.LineSegments(geo(new THREE.EdgesGeometry(mesh.geometry)),m));}edges(top);
  const parts=CORNERS.map(([x,z],i)=>{
   const legMat=mat(finish.base_color),screwMat=mat('#b1873d',.65),leg=new THREE.Mesh(geo(new THREE.BoxGeometry(50,405,50)),legMat);legMat.map=texture;leg.name=`leg-${i+1}`;leg.castShadow=true;leg.receiveShadow=true;edges(leg);assembly.add(leg);
   const screw=new THREE.Group();screw.name=`screw-${i+1}`;assembly.add(screw);
   screw.add(new THREE.Mesh(geo(new THREE.CylinderGeometry(3.2,3.2,44,16)),screwMat));
   for(const side of [-1,1]){const tip=new THREE.Mesh(geo(new THREE.ConeGeometry(3.2,4,16)),screwMat);tip.position.y=side*24;if(side<0)tip.rotation.z=Math.PI;screw.add(tip);
    const points:THREE.Vector3[]=[];for(let n=0;n<=100;n++){const y=side*(2+n/100*20),a=y/4.2*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*4.4,y,Math.sin(a)*4.4));}screw.add(new THREE.Mesh(geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),100,.8,5,false)),screwMat));}
   const ring=new THREE.Mesh(geo(new THREE.TorusGeometry(38,1.8,6,48)),mat('#2563eb'));ring.rotation.x=Math.PI/2;ring.position.set(x,47,z);assembly.add(ring);
   return {leg,legMat,screw,screwMat,ring};
  });
  const light=new THREE.DirectionalLight('#ffffff',3);light.position.set(400,1200,700);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-800,right:800,top:900,bottom:-800});light.shadow.normalBias=2;scene.add(light,new THREE.HemisphereLight('#ffffff','#8b93a0',2.7));
  const floorMat=new THREE.ShadowMaterial({opacity:.13});ms.push(floorMat);const floor=new THREE.Mesh(geo(new THREE.PlaneGeometry(3000,3000)),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-1;floor.receiveShadow=true;scene.add(floor);
  const reset=()=>{const narrow=el.clientWidth<500;camera.position.set(narrow?1250:1000,narrow?1100:850,narrow?1500:1200);controls.target.set(0,state.current.upright?225:330,0);controls.update();};reset();
  let raf=0,last=0,lastUi=0,disposed=false;
  function draw(){if(disposed)return;const p=sampleFullTable(state.current.progress);assembly.rotation.x=state.current.upright?Math.PI:0;assembly.position.y=state.current.upright?450:0;protective.visible=!state.current.upright;
   ((top.children[0] as THREE.LineSegments).material as THREE.LineBasicMaterial).color.set(selected.current==='tabletop'?'#2563eb':'#8793a3');
   parts.forEach((part,i)=>{const s=p.parts[i];part.leg.position.set(s.legX,s.legY,s.z);part.leg.rotation.y=s.legRotation;part.leg.visible=s.legVisible;part.screw.position.set(s.x,s.screwY,s.z);part.screw.rotation.y=s.screwRotation;part.screw.visible=s.screwVisible;
    const active=i===p.connection-1&&p.phase!=='complete';part.ring.visible=active;part.ring.rotation.z=-s.screwRotation;
    const legSelected=selected.current==='legs'||selected.current===`leg-${i+1}`,screwSelected=selected.current==='screws'||selected.current===`screw-${i+1}`;
    ((part.leg.children[0] as THREE.LineSegments).material as THREE.LineBasicMaterial).color.set(legSelected||active?'#2563eb':'#8793a3');part.screwMat.emissive.set(screwSelected||active?'#946e25':'#000000');part.screwMat.emissiveIntensity=.2;
   });
   Object.assign(el.dataset,{animationProgress:p.progress.toFixed(5),animationPhase:p.phase,connection:String(p.connection),completed:String(p.completed),playing:String(state.current.playing),orientation:state.current.upright?'upright':'assembly',legY:parts.map(x=>x.leg.position.y.toFixed(3)).join(','),legRotation:parts.map(x=>x.leg.rotation.y.toFixed(3)).join(','),screwY:parts.map(x=>x.screw.position.y.toFixed(3)).join(','),visibleLegs:String(parts.filter(x=>x.leg.visible).length)});renderer.render(scene,camera);
   CORNERS.forEach(([x,z],i)=>{const line=markerLines.current[i];if(!line)return;const point=new THREE.Vector3(x,45,z);assembly.localToWorld(point);point.project(camera);const marker=el.parentElement?.querySelector<HTMLButtonElement>(`.full-corner-${i+1}`);line.setAttribute('x1',String(marker?marker.offsetLeft+marker.offsetWidth/2:0));line.setAttribute('y1',String(marker?marker.offsetTop+marker.offsetHeight/2:0));line.setAttribute('x2',String((point.x+1)*el.clientWidth/2));line.setAttribute('y2',String((1-point.y)*el.clientHeight/2));});
  }
  function pause(){state.current.playing=false;setPlaying(false);cancelAnimationFrame(raf);setProgress(state.current.progress);draw();}
  function tick(now:number){if(!state.current.playing||disposed)return;if(!shown.current||document.hidden){pause();return;}const dt=last?Math.min(.1,(now-last)/1000):0;last=now;state.current.progress=Math.min(1,state.current.progress+dt*state.current.speed/FULL_TABLE_DURATION);if(now-lastUi>80){lastUi=now;setProgress(state.current.progress);}draw();if(state.current.progress===1){pause();return;}raf=requestAnimationFrame(tick);}
  command.current=(action,value)=>{
   if(action==='pause'){pause();return;}if(action==='reset'){reset();draw();return;}
   if(action==='finished'){pause();state.current.progress=1;state.current.upright=true;setUpright(true);setProgress(1);reset();draw();return;}
   if(action==='assembly'){pause();state.current.upright=false;setUpright(false);reset();draw();return;}
   if(action==='seek'){pause();state.current.progress=Math.max(0,Math.min(1,value??0));state.current.upright=false;setUpright(false);setProgress(state.current.progress);draw();return;}
   if(action==='replay'||state.current.progress>=1)state.current.progress=0;state.current.upright=false;setUpright(false);
   if(!shown.current||document.hidden)return;state.current.playing=true;setPlaying(true);setProgress(state.current.progress);last=0;cancelAnimationFrame(raf);draw();raf=requestAnimationFrame(tick);
  };redraw.current=draw;
  const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);draw();};const observer=new ResizeObserver(resize);observer.observe(el);controls.addEventListener('change',draw);resize();
  const hidden=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',hidden);const lost=(e:Event)=>{e.preventDefault();pause();setError('The 3D view was interrupted. Continue with the official diagram or reload to restore 3D.');};renderer.domElement.addEventListener('webglcontextlost',lost);
  return()=>{disposed=true;cancelAnimationFrame(raf);state.current.playing=false;observer.disconnect();controls.removeEventListener('change',draw);controls.dispose();document.removeEventListener('visibilitychange',hidden);renderer.domElement.removeEventListener('webglcontextlost',lost);gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());texture?.dispose();light.shadow.dispose();renderer.dispose();renderer.domElement.remove();command.current=()=>{};redraw.current=()=>{};};
 },[finish.id,finish.base_color,finish.wood_effect]);
 useEffect(()=>{redraw.current();},[selectedComponent]);useEffect(()=>{if(!visible)command.current('pause');},[visible]);useEffect(()=>{if(seenReplay.current!==replay){seenReplay.current=replay;command.current('replay');}},[replay]);
 const phaseText={'align-screw':'Align the screw','turn-screw':'Turn the screw into the tabletop','align-leg':'Align the leg over its screw','turn-leg':'Turn the leg onto the screw',complete:'All four connections shown'}[pose.phase];
 const dispatch=useCallback((action:ViewerAction,value?:number)=>{if(action==='speed'){state.current.speed=value??1;setSpeed(value??1);}else command.current(action==='toggle'?(state.current.playing?'pause':'play'):action,value);},[]);
 useEffect(()=>{onController?.({mode:'full',available:!error,animated:true,playing,progress,speed,dispatch});},[onController,error,playing,progress,speed,dispatch]);
 useEffect(()=>()=>onController?.(null),[onController]);
 return <div className="full-table-demo stable-renderer">
 <div className="full-table-stage-wrap"><div className="full-table-stage" ref={host} data-testid="full-table-viewport"/>{error&&<div className="furn-webgl-error" role="status">{error}</div>}{!error&&<><svg className="connection-leaders full-table-lines" aria-hidden="true">{CORNERS.map((_,i)=><line key={i} ref={e=>{markerLines.current[i]=e;}}/>)}</svg><div className="full-table-corner-markers">{[1,2,3,4].map(n=><button key={n} className={`full-corner full-corner-${n}`} aria-label={`Highlight connection ${n}`} aria-pressed={selectedComponent===`leg-${n}`} onClick={()=>onSelectComponent?.(`leg-${n}`)}>{n}</button>)}</div><button className="full-table-top-marker" aria-label="Highlight tabletop" onClick={()=>onSelectComponent?.('tabletop')}>Tabletop</button></>}<div className="full-table-badge">{upright?'Finished orientation':`Underside up · ${pose.completed} of 4 connections shown`}</div></div>
 <div className="stable-viewer-details"><div className="connection-heading"><span>FOUR CONNECTIONS · ONE TABLE</span><span>SCHEMATIC MOTION</span></div> <div className="connection-phase" aria-live="polite" aria-atomic="true"><strong>{pose.phase==='complete'?phaseText:`Connection ${pose.connection} of 4 · ${phaseText}`}</strong><p>{pose.phase==='complete'?'Inspect the complete table using Finished table. Follow the official final checks; do not sit on the table.':`Screw ${pose.connection} · 115980 and Leg ${pose.connection}. Earlier connections stay assembled while this one is shown.`}</p></div><div className="full-table-parts" aria-label="Labelled table parts"><button aria-label="Select Tabletop" aria-pressed={selectedComponent==='tabletop'} onClick={()=>onSelectComponent?.('tabletop')} className="full-table-top-label">Tabletop <small>Plain-language name</small></button>{pose.parts.map((p,i)=><div className="full-table-pair" data-active={pose.connection===i+1&&pose.phase!=='complete'} key={p.id}><span className="full-table-number">{p.id}</span>{(['screw','leg'] as const).map(type=>{const id=`${type}-${p.id}`,picked=selectedComponent===id||selectedComponent===(type==='leg'?'legs':'screws');return <button key={type} aria-label={`Select ${type==='leg'?'Leg':'Screw'} ${p.id}`} aria-pressed={picked} onClick={()=>onSelectComponent?.(id)}><span>{type==='leg'?`Leg ${p.id}`:`Screw ${p.id} · 115980`}</span><small>{p.seated?(type==='screw'?'Inside connection':'Attached'):!p.introduced?'Waiting':type==='leg'&&!p.legVisible?'Next in this connection':'Current connection'}</small></button>;})}</div>)}</div>

 <div className="full-table-jumps" aria-label="Full assembly connections">{[1,2,3,4].map(n=><button disabled={!!error} key={n} onClick={()=>command.current('seek',(n-1)/4)}>Connection {n}</button>)}<button disabled={!!error} aria-pressed={upright} onClick={()=>command.current('finished')}>Finished table</button>{upright&&<button disabled={!!error} onClick={()=>command.current('assembly')}>Assembly orientation</button>}</div>
 <p className="connection-disclaimer">Part numbers 1–4 are assistant labels. All screws are IKEA hardware 115980. Corner order is an assistant choice. Motion, thread shape and dimensions are illustrative, not turn-count, torque or insertion-depth instructions. The finished view changes orientation without demonstrating how to lift the table. Follow the official diagram.</p></div></div>;
}
