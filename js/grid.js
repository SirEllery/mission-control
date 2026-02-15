import * as THREE from 'three';

export function createGrid() {
    const gridGroup = new THREE.Group();

    // ═══ STARS (background) ═══
    const starCount = 2000;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = [];
    const starColors = [];

    for (let i = 0; i < starCount; i++) {
        // Distribute on a large sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 150 + Math.random() * 100;

        starPositions.push(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );

        // Most white, some faint blue/yellow
        const tint = Math.random();
        if (tint > 0.9) {
            starColors.push(0.7, 0.8, 1.0); // blue-ish
        } else if (tint > 0.8) {
            starColors.push(1.0, 0.95, 0.7); // warm
        } else {
            const b = 0.6 + Math.random() * 0.4;
            starColors.push(b, b, b); // white
        }
    }

    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
        size: 0.4,
        transparent: true,
        opacity: 0.8,
        vertexColors: true,
        depthWrite: false,
        sizeAttenuation: true
    });

    gridGroup.add(new THREE.Points(starGeo, starMat));

    // ═══ GRID FLOOR ═══
    const gridSize = 60;
    const divisions = 60;

    const gridMaterial = new THREE.LineBasicMaterial({
        color: 0x00ddff,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending
    });

    const gridGeometry = new THREE.BufferGeometry();
    const gridPositions = [];

    for (let i = -gridSize/2; i <= gridSize/2; i += gridSize/divisions) {
        gridPositions.push(-gridSize/2, 0, i, gridSize/2, 0, i);
        gridPositions.push(i, 0, -gridSize/2, i, 0, gridSize/2);
    }

    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
    gridGroup.add(new THREE.LineSegments(gridGeometry, gridMaterial));

    // Subtle ground plane
    const planeGeo = new THREE.PlaneGeometry(gridSize, gridSize);
    const planeMat = new THREE.MeshBasicMaterial({
        color: 0x001122, transparent: true, opacity: 0.04,
        side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.01;
    gridGroup.add(plane);

    return gridGroup;
}
