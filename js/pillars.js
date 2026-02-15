import * as THREE from 'three';

const STATUS_CONFIG = {
    active:    { emissive: 1.0,  opacity: 0.95, lightIntensity: 3,   haloOpacity: 0.12, pulse: true,  beam: true  },
    idle:      { emissive: 0.15, opacity: 0.5,  lightIntensity: 0.5, haloOpacity: 0.04, pulse: false, beam: false },
    error:     { emissive: 0.6,  opacity: 0.8,  lightIntensity: 2,   haloOpacity: 0.10, pulse: false, beam: false },
    completed: { emissive: 0.1,  opacity: 0.35, lightIntensity: 0.3, haloOpacity: 0.02, pulse: false, beam: false },
    offline:   { emissive: 0.0,  opacity: 0.2,  lightIntensity: 0,   haloOpacity: 0.0,  pulse: false, beam: false }
};

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

        // Halo — reduced
        const haloMat = new THREE.MeshBasicMaterial({
            color: agent.color, transparent: true, opacity: config.haloOpacity,
            side: THREE.BackSide, blending: THREE.AdditiveBlending
        });
        const halo = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, bodyHeight, 16, 1, true), haloMat);
        halo.position.y = floatY + bodyHeight / 2;
        pillarGroup.add(halo);

        // Beam — shorter
        let beam = null, beamGlow = null, beamCounter = null;
        if (config.beam) {
            const beamHeight = agent.height >= 6 ? 6 : 4;
            const beamBase = floatY + bodyHeight + 0.25;

            beam = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.10, beamHeight, 8, 1, true),
                new THREE.MeshBasicMaterial({ color: agent.color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
            );
            beam.position.y = beamBase + beamHeight / 2;
            pillarGroup.add(beam);

            beamGlow = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.3, beamHeight, 8, 1, true),
                new THREE.MeshBasicMaterial({ color: agent.color, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
            );
            beamGlow.position.y = beamBase + beamHeight / 2;
            pillarGroup.add(beamGlow);

            // COUNTER — VERY LARGE
            const cc = createCounterCanvas(agent);
            const ct = new THREE.CanvasTexture(cc);
            ct.minFilter = THREE.LinearFilter;
            beamCounter = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, alphaTest: 0.01 }));
            beamCounter.position.y = beamBase + beamHeight + 2.0;
            beamCounter.scale.set(10, 5, 1);
            beamCounter._canvas = cc; beamCounter._texture = ct;
            pillarGroup.add(beamCounter);
        }

        // INFO PANEL — MAXIMUM READABILITY
        const ic = createInfoPanelCanvas(agent);
        const it = new THREE.CanvasTexture(ic);
        it.minFilter = THREE.LinearFilter;
        const infoPanel = new THREE.Sprite(new THREE.SpriteMaterial({ map: it, transparent: true, alphaTest: 0.01, depthWrite: false }));
        infoPanel.position.set(5.0, floatY + bodyHeight * 0.3, 0);
        infoPanel.scale.set(12, 10, 1);
        infoPanel._canvas = ic; infoPanel._texture = it;
        pillarGroup.add(infoPanel);

        // Name label
        const lc = createLabelCanvas(agent.name, agent.color);
        const lt = new THREE.CanvasTexture(lc);
        const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: lt, transparent: true, alphaTest: 0.1 }));
        label.position.y = floatY + bodyHeight + (config.beam ? 0.5 : 1.5);
        label.scale.set(5, 1.5, 1);
        pillarGroup.add(label);

        // Point light — reduced intensity
        const pointLight = new THREE.PointLight(agent.color, config.lightIntensity * 0.7, 10);
        pointLight.position.y = floatY + bodyHeight + 0.5;
        pillarGroup.add(pointLight);

        let errorLight = null;
        if (agent.errorCount > 0) {
            errorLight = new THREE.PointLight(0xff0000, 1.5, 5);
            errorLight.position.y = floatY + bodyHeight;
            pillarGroup.add(errorLight);
        }

        pillars.push({
            group: pillarGroup, body, material: bodyMat, cap, capMat, healthRing, shadow,
            halo, haloMaterial: haloMat, beam, beamGlow, beamCounter,
            infoPanel, label, light: pointLight, errorLight,
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
        p.label.position.y = baseY + p.agent.height + (p.config.beam ? 0.5 : 1.5);
        p.infoPanel.position.y = baseY + p.agent.height * 0.3;

        if (p.beam) {
            const bh = p.agent.height >= 6 ? 6 : 4;
            const bb = baseY + p.agent.height + 0.25;
            p.beam.position.y = bb + bh / 2;
            p.beamGlow.position.y = bb + bh / 2;
            if (p.beamCounter) p.beamCounter.position.y = bb + bh + 2.0;
        }

        // Only hex body pulses
        if (p.config.pulse) {
            p.material.emissiveIntensity = 0.6 + 0.25 * Math.sin(elapsedTime * 3 + phase);
            p.haloMaterial.opacity = 0.08 + 0.04 * Math.sin(elapsedTime * 3 + phase);
            p.light.intensity = 1.5 + 1.5 * Math.sin(elapsedTime * 3 + phase);
        } else if (p.agent.status === 'error') {
            const f = Math.random() > 0.3 ? 0.5 : 0.1;
            p.material.emissiveIntensity = f;
            if (p.errorLight) p.errorLight.intensity = f * 3;
        } else {
            p.material.emissiveIntensity = p.config.emissive + 0.04 * Math.sin(elapsedTime * 0.5 + phase);
        }

        p.healthRing.rotation.z = elapsedTime * 0.4;

        if (p.beam) {
            p.beam.material.opacity = 0.35 + 0.15 * Math.sin(elapsedTime * 4 + phase);
            p.beamGlow.material.opacity = 0.03 + 0.02 * Math.sin(elapsedTime * 4 + phase);
            if (p.beamCounter) {
                updateCounterCanvas(p.beamCounter._canvas, p.agent, elapsedTime);
                p.beamCounter._texture.needsUpdate = true;
            }
        }
        if (p.cap) p.capMat.emissiveIntensity = p.config.emissive * (0.7 + 0.2 * Math.sin(elapsedTime * 5 + phase));
        p.shadow.material.opacity = p.config.emissive * (0.03 + 0.015 * Math.sin(elapsedTime * 2 + phase));
    });
}

// ═══ INFO PANEL — FILL THE PANEL, HUGE TEXT ═══
function createInfoPanelCanvas(agent) {
    const W = 1400, H = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Solid background
    ctx.fillStyle = 'rgba(4, 4, 12, 0.97)';
    ctx.strokeStyle = agent.color;
    ctx.lineWidth = 5;
    roundRect(ctx, 4, 4, W - 8, H - 8, 16);
    ctx.fill(); ctx.stroke();

    // Agent name
    ctx.fillStyle = agent.color;
    ctx.font = 'bold 72px "Courier New", monospace';
    ctx.fillText(agent.name.toUpperCase(), 40, 85);

    // Status
    const sc = agent.status === 'active' ? '#00ff88' : agent.status === 'error' ? '#ff4444' : agent.status === 'idle' ? '#ffaa00' : '#666';
    ctx.fillStyle = sc;
    ctx.font = 'bold 52px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(agent.status.toUpperCase(), W - 40, 85);
    ctx.textAlign = 'left';

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(40, 110); ctx.lineTo(W - 40, 110); ctx.stroke();

    // Task
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '40px "Courier New", monospace';
    const task = agent.currentTask || '—';
    ctx.fillText(task.length > 30 ? task.substring(0, 30) + '…' : task, 40, 165);

    // Data rows — MASSIVE
    const rows = [
        ['Model', agent.model],
        ['Role', agent.role],
        ['Sessions', String(agent.sessions)],
        ['Messages', String(agent.messagesCount || 0)],
        ['Tokens', formatTokens(agent.tokensToday || 0)],
        ['Cost', agent.cost || '$0.00'],
        ['Errors', String(agent.errorCount || 0)],
        ['Heartbeat', agent.heartbeat ? 'ON' : 'OFF'],
        ['Active', agent.lastActive || '—'],
        ['Uptime', agent.uptime || '—']
    ];

    let y = 245;
    rows.forEach(([label, value]) => {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '48px "Courier New", monospace';
        ctx.fillText(label, 40, y);

        ctx.fillStyle = label === 'Errors' && agent.errorCount > 0 ? '#ff4444' : '#ffffff';
        ctx.font = 'bold 48px "Courier New", monospace';
        ctx.fillText(value, 560, y);
        y += 88;
    });

    return canvas;
}

// ═══ COUNTER — VERY LARGE, CLEAN ═══
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

    const tokens = (agent.tokensToday || 0) + Math.floor(time * 12);

    // Background
    ctx.fillStyle = 'rgba(4, 4, 12, 0.85)';
    roundRect(ctx, 30, 5, W - 60, H - 10, 12);
    ctx.fill();

    // Border
    ctx.strokeStyle = agent.color + '60';
    ctx.lineWidth = 2;
    roundRect(ctx, 30, 5, W - 60, H - 10, 12);
    ctx.stroke();

    ctx.textAlign = 'center';

    // Tokens
    ctx.fillStyle = agent.color;
    ctx.font = 'bold 80px "Courier New", monospace';
    ctx.fillText(formatTokens(tokens), W / 2, 85);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '28px "Courier New", monospace';
    ctx.fillText('TOKENS', W / 2, 120);

    // Cost
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 68px "Courier New", monospace';
    ctx.fillText(agent.cost || '$0.00', W / 2, 210);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '26px "Courier New", monospace';
    ctx.fillText('COST', W / 2, 245);

    // Uptime
    ctx.fillStyle = agent.color;
    ctx.font = 'bold 50px "Courier New", monospace';
    ctx.fillText(agent.uptime || '—', W / 2, 335);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '24px "Courier New", monospace';
    ctx.fillText('UPTIME', W / 2, 370);

    ctx.textAlign = 'left';
}

function createLabelCanvas(text, color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 700; canvas.height = 160;
    ctx.font = 'bold 60px "Courier New", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = color; ctx.shadowBlur = 4;
    ctx.fillText(text.toUpperCase(), 350, 80);
    return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function formatTokens(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}
