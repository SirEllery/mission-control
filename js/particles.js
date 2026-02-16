import * as THREE from 'three';

// Create an 8-point star texture (4 long points + 4 short points)
function createStarTexture(size = 128, longRatio = 1.0, shortRatio = 0.5, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const outerLong = size * 0.45 * longRatio;
    const outerShort = size * 0.45 * shortRatio;
    const inner = size * 0.08;

    // Draw 8-point star
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 - Math.PI / 2;
        const isLong = i % 2 === 0;
        const outer = isLong ? outerLong : outerShort;
        
        // Outer point
        const ox = cx + Math.cos(angle) * outer;
        const oy = cy + Math.sin(angle) * outer;
        
        // Inner point (between this and next)
        const midAngle = angle + Math.PI / 8;
        const ix = cx + Math.cos(midAngle) * inner;
        const iy = cy + Math.sin(midAngle) * inner;
        
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
    }
    ctx.closePath();

    // Glow gradient fill
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.45);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Bright center core
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, inner * 2);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, inner * 2, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
}

// Create a spiral galaxy texture
function createMilkyWayTexture() {
    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const maxR = size * 0.46;

    // Background: transparent
    ctx.clearRect(0, 0, size, size);

    // Bright core glow — warm yellow/white center (like reference image)
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.3);
    coreGrad.addColorStop(0, 'rgba(255, 250, 220, 1.0)');
    coreGrad.addColorStop(0.08, 'rgba(255, 230, 180, 0.95)');
    coreGrad.addColorStop(0.2, 'rgba(255, 190, 120, 0.6)');
    coreGrad.addColorStop(0.5, 'rgba(180, 120, 80, 0.2)');
    coreGrad.addColorStop(0.8, 'rgba(100, 80, 140, 0.08)');
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(0, 0, size, size);

    // Outer diffuse glow — purple/blue haze
    const outerGrad = ctx.createRadialGradient(cx, cy, maxR * 0.15, cx, cy, maxR * 0.9);
    outerGrad.addColorStop(0, 'rgba(120, 80, 160, 0.12)');
    outerGrad.addColorStop(0.5, 'rgba(60, 80, 160, 0.06)');
    outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = outerGrad;
    ctx.fillRect(0, 0, size, size);

    // Draw spiral arms with logarithmic spiral
    const numArms = 2;
    const armWidth = 0.35; // radians of spread
    const windTightness = 0.3;
    const totalStars = 40000;

    for (let i = 0; i < totalStars; i++) {
        // Pick a random arm
        const arm = Math.floor(Math.random() * numArms);
        const armOffset = (arm / numArms) * Math.PI * 2;

        // Distance from center (biased toward outer)
        const t = Math.random();
        const dist = t * maxR;

        // Logarithmic spiral angle
        const spiralAngle = windTightness * Math.log(1 + dist / 10) * 8 + armOffset;

        // Add spread (more at outer edges)
        const spread = (Math.random() - 0.5) * armWidth * (0.5 + t * 1.5);
        const angle = spiralAngle + spread;

        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;

        if (x < 0 || x > size || y < 0 || y > size) continue;

        // Color: warm near center, blue at edges
        const r = Math.random();
        let fillColor;
        if (t < 0.15) {
            // Core: warm white/yellow — bright
            const brightness = 85 + Math.random() * 15;
            fillColor = `hsla(${30 + Math.random() * 25}, ${50 + Math.random() * 30}%, ${brightness}%, ${0.5 + Math.random() * 0.5})`;
        } else if (t < 0.5) {
            // Mid: purple/pink/rose mix
            const hue = 260 + Math.random() * 50;
            fillColor = `hsla(${hue}, ${50 + Math.random() * 30}%, ${60 + Math.random() * 30}%, ${0.25 + Math.random() * 0.4})`;
        } else {
            // Outer arms: vivid blue/cyan
            const hue = 200 + Math.random() * 30;
            fillColor = `hsla(${hue}, ${60 + Math.random() * 35}%, ${55 + Math.random() * 35}%, ${0.2 + Math.random() * 0.35})`;
        }

        const starSize = t < 0.2 ? (0.5 + Math.random() * 2.5) : (0.3 + Math.random() * 1.8);

        ctx.beginPath();
        ctx.arc(x, y, starSize, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
    }

    // Add bright blue knots along arms (star-forming regions)
    for (let i = 0; i < 200; i++) {
        const arm = Math.floor(Math.random() * numArms);
        const armOffset = (arm / numArms) * Math.PI * 2;
        const t = 0.3 + Math.random() * 0.6; // mid to outer
        const dist = t * maxR;
        const spiralAngle = windTightness * Math.log(1 + dist / 10) * 8 + armOffset;
        const spread = (Math.random() - 0.5) * 0.15;
        const angle = spiralAngle + spread;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;

        const knotR = 3 + Math.random() * 8;
        const knotGrad = ctx.createRadialGradient(x, y, 0, x, y, knotR);
        knotGrad.addColorStop(0, `rgba(100, 180, 255, ${0.2 + Math.random() * 0.3})`);
        knotGrad.addColorStop(1, 'rgba(60, 120, 220, 0)');
        ctx.fillStyle = knotGrad;
        ctx.beginPath();
        ctx.arc(x, y, knotR, 0, Math.PI * 2);
        ctx.fill();
    }

    // Soften with a final radial fade to transparent at edges
    const fadeGrad = ctx.createRadialGradient(cx, cy, maxR * 0.7, cx, cy, maxR);
    fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
    fadeGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';

    return canvas;
}

// Create shooting star/meteor trail texture
function createMeteorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    const grad = ctx.createLinearGradient(0, 8, 256, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.3, 'rgba(200, 220, 255, 0.3)');
    grad.addColorStop(0.7, 'rgba(220, 230, 255, 0.7)');
    grad.addColorStop(0.95, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(128, 8, 128, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas;
}

export function createParticles() {
    const group = new THREE.Group();

    // ═══ FLOATING ORBS ═══
    const orbColors = [0x00ddff, 0x00ff88, 0xff44ff, 0xffaa00, 0xff4466, 0x6666ff];
    const orbCount = 40;

    for (let i = 0; i < orbCount; i++) {
        const color = orbColors[Math.floor(Math.random() * orbColors.length)];
        const size = 0.15 + Math.random() * 0.35;
        const isCube = Math.random() > 0.5;
        const geo = isCube
            ? new THREE.BoxGeometry(size, size, size)
            : new THREE.SphereGeometry(size * 0.6, 8, 8);
        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.3 + Math.random() * 0.4,
            blending: THREE.AdditiveBlending
        });
        const orb = new THREE.Mesh(geo, mat);
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * 35;
        orb.position.set(Math.cos(angle) * dist, 0.5 + Math.random() * 8, Math.sin(angle) * dist);
        orb.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        orb.userData = {
            floatSpeed: 0.3 + Math.random() * 0.5,
            floatPhase: Math.random() * Math.PI * 2,
            rotSpeed: 0.2 + Math.random() * 0.4,
            baseY: orb.position.y
        };
        group.add(orb);
    }

    // ═══ DUST PARTICLES ═══
    const dustCount = 120;
    const dustGeo = new THREE.BufferGeometry();
    const positions = [], colors = [];
    const dustColors = [new THREE.Color(0x334466), new THREE.Color(0x223344), new THREE.Color(0x2a2a4a)];
    for (let i = 0; i < dustCount; i++) {
        positions.push((Math.random() - 0.5) * 70, Math.random() * 12 + 0.5, (Math.random() - 0.5) * 70);
        const c = dustColors[Math.floor(Math.random() * dustColors.length)];
        colors.push(c.r, c.g, c.b);
    }
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    dustGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    group.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
        size: 0.15, transparent: true, opacity: 0.2, vertexColors: true,
        blending: THREE.AdditiveBlending, depthWrite: false
    })));

    // ═══ 8-POINT STAR FIELD (sprites with star texture) ═══
    const starTexCanvas = createStarTexture(128, 1.0, 0.55);
    const starTex = new THREE.CanvasTexture(starTexCanvas);

    const starCount = 500;
    for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 80 + Math.random() * 120;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = Math.abs(r * Math.cos(phi)) * 0.5 + 10;
        const z = r * Math.sin(phi) * Math.sin(theta);

        const isBright = i < 50;
        const scale = isBright ? (1.5 + Math.random() * 2.5) : (0.4 + Math.random() * 1.0);
        const opacity = isBright ? (0.7 + Math.random() * 0.3) : (0.3 + Math.random() * 0.4);

        const starSprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: starTex,
            transparent: true,
            opacity: opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            rotation: Math.random() * Math.PI * 2
        }));
        starSprite.position.set(x, y, z);
        starSprite.scale.set(scale, scale, 1);

        starSprite.userData = {
            isTwinkle: true,
            twinkleSpeed: 0.5 + Math.random() * 2.5,
            twinklePhase: Math.random() * Math.PI * 2,
            baseOpacity: opacity,
            baseScale: scale
        };

        group.add(starSprite);
    }

    // ═══ GALAXY — disabled ═══

    // ═══ SHOOTING STARS / METEORS ═══
    const meteorTexCanvas = createMeteorTexture();
    const meteorTex = new THREE.CanvasTexture(meteorTexCanvas);

    const meteorPool = [];
    const METEOR_COUNT = 5; // pool size

    for (let i = 0; i < METEOR_COUNT; i++) {
        const meteor = new THREE.Sprite(new THREE.SpriteMaterial({
            map: meteorTex,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            rotation: 0
        }));
        meteor.scale.set(0, 0, 1);
        meteor.visible = false;

        meteor.userData = {
            isMeteor: true,
            active: false,
            progress: 0,
            startPos: new THREE.Vector3(),
            endPos: new THREE.Vector3(),
            speed: 0,
            trailLength: 0,
            nextSpawnTime: 3 + Math.random() * 12, // stagger initial spawns
            fadeIn: 0,
        };

        group.add(meteor);
        meteorPool.push(meteor);
    }

    // Store meteor pool ref on group for animation
    group.userData.meteorPool = meteorPool;

    return group;
}

// Spawn a new meteor with random trajectory
function spawnMeteor(meteor) {
    const d = meteor.userData;
    
    // Random start position high in the sky
    const startAngle = Math.random() * Math.PI * 2;
    const startR = 40 + Math.random() * 80;
    const startY = 40 + Math.random() * 60;
    d.startPos.set(
        Math.cos(startAngle) * startR,
        startY,
        Math.sin(startAngle) * startR
    );

    // End position: generally downward and across
    const drift = 30 + Math.random() * 50;
    const driftAngle = startAngle + (Math.random() - 0.5) * 1.2;
    d.endPos.set(
        Math.cos(driftAngle) * (startR + drift),
        startY - 20 - Math.random() * 30,
        Math.sin(driftAngle) * (startR + drift)
    );

    d.speed = 0.4 + Math.random() * 0.8; // how fast it crosses
    d.trailLength = 8 + Math.random() * 15;
    d.progress = 0;
    d.active = true;
    d.fadeIn = 0;
    meteor.visible = true;

    // Orient the sprite toward direction of travel
    const dir = new THREE.Vector3().subVectors(d.endPos, d.startPos).normalize();
    meteor.material.rotation = Math.atan2(dir.y - dir.x, dir.z + dir.x) + Math.PI / 4;
}

// Call this from the main animate loop
export function animateParticles(group, elapsedTime, deltaTime) {
    if (!group) return;

    const meteorPool = group.userData.meteorPool || [];

    group.children.forEach(child => {
        const d = child.userData;
        if (!d) return;

        // Floating orbs
        if (d.floatSpeed) {
            child.position.y = d.baseY + Math.sin(elapsedTime * d.floatSpeed + d.floatPhase) * 0.4;
            child.rotation.x += d.rotSpeed * 0.008;
            child.rotation.y += d.rotSpeed * 0.012;
        }

        // Twinkling stars
        if (d.isTwinkle) {
            const twinkle = Math.sin(elapsedTime * d.twinkleSpeed + d.twinklePhase);
            child.material.opacity = d.baseOpacity + 0.25 * twinkle;
            if (d.baseScale) {
                const s = d.baseScale * (0.85 + 0.15 * twinkle);
                child.scale.set(s, s, 1);
            }
        }

        // Milky Way slow rotation (Z-axis spin for face-on plane)
        if (d.isMilkyWay) {
            child.rotation.z += d.rotSpeed * (deltaTime || 0.016);
        }
    });

    // Animate meteors
    for (const meteor of meteorPool) {
        const d = meteor.userData;

        if (!d.active) {
            // Check if it's time to spawn
            d.nextSpawnTime -= (deltaTime || 0.016);
            if (d.nextSpawnTime <= 0) {
                spawnMeteor(meteor);
            }
            continue;
        }

        // Advance progress
        d.progress += d.speed * (deltaTime || 0.016);
        d.fadeIn = Math.min(d.fadeIn + (deltaTime || 0.016) * 5, 1);

        if (d.progress >= 1) {
            // Meteor finished
            d.active = false;
            meteor.visible = false;
            meteor.material.opacity = 0;
            d.nextSpawnTime = 4 + Math.random() * 15; // next spawn delay
            continue;
        }

        // Interpolate position
        meteor.position.lerpVectors(d.startPos, d.endPos, d.progress);

        // Scale = trail length, tapers at start and end
        const taper = Math.sin(d.progress * Math.PI); // 0→1→0
        const len = d.trailLength * Math.max(taper, 0.2);
        meteor.scale.set(len, 0.3 + taper * 0.4, 1);

        // Opacity: fade in quick, fade out at end
        const fadeOut = d.progress > 0.7 ? 1 - ((d.progress - 0.7) / 0.3) : 1;
        meteor.material.opacity = d.fadeIn * fadeOut * (0.6 + Math.random() * 0.2);

        // Orient toward travel direction
        const dir = new THREE.Vector3().subVectors(d.endPos, d.startPos);
        meteor.material.rotation = Math.atan2(dir.y, dir.x);
    }
}
