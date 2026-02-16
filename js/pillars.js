import * as THREE from 'three';

const STATUS_CONFIG = {
    active:    { emissive: 1.0,  opacity: 0.95, lightIntensity: 3,   haloOpacity: 0.12, pulse: true  },
    idle:      { emissive: 0.7,  opacity: 0.9,  lightIntensity: 2,   haloOpacity: 0.08, pulse: false },
    error:     { emissive: 0.6,  opacity: 0.8,  lightIntensity: 2,   haloOpacity: 0.10, pulse: false },
    completed: { emissive: 0.5,  opacity: 0.7,  lightIntensity: 1.5, haloOpacity: 0.06, pulse: false },
    offline:   { emissive: 0.3,  opacity: 0.5,  lightIntensity: 0.5, haloOpacity: 0.03, pulse: false }
};

// ═══ PLASMA SHELL — lightning arcs flickering around the hexagon ═══
function createPlasmaShell(agent, bodyHeight, floatY) {
    const shell = new THREE.Group();
    const arcCount = 20;
    const arcs = [];

    for (let i = 0; i < arcCount; i++) {
        const points = [];
        const segments = 8;
        for (let s = 0; s <= segments; s++) {
            points.push(new THREE.Vector3(0, s * 0.1, 0));
        }
        const curve = new THREE.CatmullRomCurve3(points);

        // White-hot core like real lightning
        const geo = new THREE.TubeGeometry(curve, 8, 0.018, 4, false);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.8,
            blending: THREE.AdditiveBlending, side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        shell.add(mesh);

        // Electric blue glow around each arc
        const glowGeo = new THREE.TubeGeometry(curve, 8, 0.07, 4, false);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x6699ff, transparent: true, opacity: 0.2,
            blending: THREE.AdditiveBlending, side: THREE.DoubleSide
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        shell.add(glowMesh);

        // Outer bloom halo
        const bloomGeo = new THREE.TubeGeometry(curve, 8, 0.15, 4, false);
        const bloomMat = new THREE.MeshBasicMaterial({
            color: 0x4466cc, transparent: true, opacity: 0.06,
            blending: THREE.AdditiveBlending, side: THREE.DoubleSide
        });
        const bloomMesh = new THREE.Mesh(bloomGeo, bloomMat);
        shell.add(bloomMesh);

        arcs.push({ mesh, mat, glowMesh, glowMat, bloomMesh, bloomMat, phase: Math.random() * Math.PI * 2 });
    }

    return { group: shell, arcs };
}

function updatePlasmaShell(plasma, agent, bodyHeight, floatY, time) {
    if (!plasma) return;
    const radius = 0.95;
    const centerY = floatY + bodyHeight / 2;

    plasma.arcs.forEach((arc, i) => {
        // Each arc crawls around the hex surface
        const angle1 = (i / plasma.arcs.length) * Math.PI * 2 + time * 1.5 + arc.phase;
        const angle2 = angle1 + 0.4 + Math.sin(time * 3 + arc.phase) * 0.3;
        const yOff1 = (Math.sin(time * 2.5 + arc.phase) * 0.5) * bodyHeight * 0.45;
        const yOff2 = (Math.sin(time * 2.5 + arc.phase + 1.5) * 0.5) * bodyHeight * 0.45;

        const start = new THREE.Vector3(
            Math.cos(angle1) * radius, centerY + yOff1, Math.sin(angle1) * radius
        );
        const end = new THREE.Vector3(
            Math.cos(angle2) * radius, centerY + yOff2, Math.sin(angle2) * radius
        );

        // Generate jagged path between start and end
        const points = [];
        const segs = 8;
        for (let s = 0; s <= segs; s++) {
            const t = s / segs;
            const p = start.clone().lerp(end, t);
            if (s > 0 && s < segs) {
                const jitter = 0.12;
                p.x += (Math.random() - 0.5) * jitter;
                p.y += (Math.random() - 0.5) * jitter;
                p.z += (Math.random() - 0.5) * jitter;
            }
            points.push(p);
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const newGeo = new THREE.TubeGeometry(curve, 8, 0.018, 4, false);
        arc.mesh.geometry.dispose();
        arc.mesh.geometry = newGeo;

        const newGlowGeo = new THREE.TubeGeometry(curve, 8, 0.07, 4, false);
        arc.glowMesh.geometry.dispose();
        arc.glowMesh.geometry = newGlowGeo;

        const newBloomGeo = new THREE.TubeGeometry(curve, 8, 0.15, 4, false);
        arc.bloomMesh.geometry.dispose();
        arc.bloomMesh.geometry = newBloomGeo;

        // Flicker like real lightning
        const flicker = Math.random();
        if (flicker > 0.8) {
            // BRIGHT flash
            arc.mat.opacity = 1.0;
            arc.glowMat.opacity = 0.5;
            arc.bloomMat.opacity = 0.15;
        } else if (flicker > 0.3) {
            // Normal
            arc.mat.opacity = 0.7;
            arc.glowMat.opacity = 0.25;
            arc.bloomMat.opacity = 0.06;
        } else if (flicker > 0.1) {
            // Dim
            arc.mat.opacity = 0.3;
            arc.glowMat.opacity = 0.1;
            arc.bloomMat.opacity = 0.03;
        } else {
            // Momentary blackout
            arc.mat.opacity = 0.0;
            arc.glowMat.opacity = 0.0;
            arc.bloomMat.opacity = 0.0;
        }
    });
}

export function createPillars(agents) {
    const pillars = [];

    agents.forEach(agent => {
        const config = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;
        const pillarGroup = new THREE.Group();
        pillarGroup.name = agent.id;

        const floatY = agent.floatHeight || 2.5;
        const pos = agent.position || [0, 0, 0];
        pillarGroup.position.set(pos[0], 0, pos[2] || 0);

        // Tether
        pillarGroup.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,floatY,0)]),
            new THREE.LineBasicMaterial({ color: agent.color, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending })
        ));

        // Ground shadow
        const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(0.8, 32),
            new THREE.MeshBasicMaterial({ color: agent.color, transparent: true, opacity: config.emissive * 0.05, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
        );
        shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01;
        pillarGroup.add(shadow);

        // Hex body
        const bodyHeight = agent.height;
        const bodyMat = new THREE.MeshStandardMaterial({
            color: agent.color, emissive: agent.color, emissiveIntensity: config.emissive,
            transparent: true, opacity: config.opacity, metalness: 0.3, roughness: 0.2
        });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.75, bodyHeight, 6), bodyMat);
        body.position.y = floatY + bodyHeight / 2;
        pillarGroup.add(body);

        // Cap
        const capMat = new THREE.MeshStandardMaterial({
            color: agent.color, emissive: agent.color, emissiveIntensity: config.emissive * 1.0,
            metalness: 0.5, roughness: 0.1
        });
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 0.25, 6), capMat);
        cap.position.y = floatY + bodyHeight + 0.125;
        pillarGroup.add(cap);

        // Health ring
        const hc = agent.errorCount > 0 ? '#ff4444' : (agent.status === 'idle' ? '#ffaa00' : '#00ff88');
        const healthRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.0, 0.035, 8, 64),
            new THREE.MeshBasicMaterial({ color: hc, transparent: true, opacity: config.emissive * 0.5, blending: THREE.AdditiveBlending })
        );
        healthRing.rotation.x = -Math.PI / 2; healthRing.position.y = floatY + 0.05;
        pillarGroup.add(healthRing);

        // Halo
        const haloMat = new THREE.MeshBasicMaterial({
            color: agent.color, transparent: true, opacity: config.haloOpacity,
            side: THREE.BackSide, blending: THREE.AdditiveBlending
        });
        const halo = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, bodyHeight, 16, 1, true), haloMat);
        halo.position.y = floatY + bodyHeight / 2;
        pillarGroup.add(halo);

        // Beam — ALWAYS ON for all agents
        const beamHeight = agent.height >= 6 ? 6 : 4;
        const beamBase = floatY + bodyHeight + 0.25;

        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.10, beamHeight, 8, 1, true),
            new THREE.MeshBasicMaterial({ color: agent.color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
        );
        beam.position.y = beamBase + beamHeight / 2;
        pillarGroup.add(beam);

        const beamGlow = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.3, beamHeight, 8, 1, true),
            new THREE.MeshBasicMaterial({ color: agent.color, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
        );
        beamGlow.position.y = beamBase + beamHeight / 2;
        pillarGroup.add(beamGlow);

        // COUNTER — ALWAYS ON
        const cc = createCounterCanvas(agent);
        const ct = new THREE.CanvasTexture(cc);
        ct.minFilter = THREE.LinearFilter;
        const beamCounter = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, alphaTest: 0.01 }));
        beamCounter.position.y = beamBase + beamHeight + 2.0;
        beamCounter.scale.set(10, 5, 1);
        beamCounter._canvas = cc; beamCounter._texture = ct;
        pillarGroup.add(beamCounter);

        // INFO PANEL
        const ic = createInfoPanelCanvas(agent);
        const it = new THREE.CanvasTexture(ic);
        it.minFilter = THREE.LinearFilter;
        const infoPanel = new THREE.Sprite(new THREE.SpriteMaterial({ map: it, transparent: true, alphaTest: 0.01, depthWrite: false }));
        infoPanel.position.set(5.0, floatY + bodyHeight * 0.3, 0);
        infoPanel.scale.set(9, 7.5, 1);
        infoPanel._canvas = ic; infoPanel._texture = it;
        pillarGroup.add(infoPanel);

        // NO standalone name label — name is on the panel only

        // Point light
        const pointLight = new THREE.PointLight(agent.color, config.lightIntensity * 0.7, 10);
        pointLight.position.y = floatY + bodyHeight + 0.5;
        pillarGroup.add(pointLight);

        let errorLight = null;
        if (agent.errorCount > 0) {
            errorLight = new THREE.PointLight(0xff0000, 1.5, 5);
            errorLight.position.y = floatY + bodyHeight;
            pillarGroup.add(errorLight);
        }

        // Plasma shell — only for active agents
        let plasma = null;
        if (agent.status === 'active') {
            plasma = createPlasmaShell(agent, bodyHeight, floatY);
            pillarGroup.add(plasma.group);
        }

        pillars.push({
            group: pillarGroup, body, material: bodyMat, cap, capMat, healthRing, shadow,
            halo, haloMaterial: haloMat, beam, beamGlow, beamCounter,
            infoPanel, light: pointLight, errorLight, plasma,
            agent, config, floatY, floatPhase: Math.random() * Math.PI * 2
        });
    });
    return pillars;
}

export function animatePillars(pillars, elapsedTime) {
    pillars.forEach((p, index) => {
        const phase = index * 1.5;
        const bob = Math.sin(elapsedTime * 0.6 + p.floatPhase) * 0.12;
        const baseY = p.floatY + bob;

        p.body.position.y = baseY + p.agent.height / 2;
        p.cap.position.y = baseY + p.agent.height + 0.125;
        p.healthRing.position.y = baseY + 0.05;
        p.halo.position.y = baseY + p.agent.height / 2;
        p.infoPanel.position.y = baseY + p.agent.height * 0.3;

        // Beam + counter always animate
        const bh = p.agent.height >= 6 ? 6 : 4;
        const bb = baseY + p.agent.height + 0.25;
        p.beam.position.y = bb + bh / 2;
        p.beamGlow.position.y = bb + bh / 2;
        p.beamCounter.position.y = bb + bh + 2.0;

        p.beam.material.opacity = 0.35 + 0.15 * Math.sin(elapsedTime * 4 + phase);
        p.beamGlow.material.opacity = 0.03 + 0.02 * Math.sin(elapsedTime * 4 + phase);

        updateCounterCanvas(p.beamCounter._canvas, p.agent, elapsedTime);
        p.beamCounter._texture.needsUpdate = true;

        // Pulse for active, subtle breathe for others
        if (p.config.pulse) {
            p.material.emissiveIntensity = 0.6 + 0.25 * Math.sin(elapsedTime * 3 + phase);
            p.haloMaterial.opacity = 0.08 + 0.04 * Math.sin(elapsedTime * 3 + phase);
            p.light.intensity = 1.5 + 1.5 * Math.sin(elapsedTime * 3 + phase);
        } else if (p.agent.status === 'error') {
            const f = Math.random() > 0.3 ? 0.5 : 0.1;
            p.material.emissiveIntensity = f;
            if (p.errorLight) p.errorLight.intensity = f * 3;
        } else {
            p.material.emissiveIntensity = p.config.emissive + 0.08 * Math.sin(elapsedTime * 0.5 + phase);
        }

        p.healthRing.rotation.z = elapsedTime * 0.4;
        if (p.cap) p.capMat.emissiveIntensity = p.config.emissive * (0.7 + 0.2 * Math.sin(elapsedTime * 5 + phase));
        p.shadow.material.opacity = p.config.emissive * (0.03 + 0.015 * Math.sin(elapsedTime * 2 + phase));

        // Animate plasma shell if active
        if (p.plasma) {
            updatePlasmaShell(p.plasma, p.agent, p.agent.height, baseY, elapsedTime);
        }
    });
}

// ═══ INFO PANEL ═══
function createInfoPanelCanvas(agent) {
    const W = 1400, H = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const MID = 620; // divider between left data and right activity

    // Solid background
    ctx.fillStyle = 'rgba(4, 4, 12, 0.97)';
    ctx.strokeStyle = agent.color;
    ctx.lineWidth = 5;
    roundRect(ctx, 4, 4, W - 8, H - 8, 16);
    ctx.fill(); ctx.stroke();

    // Agent name
    ctx.fillStyle = agent.color;
    ctx.font = 'bold 80px "Courier New", monospace';
    ctx.fillText(agent.name.toUpperCase(), 40, 85);

    // Status — on its own line
    const sc = agent.status === 'active' ? '#00ff88' : agent.status === 'error' ? '#ff4444' : agent.status === 'idle' ? '#ffaa00' : '#888';
    ctx.fillStyle = sc;
    ctx.font = 'bold 45px "Courier New", monospace';
    ctx.fillText('● ' + agent.status.toUpperCase(), 40, 135);

    // Full width divider
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(40, 160); ctx.lineTo(W - 40, 160); ctx.stroke();

    // ═══ LEFT SIDE — Data fields (single column) ═══
    const rows = [
        ['Model', agent.model],
        ['Role', agent.role],
        ['Sessions', String(agent.sessions)],
        ['Messages', String(agent.messagesCount || 0)],
        ['Errors', String(agent.errorCount || 0)],
        ['Heartbeat', agent.heartbeat ? 'ON' : 'OFF'],
        ['Channels', agent.channels?.length ? agent.channels.join(', ') : '—']
    ];

    let y = 230;
    for (const [label, value] of rows) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '40px "Courier New", monospace';
        ctx.fillText(label, 40, y);

        ctx.fillStyle = label === 'Errors' && agent.errorCount > 0 ? '#ff4444' : '#ffffff';
        ctx.font = 'bold 44px "Courier New", monospace';
        ctx.fillText(value, 40, y + 52);
        y += 120;
    }

    // ═══ VERTICAL DIVIDER ═══
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(MID, 170); ctx.lineTo(MID, H - 40); ctx.stroke();

    // ═══ RIGHT SIDE — Activity Feed ═══
    ctx.fillStyle = agent.color;
    ctx.font = 'bold 42px "Courier New", monospace';
    ctx.fillText('ACTIVITY', MID + 30, 215);

    // Thin divider under activity header
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(MID + 30, 230); ctx.lineTo(W - 40, 230); ctx.stroke();

    // Activity entries
    const activities = agent._activities || [];
    const maxLineWidth = W - MID - 70;
    let ay = 275;
    const lineHeight = 42;
    const maxLines = 22;
    let linesDrawn = 0;

    if (activities.length === 0) {
        // Show current task as fallback
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '36px "Courier New", monospace';
        const task = agent.currentTask || '—';
        const wrappedTask = wrapText(ctx, task, maxLineWidth);
        for (const line of wrappedTask) {
            if (linesDrawn >= maxLines) break;
            ctx.fillText(line, MID + 30, ay);
            ay += lineHeight;
            linesDrawn++;
        }
    } else {
        for (let i = activities.length - 1; i >= 0; i--) {
            if (linesDrawn >= maxLines) break;
            const entry = activities[i];

            // Timestamp
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '28px "Courier New", monospace';
            ctx.fillText(entry.time || '', MID + 30, ay);
            ay += 32;
            linesDrawn++;

            // Content
            ctx.fillStyle = entry.role === 'user' ? '#88aaff' : 'rgba(255,255,255,0.75)';
            ctx.font = '34px "Courier New", monospace';
            const wrapped = wrapText(ctx, entry.text || '', maxLineWidth);
            for (const line of wrapped) {
                if (linesDrawn >= maxLines) break;
                ctx.fillText(line, MID + 30, ay);
                ay += lineHeight - 4;
                linesDrawn++;
            }
            ay += 12;
        }
    }

    return canvas;
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
        const test = current ? current + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines;
}

// ═══ COUNTER ═══
function createCounterCanvas(agent) {
    const canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 450;
    updateCounterCanvas(canvas, agent, 0);
    return canvas;
}

function updateCounterCanvas(canvas, agent, time) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const tokens = (agent.tokensToday || 0) + (agent.status === 'active' ? Math.floor(time * 12) : 0);

    ctx.textAlign = 'center';

    ctx.fillStyle = agent.color;
    ctx.font = 'bold 80px "Courier New", monospace';
    ctx.fillText(formatTokens(tokens), W / 2, 85);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '26px "Courier New", monospace';
    ctx.fillText('TOKENS', W / 2, 118);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 68px "Courier New", monospace';
    ctx.fillText(agent.cost || '$0.00', W / 2, 210);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '24px "Courier New", monospace';
    ctx.fillText('COST', W / 2, 242);

    ctx.fillStyle = agent.color;
    ctx.font = 'bold 50px "Courier New", monospace';
    ctx.fillText(agent.uptime || '—', W / 2, 330);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '22px "Courier New", monospace';
    ctx.fillText(agent.status === 'active' ? 'UPTIME' : 'LAST SEEN', W / 2, 360);

    ctx.textAlign = 'left';
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

// ═══ LIVE UPDATE ═══
export function updatePillarData(pillars, newAgents) {
    if (!pillars || !newAgents) return;
    for (const p of pillars) {
        const updated = newAgents.find(a => a.id === p.agent.id);
        if (!updated) continue;

        const oldStatus = p.agent.status;
        Object.assign(p.agent, updated);

        const newConfig = STATUS_CONFIG[updated.status] || STATUS_CONFIG.idle;
        p.config = newConfig;

        // Refresh info panel
        if (p.infoPanel && p.infoPanel._canvas) {
            const ctx = p.infoPanel._canvas.getContext('2d');
            ctx.clearRect(0, 0, p.infoPanel._canvas.width, p.infoPanel._canvas.height);
            const newCanvas = createInfoPanelCanvas(p.agent);
            ctx.drawImage(newCanvas, 0, 0);
            p.infoPanel._texture.needsUpdate = true;
        }

        // Update health ring color
        if (p.healthRing) {
            const hc = updated.errorCount > 0 ? '#ff4444' : (updated.status === 'idle' ? '#ffaa00' : '#00ff88');
            p.healthRing.material.color.set(hc);
        }

        // Update material
        if (p.material) {
            p.material.emissiveIntensity = newConfig.emissive;
            p.material.opacity = newConfig.opacity;
        }

        // Plasma shell: create when active, remove when not
        if (updated.status === 'active' && !p.plasma) {
            p.plasma = createPlasmaShell(p.agent, p.agent.height, p.floatY);
            p.group.add(p.plasma.group);
        } else if (updated.status !== 'active' && p.plasma) {
            p.group.remove(p.plasma.group);
            // Dispose arc geometries
            p.plasma.arcs.forEach(arc => {
                arc.mesh.geometry.dispose(); arc.mesh.material.dispose();
                arc.glowMesh.geometry.dispose(); arc.glowMesh.material.dispose();
                arc.bloomMesh.geometry.dispose(); arc.bloomMesh.material.dispose();
            });
            p.plasma = null;
        }

        // Update counter
        if (p.beamCounter && p.beamCounter._canvas) {
            const ctx = p.beamCounter._canvas.getContext('2d');
            ctx.clearRect(0, 0, p.beamCounter._canvas.width, p.beamCounter._canvas.height);
            const nc = createCounterCanvas(p.agent);
            ctx.drawImage(nc, 0, 0);
            p.beamCounter._texture.needsUpdate = true;
        }
    }
}

function formatTokens(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}
