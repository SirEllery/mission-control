// ═══════════════════════════════════════════════════
//  Sir Ellery — Mission Control  (Three.js r164)
// ═══════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ── Agent Definitions ──────────────────────────────
const AGENTS = [
  {
    id: 'sir-ellery', name: 'Sir Ellery', role: 'Coordinator',
    model: 'Claude Opus 4.6', color: 0x22ee66,
    orbitRadius: 0, orbitSpeed: 0, // center
    status: 'active', tokens: 184200, messages: 47, errors: 0,
    task: 'Orchestrating dialectic', uptime: '2h 14m', cost: '$0.38',
    sessionCount: 3
  },
  {
    id: 'dreamer', name: 'The Dreamer', role: 'Expansionist',
    model: 'MiniMax M2.5', color: 0xee9922,
    orbitRadius: 8, orbitSpeed: 0.15, orbitPhase: 0,
    status: 'active', tokens: 62400, messages: 18, errors: 0,
    task: 'Round 2 — expanding memory spec', uptime: '1h 48m', cost: '$0.04',
    sessionCount: 2
  },
  {
    id: 'skeptic', name: 'The Skeptic', role: 'Adversarial Reviewer',
    model: 'GPT-5', color: 0xdd44cc,
    orbitRadius: 12, orbitSpeed: 0.10, orbitPhase: Math.PI * 0.7,
    status: 'active', tokens: 41800, messages: 14, errors: 0,
    task: 'Round 2 — stress-testing memory spec', uptime: '1h 48m', cost: '$0.22',
    sessionCount: 2
  },
  {
    id: 'researcher', name: 'The Researcher', role: 'Intelligence',
    model: 'GPT-5', color: 0x44ddee,
    orbitRadius: 16, orbitSpeed: 0.07, orbitPhase: Math.PI * 1.4,
    status: 'idle', tokens: 0, messages: 0, errors: 0,
    task: 'Awaiting deployment', uptime: '—', cost: '$0.00',
    sessionCount: 0
  }
];

// Connections (lightning arcs between collaborating agents)
const CONNECTIONS = [
  { from: 'dreamer', to: 'skeptic', active: true },
  { from: 'sir-ellery', to: 'dreamer', active: true },
  { from: 'sir-ellery', to: 'skeptic', active: false },
];

// ── Globals ────────────────────────────────────────
let scene, camera, renderer, composer, controls, clock;
let agentMeshes = {}; // id → { group, pillar, beam, beamLight, healthRing, label, data }
let lightningLines = [];
let raycaster, mouse;
let hoveredAgent = null;
const tooltip = document.getElementById('agent-tooltip');

// ── Init ───────────────────────────────────────────
function init() {
  clock = new THREE.Clock();
  const canvas = document.getElementById('scene');

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a14);
  scene.fog = new THREE.FogExp2(0x0a0a14, 0.012);

  // Camera
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(12, 18, 24);

  // Controls
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 60;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 3, 0);

  // Post-processing (bloom)
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.0,   // strength
    0.4,   // radius
    0.2    // threshold
  );
  composer.addPass(bloom);

  // Lights
  scene.add(new THREE.AmbientLight(0x222244, 0.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // Ground
  createGround();

  // Agents
  AGENTS.forEach(a => createAgent(a));

  // Orbital rings
  AGENTS.filter(a => a.orbitRadius > 0).forEach(a => createOrbitRing(a));

  // Lightning
  createLightningLines();

  // Raycasting
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2(-999, -999);
  canvas.addEventListener('pointermove', onPointerMove);

  // Resize
  window.addEventListener('resize', onResize);

  // Chat
  initChat();

  // Go
  animate();
}

// ── Ground ─────────────────────────────────────────
function createGround() {
  // Grid helper
  const grid = new THREE.GridHelper(80, 80, 0x1a1a3a, 0x111128);
  grid.position.y = -0.01;
  scene.add(grid);

  // Subtle ground plane
  const geoGround = new THREE.PlaneGeometry(100, 100);
  const matGround = new THREE.MeshStandardMaterial({
    color: 0x0c0c1e, roughness: 1, metalness: 0, transparent: true, opacity: 0.8
  });
  const ground = new THREE.Mesh(geoGround, matGround);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  // Particle field (starfield on the ground)
  const starCount = 600;
  const starGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = Math.random() * 0.3;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0x4444aa, size: 0.08, transparent: true, opacity: 0.5 });
  scene.add(new THREE.Points(starGeo, starMat));
}

// ── Agent Construction ─────────────────────────────
function createAgent(data) {
  const group = new THREE.Group();
  const isCenter = data.orbitRadius === 0;
  const isActive = data.status === 'active';

  // ── Pillar (hexagonal column) ──
  const pillarHeight = isCenter ? 5 : 3;
  const pillarGeo = new THREE.CylinderGeometry(0.6, 0.8, pillarHeight, 6);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: data.color,
    emissive: data.color,
    emissiveIntensity: isActive ? 0.4 : 0.08,
    metalness: 0.7,
    roughness: 0.3,
    transparent: true,
    opacity: isActive ? 0.9 : 0.35
  });
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.y = pillarHeight / 2;
  pillar.userData = { agentId: data.id }; // for raycasting
  group.add(pillar);

  // ── Beam of light (shooting upward) ──
  const beamHeight = isCenter ? 14 : 9;
  const beamGeo = new THREE.CylinderGeometry(0.05, 0.25, beamHeight, 8, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: data.color,
    transparent: true,
    opacity: isActive ? 0.55 : 0,
    side: THREE.DoubleSide
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = pillarHeight + beamHeight / 2;
  group.add(beam);

  // Beam point light
  const beamLight = new THREE.PointLight(data.color, isActive ? 2 : 0, 12);
  beamLight.position.y = pillarHeight + 1;
  group.add(beamLight);

  // ── Health ring (rotating torus at base) ──
  const healthColor = data.errors > 2 ? 0xee4444 : data.errors > 0 ? 0xeeb822 : 0x22ee66;
  const ringGeo = new THREE.TorusGeometry(1.2, 0.04, 8, 48);
  const ringMat = new THREE.MeshBasicMaterial({ color: healthColor, transparent: true, opacity: 0.7 });
  const healthRing = new THREE.Mesh(ringGeo, ringMat);
  healthRing.rotation.x = Math.PI / 2;
  healthRing.position.y = 0.15;
  group.add(healthRing);

  // Second ring (wider, slower)
  const ring2Geo = new THREE.TorusGeometry(1.6, 0.025, 8, 64);
  const ring2Mat = new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.25 });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = 0.1;
  group.add(ring2);

  // ── Token counter (CSS2D would be better, but keeping it simple with sprite) ──
  const label = createTextSprite(data.name, data.color);
  label.position.y = pillarHeight + beamHeight + 1;
  label.scale.set(3, 1.5, 1);
  group.add(label);

  // Position
  if (!isCenter) {
    const angle = data.orbitPhase || 0;
    group.position.x = Math.cos(angle) * data.orbitRadius;
    group.position.z = Math.sin(angle) * data.orbitRadius;
  }

  scene.add(group);
  agentMeshes[data.id] = { group, pillar, beam, beamLight, healthRing, ring2, label, data };
}

function createTextSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, 512, 128);

  const hex = '#' + new THREE.Color(color).getHexString();
  ctx.font = 'bold 42px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow
  ctx.shadowColor = hex;
  ctx.shadowBlur = 20;
  ctx.fillStyle = hex;
  ctx.fillText(text, 256, 64);

  // Crisp
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  return new THREE.Sprite(mat);
}

// ── Orbit Rings ────────────────────────────────────
function createOrbitRing(agentDef) {
  const geo = new THREE.RingGeometry(agentDef.orbitRadius - 0.03, agentDef.orbitRadius + 0.03, 128);
  const mat = new THREE.MeshBasicMaterial({
    color: agentDef.color, transparent: true, opacity: 0.12, side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  scene.add(ring);
}

// ── Lightning Arcs ─────────────────────────────────
function createLightningLines() {
  CONNECTIONS.forEach(conn => {
    const mat = new THREE.LineBasicMaterial({
      color: 0xaaaaff,
      transparent: true,
      opacity: conn.active ? 0.7 : 0,
      linewidth: 1
    });
    const geo = new THREE.BufferGeometry();
    const points = new Float32Array(20 * 3); // 20 segments
    geo.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    lightningLines.push({ line, conn, geo });
  });
}

function updateLightning(time) {
  lightningLines.forEach(({ line, conn, geo }) => {
    if (!conn.active) { line.material.opacity = 0; return; }

    const fromMesh = agentMeshes[conn.from];
    const toMesh = agentMeshes[conn.to];
    if (!fromMesh || !toMesh) return;

    const fromPos = fromMesh.group.position;
    const toPos = toMesh.group.position;
    const positions = geo.attributes.position.array;
    const segments = 20;

    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1);
      const x = fromPos.x + (toPos.x - fromPos.x) * t;
      const z = fromPos.z + (toPos.z - fromPos.z) * t;
      // Arc upward in the middle + jitter
      const baseY = 3 + Math.sin(t * Math.PI) * 4;
      const jitter = (i > 0 && i < segments - 1)
        ? (Math.random() - 0.5) * 1.2 * Math.sin(t * Math.PI)
        : 0;
      positions[i * 3] = x + jitter * 0.5;
      positions[i * 3 + 1] = baseY + jitter;
      positions[i * 3 + 2] = z + jitter * 0.5;
    }
    geo.attributes.position.needsUpdate = true;

    // Flicker
    line.material.opacity = 0.3 + Math.random() * 0.5;
    const blendColor = new THREE.Color(0x8888ff).lerp(new THREE.Color(0xffffff), Math.random() * 0.4);
    line.material.color = blendColor;
  });
}

// ── Raycasting / Tooltip ───────────────────────────
function onPointerMove(e) {
  const chatPanel = document.getElementById('chat-panel');
  const panelRect = chatPanel.getBoundingClientRect();
  // Ignore pointer events over chat panel
  if (e.clientX >= panelRect.left) { hideTooltip(); return; }

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const pillars = Object.values(agentMeshes).map(m => m.pillar);
  const hits = raycaster.intersectObjects(pillars);

  if (hits.length > 0) {
    const id = hits[0].object.userData.agentId;
    hoveredAgent = id;
    showTooltip(id, e.clientX, e.clientY);
  } else {
    hideTooltip();
    hoveredAgent = null;
  }
}

function showTooltip(agentId, mx, my) {
  const a = agentMeshes[agentId].data;
  const statusDot = a.status === 'active' ? 'var(--green)' : a.status === 'error' ? 'var(--red)' : 'var(--text-dim)';
  tooltip.innerHTML = `
    <div class="tt-name" style="color:#${new THREE.Color(a.color).getHexString()}">${a.name}</div>
    <div class="tt-row"><span class="tt-label">Status</span><span class="tt-val"><span class="tt-status" style="background:${statusDot}"></span>${a.status}</span></div>
    <div class="tt-row"><span class="tt-label">Role</span><span class="tt-val">${a.role}</span></div>
    <div class="tt-row"><span class="tt-label">Model</span><span class="tt-val">${a.model}</span></div>
    <div class="tt-row"><span class="tt-label">Task</span><span class="tt-val">${a.task}</span></div>
    <div class="tt-row"><span class="tt-label">Tokens</span><span class="tt-val">${a.tokens.toLocaleString()}</span></div>
    <div class="tt-row"><span class="tt-label">Messages</span><span class="tt-val">${a.messages}</span></div>
    <div class="tt-row"><span class="tt-label">Cost</span><span class="tt-val">${a.cost}</span></div>
    <div class="tt-row"><span class="tt-label">Uptime</span><span class="tt-val">${a.uptime}</span></div>
    <div class="tt-row"><span class="tt-label">Sessions</span><span class="tt-val">${a.sessionCount}</span></div>
  `;
  tooltip.classList.remove('hidden');
  // Position
  const pad = 16;
  let x = mx + pad;
  let y = my + pad;
  if (x + 300 > window.innerWidth) x = mx - 300 - pad;
  if (y + 300 > window.innerHeight) y = my - 300 - pad;
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}

function hideTooltip() {
  tooltip.classList.add('hidden');
}

// ── Animation Loop ─────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = clock.getDelta();

  controls.update();

  // Orbit agents
  AGENTS.forEach(a => {
    if (a.orbitRadius === 0) return;
    const mesh = agentMeshes[a.id];
    const angle = (a.orbitPhase || 0) + t * a.orbitSpeed;
    mesh.group.position.x = Math.cos(angle) * a.orbitRadius;
    mesh.group.position.z = Math.sin(angle) * a.orbitRadius;
  });

  // Animate agent visuals
  Object.values(agentMeshes).forEach(({ pillar, beam, beamLight, healthRing, ring2, data }) => {
    const isActive = data.status === 'active';

    // Pulse emissive
    const pulse = Math.sin(t * 2) * 0.15;
    pillar.material.emissiveIntensity = isActive ? 0.4 + pulse : 0.08;

    // Beam shimmer
    if (isActive) {
      beam.material.opacity = 0.35 + Math.sin(t * 3 + data.orbitPhase) * 0.2;
      beamLight.intensity = 1.5 + Math.sin(t * 4) * 0.5;
    }

    // Health ring rotation
    healthRing.rotation.z = t * 1.5;
    ring2.rotation.z = -t * 0.8;
  });

  // Lightning refresh (every ~5 frames for perf)
  if (Math.floor(t * 60) % 5 === 0) {
    updateLightning(t);
  }

  composer.render();
}

// ── Resize ─────────────────────────────────────────
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// ── Chat Panel ─────────────────────────────────────
function initChat() {
  const toggle = document.getElementById('chat-toggle');
  const panel = document.getElementById('chat-panel');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const messages = document.getElementById('chat-messages');

  toggle.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    toggle.textContent = panel.classList.contains('collapsed') ? '▶' : '◀';
  });

  function send() {
    const text = input.value.trim();
    if (!text) return;
    addChatMsg('user', text);
    input.value = '';
    // Mock response
    setTimeout(() => {
      addChatMsg('assistant', `Acknowledged. Processing: "${text}"\n\n(Live API not connected — mock mode)`);
    }, 800);
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

  // Welcome
  addChatMsg('assistant', 'Mission Control online. All agents reporting.\n\nDreamer ↔ Skeptic dialectic active (Round 2).\nResearcher standing by.');
}

function addChatMsg(role, text) {
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  div.innerHTML = `${text.replace(/\n/g, '<br>')}<div class="meta">${time}</div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// ── Boot ───────────────────────────────────────────
init();
