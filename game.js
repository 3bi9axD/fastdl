import * as THREE from 'three';

const root = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x86c9ff);
scene.fog = new THREE.Fog(0x86c9ff, 45, 125);

const camera = new THREE.PerspectiveCamera(62, innerWidth/innerHeight, 0.1, 300);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff,0x4f6b39,2.0));
const sun = new THREE.DirectionalLight(0xffffff,2.2); sun.position.set(25,40,15); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-80;sun.shadow.camera.right=80;sun.shadow.camera.top=80;sun.shadow.camera.bottom=-80;scene.add(sun);

const mat=(c)=>new THREE.MeshStandardMaterial({color:c,roughness:.85});
const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),mat(0x69a95b));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);

function box(x,y,z,w,h,d,c){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.position.set(x,y+h/2,z);m.castShadow=m.receiveShadow=true;scene.add(m);return m}
function road(x,z,w,d){box(x,.012,z,w,.025,d,0x3f454c);for(let i=-Math.floor((w+d)/7);i<Math.floor((w+d)/7);i++){}}
road(0,0,18,180);road(0,0,180,18);
for(let z=-78;z<=78;z+=12){box(0,.03,z,0.3,.03,5,0xf4e66c)}
for(let x=-78;x<=78;x+=12){box(x,.03,0,5,.03,0.3,0xf4e66c)}

// sidewalks
box(-12,.02,0,5,.12,180,0xb7bcc1); box(12,.02,0,5,.12,180,0xb7bcc1); box(0,.02,-12,180,.12,5,0xb7bcc1);box(0,.02,12,180,.12,5,0xb7bcc1);

const buildingColors=[0xf3c86a,0xe58f7a,0x7bc4c4,0xa7a1d2,0xd9d4c5];
function building(x,z,w,d,h,c){box(x,.1,z,w,h,d,c);box(x,h+.1,z,w*.78,.4,d*.78,0xdddddd);const door=box(x,.11,z+d/2+.011,1.6,2.4,.08,0x4d3328);return door}
let seed=7; const rnd=()=>((seed=Math.sin(seed)*10000)-Math.floor(seed));
for(const sx of [-1,1])for(const sz of [-1,1]){
  for(let i=0;i<8;i++){
    const x=sx*(24+rnd()*56),z=sz*(24+rnd()*56),w=7+rnd()*9,d=7+rnd()*8,h=5+rnd()*11;
    building(x,z,w,d,h,buildingColors[Math.floor(rnd()*buildingColors.length)]);
  }
}
// park, trees
function tree(x,z){const trunk=box(x,.1,z,.7,2.7,.7,0x7c5237);const crown=new THREE.Mesh(new THREE.SphereGeometry(2.2,12,10),mat(0x3f8d4b));crown.position.set(x,4,z);crown.castShadow=true;scene.add(crown)}
for(let i=0;i<25;i++){const a=i*.9;tree(-55+Math.sin(a*1.7)*17,45+Math.cos(a)*16)}

// shop + NPC + delivery locations
building(27,-28,13,10,7,0xffc928);const shopSign=box(27,5.8,-22.94,8,.8,.2,0x171717);
const npc=new THREE.Group();const npcBody=new THREE.Mesh(new THREE.CapsuleGeometry(.45,.95,4,8),mat(0x24364b));npcBody.position.y=1.05;const npcHead=new THREE.Mesh(new THREE.SphereGeometry(.42,12,10),mat(0xd19a6b));npcHead.position.y=2.1;npc.add(npcBody,npcHead);npc.position.set(27,0,-18);scene.add(npc);

function marker(color){const g=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(1.3,.12,8,28),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.5}));ring.rotation.x=Math.PI/2;ring.position.y=.18;g.add(ring);const beam=new THREE.Mesh(new THREE.CylinderGeometry(.25,.75,4,16,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.13,side:THREE.DoubleSide}));beam.position.y=2;g.add(beam);scene.add(g);return g}
const npcMarker=marker(0xffd84d);npcMarker.position.set(27,0,-18);
const deliveryMarker=marker(0x5de0ff);deliveryMarker.position.set(-35,0,34);deliveryMarker.visible=false;

// decorative car
const car=new THREE.Group();const carBody=new THREE.Mesh(new THREE.BoxGeometry(3.8,1,2),mat(0xd94242));carBody.position.y=.85;car.add(carBody);const cabin=new THREE.Mesh(new THREE.BoxGeometry(2,0.8,1.75),mat(0x8ac9e9));cabin.position.set(.2,1.65,0);car.add(cabin);for(const x of [-1.15,1.15])for(const z of [-1.05,1.05]){const wh=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.26,16),mat(0x151515));wh.rotation.x=Math.PI/2;wh.position.set(x,.5,z*.87);car.add(wh)}car.position.set(18,0,25);car.rotation.y=Math.PI/2;scene.add(car);

// player
const player=new THREE.Group();
const body=new THREE.Mesh(new THREE.CapsuleGeometry(.48,1.15,6,10),mat(0x202a38));body.position.y=1.2;body.castShadow=true;const head=new THREE.Mesh(new THREE.SphereGeometry(.44,16,12),mat(0xc98f65));head.position.y=2.35;head.castShadow=true;player.add(body,head);
const cap=new THREE.Mesh(new THREE.CylinderGeometry(.46,.46,.2,16),mat(0xffd84d));cap.position.y=2.67;player.add(cap);scene.add(player);

const SAVE='3bi9a-world-save-v1';
let state={coins:500,xp:0,level:1,mission:'talk',x:0,z:24};
try{state={...state,...JSON.parse(localStorage.getItem(SAVE)||'{}')}}catch{}
player.position.set(state.x,0,state.z);
function save(){state.x=+player.position.x.toFixed(2);state.z=+player.position.z.toFixed(2);localStorage.setItem(SAVE,JSON.stringify(state))}
setInterval(save,2000);

const coinsEl=document.querySelector('#coins'),lvlEl=document.querySelector('#level'),xpBar=document.querySelector('#xpBar');
const title=document.querySelector('#missionTitle'),text=document.querySelector('#missionText');
function syncUI(){coinsEl.textContent=state.coins;lvlEl.textContent=state.level;const need=state.level*250;xpBar.style.width=Math.min(100,state.xp/need*100)+'%';
 if(state.mission==='talk'){title.textContent='Talk to Yassine at the delivery shop';text.textContent='Walk to the yellow marker and press E.';npcMarker.visible=true;deliveryMarker.visible=false}
 else if(state.mission==='deliver'){title.textContent='Deliver the package';text.textContent='Reach the blue marker across town.';npcMarker.visible=false;deliveryMarker.visible=true}
 else {title.textContent='Free roam';text.textContent='Explore the city. Return to Yassine for another delivery.';npcMarker.visible=true;deliveryMarker.visible=false}}
syncUI();

const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='e')interact()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
const dialog=document.querySelector('#dialog'),dialogText=document.querySelector('#dialogText');
function distTo(obj){const dx=player.position.x-obj.position.x,dz=player.position.z-obj.position.z;return Math.hypot(dx,dz)}
function interact(){
 if(distTo(npc)<3.7){dialog.classList.remove('hidden');dialogText.textContent=state.mission==='deliver'?'You already have a package. Take it to the blue marker!':'Ready to make some coins? Take this package across town.'}
}
function reward(){state.coins+=150;state.xp+=120;while(state.xp>=state.level*250){state.xp-=state.level*250;state.level++;toast('LEVEL UP! Level '+state.level)}state.mission='done';save();syncUI();toast('+150 Coins  •  +120 XP')}
document.querySelector('#acceptBtn').onclick=()=>{if(state.mission!=='deliver'){state.mission='deliver';syncUI();save();toast('Delivery started!')}dialog.classList.add('hidden')};document.querySelector('#closeBtn').onclick=()=>dialog.classList.add('hidden');
document.querySelector('#resetBtn').onclick=()=>{if(confirm('Reset your saved progress?')){localStorage.removeItem(SAVE);location.reload()}};
let toastTimer;function toast(msg){const el=document.querySelector('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}

// mobile joystick
let joy={x:0,y:0,sprint:false};const jb=document.querySelector('#joyBase'),js=document.querySelector('#joyStick');
function setJoy(e){const r=jb.getBoundingClientRect(),t=e.touches?e.touches[0]:e;let x=t.clientX-(r.left+r.width/2),y=t.clientY-(r.top+r.height/2);const l=Math.hypot(x,y),m=38;if(l>m){x=x/l*m;y=y/l*m}joy.x=x/m;joy.y=y/m;js.style.transform=`translate(${x}px,${y}px)`}
jb.addEventListener('touchstart',setJoy,{passive:false});jb.addEventListener('touchmove',e=>{e.preventDefault();setJoy(e)},{passive:false});jb.addEventListener('touchend',()=>{joy.x=joy.y=0;js.style.transform=''});
document.querySelector('#mobileInteract').onclick=interact;const runBtn=document.querySelector('#mobileSprint');runBtn.addEventListener('touchstart',e=>{e.preventDefault();joy.sprint=true});runBtn.addEventListener('touchend',()=>joy.sprint=false);

const clock=new THREE.Clock();let walkT=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);let mx=0,mz=0;
 if(keys['w']||keys['arrowup'])mz-=1;if(keys['s']||keys['arrowdown'])mz+=1;if(keys['a']||keys['arrowleft'])mx-=1;if(keys['d']||keys['arrowright'])mx+=1;mx+=joy.x;mz+=joy.y;
 const len=Math.hypot(mx,mz);if(len>.08){mx/=len;mz/=len;const speed=(keys['shift']||joy.sprint)?9.2:5.5;player.position.x=THREE.MathUtils.clamp(player.position.x+mx*speed*dt,-86,86);player.position.z=THREE.MathUtils.clamp(player.position.z+mz*speed*dt,-86,86);player.rotation.y=Math.atan2(mx,mz);walkT+=dt*11;body.position.y=1.2+Math.abs(Math.sin(walkT))*.05}
 camera.position.lerp(new THREE.Vector3(player.position.x,7.2,player.position.z+10.5),1-Math.pow(.001,dt));camera.lookAt(player.position.x,1.4,player.position.z-2.5);
 npcMarker.rotation.y+=dt;deliveryMarker.rotation.y+=dt;
 if(state.mission==='deliver'&&distTo(deliveryMarker)<2.2)reward();
 renderer.render(scene,camera)}animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
