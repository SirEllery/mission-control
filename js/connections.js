import * as THREE from 'three';

export function createConnections(agents, connections, activeConversations, pillars) {
    const connectionObjects = [];
    const activeSet = new Set((activeConversations || []).map(c => `${c.from}->${c.to}`));

    const pillarMap = {};
    pillars.forEach(p => { pillarMap[p.agent.id] = p; });

    connections.forEach(connection => {
        const fromPillar = pillarMap[connection.from];
        const toPillar = pillarMap[connection.to];
        if (!fromPillar || !toPillar) return;

        const isActive = connection.active || activeSet.has(`${connection.from}->${connection.to}`);

        const group = new THREE.Group();

        if (isActive) {
            // ═══ ONE THICK REALISTIC LIGHTNING BOLT ═══

            // Main bolt — thick, white-hot core
            const mainBolt = createThickBolt(0xffffff, 0.06);
            group.add(mainBolt.mesh);

            // Electric blue glow around the bolt
            const glowBolt = createThickBolt(0x6699ff, 0.15);
            group.add(glowBolt.mesh);

            // Outer bloom halo
            const bloomBolt = createThickBolt(0x4466cc, 0.35);
            group.add(bloomBolt.mesh);

            connectionObjects.push({
                line: group,
                isActive: true,
                bolts: [mainBolt, glowBolt, bloomBolt],
                fromId: connection.from,
                toId: connection.to,
                lastUpdate: 0
            });
        } else {
            // Dormant — very faint
            const lineGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 0, 0)
            ]);
            const lineMat = new THREE.LineBasicMaterial({
                color: 0x334466, transparent: true, opacity: 0.03,
                blending: THREE.AdditiveBlending
            });
            group.add(new THREE.Line(lineGeo, lineMat));

            connectionObjects.push({
                line: group,
                isActive: false,
                fromId: connection.from,
                toId: connection.to,
                dormantLine: group.children[0]
            });
        }
    });

    return connectionObjects;
}

function createThickBolt(color, tubeRadius) {
    // Create initial tube geometry along a path
    const points = [];
    for (let i = 0; i <= 20; i++) points.push(new THREE.Vector3(0, i * 0.1, 0));
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 20, tubeRadius, 6, false);
    const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: tubeRadius < 0.1 ? 0.9 : (tubeRadius < 0.2 ? 0.3 : 0.08),
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    return { mesh, mat, radius: tubeRadius };
}

function generateBoltPath(start, end, jitter) {
    const points = [];
    const segments = 16;

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const point = start.clone().lerp(end, t);

        // Arc upward
        point.y += Math.sin(t * Math.PI) * 1.8;

        // JAGGED lightning displacement (sharp, not smooth)
        if (i > 0 && i < segments) {
            const strength = Math.sin(t * Math.PI) * jitter;
            // Sharp random offsets — real lightning is angular
            point.x += (Math.random() - 0.5) * strength * 2.5;
            point.y += (Math.random() - 0.5) * strength * 1.0;
            point.z += (Math.random() - 0.5) * strength * 2.5;
        }

        points.push(point);
    }
    return points;
}

export function animateConnections(connections, elapsedTime, pillars) {
    const pillarMap = {};
    pillars.forEach(p => { pillarMap[p.agent.id] = p; });

    connections.forEach(conn => {
        const fromPillar = pillarMap[conn.fromId];
        const toPillar = pillarMap[conn.toId];
        if (!fromPillar || !toPillar) return;

        const startPos = fromPillar.group.position.clone();
        startPos.y = fromPillar.floatY + fromPillar.agent.height * 0.6;
        const endPos = toPillar.group.position.clone();
        endPos.y = toPillar.floatY + toPillar.agent.height * 0.6;

        if (conn.isActive) {
            // Regenerate bolt path every ~4 frames for flicker effect
            const frameCheck = Math.floor(elapsedTime * 60);
            if (frameCheck % 4 === 0 || frameCheck !== conn.lastUpdate) {
                conn.lastUpdate = frameCheck;

                const boltPoints = generateBoltPath(startPos, endPos, 0.8);
                const curve = new THREE.CatmullRomCurve3(boltPoints);

                conn.bolts.forEach(bolt => {
                    const newGeo = new THREE.TubeGeometry(curve, 20, bolt.radius, 6, false);
                    bolt.mesh.geometry.dispose();
                    bolt.mesh.geometry = newGeo;
                });

                // Flicker the main bolt
                const flicker = Math.random();
                if (flicker > 0.8) {
                    // BRIGHT flash
                    conn.bolts[0].mat.opacity = 1.0;
                    conn.bolts[1].mat.opacity = 0.5;
                    conn.bolts[2].mat.opacity = 0.15;
                } else if (flicker > 0.3) {
                    // Normal
                    conn.bolts[0].mat.opacity = 0.7;
                    conn.bolts[1].mat.opacity = 0.25;
                    conn.bolts[2].mat.opacity = 0.06;
                } else if (flicker > 0.1) {
                    // Dim
                    conn.bolts[0].mat.opacity = 0.3;
                    conn.bolts[1].mat.opacity = 0.1;
                    conn.bolts[2].mat.opacity = 0.03;
                } else {
                    // Momentary blackout
                    conn.bolts[0].mat.opacity = 0.0;
                    conn.bolts[1].mat.opacity = 0.0;
                    conn.bolts[2].mat.opacity = 0.0;
                }
            }
        } else {
            if (conn.dormantLine) {
                const positions = conn.dormantLine.geometry.attributes.position;
                if (positions) {
                    positions.array[0] = startPos.x; positions.array[1] = startPos.y; positions.array[2] = startPos.z;
                    positions.array[3] = endPos.x; positions.array[4] = endPos.y; positions.array[5] = endPos.z;
                    positions.needsUpdate = true;
                }
            }
        }
    });
}
