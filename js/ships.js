import * as THREE from 'three';

// ═══ SPACESHIPS — ambient cruisers drifting overhead ═══

const SHIP_COLORS = [0x4466aa, 0x6688cc, 0x335577, 0x557799, 0x3a5f8a];

function createShipMesh() {
    const group = new THREE.Group();
    const color = SHIP_COLORS[Math.floor(Math.random() * SHIP_COLORS.length)];

    // Pick a random ship type
    const type = Math.floor(Math.random() * 3);

    if (type === 0) {
        // ═══ LARGE CRUISER — long angular hull ═══
        const hull = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.15, 2.5),
            new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, metalness: 0.7, roughness: 0.3 })
        );
        group.add(hull);

        // Bridge tower
        const bridge = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 0.2, 0.4),
            new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.3 })
        );
        bridge.position.set(0, 0.15, -0.6);
        group.add(bridge);

        // Engine glow
        const engine1 = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
        );
        engine1.position.set(-0.1, 0, 1.3);
        group.add(engine1);

        const engine2 = engine1.clone();
        engine2.position.set(0.1, 0, 1.3);
        group.add(engine2);

        // Engine trail glow
        const trail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.12, 1.5, 6, 1, true),
            new THREE.MeshBasicMaterial({ color: 0x4488cc, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending })
        );
        trail.rotation.x = Math.PI / 2;
        trail.position.set(0, 0, 2.1);
        group.add(trail);

        group.scale.setScalar(2.5 + Math.random() * 1.5);

    } else if (type === 1) {
        // ═══ FIGHTER — small, fast, angular ═══
        const body = new THREE.Mesh(
            new THREE.ConeGeometry(0.15, 1.2, 4),
            new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, metalness: 0.8, roughness: 0.2 })
        );
        body.rotation.x = Math.PI / 2;
        group.add(body);

        // Wings
        const wingGeo = new THREE.BoxGeometry(1.2, 0.03, 0.3);
        const wingMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, metalness: 0.6, roughness: 0.4 });
        const wing = new THREE.Mesh(wingGeo, wingMat);
        wing.position.set(0, 0, 0.2);
        group.add(wing);

        // Engine
        const engine = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
        );
        engine.position.set(0, 0, 0.65);
        group.add(engine);

        group.scale.setScalar(1.0 + Math.random() * 0.8);

    } else {
        // ═══ TRANSPORT — wide, boxy, slow ═══
        const hull = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.3, 1.8),
            new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, metalness: 0.5, roughness: 0.5 })
        );
        group.add(hull);

        // Cargo pods
        const pod1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 0.6),
            new THREE.MeshStandardMaterial({ color: 0x444466, emissive: 0x444466, emissiveIntensity: 0.15, metalness: 0.4, roughness: 0.6 })
        );
        pod1.position.set(-0.5, -0.1, 0);
        group.add(pod1);

        const pod2 = pod1.clone();
        pod2.position.set(0.5, -0.1, 0);
        group.add(pod2);

        // Running lights
        for (let i = 0; i < 4; i++) {
            const light = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 4, 4),
                new THREE.MeshBasicMaterial({
                    color: i % 2 === 0 ? 0xff4444 : 0x44ff44,
                    transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending
                })
            );
            light.position.set(
                (i < 2 ? -0.45 : 0.45),
                0.15,
                (i % 2 === 0 ? -0.8 : 0.8)
            );
            group.add(light);
        }

        // Engines
        const eng = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x88aadd, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
        );
        eng.position.set(0, 0, 0.95);
        group.add(eng);

        group.scale.setScalar(2.0 + Math.random() * 2.0);
    }

    return group;
}

function spawnShip() {
    const mesh = createShipMesh();

    // Random altitude — high above the scene
    const altitude = 18 + Math.random() * 25;

    // Random direction across the scene
    const angle = Math.random() * Math.PI * 2;
    const distance = 80;
    const startX = Math.cos(angle) * distance;
    const startZ = Math.sin(angle) * distance;
    const endX = -startX + (Math.random() - 0.5) * 30;
    const endZ = -startZ + (Math.random() - 0.5) * 30;

    mesh.position.set(startX, altitude, startZ);

    // Face direction of travel
    mesh.lookAt(new THREE.Vector3(endX, altitude, endZ));

    // Speed — slow drift
    const speed = 2 + Math.random() * 4;
    const dx = endX - startX;
    const dz = endZ - startZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const duration = dist / speed;

    return {
        mesh,
        startX, startZ, endX, endZ,
        altitude,
        elapsed: 0,
        duration,
        speed
    };
}

export function createShips() {
    return {
        ships: [],
        lastSpawn: 0,
        spawnInterval: 8 + Math.random() * 12 // 8-20 seconds between ships
    };
}

export function animateShips(state, scene, elapsedTime, deltaTime) {
    if (!state) return;

    // Spawn new ships
    if (elapsedTime - state.lastSpawn > state.spawnInterval) {
        const ship = spawnShip();
        scene.add(ship.mesh);
        state.ships.push(ship);
        state.lastSpawn = elapsedTime;
        state.spawnInterval = 8 + Math.random() * 12;
    }

    // Animate and cleanup
    for (let i = state.ships.length - 1; i >= 0; i--) {
        const s = state.ships[i];
        s.elapsed += deltaTime;
        const t = s.elapsed / s.duration;

        if (t >= 1) {
            // Remove ship
            scene.remove(s.mesh);
            s.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            state.ships.splice(i, 1);
            continue;
        }

        // Smooth movement
        s.mesh.position.x = s.startX + (s.endX - s.startX) * t;
        s.mesh.position.z = s.startZ + (s.endZ - s.startZ) * t;

        // Subtle altitude variation
        s.mesh.position.y = s.altitude + Math.sin(t * Math.PI) * 1.5;
    }
}
