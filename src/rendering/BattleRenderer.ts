import * as THREE from 'three';
import type { Cell, GameState, Unit } from '../game/types';
import { coverAt, distance, findPath, keyOf, reachableCells } from '../game/grid';
import { targetLegal } from '../game/engine';
import { AxieAvatarFactory } from '../integrations/axie/AxieAvatarFactory';
import type { AxieAvatar } from '../integrations/axie/AxieAvatar';
import { LunacianEnvironment } from './LunacianEnvironment';

interface UnitVisual { root: THREE.Group; avatar?: AxieAvatar; hp: THREE.Sprite; lastHp: number }
interface Motion { visual:UnitVisual; points:THREE.Vector3[]; index:number; done:()=>void }

export class BattleRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  private readonly scene = new THREE.Scene();
  private readonly environment = new LunacianEnvironment();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly clock = new THREE.Clock();
  private readonly cells = new Map<string, THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>>();
  private readonly unitVisuals = new Map<string, UnitVisual>();
  private readonly avatarFactory: AxieAvatarFactory;
  private readonly selectedRing = new THREE.Mesh(new THREE.RingGeometry(.47,.51,64),new THREE.MeshBasicMaterial({color:0x7ff5ff,side:THREE.DoubleSide,depthWrite:false}));
  private readonly hoverRing = new THREE.Mesh(new THREE.RingGeometry(.35,.39,4),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,depthWrite:false}));
  private readonly pathLine = new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0xb4fcff,dashSize:.16,gapSize:.09,depthTest:false}));
  private readonly fogTexture:THREE.CanvasTexture;
  private readonly fogCanvas=document.createElement('canvas');
  private animationId=0;
  private readonly cameraTarget=new THREE.Vector3(6,0,4.3);
  private readonly cameraPosition=new THREE.Vector3();
  private yaw=-.28;
  private distance=15.2;
  private state?:GameState;
  private reachable=new Set<string>();
  private motion?:Motion;
  private loading?:Promise<void>;
  private disposed=false;
  private time=0;
  private effects:Array<{object:THREE.Object3D;remaining:number;duration:number}>=[];
  private cinematic?: { remaining:number; restoreTarget:THREE.Vector3; restoreDistance:number };
  onCell?:(x:number,z:number)=>void;
  onUnit?:(id:string)=>void;
  onHover?:(text:string)=>void;
  onCancel?:()=>void;

  constructor(private readonly canvas:HTMLCanvasElement) {
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.avatarFactory=new AxieAvatarFactory(this.renderer);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
    this.camera=new THREE.PerspectiveCamera(43,1,.1,120);this.scene.background=new THREE.Color(0x9aceed);this.scene.fog=new THREE.Fog(0xb7d7e9,30,65);
    this.scene.add(new THREE.HemisphereLight(0xd9f4ff,0x738449,2));
    const sun=new THREE.DirectionalLight(0xffecd0,2.7);sun.position.set(-6,15,8);sun.target.position.set(6,0,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:.5,far:45});sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;this.scene.add(sun,sun.target,this.environment.root);
    const geo=new THREE.PlaneGeometry(.94,.94);
    for(let x=0;x<14;x++)for(let z=0;z<10;z++) {
      const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x55dfff,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.065,z);mesh.userData.cell={x,z};this.cells.set(`${x},${z}`,mesh);this.scene.add(mesh);
      const edge=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.47,-.47,0),new THREE.Vector3(.47,-.47,0),new THREE.Vector3(.47,.47,0),new THREE.Vector3(-.47,.47,0)]),new THREE.LineBasicMaterial({color:0x69eaff,transparent:true,opacity:.65}));edge.visible=false;mesh.add(edge);
    }
    this.fogCanvas.width=14;this.fogCanvas.height=10;this.fogTexture=new THREE.CanvasTexture(this.fogCanvas);this.fogTexture.magFilter=THREE.LinearFilter;
    const fog=new THREE.Mesh(new THREE.PlaneGeometry(14,10),new THREE.MeshBasicMaterial({map:this.fogTexture,transparent:true,depthWrite:false}));fog.rotation.x=-Math.PI/2;fog.position.set(6.5,.04,4.5);this.scene.add(fog);
    this.selectedRing.rotation.x=this.hoverRing.rotation.x=-Math.PI/2;this.hoverRing.rotation.z=Math.PI/4;this.selectedRing.visible=this.hoverRing.visible=false;this.scene.add(this.selectedRing,this.hoverRing,this.pathLine);
    canvas.addEventListener('pointerup',this.pick);canvas.addEventListener('pointermove',this.hover);canvas.addEventListener('pointerleave',this.clearHover);canvas.addEventListener('contextmenu',this.cancel);canvas.addEventListener('wheel',this.zoom,{passive:false});window.addEventListener('keydown',this.keydown);window.addEventListener('resize',this.resize);
    this.positionCamera(true);this.resize();this.frame();
  }

  async setState(state:GameState):Promise<void> {
    this.state=state;
    if(!this.loading)this.loading=Promise.all([this.environment.dressBattle(state),...state.units.map(unit=>this.loadUnit(unit))]).then(()=>undefined);
    await this.loading;if(this.disposed||this.state!==state)return;
    const selected=state.units.find(u=>u.id===state.selectedId);
    this.reachable=new Set(selected&&selected.ap>0&&state.phase==='PLAYER_PHASE'&&state.actionMode==='move'?reachableCells(state,selected).map(keyOf):[]);
    for(const [key,mesh] of this.cells) {mesh.material.opacity=this.reachable.has(key)?.13:0;mesh.children[0]!.visible=this.reachable.has(key);}
    const ctx=this.fogCanvas.getContext('2d')!;ctx.clearRect(0,0,14,10);
    for(let x=0;x<14;x++)for(let z=0;z<10;z++){const vis=state.visibility.get(`${x},${z}`);ctx.fillStyle=vis==='visible'?'rgba(32,51,65,0)':vis==='explored'?'rgba(32,51,65,0.18)':'rgba(32,51,65,0.45)';ctx.fillRect(x,z,1,1);}this.fogTexture.needsUpdate=true;
    for(const unit of state.units){const visual=this.unitVisuals.get(unit.id)!;visual.root.position.set(unit.cell.x,.09,unit.cell.z);visual.root.visible=unit.alive&&(unit.team==='player'||state.visibility.get(keyOf(unit.cell))==='visible');visual.hp.scale.x=.8*unit.hp/unit.maxHp;if(visual.lastHp>unit.hp){visual.avatar?.play(unit.alive?'hit':'defeat');if(visual.root.visible)this.damageText(visual.root.position,visual.lastHp-unit.hp);}visual.lastHp=unit.hp;}
    this.canvas.dataset.axieSources=state.units.filter(u=>u.team==='player').map(u=>`${u.id}:${this.unitVisuals.get(u.id)?.avatar?.source??'missing'}`).join(',');this.canvas.dataset.enemySources='official-origins-portrait-fallback';this.canvas.dataset.ready='true';
    this.selectedRing.visible=Boolean(selected?.alive);if(selected)this.selectedRing.position.set(selected.cell.x,.09,selected.cell.z);this.clearHover();
  }

  private async loadUnit(unit:Unit):Promise<void> {
    const root=new THREE.Group();root.userData.unitId=unit.id;
    const hp=new THREE.Sprite(new THREE.SpriteMaterial({color:unit.team==='player'?0x70ed9b:0xff6565,depthTest:false}));hp.position.set(0,1.64,0);hp.scale.set(.8,.065,1);root.add(hp);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.42,.45,48),new THREE.MeshBasicMaterial({color:unit.team==='player'?0x55dfff:0xff677a,side:THREE.DoubleSide,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.y=.02;root.add(ring);
    const visual:UnitVisual={root,hp,lastHp:unit.hp};this.unitVisuals.set(unit.id,visual);this.scene.add(root);
    if(unit.team==='player'){
      const avatar=await this.avatarFactory.create(unit);if(this.disposed){avatar.dispose();return;}visual.avatar=avatar;root.add(avatar.object);root.rotation.y=0;
    }else{
      // Official portrait markers until the intended Chimera 3D files are supplied.
      const name=unit.id==='brute'?'treant':unit.id==='hunter'?'gray-wolf':'aqua-slime-atk';
      const texture=await new THREE.TextureLoader().loadAsync(`./assets/chimeras/${name}-portrait.png`);if(this.disposed){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.03}));sprite.scale.set(1.25,1.25,1);sprite.position.y=.73;root.add(sprite);
    }
  }

  moveUnit(id:string,path:Cell[],done:()=>void):void {const visual=this.unitVisuals.get(id);if(!visual||path.length===0){done();return;}visual.avatar?.play('move');this.clearHover();this.motion={visual,points:path.map(c=>new THREE.Vector3(c.x,.09,c.z)),index:0,done};}
  attack(id:string,targetId:string):void {
    const attacker=this.unitVisuals.get(id),target=this.unitVisuals.get(targetId);if(!attacker||!target)return;
    attacker.avatar?.play('attack');const a=attacker.root.position.clone().add(new THREE.Vector3(0,.7,0));const b=target.root.position.clone().add(new THREE.Vector3(0,.7,0));attacker.root.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);
    // A short XCOM-style push-in puts the acting Axie and target in frame.
    this.cinematic={remaining:1.05,restoreTarget:this.cameraTarget.clone(),restoreDistance:this.distance};
    this.cameraTarget.copy(a.lerp(b,.38));this.cameraTarget.y=.28;this.distance=Math.min(this.distance,8.2);this.canvas.dataset.cinematic='attack';
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),new THREE.LineBasicMaterial({color:0xb8f7ff,transparent:true,opacity:1}));this.scene.add(line);this.effects.push({object:line,remaining:.35,duration:.35});
  }
  private damageText(position:THREE.Vector3,amount:number):void {
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.strokeStyle='#182133';ctx.lineWidth=7;ctx.strokeText(`−${amount}`,64,47);ctx.fillStyle='#fff0bc';ctx.fillText(`−${amount}`,64,47);
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false,transparent:true}));sprite.position.copy(position).add(new THREE.Vector3(0,1.8,0));sprite.scale.set(1.4,.7,1);this.scene.add(sprite);this.effects.push({object:sprite,remaining:1.1,duration:1.1});
  }
  centerOn(unit:Unit):void{this.cameraTarget.set(unit.cell.x,0,unit.cell.z);}
  rotate(amount:number):void{this.yaw+=amount;}
  private intersect(event:PointerEvent):{unit?:string;cell?:Cell}|undefined {
    const rect=this.canvas.getBoundingClientRect();this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
    const roots=[...this.unitVisuals.values()].filter(v=>v.root.visible).map(v=>v.root);
    for(const hit of this.raycaster.intersectObjects(roots,true)){let object:THREE.Object3D|null=hit.object;while(object&&!object.userData.unitId)object=object.parent;if(object?.userData.unitId)return {unit:String(object.userData.unitId)};}
    const hit=this.raycaster.intersectObjects([...this.cells.values()],false)[0];return hit?{cell:hit.object.userData.cell as Cell}:undefined;
  }
  private pick=(event:PointerEvent):void=>{if(event.button!==0||this.motion)return;const hit=this.intersect(event);if(hit?.unit)this.onUnit?.(hit.unit);else if(hit?.cell)this.onCell?.(hit.cell.x,hit.cell.z);};
  private hover=(event:PointerEvent):void=>{
    if(this.motion||!this.state)return;const hit=this.intersect(event);const selected=this.state.units.find(u=>u.id===this.state?.selectedId);this.clearHover();if(!selected)return;
    if(hit?.cell&&this.reachable.has(keyOf(hit.cell))){const path=findPath(this.state,selected.cell,hit.cell,selected.id);if(!path)return;this.pathLine.geometry.dispose();this.pathLine.geometry=new THREE.BufferGeometry().setFromPoints([selected.cell,...path].map(c=>new THREE.Vector3(c.x,.12,c.z)));this.pathLine.computeLineDistances();this.pathLine.visible=true;this.hoverRing.position.set(hit.cell.x,.1,hit.cell.z);this.hoverRing.visible=true;const cover=this.state.cover.get(keyOf(hit.cell));this.onHover?.(`Move · 1 AP · ${path.length} steps${cover?` · ${cover} cover`:''}`);}
    if(hit?.unit){const target=this.state.units.find(u=>u.id===hit.unit);if(!target)return;if(target.team==='enemy'){const ability=this.state.actionMode==='ability';const legal=targetLegal(this.state,selected,target,ability);const cover=coverAt(this.state,target);this.onHover?.(`${target.name} · ${target.hp} HP · ${distance(selected.cell,target.cell)} tiles · ${legal?`${ability?selected.ability.cost:1} AP`:'Out of range or blocked'} · ${cover} cover`);}else this.onHover?.(`${target.name} · ${target.role} · ${target.hp} HP`);}
  };
  private clearHover=():void=>{this.pathLine.visible=false;this.hoverRing.visible=false;};
  private cancel=(event:MouseEvent):void=>{event.preventDefault();this.onCancel?.();};
  private zoom=(event:WheelEvent):void=>{event.preventDefault();this.distance=THREE.MathUtils.clamp(this.distance+event.deltaY*.008,7,23);};
  private keydown=(event:KeyboardEvent):void=>{if(document.querySelector('.modal-layer.show'))return;const key=event.key.toLowerCase();if(key==='q')this.rotate(-Math.PI/4);if(key==='e')this.rotate(Math.PI/4);if(key==='w')this.cameraTarget.z-=.5;if(key==='s')this.cameraTarget.z+=.5;if(key==='a')this.cameraTarget.x-=.5;if(key==='d')this.cameraTarget.x+=.5;};
  private resize=():void=>{const width=this.canvas.clientWidth,height=this.canvas.clientHeight;this.renderer.setSize(width,height,false);this.camera.aspect=width/Math.max(1,height);this.camera.updateProjectionMatrix();};
  private positionCamera(instant=false):void{this.cameraPosition.set(Math.sin(this.yaw)*this.distance,this.distance*.83,Math.cos(this.yaw)*this.distance).add(this.cameraTarget);if(instant)this.camera.position.copy(this.cameraPosition);else this.camera.position.lerp(this.cameraPosition,.1);this.camera.lookAt(this.cameraTarget);}
  private frame=():void=>{
    this.animationId=requestAnimationFrame(this.frame);const delta=Math.min(this.clock.getDelta(),.05);if(document.hidden||this.disposed)return;this.time+=delta;
    if(this.cinematic){this.cinematic.remaining-=delta;if(this.cinematic.remaining<=0){this.cameraTarget.copy(this.cinematic.restoreTarget);this.distance=this.cinematic.restoreDistance;this.cinematic=undefined;delete this.canvas.dataset.cinematic;}}
    this.positionCamera();this.environment.update(this.time);
    if(this.motion){const motion=this.motion;const target=motion.points[motion.index]!;const current=motion.visual.root.position;const d=current.distanceTo(target);if(d<delta*4){current.copy(target);motion.index++;if(motion.index>=motion.points.length){this.motion=undefined;motion.visual.avatar?.play('idle');motion.done();}}else{motion.visual.root.rotation.y=Math.atan2(target.x-current.x,target.z-current.z);current.lerp(target,delta*4/d);}}
    for(const visual of this.unitVisuals.values())visual.avatar?.update(delta);
    this.effects=this.effects.filter(effect=>{effect.remaining-=delta;const material=(effect.object as THREE.Sprite).material as THREE.Material;material.opacity=Math.max(0,effect.remaining/effect.duration);if(effect.object instanceof THREE.Sprite)effect.object.position.y+=delta*.5;if(effect.remaining<=0){this.scene.remove(effect.object);this.release(effect.object);return false;}return true;});
    this.renderer.render(this.scene,this.camera);
    if(this.canvas.dataset.ready==='true'){const projected:Record<string,{x:number;y:number}>={};for(const key of this.reachable){const cell=this.cells.get(key)!;const p=cell.position.clone().project(this.camera);projected[key]={x:(p.x+1)*this.canvas.clientWidth/2,y:(1-p.y)*this.canvas.clientHeight/2};}this.canvas.dataset.reachableScreen=JSON.stringify(projected);}
  };
  private release(root:THREE.Object3D):void{root.traverse(object=>{const mesh=object as THREE.Mesh;mesh.geometry?.dispose();if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){for(const value of Object.values(material))if(value instanceof THREE.Texture)value.dispose();material.dispose();}});}
  dispose():void{this.disposed=true;cancelAnimationFrame(this.animationId);this.motion=undefined;this.canvas.removeEventListener('pointerup',this.pick);this.canvas.removeEventListener('pointermove',this.hover);this.canvas.removeEventListener('pointerleave',this.clearHover);this.canvas.removeEventListener('contextmenu',this.cancel);this.canvas.removeEventListener('wheel',this.zoom);window.removeEventListener('keydown',this.keydown);window.removeEventListener('resize',this.resize);for(const visual of this.unitVisuals.values())visual.avatar?.dispose();this.avatarFactory.dispose();this.environment.dispose();this.release(this.scene);this.renderer.dispose();}
}
