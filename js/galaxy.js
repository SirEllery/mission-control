import * as THREE from 'three';

export function createGalaxy() {
    const group = new THREE.Group();

    const ARMS = 5;
    const STARS_PER_ARM = 7000;
    const CORE_STARS = 5000;
    const TOTAL = ARMS * STARS_PER_ARM + CORE_STARS;

    const positions = new Float32Array(TOTAL * 3);
    const colors = new Float32Array(TOTAL * 3);
    const sizes = new Float32Array(TOTAL);

    // Color palette for spiral arms
    const armColors = [
        new THREE.Color(0.35, 0.5, 0.8),   // muted blue
        new THREE.Color(0.7, 0.35, 0.6),   // muted pink
        new THREE.Color(0.3, 0.7, 0.5),    // muted teal
        new THREE.Color(0.75, 0.55, 0.25), // muted gold
        new THREE.Color(0.5, 0.3, 0.75),   // muted purple
    ];

    let idx = 0;

    // Spiral arms
    for (let arm = 0; arm < ARMS; arm++) {
        const armAngleOffset = (arm / ARMS) * Math.PI * 2;
        const baseColor = armColors[arm];

        for (let i = 0; i < STARS_PER_ARM; i++) {
            const t = i / STARS_PER_ARM; // 0 to 1 along arm
            const radius = t * 80; // arm extends out to 80 units
            const windAngle = t * Math.PI * 3.5; // how tightly wound
            const angle = armAngleOffset + windAngle;

            // Spread perpendicular to arm (tighter near core, much wider/scattered at edge)
            const spread = (0.5 + t * 14) * (Math.random() - 0.5) * 2;
            const spreadPerp = (0.5 + t * 10) * (Math.random() - 0.5) * 2;
            const ySpread = (0.3 + t * 3) * (Math.random() - 0.5) * 2;

            const x = Math.cos(angle) * (radius + spread) - Math.sin(angle) * spreadPerp;
            const z = Math.sin(angle) * (radius + spread) + Math.cos(angle) * spreadPerp;
            const y = ySpread;

            positions[idx * 3] = x;
            positions[idx * 3 + 1] = y;
            positions[idx * 3 + 2] = z;

            // Color: blend arm color with white near core, redder at edges
            const coreBlend = 1 - t;
            const c = baseColor.clone();
            c.lerp(new THREE.Color(1, 1, 1), coreBlend * 0.4);
            // Add some randomness
            c.r += (Math.random() - 0.5) * 0.15;
            c.g += (Math.random() - 0.5) * 0.15;
            c.b += (Math.random() - 0.5) * 0.15;

            colors[idx * 3] = Math.max(0, c.r);
            colors[idx * 3 + 1] = Math.max(0, c.g);
            colors[idx * 3 + 2] = Math.max(0, c.b);

            sizes[idx] = (0.3 + Math.random() * 0.7) * (1 - t * 0.5);

            idx++;
        }
    }

    // Dense bright core
    for (let i = 0; i < CORE_STARS; i++) {
        const r = Math.pow(Math.random(), 2) * 15; // concentrated near center
        const angle = Math.random() * Math.PI * 2;
        const y = (Math.random() - 0.5) * 2 * (1 - r / 15);

        positions[idx * 3] = Math.cos(angle) * r;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = Math.sin(angle) * r;

        // Core is bright white/yellow
        const warmth = Math.random();
        colors[idx * 3] = 1.0;
        colors[idx * 3 + 1] = 0.85 + warmth * 0.15;
        colors[idx * 3 + 2] = 0.6 + warmth * 0.3;

        sizes[idx] = 0.4 + Math.random() * 1.0;

        idx++;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.45,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    group.add(points);

    // Add a core glow sprite
    // No sprite — the dense core stars handle the glow naturally

    // Position galaxy in the distance, tilted
    group.position.set(0, 80, -250);
    group.rotation.x = Math.PI * 0.25; // tilt toward viewer
    group.rotation.z = Math.PI * 0.1;  // slight roll

    return group;
}

export function animateGalaxy(galaxyGroup, time) {
    if (!galaxyGroup) return;
    galaxyGroup.rotation.y = time * 0.015; // slow spin
}
