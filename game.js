import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.0/firebase-app.js';
import { getDatabase, ref, set, update, onValue, onChildAdded, onChildChanged, onChildRemoved, push, onDisconnect, serverTimestamp, query, limitToLast } from 'https://www.gstatic.com/firebasejs/12.2.0/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyA8YL70CSgDJ8CdPT1Q8doAiy-8jYoyxe0',
  authDomain: 'bi9agame.firebaseapp.com',
  databaseURL: 'https://bi9agame-default-rtdb.firebaseio.com',
  projectId: 'bi9agame',
  storageBucket: 'bi9agame.firebasestorage.app',
  messagingSenderId: '959072355800',
  appId: '1:959072355800:web:e551182bc78cf5b6d61ead'
};

const BLOCKS = {
  grass: { color: 0x67ad45 },
  dirt:  { color: 0x8b5a34 },
  stone: { color: 0x8d9397 },
  wood:  { color: 0x9b6a39 },
  leaves:{ color: 0x3f8537, transparent:true, opacity:.92 },
  sand:  { color: 0xd9c27a },
  brick: { color: 0xb85f4b },
  glass: { color: 0xa9dcef, transparent:true, opacity:.42 }
};
const BLOCK_ORDER = Object.keys(BLOCKS);
const CHUNK = 16;
const LOAD_RADIUS = innerWidth < 800 ? 2 : 3;
const WORLD_SEED = 93841;
const PLAYER_HEIGHT = 1.72;
const GRAVITY = 22;
const SPEED = 6.0;
const JUMP = 8.2;

let app, db;
let firebaseOK = false;
try { app = initializeApp(firebaseConfig); db = getDatabase(app); firebaseOK = true; } catch(e) { console.warn(e); }

const startScreen = document.getElementById('startScreen');
const gameUI = document.getElementById('gameUI');
const nameInput = document.getElementById('nameInput');
const playBtn = document.getElementById('playBtn');
const coordsEl = document.getElementById('coords');
const saveStatus = document.getElementById('saveStatus');
const onlineCount = document.getElementById('onlineCount');
const playersList = document.getElementById('playersList');
const hotbar = document.getElementById('hotbar');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const messageEl = document.getElementById('message');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x79bce8);
scene.fog = new THREE.Fog(0x79bce8, 34, 86);
const camera = new THREE.PerspectiveCamera(72, innerWidth/innerHeight, .08, 150);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xd9efff, 0x5d6b3f, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(30,50,20); scene.add(sun);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.object);
controls.object.position.set(0, terrainHeight(0,0)+PLAYER_HEIGHT+1, 0);

const boxGeom = new THREE.BoxGeometry(1,1,1);
const mats = {};
for (const [name,b] of Object.entries(BLOCKS)) mats[name] = new THREE.MeshLambertMaterial({color:b.color,transparent:!!b.transparent,opacity:b.opacity??1,depthWrite:!b.transparent});
const chunkMeshes = new Map();
const edits = new Map(); // key xyz -> block type | null
const remotePlayers = new Map();
let playerId = localStorage.getItem('bi9a-player-id') || crypto.randomUUID();
localStorage.setItem('bi9a-player-id', playerId);
let playerName = 'Player';
let selectedBlock = 0;
let velocityY = 0, grounded = false;
let lastTime = performance.now(), lastPresence=0, lastChunkX=9999,lastChunkZ=9999;
let gameStarted = false;
const keys = {};
const raycaster = new THREE.Raycaster();
raycaster.far = 6;
const rayTargets = [];
let mobileMove = {x:0,y:0};
let touchLookId=null, lastTouchX=0,lastTouchY=0;

function hash2(x,z){ let n=(x*374761393+z*668265263+WORLD_SEED*1447)|0; n=(n^(n>>>13))*1274126177; return ((n^(n>>>16))>>>0)/4294967295; }
function smoothNoise(x,z){
  const x0=Math.floor(x),z0=Math.floor(z),tx=x-x0,tz=z-z0;
  const s=t=>t*t*(3-2*t); const a=hash2(x0,z0),b=hash2(x0+1,z0),c=hash2(x0,z0+1),d=hash2(x0+1,z0+1);
  const ab=a+(b-a)*s(tx), cd=c+(d-c)*s(tx); return ab+(cd-ab)*s(tz);
}
function terrainHeight(x,z){
  const n1=smoothNoise(x/18,z/18), n2=smoothNoise(x/43+11,z/43-7), n3=smoothNoise(x/7-31,z/7+18);
  return Math.floor(5 + n1*6 + n2*7 + n3*2 + Math.sin(x*.055)*1.5 + Math.cos(z*.047)*1.5);
}
function worldKey(x,y,z){return `${x},${y},${z}`}
function chunkKey(cx,cz){return `${cx},${cz}`}
function baseBlock(x,y,z){
  const h=terrainHeight(x,z);
  if(y>h) return null;
  if(y===h) return h<=6?'sand':'grass';
  if(y>=h-2) return h<=6?'sand':'dirt';
  return 'stone';
}
function getBlock(x,y,z){ const k=worldKey(x,y,z); return edits.has(k)?edits.get(k):baseBlock(x,y,z); }
function isTreePart(x,y,z){
  // deterministic sparse trees, separate from base terrain
  for(let tx=x-2;tx<=x+2;tx++) for(let tz=z-2;tz<=z+2;tz++){
    const h=terrainHeight(tx,tz); if(h<=7 || hash2(tx*7,tz*7)>.035) continue;
    if(x===tx&&z===tz&&y>h&&y<=h+4) return 'wood';
    if(y>=h+3&&y<=h+5 && Math.abs(x-tx)<=2 && Math.abs(z-tz)<=2){
      if(Math.abs(x-tx)+Math.abs(z-tz)+(y-(h+3))<5) return 'leaves';
    }
  }
  return null;
}
function effectiveBlock(x,y,z){ const k=worldKey(x,y,z); if(edits.has(k)) return edits.get(k); return baseBlock(x,y,z) || isTreePart(x,y,z); }

function clearChunk(cx,cz){
  const k=chunkKey(cx,cz), group=chunkMeshes.get(k); if(!group)return;
  group.traverse(o=>{ if(o.isMesh){const i=rayTargets.indexOf(o);if(i>=0)rayTargets.splice(i,1);} });
  scene.remove(group); chunkMeshes.delete(k);
}
function buildChunk(cx,cz){
  clearChunk(cx,cz);
  const group=new THREE.Group(); group.userData={cx,cz};
  const byType={}; BLOCK_ORDER.forEach(t=>byType[t]=[]);
  const minX=cx*CHUNK,minZ=cz*CHUNK;
  for(let lx=0;lx<CHUNK;lx++) for(let lz=0;lz<CHUNK;lz++){
    const x=minX+lx,z=minZ+lz,h=terrainHeight(x,z);
    const yMin=Math.max(0,h-4), yMax=h+6;
    for(let y=yMin;y<=yMax;y++){
      const type=effectiveBlock(x,y,z); if(!type)continue;
      // only render blocks with at least one exposed face
      const exposed = !effectiveBlock(x+1,y,z)||!effectiveBlock(x-1,y,z)||!effectiveBlock(x,y+1,z)||!effectiveBlock(x,y-1,z)||!effectiveBlock(x,y,z+1)||!effectiveBlock(x,y,z-1);
      if(exposed) byType[type]?.push({x,y,z});
    }
  }
  const m=new THREE.Matrix4();
  for(const type of BLOCK_ORDER){ const arr=byType[type]; if(!arr.length)continue;
    const mesh=new THREE.InstancedMesh(boxGeom,mats[type],arr.length); mesh.userData.instanceBlocks=arr; mesh.userData.blockType=type;
    for(let i=0;i<arr.length;i++){const p=arr[i];m.makeTranslation(p.x,p.y,p.z);mesh.setMatrixAt(i,m);} mesh.instanceMatrix.needsUpdate=true;
    group.add(mesh); rayTargets.push(mesh);
  }
  chunkMeshes.set(chunkKey(cx,cz),group); scene.add(group);
}
function ensureChunks(force=false){
  const p=controls.object.position,cx=Math.floor(p.x/CHUNK),cz=Math.floor(p.z/CHUNK); if(!force&&cx===lastChunkX&&cz===lastChunkZ)return; lastChunkX=cx;lastChunkZ=cz;
  const needed=new Set();
  for(let dx=-LOAD_RADIUS;dx<=LOAD_RADIUS;dx++)for(let dz=-LOAD_RADIUS;dz<=LOAD_RADIUS;dz++){if(dx*dx+dz*dz>(LOAD_RADIUS+.5)**2)continue; const k=chunkKey(cx+dx,cz+dz);needed.add(k);if(!chunkMeshes.has(k))buildChunk(cx+dx,cz+dz);}
  for(const [k,g] of chunkMeshes) if(!needed.has(k)) clearChunk(g.userData.cx,g.userData.cz);
}
function rebuildAroundBlock(x,z){ const cx=Math.floor(x/CHUNK),cz=Math.floor(z/CHUNK); for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const k=chunkKey(cx+dx,cz+dz);if(chunkMeshes.has(k))buildChunk(cx+dx,cz+dz);} }

function selectedHit(){
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera); const hits=raycaster.intersectObjects(rayTargets,false); if(!hits.length)return null;
  const h=hits[0], p=h.object.userData.instanceBlocks?.[h.instanceId]; if(!p)return null; return {hit:h,block:p};
}
async function changeBlock(x,y,z,value){
  if(y<0||y>70)return; const k=worldKey(x,y,z); edits.set(k,value); rebuildAroundBlock(x,z); flash(value?`Placed ${value}`:'Block broken');
  if(firebaseOK){ try{saveStatus.textContent='World: saving…'; await set(ref(db,`voxel/worlds/main/edits/${encodeURIComponent(k)}`), value===null?'__AIR__':value); saveStatus.textContent='World: saved ✓';}catch(e){saveStatus.textContent='World: save blocked';console.warn(e);} }
}
function breakBlock(){const s=selectedHit();if(!s)return;const {x,y,z}=s.block;changeBlock(x,y,z,null)}
function placeBlock(){const s=selectedHit();if(!s)return;const b=s.block,n=s.hit.face?.normal;if(!n)return;const x=b.x+Math.round(n.x),y=b.y+Math.round(n.y),z=b.z+Math.round(n.z);const pp=controls.object.position;if(Math.abs(pp.x-x)<.7&&Math.abs(pp.z-z)<.7&&y>pp.y-PLAYER_HEIGHT-.2&&y<pp.y+.5)return;changeBlock(x,y,z,BLOCK_ORDER[selectedBlock])}

function groundAt(x,z,currentY){
  const ix=Math.round(x),iz=Math.round(z); let highest=0; const top=Math.max(terrainHeight(ix,iz)+7,Math.ceil(currentY+2));
  for(let y=top;y>=0;y--) if(effectiveBlock(ix,y,iz)){highest=y+.5;break;} return highest;
}
function collidesAt(x,y,z){
  const checks=[[x-.28,z-.28],[x+.28,z-.28],[x-.28,z+.28],[x+.28,z+.28]];
  for(const [cx,cz] of checks){for(const py of [y-PLAYER_HEIGHT+.15,y-PLAYER_HEIGHT/2,y-.15]){if(effectiveBlock(Math.round(cx),Math.round(py),Math.round(cz)))return true;}} return false;
}
function updateMovement(dt){
  const obj=controls.object; const forward=(keys.KeyW?1:0)-(keys.KeyS?1:0)-mobileMove.y; const right=(keys.KeyD?1:0)-(keys.KeyA?1:0)+mobileMove.x;
  const len=Math.hypot(forward,right)||1; const f=forward/len,r=right/len;
  if(f||r){const old=obj.position.clone(); controls.moveForward(f*SPEED*dt); controls.moveRight(r*SPEED*dt); if(collidesAt(obj.position.x,obj.position.y,obj.position.z)){obj.position.x=old.x;obj.position.z=old.z;}}
  velocityY-=GRAVITY*dt; obj.position.y+=velocityY*dt;
  const gy=groundAt(obj.position.x,obj.position.z,obj.position.y)+PLAYER_HEIGHT;
  if(obj.position.y<=gy){obj.position.y=gy;velocityY=0;grounded=true}else grounded=false;
  if(obj.position.y<0)obj.position.set(0,terrainHeight(0,0)+PLAYER_HEIGHT+2,0);
  coordsEl.textContent=`X ${obj.position.x.toFixed(1)} Y ${obj.position.y.toFixed(1)} Z ${obj.position.z.toFixed(1)}`;
}
function doJump(){if(grounded){velocityY=JUMP;grounded=false}}

function makePlayerMesh(color=0x3d7eff){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(.58,.85,.32),new THREE.MeshLambertMaterial({color}));body.position.y=.9;
  const head=new THREE.Mesh(new THREE.BoxGeometry(.52,.52,.52),new THREE.MeshLambertMaterial({color:0xe2b58d}));head.position.y=1.58;
  const legMat=new THREE.MeshLambertMaterial({color:0x33446d}); for(const x of [-.16,.16]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.22,.72,.25),legMat);leg.position.set(x,.36,0);g.add(leg)}
  g.add(body,head); return g;
}

function setupFirebase(){
  if(!firebaseOK){saveStatus.textContent='World: offline local';return;}
  saveStatus.textContent='World: loading saves…';
  onValue(ref(db,'voxel/worlds/main/edits'), snap=>{
    edits.clear(); const data=snap.val()||{}; for(const [ek,v] of Object.entries(data)){const k=decodeURIComponent(ek);edits.set(k,v==='__AIR__'?null:v);} ensureChunks(true); saveStatus.textContent='World: saved ✓';
  },()=>saveStatus.textContent='World: database rules blocked');
  const myRef=ref(db,`voxel/worlds/main/players/${playerId}`); onDisconnect(myRef).remove();
  onValue(ref(db,'voxel/worlds/main/players'),snap=>{
    const all=snap.val()||{}; onlineCount.textContent=`• ${Object.keys(all).length||1} online`; playersList.innerHTML='';
    const live=new Set();
    for(const [id,p] of Object.entries(all)){
      live.add(id); const row=document.createElement('div');row.className='playerRow';row.innerHTML=`<span class="playerDot"></span>${esc(p.name||'Player')}`;playersList.appendChild(row);
      if(id===playerId)continue; let rp=remotePlayers.get(id); if(!rp){rp=makePlayerMesh(p.color||0x3978dc);remotePlayers.set(id,rp);scene.add(rp)} rp.position.set(p.x||0,p.y? p.y-PLAYER_HEIGHT:0,p.z||0);rp.rotation.y=p.ry||0;
    }
    for(const [id,m] of remotePlayers)if(!live.has(id)){scene.remove(m);remotePlayers.delete(id)}
  });
  onChildAdded(query(ref(db,'voxel/worlds/main/chat'),limitToLast(20)),s=>addChat(s.val()));
}
function sendPresence(){if(!firebaseOK)return;const p=controls.object.position; set(ref(db,`voxel/worlds/main/players/${playerId}`),{name:playerName,x:+p.x.toFixed(2),y:+p.y.toFixed(2),z:+p.z.toFixed(2),ry:+camera.rotation.y.toFixed(3),color:0x3978dc,t:serverTimestamp()}).catch(()=>{});}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function addChat(d){if(!d)return;const div=document.createElement('div');div.className='chatLine';div.innerHTML=`<span class="chatName">${esc(d.name||'Player')}:</span> ${esc(d.text||'')}`;chatMessages.appendChild(div);while(chatMessages.children.length>18)chatMessages.firstChild.remove();}
chatForm.addEventListener('submit',e=>{e.preventDefault();const text=chatInput.value.trim();if(!text)return;chatInput.value=''; if(firebaseOK)push(ref(db,'voxel/worlds/main/chat'),{name:playerName,text,t:serverTimestamp()});else addChat({name:playerName,text});chatInput.blur();});

function buildHotbar(){hotbar.innerHTML='';BLOCK_ORDER.forEach((type,i)=>{const b=document.createElement('div');b.className='slot'+(i===selectedBlock?' selected':'');b.innerHTML=`<span class="slotNum">${i+1}</span><span class="blockIcon" style="background:#${BLOCKS[type].color.toString(16).padStart(6,'0')};opacity:${BLOCKS[type].opacity??1}"></span>`;b.onclick=()=>{selectedBlock=i;buildHotbar()};hotbar.appendChild(b)});}
function flash(t){messageEl.textContent=t;messageEl.style.opacity=1;clearTimeout(flash.t);flash.t=setTimeout(()=>messageEl.style.opacity=0,850)}

playBtn.addEventListener('click',()=>{
  playerName=(nameInput.value.trim()||'Player').slice(0,18);localStorage.setItem('bi9a-name',playerName);startScreen.classList.add('hidden');gameUI.classList.remove('hidden');gameStarted=true;buildHotbar();ensureChunks(true);setupFirebase();
  if(!matchMedia('(pointer:coarse)').matches) controls.lock();
});
nameInput.value=localStorage.getItem('bi9a-name')||'Player';
renderer.domElement.addEventListener('click',e=>{if(!gameStarted)return;if(matchMedia('(pointer:coarse)').matches)return;if(!controls.isLocked){controls.lock();return;} if(e.button===0)breakBlock();});
window.addEventListener('contextmenu',e=>{e.preventDefault();if(gameStarted&&!matchMedia('(pointer:coarse)').matches)placeBlock()});
window.addEventListener('keydown',e=>{if(document.activeElement===chatInput)return;keys[e.code]=true;if(e.code==='Space'){e.preventDefault();doJump()}if(e.code==='Enter'){chatInput.focus()}if(/^Digit[1-8]$/.test(e.code)){selectedBlock=+e.code.slice(5)-1;buildHotbar()}});
window.addEventListener('keyup',e=>keys[e.code]=false);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

// Mobile joystick
const joystick=document.getElementById('joystick'),stick=document.getElementById('stick'); let joyId=null;
function joyMove(e){const t=[...e.changedTouches].find(t=>t.identifier===joyId);if(!t)return;const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=t.clientX-cx,dy=t.clientY-cy;const len=Math.hypot(dx,dy),max=45;if(len>max){dx=dx/len*max;dy=dy/len*max}stick.style.transform=`translate(${dx}px,${dy}px)`;mobileMove.x=dx/max;mobileMove.y=dy/max;}
joystick.addEventListener('touchstart',e=>{joyId=e.changedTouches[0].identifier;joyMove(e)},{passive:false});joystick.addEventListener('touchmove',e=>{e.preventDefault();joyMove(e)},{passive:false});joystick.addEventListener('touchend',e=>{if([...e.changedTouches].some(t=>t.identifier===joyId)){joyId=null;mobileMove={x:0,y:0};stick.style.transform=''}});
document.getElementById('jumpBtn').addEventListener('touchstart',e=>{e.preventDefault();doJump()},{passive:false});document.getElementById('breakBtn').addEventListener('touchstart',e=>{e.preventDefault();breakBlock()},{passive:false});document.getElementById('placeBtn').addEventListener('touchstart',e=>{e.preventDefault();placeBlock()},{passive:false});
// mobile camera look on free screen area
renderer.domElement.addEventListener('touchstart',e=>{for(const t of e.changedTouches){if(t.clientX>innerWidth*.35){touchLookId=t.identifier;lastTouchX=t.clientX;lastTouchY=t.clientY;break;}}},{passive:false});
renderer.domElement.addEventListener('touchmove',e=>{const t=[...e.changedTouches].find(t=>t.identifier===touchLookId);if(!t)return;e.preventDefault();const dx=t.clientX-lastTouchX,dy=t.clientY-lastTouchY;lastTouchX=t.clientX;lastTouchY=t.clientY;controls.object.rotation.y-=dx*.004;camera.rotation.x=Math.max(-1.45,Math.min(1.45,camera.rotation.x-dy*.004));},{passive:false});
renderer.domElement.addEventListener('touchend',e=>{if([...e.changedTouches].some(t=>t.identifier===touchLookId))touchLookId=null});

function animate(now){requestAnimationFrame(animate);const dt=Math.min(.04,(now-lastTime)/1000);lastTime=now;if(gameStarted){updateMovement(dt);ensureChunks();if(now-lastPresence>300){sendPresence();lastPresence=now}}renderer.render(scene,camera)}
requestAnimationFrame(animate);
