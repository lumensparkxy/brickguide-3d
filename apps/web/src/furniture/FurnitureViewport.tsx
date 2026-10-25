import {finishTexture,WHITE_FINISH,type FurnitureFinishAppearance} from './finishMaterial';
import {useCallback, useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import type {FurnitureStep} from './contracts';
import ConnectionDemo from './ConnectionDemo';
import FullTableDemo from './FullTableDemo';
import {CORNERS} from './fullTableMotion';
import './connection.css';
import ViewerControls from './ViewerControls';
import type {ControlledViewerProps,ViewerController,ViewerAction} from './viewerController';
import './stableViewer.css';
interface ViewportProps extends ControlledViewerProps {finish?:FurnitureFinishAppearance; autoPlay?:boolean; stepId?:string; kind:FurnitureStep['kind']; activeComponents:string[]; replay:number; selectedComponent?:string|null; onSelectComponent?:(id:string)=>void; visible?:boolean }
type Command = 'reset'|'left'|'right'|'up'|'down'|'in'|'out'|'highlight';
function Overview({finish=WHITE_FINISH,kind,activeComponents,replay,selectedComponent,onSelectComponent,onController}:ViewportProps) {
  const labels=useRef<Record<string,HTMLButtonElement|null>>({}); const leaders=useRef<Record<string,SVGLineElement|null>>({});
  const selectedRef=useRef(selectedComponent);selectedRef.current=selectedComponent;
  const drawRef=useRef<()=>void>(()=>{}); const [labelData,setLabelData]=useState<{id:string;category:string;text:string}[]>([]);
  const host=useRef<HTMLDivElement>(null); const command=useRef<(value:Command)=>void>(()=>{}); const [error,setError]=useState('');
  const activeKey=activeComponents.join(',');
  useEffect(()=>{
    const element=host.current;if(!element)return;
    setError('');let renderer:THREE.WebGLRenderer;
    try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}
    catch {setError('3D is unavailable in this browser. The official diagram and written instructions are still available.');return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor('#eef1f5');renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.domElement.setAttribute('aria-label','Schematic table. Drag to rotate; scroll to zoom. Camera buttons are available below.');
    element.append(renderer.domElement);
    const scene=new THREE.Scene(); const camera=new THREE.PerspectiveCamera(36,1,1,6000);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=500;controls.maxDistance=2300;controls.maxPolarAngle=Math.PI*.88;
    const texture=finishTexture(finish);const geometry:THREE.BufferGeometry[]=[];const materials:THREE.Material[]=[];const targets:{id:string;category:string;mat:THREE.MeshStandardMaterial;edge?:THREE.LineBasicMaterial}[]=[];
    const anchors:{id:string;category:string;text:string;point:THREE.Vector3}[]=[];
    const group=new THREE.Group();scene.add(group);
    const active=new Set(activeComponents);
    // These are intentionally schematic dimensions, never manufacturing/connector measurements.
    const topThickness=45,legWidth=50,legLength=405;
    function box(id:string,w:number,h:number,d:number,x:number,y:number,z:number,category:string){
      const geo=new THREE.BoxGeometry(w,h,d);geometry.push(geo);
      const mat=new THREE.MeshStandardMaterial({color:category==='screws'?'#9d9989':finish.base_color,roughness:.7,metalness:category==='screws'?.3:0});if(category!=='screws')mat.map=texture;materials.push(mat);
      const mesh=new THREE.Mesh(geo,mat);mesh.name=id;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
      const edgesGeo=new THREE.EdgesGeometry(geo);geometry.push(edgesGeo);const edgeMat=new THREE.LineBasicMaterial({color:active.has(category)?'#2563eb':'#8793a3'});materials.push(edgeMat);const edges=new THREE.LineSegments(edgesGeo,edgeMat);mesh.add(edges);
      targets.push({id,category,mat,edge:edgeMat});
      if(category==='legs'||category==='tabletop')anchors.push({id,category,text:category==='legs'?`Leg ${id.split('-')[1]}`:'Tabletop',point:mesh.position.clone()});
      return mesh;
    }
    const finished=kind==='finish';const hardwareLayout=kind==='prepare'&&active.has('screws');const withLegs=kind==='attach_legs'||finished;const withScrews=kind==='insert_screws';
    if(!hardwareLayout)box('tabletop',550,topThickness,550,0,finished?450-topThickness/2:topThickness/2,0,'tabletop');
    let i=0;for(const [x,assemblyZ] of CORNERS){
      i++;const z=finished?-assemblyZ:assemblyZ;
      if(withLegs)box(`leg-${i}`,legWidth,legLength,legWidth,x,finished?legLength/2:topThickness+legLength/2,z,'legs');
      if(hardwareLayout)box(`leg-${i}`,legWidth,legWidth,legLength,(i-2.5)*90,legWidth/2,-50,'legs');
      if(withScrews||hardwareLayout){const geo=new THREE.CylinderGeometry(4,4,32,12);geometry.push(geo);const mat=new THREE.MeshStandardMaterial({color:'#a38b50',roughness:.5,metalness:.3});materials.push(mat);const mesh=new THREE.Mesh(geo,mat);mesh.name=`screw-${i}`;mesh.position.set(hardwareLayout?(i-2.5)*90:x,hardwareLayout?5:topThickness+16,hardwareLayout?250:z);if(hardwareLayout)mesh.rotation.x=Math.PI/2;group.add(mesh);targets.push({id:`screw-${i}`,category:'screws',mat});if(i===1)anchors.push({id:'screws',category:'screws',text:'Screws · 115980',point:mesh.position.clone()});}
    }
    setLabelData(anchors.map(({id,category,text})=>({id,category,text})));
    // No unseen holes, threads, exact offsets or screw rotations are asserted by this diagram.
    const groundGeo=new THREE.PlaneGeometry(2600,2600);geometry.push(groundGeo);const groundMat=new THREE.ShadowMaterial({opacity:.12});materials.push(groundMat);const floor=new THREE.Mesh(groundGeo,groundMat);floor.rotation.x=-Math.PI/2;floor.position.y=-1;floor.receiveShadow=true;scene.add(floor);
    scene.add(new THREE.HemisphereLight('#ffffff','#8b93a0',3));const sun=new THREE.DirectionalLight('#ffffff',3);sun.position.set(-500,1000,600);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-800;sun.shadow.camera.right=800;sun.shadow.camera.top=800;sun.shadow.camera.bottom=-800;sun.shadow.normalBias=2;scene.add(sun);
    const reset=()=>{camera.position.set(850,700,1000);controls.target.set(0,withLegs?210:50,0);controls.update();};reset();
    let frame=0;let flashUntil=0;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const draw=()=>{cancelAnimationFrame(frame);const on=performance.now()<flashUntil;
      for(const {id,mat,category,edge} of targets){const picked=selectedRef.current===category||selectedRef.current===id;const flash=on&&active.has(category);mat.emissive.set('#000000');edge?.color.set(picked||flash?'#2563eb':active.has(category)?'#2563eb':'#8793a3');}
      renderer.render(scene,camera);
      const w=element.clientWidth,h=element.clientHeight;const used={left:18,right:18};
      const ordered=anchors.map(a=>({...a,p:a.point.clone().project(camera)})).sort((a,b)=>b.p.y-a.p.y);
      ordered.forEach((a,i)=>{const label=labels.current[a.id],line=leaders.current[a.id];if(!label||!line)return;const side=i%2?'right':'left';const x=side==='left'?10:Math.max(10,w-label.offsetWidth-10);const py=(1-a.p.y)*h/2;const y=Math.min(h-45,Math.max(used[side],py-20));used[side]=y+50;label.style.transform=`translate(${x}px,${y}px)`;label.dataset.selected=String(selectedRef.current===a.category||selectedRef.current===a.id);const hide=a.p.z>1||a.p.z< -1;label.style.visibility=hide?'hidden':'visible';line.style.visibility=hide?'hidden':'visible';line.setAttribute('x1',String(side==='left'?x+label.offsetWidth:x));line.setAttribute('y1',String(y+label.offsetHeight/2));line.setAttribute('x2',String((a.p.x+1)*w/2));line.setAttribute('y2',String(py));});
      if(on)frame=requestAnimationFrame(draw);
    };drawRef.current=draw;
    command.current=(value)=>{if(value==='reset')reset();else if(value==='highlight'){flashUntil=performance.now()+(reduced.matches?3000:1400);}else if(value==='in'||value==='out'){camera.position.sub(controls.target).multiplyScalar(value==='in'?.8:1.25).add(controls.target);controls.update();}else{const delta=camera.position.clone().sub(controls.target);const spherical=new THREE.Spherical().setFromVector3(delta);if(value==='left')spherical.theta-=.25;if(value==='right')spherical.theta+=.25;if(value==='up')spherical.phi=Math.max(.1,spherical.phi-.2);if(value==='down')spherical.phi=Math.min(Math.PI*.88,spherical.phi+.2);camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(controls.target));controls.update();}cancelAnimationFrame(frame);draw();};
    const resize=()=>{const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);draw();};
    const observer=new ResizeObserver(resize);observer.observe(element);controls.addEventListener('change',draw);resize();
    const contextLost=(e:Event)=>{e.preventDefault();setError('The 3D view was interrupted. Continue with the official diagram or reload the page to restore 3D.');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
    return()=>{observer.disconnect();cancelAnimationFrame(frame);controls.removeEventListener('change',draw);controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',contextLost);geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture?.dispose();sun.shadow.dispose();renderer.dispose();renderer.domElement.remove();command.current=()=>{};};
  },[kind,activeKey,finish.id,finish.base_color,finish.wood_effect]);
  useEffect(()=>{if(replay)command.current('highlight');},[replay]);
  useEffect(()=>{drawRef.current();},[selectedComponent,labelData]);
  const dispatch=useCallback((action:ViewerAction)=>{if(action==='reset')command.current('reset');},[]);
  useEffect(()=>{onController?.({mode:'overview',available:!error,animated:false,playing:false,progress:0,speed:1,dispatch});},[onController,error,dispatch]);
  useEffect(()=>()=>onController?.(null),[onController]);
  return <div className="furn-viewport stable-renderer"><div className="overview-stage-wrap"><div className="furn-stage" ref={host} data-testid="furniture-viewport"/>{!error&&<><svg className="connection-leaders" aria-hidden="true">{labelData.map(a=><line key={a.id} ref={el=>{leaders.current[a.id]=el;}}/>)}</svg><div className="connection-labels">{labelData.map(a=><button key={a.id} ref={el=>{labels.current[a.id]=el;}} className={`connection-label overview-label component-${a.category}`} aria-label={`Select ${a.text}`} aria-pressed={selectedComponent===a.category||selectedComponent===a.id} onClick={()=>onSelectComponent?.(a.id)}>{a.text}</button>)}</div></>}{error&&<div className="furn-webgl-error" role="status">{error}</div>}</div><div className="stable-viewer-details"><div className="furn-orientation">{kind==='finish'?'Finished orientation':kind==='prepare'&&activeComponents.includes('screws')?'Component layout · four legs and four screws (schematic)':'Assembly orientation · underside facing up'}</div><div className="furn-camera-controls" aria-label="3D camera controls">{([['left','Rotate left','↶'],['right','Rotate right','↷'],['up','Tilt up','↑'],['down','Tilt down','↓'],['in','Zoom in','＋'],['out','Zoom out','−']] as const).map(([cmd,label,text])=><button key={cmd} aria-label={label} title={label} disabled={!!error} onClick={()=>command.current(cmd)}>{text}</button>)}</div><p className="furn-stage-hint">Drag to look around · Scroll to zoom · Tap a part label to highlight it · Leg numbers are assistant labels</p></div></div>;
}

export default function FurnitureViewport(props:ViewportProps) {
  type Mode='full'|'closeup'|'overview';
  const defaultMode:Mode=props.kind==='attach_legs'||props.kind==='finish'?'full':props.kind==='insert_screws'?'closeup':'overview';
  const [choice,setChoice]=useState<{stepId?:string;mode:Mode}>({stepId:props.stepId,mode:defaultMode});
  const mode=choice.stepId===props.stepId?choice.mode:defaultMode;
  const setMode=(next:Mode)=>setChoice({stepId:props.stepId,mode:next});
  const [controller,setController]=useState<(ViewerController & {stepId?:string})|null>(null);
  const available=props.kind==='insert_screws'||props.kind==='attach_legs'||props.kind==='finish';
  const started=useRef<string|undefined>(undefined);
  useEffect(()=>{
    if(!props.autoPlay||started.current===props.stepId)return;
    if(props.kind!=='insert_screws'&&props.kind!=='attach_legs')return;
    if(props.visible===false||document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches){started.current=props.stepId;return;}
    if(!controller?.available||controller.stepId!==props.stepId||!controller.animated||controller.mode!==defaultMode)return;
    started.current=props.stepId;controller.dispatch('play');
  },[props.stepId,props.autoPlay,props.visible,props.kind,controller,defaultMode]);
  useEffect(()=>{if(!props.autoPlay)started.current=undefined;},[props.autoPlay]);
  const receiveController=useCallback((next:ViewerController|null)=>setController(next?{...next,stepId:props.stepId}:null),[props.stepId]);
  const childProps={...props,onController:receiveController};
  return <div className="furniture-viewer-with-labels stable-viewer" tabIndex={0} role="group" aria-label="Interactive assembly viewer. Space plays or pauses animation." data-testid="furniture-viewer-surface" onPointerDown={e=>{if(e.target instanceof HTMLCanvasElement)e.currentTarget.focus({preventScroll:true});}} onKeyDown={e=>{if(e.target===e.currentTarget&&e.code==='Space'&&!e.defaultPrevented&&!e.repeat&&!e.nativeEvent.isComposing&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&controller?.available&&controller.animated){e.preventDefault();controller.dispatch('toggle');}}}>
    <div className="connection-view-switch" aria-label="Illustration detail"><button disabled={!available} aria-pressed={available&&mode==='full'} onClick={()=>setMode('full')}>Full assembly</button><button disabled={!available} aria-pressed={available&&mode==='closeup'} onClick={()=>setMode('closeup')}>Connection close-up</button><button aria-pressed={!available||mode==='overview'} onClick={()=>setMode('overview')}>Whole table</button></div>
    {available&&mode==='full'?<FullTableDemo key={`full-${props.stepId}`} {...childProps} initialFinished={props.kind==='finish'}/>:available&&mode==='closeup'?<ConnectionDemo key={`close-${props.stepId}`} {...childProps} screwOnly={props.kind==='insert_screws'}/>:<Overview key={`overview-${props.stepId}`} {...childProps}/>}
    <ViewerControls controller={controller}/>
  </div>;
}
