import {finishTexture,WHITE_FINISH,type FurnitureFinishAppearance} from './finishMaterial';
import {useCallback, useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import type {ControlledViewerProps,ViewerAction} from './viewerController';
import {CONNECTION_DURATION, phaseCopy, sampleConnection} from './connectionMotion';
interface Props extends ControlledViewerProps {finish?:FurnitureFinishAppearance;screwOnly?:boolean; replay: number; selectedComponent?: string|null; onSelectComponent?: (id:string)=>void; visible?:boolean }
export default function ConnectionDemo({finish=WHITE_FINISH,replay,selectedComponent,onSelectComponent,visible=true,onController,screwOnly=false}:Props) {
  const host=useRef<HTMLDivElement>(null);
  const labels=useRef<Record<string,HTMLButtonElement|null>>({});
  const leaders=useRef<Record<string,SVGLineElement|null>>({});
  const [progress,setProgress]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[error,setError]=useState('');
  const seenReplay=useRef(replay);
  const progressRef=useRef(0),playingRef=useRef(false),speedRef=useRef(1);
  const selectedCategory=selectedComponent?.startsWith('leg-')?'legs':selectedComponent?.startsWith('screw-')?'screws':selectedComponent;
  const selectedRef=useRef(selectedCategory);selectedRef.current=selectedCategory;
  const visibleRef=useRef(visible);visibleRef.current=visible;
  const command=useRef<(action:'play'|'pause'|'replay'|'seek'|'reset',value?:number)=>void>(()=>{});
  const drawRef=useRef<()=>void>(()=>{});
  const pose=sampleConnection(screwOnly?progress*.44:progress);const copy=screwOnly&&progress===1?{title:'Screw insertion shown',detail:'Continue to the next step for the leg attachment.'}:phaseCopy[pose.phase];
  useEffect(()=>{
    if(!host.current)return;const el:HTMLDivElement=host.current;
    let renderer:THREE.WebGLRenderer;
    try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}
    catch {setError('3D is unavailable in this browser. Continue with the official diagram and written instructions.');return;}
    setError('');renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#eef1f5');
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label','Screw and leg connection. Drag to orbit; use the timeline to inspect each stage.');
    el.append(renderer.domElement);
    const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(38,1,.1,3000);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=260;controls.maxDistance=1000;controls.maxPolarAngle=Math.PI*.8;
    const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
    const register=<T extends THREE.BufferGeometry>(g:T)=>{geometries.push(g);return g;};
    const material=(color:string,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,roughness:metalness?.3:.65,metalness});materials.push(m);return m;};
    const texture=finishTexture(finish);const topMat=material(finish.base_color),legMat=material(finish.base_color),screwMat=material('#b48841',.65);topMat.map=legMat.map=texture;
    const top=new THREE.Mesh(register(new THREE.BoxGeometry(180,30,145)),topMat);top.position.set(-55,15,-37.5);top.receiveShadow=true;scene.add(top);
    const leg=new THREE.Mesh(register(new THREE.BoxGeometry(44,110,44)),legMat);leg.castShadow=true;leg.receiveShadow=true;scene.add(leg);
    const outline=(mesh:THREE.Mesh,color:string)=>{const m=new THREE.LineBasicMaterial({color,transparent:true,opacity:.55});materials.push(m);mesh.add(new THREE.LineSegments(register(new THREE.EdgesGeometry(mesh.geometry)),m));};
    outline(top,'#7e8e78');outline(leg,'#57765e');
    // Only a section of the leg is shown. Marks at its top distinguish the crop from a full leg.
    const cutMat=new THREE.LineBasicMaterial({color:'#2563eb',transparent:true,opacity:.6});materials.push(cutMat);
    for(let x=-17;x<20;x+=9){const g=register(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,55.3,-21),new THREE.Vector3(Math.min(21,x+25),55.3,21)]));leg.add(new THREE.Line(g,cutMat));}
    const screw=new THREE.Group();scene.add(screw);
    const core=new THREE.Mesh(register(new THREE.CylinderGeometry(3.1,3.1,52,24)),screwMat);core.castShadow=true;screw.add(core);
    for(const side of [-1,1]){const tip=new THREE.Mesh(register(new THREE.ConeGeometry(3.1,4,24)),screwMat);tip.position.y=side*28;if(side<0)tip.rotation.z=Math.PI;tip.castShadow=true;screw.add(tip);}
    // Authored visual threads identify a double-ended fastener. Pitch is not a manufacturing measurement.
    for(const side of [-1,1]){
      const points:THREE.Vector3[]=[];for(let n=0;n<=260;n++){const y=side*(3+n/260*23),a=y/4.2*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*4.3,y,Math.sin(a)*4.3));}
      const thread=new THREE.Mesh(register(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),260,.85,6,false)),screwMat);thread.castShadow=true;screw.add(thread);
    }
    const lineMat=new THREE.LineDashedMaterial({color:'#2563eb',dashSize:4,gapSize:4,transparent:true,opacity:.6});materials.push(lineMat);
    const alignment=new THREE.Line(register(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,31,0),new THREE.Vector3(0,278,0)])),lineMat);alignment.computeLineDistances();scene.add(alignment);
    const ringPoints:THREE.Vector3[]=[];for(let n=0;n<=70;n++){const a=n/70*Math.PI*1.5;ringPoints.push(new THREE.Vector3(Math.cos(a)*35,0,Math.sin(a)*35));}
    const arrow=new THREE.Group();const arrowMat=new THREE.LineBasicMaterial({color:'#2563eb'});materials.push(arrowMat);arrow.add(new THREE.Line(register(new THREE.BufferGeometry().setFromPoints(ringPoints)),arrowMat));
    const head=new THREE.Mesh(register(new THREE.ConeGeometry(3.7,11,12)),material('#2563eb'));head.position.copy(ringPoints[70]);head.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(1,0,0));arrow.add(head);scene.add(arrow);
    const floorMat=new THREE.ShadowMaterial({opacity:.12});materials.push(floorMat);const floor=new THREE.Mesh(register(new THREE.PlaneGeometry(1500,1500)),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.5;floor.receiveShadow=true;scene.add(floor);
    scene.add(new THREE.HemisphereLight('#ffffff','#8b93a0',2.7));const light=new THREE.DirectionalLight('#ffffff',3.3);light.position.set(150,400,240);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-300;light.shadow.camera.right=300;light.shadow.camera.top=350;light.shadow.camera.bottom=-300;light.shadow.normalBias=.5;scene.add(light);
    const reset=()=>{camera.position.set(320,270,400);controls.target.set(0,145,0);controls.update();};reset();
    let frame=0,last=0,lastUi=0,disposed=false;
    function placeLabel(id:string,point:THREE.Vector3,side:'left'|'right',offset=0){
      const label=labels.current[id],line=leaders.current[id];if(!label||!line)return;
      const p=point.clone().project(camera),w=el.clientWidth,h=el.clientHeight;
      const px=(p.x+1)*w/2,py=(1-p.y)*h/2;
      const x=side==='left'?12:Math.max(12,w-label.offsetWidth-12);
      const y=h<200?(id==='legs'?4:id==='tabletop'?Math.max(4,h-label.offsetHeight-4):Math.max(4,(h-label.offsetHeight)/2)):Math.min(h-label.offsetHeight-12,Math.max(18,py+offset));
      label.style.transform=`translate(${x}px,${y}px)`;
      const hidden=p.z>1||p.z< -1;label.style.visibility=hidden?'hidden':'visible';line.style.visibility=hidden?'hidden':'visible';
      line.setAttribute('x1',String(side==='left'?x+label.offsetWidth:x));line.setAttribute('y1',String(y+label.offsetHeight/2));line.setAttribute('x2',String(px));line.setAttribute('y2',String(py));
      label.dataset.selected=String((selectedRef.current??phaseCopy[sampleConnection(screwOnly?progressRef.current*.44:progressRef.current).phase].component)===id);
    }
    function draw(){
      if(disposed)return;
      const p=sampleConnection(screwOnly?progressRef.current*.44:progressRef.current);screw.position.set(0,p.screwY,0);screw.rotation.y=p.screwRotation;leg.position.set(p.legX,p.legY,0);leg.rotation.y=p.legRotation;
      legMat.transparent=p.legOpacity<1;legMat.opacity=p.legOpacity;legMat.depthWrite=p.legOpacity===1;
      const selected=selectedRef.current??phaseCopy[p.phase].component;
      for(const [id,m] of [['tabletop',topMat],['legs',legMat],['screws',screwMat]] as const){m.emissive.set('#000000');if(id!=='screws'){const mesh=id==='tabletop'?top:leg;((mesh.children[0] as THREE.LineSegments).material as THREE.LineBasicMaterial).color.set(id===selected?'#2563eb':'#8793a3');}}
      arrow.visible=p.arrowVisible;arrow.position.y=p.phase==='insert-screw'?p.screwY+13:p.legY-32;arrow.rotation.y=p.phase==='insert-screw'?p.screwRotation:p.legRotation;
      alignment.visible=p.phase!=='seated';
      Object.assign(el.dataset,{animationProgress:p.progress.toFixed(5),animationPhase:p.phase,playing:String(playingRef.current),screwY:String(screw.position.y),legY:String(leg.position.y),legRotation:String(leg.rotation.y),screwRotation:String(screw.rotation.y)});
      renderer.render(scene,camera);
      placeLabel('tabletop',new THREE.Vector3(-100,30,5),'left',10);
      placeLabel('screws',screw.position.clone(),'right',12);
      placeLabel('legs',leg.position.clone().add(new THREE.Vector3(0,33,0)),'left',-40);
    }
    function pause(){playingRef.current=false;setPlaying(false);cancelAnimationFrame(frame);frame=0;setProgress(progressRef.current);draw();}
    function tick(now:number){
      if(!playingRef.current||disposed)return;
      if(!visibleRef.current||document.hidden){pause();return;}
      const delta=last?Math.min((now-last)/1000,.1):0;last=now;
      progressRef.current=Math.min(1,progressRef.current+delta*speedRef.current/CONNECTION_DURATION);
      if(now-lastUi>80){lastUi=now;setProgress(progressRef.current);}draw();
      if(progressRef.current>=1){pause();return;}frame=requestAnimationFrame(tick);
    }
    command.current=(action,value)=>{
      if(action==='pause'){pause();return;}
      if(action==='reset'){reset();draw();return;}
      if(action==='seek'){pause();progressRef.current=Math.max(0,Math.min(1,value??0));setProgress(progressRef.current);draw();return;}
      if(action==='replay'||progressRef.current>=1)progressRef.current=0;
      if(!visibleRef.current||document.hidden)return;
      playingRef.current=true;setPlaying(true);setProgress(progressRef.current);last=0;cancelAnimationFrame(frame);draw();frame=requestAnimationFrame(tick);
    };
    drawRef.current=draw;
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);draw();};
    const observer=new ResizeObserver(resize);observer.observe(el);controls.addEventListener('change',draw);resize();
    const visibility=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',visibility);
    const contextLost=(event:Event)=>{event.preventDefault();pause();setError('The 3D view was interrupted. Continue with the official diagram or reload to restore the animation.');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
    return()=>{disposed=true;cancelAnimationFrame(frame);playingRef.current=false;observer.disconnect();document.removeEventListener('visibilitychange',visibility);controls.removeEventListener('change',draw);controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',contextLost);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture?.dispose();light.shadow.dispose();renderer.dispose();renderer.domElement.remove();command.current=()=>{};drawRef.current=()=>{};};
  },[finish.id,finish.base_color,finish.wood_effect]);
  useEffect(()=>{drawRef.current();},[selectedComponent]);
  useEffect(()=>{if(!visible)command.current('pause');},[visible]);
  useEffect(()=>{if(replay!==seenReplay.current){seenReplay.current=replay;if(replay)command.current('replay');}},[replay]);
  const dispatch=useCallback((action:ViewerAction,value?:number)=>{if(action==='speed'){speedRef.current=value??1;setSpeed(value??1);}else command.current(action==='toggle'?(playingRef.current?'pause':'play'):action,value);},[]);
  useEffect(()=>{onController?.({mode:'closeup',available:!error,animated:true,playing,progress,speed,dispatch});},[onController,error,playing,progress,speed,dispatch]);
  useEffect(()=>()=>onController?.(null),[onController]);
  return <div className="connection-demo stable-renderer">
    <div className="connection-stage-wrap"><div ref={host} className="connection-stage" data-testid="connection-viewport"/>
      {!error&&<><svg className="connection-leaders" aria-hidden="true">{['tabletop','screws','legs'].map(id=><line key={id} ref={el=>{leaders.current[id]=el;}}/>)}</svg><div className="connection-labels">{[['tabletop','Tabletop','Plain-language name'],['screws','Screw · 115980','IKEA hardware number'],['legs','Leg · partial view','Shortened for clarity']].map(([id,title,note])=><button key={id} ref={el=>{labels.current[id]=el;}} className={`connection-label component-${id}`} aria-label={`Select ${title}`} aria-pressed={selectedCategory===id} onClick={()=>onSelectComponent?.(id)}><span>{title}</span><small>{note}</small></button>)}</div></>}
      {error&&<div className="furn-webgl-error" role="status">{error}</div>}
    </div>
    <div className="stable-viewer-details"><div className="connection-heading"><span>ONE CONNECTION, UP CLOSE</span><span>SCHEMATIC MOTION</span></div><div className="connection-phase" aria-live="polite" aria-atomic="true"><strong>{copy.title}</strong><p>{copy.detail}</p></div>
      <div className="connection-chapters" aria-label="Animation phases">{(screwOnly?[[0,'Align screw'],[.17/.44,'Turn screw'],[1,'Screw in place']]:[[0,'Align screw'],[.17,'Turn screw'],[.45,'Align leg'],[.65,'Turn leg'],[1,'Seated']]).map(([t,label])=><button key={label} disabled={!!error} onClick={()=>command.current('seek',Number(t))}>{label}</button>)}</div>
    <p className="connection-disclaimer">Illustrative motion — not a turn count, torque or insertion-depth instruction. Leg shown partially for clarity. Follow the official diagram.</p></div>
  </div>;
}
