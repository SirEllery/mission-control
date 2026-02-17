import * as THREE from 'three';

export function createHalo() {
    const group = new THREE.Group();

    const RING_RADIUS = 55;       // distance from center
    const TUBE_RADIUS = 1.2;      // thickness of the ring structure
    const SEGMENTS = 256;         // smoothness around the ring
    const TUBE_SEGMENTS = 12;     // cross-section detail

    // ═══ MAIN RING STRUCTURE (metallic band) ═══
    const ringGeo = new THREE.TorusGeometry(RING_RADIUS, TUBE_RADIUS, TUBE_SEGMENTS, SEGMENTS);
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0x556677,
        metalness: 0.8,
        roughness: 0.3,
        emissive: 0x112233,
        emissiveIntensity: 0.3,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    // ═══ INNER EDGE GLOW (the habitable surface — green/blue tint) ═══
    const innerGeo = new THREE.TorusGeometry(RING_RADIUS, TUBE_RADIUS * 0.6, 8, SEGMENTS);
    const innerMat = new THREE.MeshBasicMaterial({
        color: 0x225544,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
    });
    const innerRing = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerRing);

    // ═══ OUTER EDGE LINES (structural ribs) ═══
    const RIB_COUNT = 64;
    const ribMat = new THREE.LineBasicMaterial({
        color: 0x445566,
        transparent: true,
        opacity: 0.3,
    });
    for (let i = 0; i < RIB_COUNT; i++) {
        const angle = (i / RIB_COUNT) * Math.PI * 2;
        const cx = Math.cos(angle) * RING_RADIUS;
        const cz = Math.sin(angle) * RING_RADIUS;
        // Short radial rib across the tube width
        const outX = Math.cos(angle) * (RING_RADIUS + TUBE_RADIUS * 1.3);
        const outZ = Math.sin(angle) * (RING_RADIUS + TUBE_RADIUS * 1.3);
        const inX = Math.cos(angle) * (RING_RADIUS - TUBE_RADIUS * 1.3);
        const inZ = Math.sin(angle) * (RING_RADIUS - TUBE_RADIUS * 1.3);
        const points = [
            new THREE.Vector3(inX, 0, inZ),
            new THREE.Vector3(outX, 0, outZ),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const rib = new THREE.Line(geo, ribMat);
        group.add(rib);
    }

    // ═══ GLOW AURA (soft halo around the ring) ═══
    // Use a large flat ring sprite with additive blending
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 512;
    glowCanvas.height = 512;
    const ctx = glowCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 100, 256, 256, 256);
    grad.addColorStop(0, 'rgba(60, 140, 180, 0.15)');
    grad.addColorStop(0.5, 'rgba(40, 100, 140, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    const glowTex = new THREE.CanvasTexture(glowCanvas);

    // Flat ring glow — a torus with very large tube for soft light
    const glowGeo = new THREE.TorusGeometry(RING_RADIUS, TUBE_RADIUS * 4, 4, SEGMENTS);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x3388aa,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    // ═══ SURFACE DETAIL PARTICLES (tiny lights on inner surface) ═══
    const LIGHT_COUNT = 400;
    const lightPositions = new Float32Array(LIGHT_COUNT * 3);
    const lightColors = new Float32Array(LIGHT_COUNT * 3);
    const surfaceColors = [
        new THREE.Color(0x88ccaa), // green terrain
        new THREE.Color(0x6699bb), // water/blue
        new THREE.Color(0xaabb88), // land
        new THREE.Color(0xddddcc), // clouds/white
    ];
    for (let i = 0; i < LIGHT_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const offset = (Math.random() - 0.5) * TUBE_RADIUS * 0.8;
        const r = RING_RADIUS + offset;
        lightPositions[i * 3] = Math.cos(angle) * r;
        lightPositions[i * 3 + 1] = (Math.random() - 0.5) * TUBE_RADIUS * 0.6;
        lightPositions[i * 3 + 2] = Math.sin(angle) * r;
        const c = surfaceColors[Math.floor(Math.random() * surfaceColors.length)];
        lightColors[i * 3] = c.r;
        lightColors[i * 3 + 1] = c.g;
        lightColors[i * 3 + 2] = c.b;
    }
    const lightGeo = new THREE.BufferGeometry();
    lightGeo.setAttribute('position', new THREE.BufferAttribute(lightPositions, 3));
    lightGeo.setAttribute('color', new THREE.BufferAttribute(lightColors, 3));
    const lightMat = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
    });
    const lights = new THREE.Points(lightGeo, lightMat);
    group.add(lights);

    // Position and tilt the ring
    group.position.set(0, 8, 0);       // centered on the scene, slightly above grid
    group.rotation.x = Math.PI * 0.38;  // tilted so you see the inner surface
    group.rotation.z = Math.PI * 0.05;  // slight roll for drama

    return group;
}

export function animateHalo(haloGroup, time) {
    if (!haloGroup) return;
    // Very slow majestic rotation
    haloGroup.rotation.y = time * 0.008;
}
