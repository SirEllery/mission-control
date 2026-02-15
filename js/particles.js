import * as THREE from 'three';

export function createParticles() {
    const group = new THREE.Group();

    // ═══ FLOATING ORBS (colored cubes/spheres scattered in field) ═══
    const orbColors = [0x00ddff, 0x00ff88, 0xff44ff, 0xffaa00, 0xff4466, 0x6666ff];
    const orbCount = 40;

    for (let i = 0; i < orbCount; i++) {
        const color = orbColors[Math.floor(Math.random() * orbColors.length)];
        const size = 0.15 + Math.random() * 0.35;

        // Mix of cubes and spheres
        const isCube = Math.random() > 0.5;
        const geo = isCube
            ? new THREE.BoxGeometry(size, size, size)
            : new THREE.SphereGeometry(size * 0.6, 8, 8);

        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3 + Math.random() * 0.4,
            blending: THREE.AdditiveBlending
        });

        const orb = new THREE.Mesh(geo, mat);

        // Scatter across the field, not too close to center
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * 35;
        orb.position.set(
            Math.cos(angle) * dist,
            0.5 + Math.random() * 8,
            Math.sin(angle) * dist
        );

        // Random rotation
        orb.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        // Store animation data
        orb.userData = {
            floatSpeed: 0.3 + Math.random() * 0.5,
            floatPhase: Math.random() * Math.PI * 2,
            rotSpeed: 0.2 + Math.random() * 0.4,
            baseY: orb.position.y
        };

        group.add(orb);
    }

    // ═══ SUBTLE DUST PARTICLES ═══
    const dustCount = 120;
    const dustGeo = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    const dustColors = [
        new THREE.Color(0x334466),
        new THREE.Color(0x223344),
        new THREE.Color(0x2a2a4a)
    ];

    for (let i = 0; i < dustCount; i++) {
        positions.push(
            (Math.random() - 0.5) * 70,
            Math.random() * 12 + 0.5,
            (Math.random() - 0.5) * 70
        );
        const c = dustColors[Math.floor(Math.random() * dustColors.length)];
        colors.push(c.r, c.g, c.b);
    }

    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    dustGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const dustMat = new THREE.PointsMaterial({
        size: 0.15,
        transparent: true,
        opacity: 0.2,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    group.add(new THREE.Points(dustGeo, dustMat));

    return group;
}
