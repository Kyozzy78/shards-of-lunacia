import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGroups } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { GameState } from '../game/types';

// Decoration is seeded; collision and cover remain owned by the game model.
export class LunacianEnvironment {
  readonly root = new THREE.Group();
  readonly ready: Promise<void>;
  private readonly templates = new Map<string, THREE.Object3D>();
  private readonly water: THREE.Mesh[] = [];
  private seed = 1977;
  private disposed = false;
  private dressed = false;
  private readonly groundTexture = this.paintGround();

  private paintGround():THREE.CanvasTexture {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#779451';ctx.fillRect(0,0,512,512);
    let value=4297;const rand=():number=>{value=(value*1664525+1013904223)>>>0;return value/4294967296;};
    for(let i=0;i<800;i++){const x=rand()*512,y=rand()*512,r=8+rand()*30;const gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,i%3?'#a7ae6c24':'#3e663f28');gradient.addColorStop(1,'#77945100');ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,r*2,r*2);}
    for(let i=0;i<18000;i++){ctx.fillStyle=i%3?'#d2c58a30':'#345b3540';ctx.fillRect(rand()*512,rand()*512,.5+rand()*1.5,.5+rand()*2);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
  }

  constructor() {
    this.buildIsland(6.5, 4.5, 9.3, 7.1, 0);
    for (const [x, z, size, y] of [[-13,-13,4,-3],[18,-18,5,-2],[32,-10,4,-4],[-19,10,3,-6],[9,-29,6,-3]]) {
      this.buildIsland(x!, z!, size!, size! * .7, y!);
    }
    this.buildPaths();
    this.buildCrystals();
    this.ready = this.load();
  }

  private random(): number { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }

  private buildIsland(cx: number, cz: number, rx: number, rz: number, top: number): void {
    const count = 40; const positions: number[] = []; const colors: number[] = [];const uvs:number[]=[];const groups:Array<{start:number;material:number}>=[];
    const rim: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2; const noise = .96 + this.random() * .08;
      // Squircle outline contains every logical corner, without a rectangular slab.
      rim.push(new THREE.Vector3(cx + Math.sign(Math.cos(angle)) * Math.pow(Math.abs(Math.cos(angle)), .58) * rx * noise, top - .05, cz + Math.sign(Math.sin(angle)) * Math.pow(Math.abs(Math.sin(angle)), .58) * rz * noise));
    }
    const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.Color,material=1): void => {
      groups.push({start:positions.length/3,material});
      for (const v of [a,b,c]) { positions.push(v.x,v.y,v.z); colors.push(color.r,color.g,color.b);uvs.push((v.x-cx)/rx/2+.5,(v.z-cz)/rz/2+.5); }
    };
    for (let i = 0; i < count; i++) {
      const a = rim[i]!; const b = rim[(i + 1) % count]!;
      tri(new THREE.Vector3(cx,top-.05,cz), b, a, new THREE.Color(0xffffff),0);
      const lowA = new THREE.Vector3(cx+(a.x-cx)*.84,top-2.7-this.random(),cz+(a.z-cz)*.84);
      const lowB = new THREE.Vector3(cx+(b.x-cx)*.84,top-2.7-this.random(),cz+(b.z-cz)*.84);
      tri(a,b,lowA,new THREE.Color(0xada589).multiplyScalar(.7+this.random()*.3));
      tri(b,lowB,lowA,new THREE.Color(0x8b8976).multiplyScalar(.7+this.random()*.3));
      tri(lowA,lowB,new THREE.Vector3(cx,top-5.8,cz),new THREE.Color(0x757c72));
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2)); geo.computeVertexNormals();for(const group of groups)geo.addGroup(group.start,3,group.material);
    mergeGroups(geo);
    const mesh = new THREE.Mesh(geo,[new THREE.MeshStandardMaterial({map:this.groundTexture,roughness:1,side:THREE.DoubleSide}),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide})]); mesh.receiveShadow=true; mesh.castShadow=true; this.root.add(mesh);
    const waterfall = new THREE.Mesh(new THREE.PlaneGeometry(.8,7,1,12),new THREE.MeshBasicMaterial({color:0xb8f0ff,transparent:true,opacity:.38,side:THREE.DoubleSide,depthWrite:false}));
    waterfall.position.set(cx+rx*.55,top-3.4,cz+rz*.92); this.root.add(waterfall); this.water.push(waterfall);
  }

  private buildPaths(): void {
    const mat = new THREE.MeshStandardMaterial({ color:0xc4bea1,roughness:1 });
    // Weathered paving follows crossing routes, not the gameplay grid.
    for (let row=0;row<16;row++) for(let col=0;col<23;col++) {
      const x=col*.65-.7, z=row*.67-.5;
      const onPath = Math.abs(z-(5+Math.sin(x*.48)*1.1))<1.1 || Math.abs(x-(6.4+Math.sin(z*.5)))<1.15;
      if (!onPath || this.random()<.11) continue;
      const stone=new THREE.Mesh(new THREE.CylinderGeometry(.42,.45,.055,5),mat); stone.scale.set(1,.8,.78); stone.rotation.y=this.random()*.4; stone.position.set(x+(this.random()-.5)*.13,-.005,z+(this.random()-.5)*.13); stone.receiveShadow=true; this.root.add(stone);
    }
  }

  private buildCrystals(): void {
    const material=new THREE.MeshStandardMaterial({color:0x51d7ed,emissive:0x126da1,emissiveIntensity:.55,metalness:.18,roughness:.25});
    for(const [x,z] of [[-1,7],[14,8],[12,-1],[0,-1],[7,11]]) for(let i=0;i<3;i++) {
      const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.5,0),material); crystal.scale.set(.5,1.3+i*.5,.6); crystal.rotation.z=(i-1)*.24; crystal.position.set(x!+i*.28,.55+i*.16,z!+i*.15); crystal.castShadow=true; this.root.add(crystal);
    }
  }

  private async load(): Promise<void> {
    const names=['tree_oak','tree_small','grass_large','grass_leafs','flower_yellowC','flower_purpleC','rock_largeA','rock_largeC','rock_tallA','log_large','plant_bush','wall-half','wall-pillar','wall-doorway','wall-corner-half','tower-square-arch','tower-square-top','flag-banner-long','rocks-small'];
    const loader=new GLTFLoader();
    await Promise.all(names.map(async name=>{
      const gltf=await loader.loadAsync(`./assets/environment/${name}.glb`);
      if(this.disposed) { this.release(gltf.scene); return; }
      gltf.scene.traverse(child=>{
        child.castShadow=true;child.receiveShadow=true;
        const mesh=child as THREE.Mesh;
        if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
          const mat=material as THREE.MeshStandardMaterial;
          // Nature Kit exports metalness=1 even for foliage. Use dielectric
          // response for wood/leaves/stone under the outdoor lighting rig.
          mat.metalness=0;mat.roughness=1;
          if(mat.name==='leafsGreen'||mat.name==='grass')mat.color.set(0x72994b);
          if(mat.name==='dirt')mat.color.set(0xa7a28b);
          if(mat.name==='woodBark')mat.color.set(0x807053);
        }
      }); this.templates.set(name,gltf.scene);
    }));
    if(this.disposed)return;
    // Large silhouettes sit outside the combat area; nothing decorative blocks a route.
    this.place('tower-square-arch',2,-2.6,3.6,0);
    this.place('wall-doorway',8,-2.3,3.5,Math.PI/2);
    this.place('wall-pillar',11.7,-1.8,3.1,.08);
    this.place('wall-corner-half',-1.6,2.4,2.1,Math.PI/2);
    this.place('flag-banner-long',2.2,-2.3,2.8,0);
    this.place('tree_oak',-2,0,3.6,.5); this.place('tree_oak',14.6,1.5,3.8,1);
    this.place('tree_small',12,-2.3,2.6,0); this.place('tree_small',-1.8,8,2.8,.6);
    for(const [x,z,h] of [[-13,-13,4],[18,-18,5],[32,-10,4],[9,-29,6]]) {
      const model=this.place('tower-square-arch',x!,z!,h!,this.random());model.position.y=-2.9;
      const tree=this.place('tree_oak',x!+2,z!,h!*.7,0);tree.position.y=-2.9;
    }
    for(let i=0;i<220;i++) {
      const x=this.random()*16-1.5,z=this.random()*12-1.5;
      // Mostly verges and corners; sparse tiny tufts on navigable terrain.
      const verge=x<0||x>13||z<0||z>9;
      if(!verge && (Math.abs(z-(5+Math.sin(x*.48)))<1.25 || Math.abs(x-6.5)<1.5))continue;
      const name=i%7===0?'flower_purpleC':i%5===0?'flower_yellowC':i%3===0?'grass_leafs':'grass_large';
      this.place(name,x,z,.12+this.random()*(verge?.45:.17),this.random()*6.28);
    }
    for(let i=0;i<22;i++) {
      const angle=i/22*Math.PI*2; const x=6.5+Math.cos(angle)*8.4,z=4.5+Math.sin(angle)*6.4;
      this.place(i%3===0?'plant_bush':'rock_largeC',x,z,.25+this.random()*.35,this.random()*6);
    }
  }

  private place(name:string,x:number,z:number,height:number,yaw:number):THREE.Object3D {
    const object=this.templates.get(name)!.clone(true);
    const box=new THREE.Box3().setFromObject(object); const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());
    const wrapper=new THREE.Group();object.position.sub(new THREE.Vector3(center.x,box.min.y,center.z));wrapper.add(object);wrapper.scale.setScalar(height/Math.max(.01,size.y));wrapper.rotation.y=yaw;wrapper.position.set(x,0,z);this.root.add(wrapper);return wrapper;
  }

  async dressBattle(state:GameState):Promise<void> {
    await this.ready;if(this.disposed||this.dressed)return;this.dressed=true;
    let i=0;
    for(const key of state.blocked) {
      const [x=0,z=0]=key.split(',').map(Number);
      const name=i%5===0?'rock_tallA':i%4===0?'log_large':i%3===0?'wall-pillar':'wall-half';
      const object=this.place(name,x,z,name==='log_large'?.48:name==='wall-pillar'?1.35:.85,(i%2)*Math.PI/2);
      // Constrain cover geometry to the one blocked cell it represents.
      const size=new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());object.scale.x*=.86/Math.max(size.x,.01);object.scale.z*=.86/Math.max(size.z,.01);
      this.place('grass_leafs',x+.35,z+.3,.35,i);
      i++;
    }
    this.instanceRepeatedMeshes();
  }

  private instanceRepeatedMeshes():void {
    this.root.updateMatrixWorld(true);
    const batches=new Map<string,THREE.Mesh[]>();
    this.root.traverse(object=>{if(!(object instanceof THREE.Mesh)||!object.castShadow)return;const material=object.material;if(Array.isArray(material))return;const key=`${object.geometry.uuid}/${material.uuid}`;const batch=batches.get(key)??[];batch.push(object);batches.set(key,batch);});
    for(const meshes of batches.values()){
      if(meshes.length<3)continue;const first=meshes[0]!;const instances=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
      meshes.forEach((mesh,i)=>{instances.setMatrixAt(i,mesh.matrixWorld);mesh.visible=false;});instances.castShadow=true;instances.receiveShadow=true;instances.computeBoundingSphere();this.root.add(instances);
    }
  }

  update(time:number):void { for(let i=0;i<this.water.length;i++) (this.water[i]!.material as THREE.MeshBasicMaterial).opacity=.3+Math.sin(time*1.5+i)*.07; }
  private release(root:THREE.Object3D):void {root.traverse(child=>{const mesh=child as THREE.Mesh;mesh.geometry?.dispose();if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]) {for(const value of Object.values(material))if(value instanceof THREE.Texture)value.dispose();material.dispose();}});}
  dispose():void {this.disposed=true;this.release(this.root);for(const template of this.templates.values())this.release(template);}
}
