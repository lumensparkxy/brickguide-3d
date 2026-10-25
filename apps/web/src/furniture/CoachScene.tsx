import {useCallback,useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {CORNERS} from './fullTableMotion';
import {sampleCoachAction,clampProgress,type CoachSceneAction} from './coachMotion';
import type {ViewerController,ViewerAction} from './viewerController';
import './coachScene.css';
import {finishTexture,WHITE_FINISH,type FurnitureFinishAppearance} from './finishMaterial';
export interface CoachSceneProps {finish?:FurnitureFinishAppearance;action:CoachSceneAction;onController?:(controller:ViewerController|null)=>void;visible?:boolean;view?:'guided'|'whole';selectedComponent?:string|null}
export default function CoachScene({finish=WHITE_FINISH,action,onController,visible=true,view='guided',selectedComponent=null}:CoachSceneProps){
 const host=useRef<HTMLDivElement>(null),label=useRef<HTMLSpanElement>(null),partLabels=useRef<(HTMLSpanElement|null)[]>([]);
 const [progress,setProgress]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[error,setError]=useState('');
 const state=useRef({progress:0,playing:false,speed:1}),shown=useRef(visible),cameraView=useRef(view),selected=useRef(selectedComponent);
 shown.current=visible;cameraView.current=view;selected.current=selectedComponent;
 const command=useRef<(action:ViewerAction,value?:number)=>void>(()=>{}),redraw=useRef(()=>{});
 useEffect(()=>{
  if(!host.current)return;const el:HTMLDivElement=host.current;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{setError('3D is unavailable. Use the Official diagram panel and written instructions to continue.');return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor('#eef1f5');renderer.shadowMap.enabled=true;
  renderer.domElement.setAttribute('aria-label','Assembly model. Drag to rotate and scroll to zoom.');el.append(renderer.domElement);
  const scene=new THREE.Scene(),assembly=new THREE.Group();scene.add(assembly);
  const camera=new THREE.PerspectiveCamera(38,1,1,6000),controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=100;controls.maxDistance=3200;controls.maxPolarAngle=Math.PI*.86;
  const gs:THREE.BufferGeometry[]=[],ms:THREE.Material[]=[];
  const geo=<T extends THREE.BufferGeometry>(g:T)=>{gs.push(g);return g;};
  const mat=(color:string,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness:.6});ms.push(m);return m;};
  const protectiveMat=mat('#c9d0da');const protective=new THREE.Mesh(geo(new THREE.BoxGeometry(610,3,610)),protectiveMat);protective.position.y=-2;scene.add(protective);
  const texture=finishTexture(finish);
  const topMat=mat(finish.base_color);topMat.map=texture;const top=new THREE.Mesh(geo(new THREE.BoxGeometry(550,45,550)),topMat);top.position.y=22.5;top.receiveShadow=true;top.castShadow=true;assembly.add(top);
  function edges(mesh:THREE.Mesh){const m=new THREE.LineBasicMaterial({color:finish.id==='black-brown'?'#8793a3':'#657285',transparent:true,opacity:.45});ms.push(m);mesh.add(new THREE.LineSegments(geo(new THREE.EdgesGeometry(mesh.geometry)),m));}edges(top);
  const parts=CORNERS.map(([x,z],i)=>{
   const legMat=mat(finish.base_color),screwMat=mat('#b1873d',.65),leg=new THREE.Mesh(geo(new THREE.BoxGeometry(50,405,50)),legMat);legMat.map=texture;leg.name=`leg-${i+1}`;leg.castShadow=true;leg.receiveShadow=true;edges(leg);assembly.add(leg);
   const screw=new THREE.Group();screw.name=`screw-${i+1}`;assembly.add(screw);
   screw.add(new THREE.Mesh(geo(new THREE.CylinderGeometry(3.2,3.2,44,16)),screwMat));
   for(const side of [-1,1]){const tip=new THREE.Mesh(geo(new THREE.ConeGeometry(3.2,4,16)),screwMat);tip.position.y=side*24;if(side<0)tip.rotation.z=Math.PI;screw.add(tip);
    const points:THREE.Vector3[]=[];for(let n=0;n<=100;n++){const y=side*(2+n/100*20),a=y/4.2*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*4.4,y,Math.sin(a)*4.4));}screw.add(new THREE.Mesh(geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),100,.8,5,false)),screwMat));}
   const ring=new THREE.Mesh(geo(new THREE.TorusGeometry(38,1.8,6,48)),mat('#2563eb'));ring.rotation.x=Math.PI/2;ring.position.set(x,47,z);assembly.add(ring);
   return {leg,legMat,screw,screwMat,ring};
  });
  const light=new THREE.DirectionalLight('#ffffff',2.4);light.position.set(400,1200,700);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-800,right:800,top:900,bottom:-800});light.shadow.normalBias=2;scene.add(light,new THREE.HemisphereLight('#ffffff','#8b93a0',2));
  const floorMat=new THREE.ShadowMaterial({opacity:.13});ms.push(floorMat);const floor=new THREE.Mesh(geo(new THREE.PlaneGeometry(3000,3000)),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-1;floor.receiveShadow=true;scene.add(floor);

  let disposed=false,raf=0,last=0,lastUi=0;
  const animated=!!action.animation,initial=sampleCoachAction(action,0),corner=Math.max(0,initial.connection-1);
  const reset=()=>{
   const aspect=Math.max(.35,el.clientWidth/Math.max(1,el.clientHeight));
   const close=cameraView.current==='guided'&&animated;
   if(close){
    const [x,z]=CORNERS[corner],targetY=action.kind==='screw'?78:390;
    controls.target.set(x,targetY,z);
    const distance=action.kind==='screw'?330:Math.max(1250,950/aspect);
    camera.position.set(x+Math.sign(x)*distance*.68,targetY+distance*.42,z+Math.sign(z)*distance*.75);
   }else{
    const distance=Math.max(action.kind==='identify'?1550:animated?1550:1200,900/aspect);
    controls.target.set(0,action.kind==='finish'?225:action.kind==='identify'?100:animated?350:180,0);
    camera.position.set(distance*.65,distance*.65,distance*.85);
   }
   controls.update();
  };
  function draw(){
   if(disposed)return;
   const pose=sampleCoachAction(action,state.current.progress),finished=action.kind==='finish',identify=action.kind==='identify';
   assembly.rotation.x=finished?Math.PI:0;assembly.position.y=finished?450:0;protective.visible=!finished&&!identify;
   top.position.set(identify?-220:0,22.5,0);top.scale.setScalar(1);
   topMat.emissive.set('#000000');(top.children[0] as THREE.LineSegments).material && ((top.children[0] as THREE.LineSegments).material as THREE.LineBasicMaterial).color.set(selected.current==='tabletop'?'#2563eb':finish.id==='black-brown'?'#8793a3':'#657285');
   parts.forEach((part,i)=>{
    const p=pose.parts[i],active=i===corner&&animated;
    part.leg.position.set(p.legX,p.legY,p.z);part.leg.rotation.set(0,p.legRotation,0);part.leg.visible=p.legVisible;
    part.screw.position.set(p.x,p.screwY,p.z);part.screw.rotation.y=p.screwRotation;part.screw.visible=p.screwVisible;
    if(identify){part.leg.visible=true;part.screw.visible=true;part.leg.position.set(430,25,-210+i*140);part.leg.rotation.set(0,0,Math.PI/2);part.screw.position.set(140,28,-210+i*140);part.screw.rotation.z=Math.PI/2;}
    part.ring.visible=active;
    const highlighted=active||selected.current===`leg-${i+1}`||selected.current==='legs';
    const outline=(part.leg.children[0] as THREE.LineSegments).material as THREE.LineBasicMaterial;outline.color.set(highlighted?'#2563eb':finish.id==='black-brown'?'#8793a3':'#657285');outline.opacity=highlighted?1:.45;
    part.legMat.emissive.set('#000000');
    part.screwMat.emissive.set(active||selected.current==='screws'||selected.current===`screw-${i+1}`?'#946e25':'#000000');part.screwMat.emissiveIntensity=.25;
   });
   Object.assign(el.dataset,{finish:finish.id,finishColor:finish.base_color,action:action.id,progress:pose.progress.toFixed(5),globalProgress:pose.globalProgress.toFixed(5),playing:String(state.current.playing),completed:String(pose.completed),legY:parts.map(p=>p.leg.position.y.toFixed(3)).join(','),visibleLegs:String(parts.filter(p=>p.leg.visible).length),orientation:finished?'upright':'assembly'});
   renderer.render(scene,camera);
   parts.forEach((part,i)=>{const marker=partLabels.current[i];if(!marker)return;marker.hidden=!part.leg.visible||(animated&&i===corner);if(marker.hidden)return;const point=part.leg.position.clone();assembly.localToWorld(point);point.project(camera);marker.style.left=`${(point.x+1)*el.clientWidth/2}px`;marker.style.top=`${(1-point.y)*el.clientHeight/2}px`;});
   if(label.current){const p=pose.parts[corner];const point=animated?new THREE.Vector3(action.kind==='leg'?p.legX:p.x,action.kind==='leg'?p.legY:p.screwY,p.z):new THREE.Vector3(0,45,0);assembly.localToWorld(point);point.project(camera);label.current.style.left=`${Math.max(12,Math.min(el.clientWidth-165,(point.x+1)*el.clientWidth/2+20))}px`;label.current.style.top=`${Math.max(42,Math.min(el.clientHeight-72,(1-point.y)*el.clientHeight/2-35))}px`;}
  }
  const pause=()=>{state.current.playing=false;setPlaying(false);cancelAnimationFrame(raf);setProgress(state.current.progress);draw();};
  const tick=(now:number)=>{if(disposed||!state.current.playing)return;if(!shown.current||document.hidden){pause();return;}const dt=last?Math.min(.1,(now-last)/1000):0;last=now;state.current.progress=Math.min(1,state.current.progress+dt*state.current.speed/initial.duration);if(now-lastUi>80){lastUi=now;setProgress(state.current.progress);}draw();if(state.current.progress>=1){pause();return;}raf=requestAnimationFrame(tick);};
  command.current=(cmd,value)=>{
   if(cmd==='reset'){reset();draw();return;}
   if(cmd==='pause'){pause();return;}
   if(cmd==='speed'){state.current.speed=Math.max(.25,Math.min(2,value??1));setSpeed(state.current.speed);return;}
   if(!animated)return;
   if(cmd==='seek'){pause();state.current.progress=clampProgress(value??0);setProgress(state.current.progress);draw();return;}
   if(cmd==='toggle'&&state.current.playing){pause();return;}
   if(cmd==='replay'||state.current.progress===1)state.current.progress=0;
   if(!shown.current||document.hidden)return;
   state.current.playing=true;setPlaying(true);setProgress(state.current.progress);last=0;cancelAnimationFrame(raf);draw();raf=requestAnimationFrame(tick);
  };
  redraw.current=draw;
  const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);reset();draw();};
  const observer=new ResizeObserver(resize);observer.observe(el);controls.addEventListener('change',draw);resize();
  const hidden=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',hidden);
  const lost=(event:Event)=>{event.preventDefault();pause();setError('The 3D view was interrupted. Use the Official diagram panel or reload to restore 3D.');};renderer.domElement.addEventListener('webglcontextlost',lost);
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');const motionChanged=()=>{if(motion.matches)pause();};motion.addEventListener('change',motionChanged);
  if(animated&&!motion.matches&&shown.current&&!document.hidden)command.current('play');
  return()=>{disposed=true;cancelAnimationFrame(raf);state.current.playing=false;observer.disconnect();controls.removeEventListener('change',draw);controls.dispose();document.removeEventListener('visibilitychange',hidden);motion.removeEventListener('change',motionChanged);renderer.domElement.removeEventListener('webglcontextlost',lost);gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());texture?.dispose();light.shadow.dispose();renderer.dispose();renderer.domElement.remove();command.current=()=>{};redraw.current=()=>{};};
 },[action.id,action.kind,action.animation?.start,action.animation?.end,finish.id,finish.base_color,finish.wood_effect]);
 useEffect(()=>{if(!visible)command.current('pause');},[visible]);
 useEffect(()=>{command.current('reset');},[view]);
 useEffect(()=>{redraw.current();},[selectedComponent]);
 const dispatch=useCallback((cmd:ViewerAction,value?:number)=>command.current(cmd,value),[]);
 useEffect(()=>{onController?.({mode:'full',available:!error,animated:!!action.animation,playing,progress,speed,dispatch});},[onController,error,action.animation,playing,progress,speed,dispatch]);
 useEffect(()=>()=>onController?.(null),[onController]);
 const pose=sampleCoachAction(action,progress),activeLabel=action.kind==='screw'?`Screw ${pose.connection} · 115980`:action.kind==='leg'?`Leg ${pose.connection}`:'Tabletop';
 return <div className="coach-scene">
  <div className="coach-canvas" ref={host} data-testid="coach-viewport" data-action={action.id}/>
  {error?<div className="coach-scene-error" role="status">{error}</div>:<>
   <span className="coach-orientation">{action.kind==='finish'?'Upright · final checks':action.kind==='identify'?'1 tabletop · 4 legs · 4 screws':'Tabletop · underside up'}</span>
   {[1,2,3,4].map((n,i)=><span key={n} ref={el=>{partLabels.current[i]=el;}} className="coach-corner-label" hidden>Leg {n}</span>)}
   <span className="coach-model-label" ref={label}>{activeLabel}{action.kind==='leg'&&<small>Assistant label · corner {pose.connection}</small>}</span>
   {action.kind==='identify'&&<span className="coach-inventory-label">Legs 1–4 · Screws 1–4 (115980)<small>Numbers 1–4 are assistant labels</small></span>}
   <span className="coach-view-note">{view==='guided'&&action.kind==='screw'?'Connection close-up · tabletop partly shown':view==='guided'&&action.kind==='leg'?'Active corner · drag to inspect':'Drag to rotate · scroll to zoom'}</span>
  </>}
 </div>;
}
