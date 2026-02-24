import * as THREE from 'three';

/**
 * Solar System v3 — MASSIVE planets lumbering around the stage.
 * Procedural textures via ImageData for performance.
 */

function createProceduralTexture(width, height, paintFn) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    paintFn(imageData.data, width, height);
    ctx.putImageData(imageData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function noise(x, y, seed) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43758.5453) * 43758.5453;
    return n - Math.floor(n);
}

function fbm(x, y, seed, octaves) {
    let val = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
        val += amp * noise(x * freq, y * freq, seed + i * 7.13);
        amp *= 0.5;
        freq *= 2.0;
    }
    return val;
}

function setPixel(data, i, r, g, b) {
    data[i] = Math.max(0, Math.min(255, r));
    data[i+1] = Math.max(0, Math.min(255, g));
    data[i+2] = Math.max(0, Math.min(255, b));
    data[i+3] = 255;
}

function paintMercury(data, w, h) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const nx = x/w*6, ny = y/h*3;
        const n = fbm(nx, ny, 1.0, 4);
        const crater = noise(nx*3, ny*3, 42) > 0.75 ? -40 : 0;
        const c = 100 + n * 80 + crater;
        setPixel(data, i, c, c-5, c-10);
    }
}

function paintVenus(data, w, h) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const nx = x/w*4, ny = y/h*4;
        const n = fbm(nx, ny, 5.5, 4);
        const swirl = Math.sin(ny*3 + n*4) * 0.3;
        setPixel(data, i, 200+(n+swirl)*50, 160+(n+swirl)*40, 80+n*30);
    }
}

function paintEarth(data, w, h) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const nx = x/w*5, ny = y/h*3;
        const land = fbm(nx, ny, 10.0, 5);
        const cloud = fbm(nx+100, ny+100, 20.0, 3) * 0.3;
        let r, g, b;
        if (land > 0.45) {
            const g2 = fbm(nx, ny, 15.0, 3);
            r = 40 + g2*60; g = 100 + g2*80; b = 30 + g2*30;
        } else {
            const d = land / 0.45;
            r = 15 + d*20; g = 40 + d*60; b = 140 + d*60;
        }
        setPixel(data, i, r+cloud*200, g+cloud*200, b+cloud*200);
    }
}

function paintMars(data, w, h) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const nx = x/w*5, ny = y/h*3;
        const n = fbm(nx, ny, 30.0, 4);
        const canyon = Math.abs(Math.sin(nx*2 + n*3)) * 0.2;
        setPixel(data, i, 180+(n-canyon)*60, 80+(n-canyon)*40, 40+n*20);
    }
}

function paintJupiter(data, w, h) {
    for (let y = 0; y < h; y++) {
        const bandY = y / h;
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const nx = x/w*8;
            const band = Math.sin(bandY * 25) * 0.5 + 0.5;
            const turb = fbm(nx, bandY*8, 50.0, 3) * 0.3;
            const swirl = Math.sin(bandY*40 + nx*2 + turb*5) * 0.15;
            const v = band + turb + swirl;
            const dx = (nx-4)*1.5, dy = (bandY-0.6)*8;
            const spot = Math.exp(-(dx*dx+dy*dy)*2) * 0.4;
            setPixel(data, i, 180+v*60+spot*120, 140+v*50-spot*20, 100+v*30-spot*40);
        }
    }
}

function paintSaturn(data, w, h) {
    for (let y = 0; y < h; y++) {
        const bandY = y / h;
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const nx = x/w*6;
            const band = Math.sin(bandY * 20) * 0.3 + 0.5;
            const turb = fbm(nx, bandY*6, 70.0, 3) * 0.2;
            const v = band + turb;
            setPixel(data, i, 210+v*30, 190+v*30, 140+v*20);
        }
    }
}

function paintUranus(data, w, h) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const n = fbm(x/w*4, y/h*4, 90.0, 3);
        setPixel(data, i, 150+n*30, 210+n*25, 230+n*20);
    }
}

function paintNeptune(data, w, h) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const n = fbm(x/w*4, y/h*4, 110.0, 4);
        const storm = Math.sin(y/h*6 + n*4) * 0.2;
        setPixel(data, i, 40+(n+storm)*30, 60+(n+storm)*50, 180+(n+storm)*50);
    }
}

// ═══ PLANET DEFINITIONS ═══
const PLANETS = [
    { name: 'mercury', radius: 2,    distance: 55,   speed: 0.08,  paint: paintMercury, tilt: 0.03, axialTilt: 0.01  },
    { name: 'venus',   radius: 4,    distance: 75,   speed: 0.055, paint: paintVenus,   tilt: 0.04, axialTilt: 0.05  },
    { name: 'earth',   radius: 4.5,  distance: 100,  speed: 0.04,  paint: paintEarth,   tilt: 0.02, axialTilt: 0.41, moon: true },
    { name: 'mars',    radius: 3,    distance: 120,  speed: 0.03,  paint: paintMars,     tilt: 0.03, axialTilt: 0.44 },
    { name: 'jupiter', radius: 14,   distance: 170,  speed: 0.015, paint: paintJupiter,  tilt: 0.01, axialTilt: 0.05 },
    { name: 'saturn',  radius: 11,   distance: 230,  speed: 0.01,  paint: paintSaturn,   tilt: 0.04, axialTilt: 0.47, rings: true },
    { name: 'uranus',  radius: 7,    distance: 300,  speed: 0.006, paint: paintUranus,   tilt: 0.10, axialTilt: 1.71 },
    { name: 'neptune', radius: 6.5,  distance: 370,  speed: 0.004, paint: paintNeptune,  tilt: 0.03, axialTilt: 0.49 },
];

export function createSolarSystem() {
    const group = new THREE.Group();
    const planetData = [];

    // Subtle warm glow from the "sun" (the stage)
    const sunLight = new THREE.PointLight(0xffdd88, 0.8, 500);
    sunLight.position.set(0, 5, 0);
    group.add(sunLight);

    PLANETS.forEach((p) => {
        const pivot = new THREE.Group();
        pivot.rotation.x = p.tilt;
        group.add(pivot);

        const texSize = p.radius > 10 ? 256 : 128;
        const texture = createProceduralTexture(texSize, texSize, p.paint);

        const geo = new THREE.SphereGeometry(p.radius, 48, 48);
        const mat = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.8,
            metalness: 0.05,
        });
        const mesh = new THREE.Mesh(geo, mat);

        const startAngle = Math.random() * Math.PI * 2;
        mesh.position.x = Math.cos(startAngle) * p.distance;
        mesh.position.z = Math.sin(startAngle) * p.distance;
        mesh.position.y = p.radius * 0.3 + 3;
        mesh.rotation.z = p.axialTilt;

        pivot.add(mesh);
        const entry = { mesh, pivot, startAngle, ...p };

        // Saturn's rings
        if (p.rings) {
            const ringGeo = new THREE.RingGeometry(p.radius * 1.3, p.radius * 2.3, 128);
            const ringTex = createProceduralTexture(256, 16, (data, w, h) => {
                for (let x = 0; x < w; x++) {
                    const t = x / w;
                    const band = Math.sin(t * 80) * 0.3 + 0.5 + noise(t * 20, 0, 200) * 0.3;
                    const r = 200 * band + 30, g = 180 * band + 20, b = 130 * band + 10;
                    const a = 180 * band + 40;
                    for (let y = 0; y < h; y++) {
                        const i = (y * w + x) * 4;
                        data[i] = Math.min(255, r); data[i+1] = Math.min(255, g);
                        data[i+2] = Math.min(255, b); data[i+3] = Math.min(255, a);
                    }
                }
            });
            const ringMat = new THREE.MeshBasicMaterial({
                map: ringTex,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide,
                depthWrite: false,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI * 0.42;
            mesh.add(ring);
        }

        // Earth's moon
        if (p.moon) {
            const moonGeo = new THREE.SphereGeometry(1.0, 24, 24);
            const moonTex = createProceduralTexture(64, 64, (data, w, h) => {
                for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                    const i = (y * w + x) * 4;
                    const n = fbm(x/w*4, y/h*4, 500, 3);
                    const crater = noise(x/w*8, y/h*8, 600) > 0.8 ? -30 : 0;
                    const c = Math.max(60, Math.min(220, 140 + n*80 + crater));
                    setPixel(data, i, c, c, c+5);
                }
            });
            const moonMat = new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.9 });
            const moonMesh = new THREE.Mesh(moonGeo, moonMat);
            mesh.add(moonMesh);
            entry.moonMesh = moonMesh;
            entry.moonDistance = 8;
        }

        planetData.push(entry);
    });

    group.userData.planets = planetData;
    return group;
}

export function animateSolarSystem(solarSystem, time) {
    if (!solarSystem || !solarSystem.userData.planets) return;

    solarSystem.userData.planets.forEach(p => {
        const angle = p.startAngle + time * p.speed;
        p.mesh.position.x = Math.cos(angle) * p.distance;
        p.mesh.position.z = Math.sin(angle) * p.distance;
        p.mesh.rotation.y += 0.001 + p.speed * 0.05;

        if (p.moonMesh) {
            const moonAngle = time * 0.3;
            p.moonMesh.position.x = Math.cos(moonAngle) * p.moonDistance;
            p.moonMesh.position.z = Math.sin(moonAngle) * p.moonDistance;
            p.moonMesh.position.y = Math.sin(moonAngle * 0.7) * 1.5;
        }
    });
}
