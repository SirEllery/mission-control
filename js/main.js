import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { createGrid } from './grid.js?v=19';
import { createPillars, animatePillars, updatePillarData } from './pillars.js?v=25';
import { createConnections, animateConnections } from './connections.js?v=19';
import { createParticles, animateParticles } from './particles.js?v=23';
import { createDataPanels, updateDataPanels } from './panels.js?v=19';
import { initializeChat } from './chat.js?v=22';
import { createShips, animateShips } from './ships.js?v=1';
import { createGalaxy, animateGalaxy } from './galaxy.js?v=4';

class Dashboard {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.controls = null;
        this.agentData = null;
        this.pillars = [];
        this.connections = [];
        this.particles = null;
        this.clock = new THREE.Clock();
        this.lastTime = 0;
        this.ships = null;
    }

    async init() {
        await this.loadAgentData();
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupLighting();
        this.setupPostProcessing();
        this.setupFog();
        this.createSceneElements();
        this.setupUI();
        this.animate();
        console.log('Mission Control v6 — stars, thick lightning, readable panels');
    }

    async loadAgentData() {
        try {
            // Try live API first, fall back to mock data
            const response = await fetch('/api/agents');
            if (response.ok) {
                this.agentData = await response.json();
                console.log('📡 Live agent data loaded', this.agentData._live ? '(LIVE)' : '(cached)');
            } else {
                throw new Error('API unavailable');
            }
        } catch (error) {
            console.warn('Live API unavailable, falling back to mock data:', error.message);
            const response = await fetch('data/mock-agents.json?v=13');
            this.agentData = await response.json();
        }
    }

    startLiveRefresh() {
        // Refresh live data every 30 seconds
        setInterval(async () => {
            try {
                const response = await fetch('/api/agents');
                if (!response.ok) return;
                const newData = await response.json();
                this.agentData = newData;
                
                // Update pillar data (counters, status, info panels)
                updatePillarData(this.pillars, newData.agents);
                
                console.log('📡 Live refresh', new Date().toLocaleTimeString());
            } catch (e) {
                // Silent fail — keep showing last data
            }
        }, 30000);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020208);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 1000);
        this.camera.position.set(20, 14, 30);
        this.camera.lookAt(0, 5, 0);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 0.7;

        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.enablePan = true;
        this.controls.panSpeed = 0.8;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 200;
        this.controls.maxPolarAngle = Math.PI * 0.85;
        this.controls.zoomSpeed = 1.2;
        this.controls.target.set(0, 5, 0);

        // Reset camera button
        const resetBtn = document.createElement('button');
        resetBtn.textContent = '⟲';
        resetBtn.title = 'Reset camera';
        resetBtn.style.cssText = `
            position: fixed; top: 12px; right: 12px; z-index: 1000;
            width: 36px; height: 36px; border-radius: 50%;
            background: rgba(20, 25, 35, 0.7); border: 1px solid rgba(100, 200, 255, 0.25);
            color: rgba(100, 200, 255, 0.7); font-size: 20px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(4px); transition: all 0.2s;
        `;
        resetBtn.addEventListener('mouseenter', () => {
            resetBtn.style.borderColor = 'rgba(100, 200, 255, 0.6)';
            resetBtn.style.color = 'rgba(100, 200, 255, 1)';
        });
        resetBtn.addEventListener('mouseleave', () => {
            resetBtn.style.borderColor = 'rgba(100, 200, 255, 0.25)';
            resetBtn.style.color = 'rgba(100, 200, 255, 0.7)';
        });
        resetBtn.addEventListener('click', () => this.resetCamera());
        document.body.appendChild(resetBtn);

        // Also bind 'R' key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'r' && !e.ctrlKey && !e.metaKey && 
                document.activeElement.tagName !== 'INPUT' && 
                document.activeElement.tagName !== 'TEXTAREA' &&
                !document.activeElement.isContentEditable) {
                this.resetCamera();
            }
        });
    }

    resetCamera() {
        this.camera.position.set(20, 14, 30);
        this.controls.target.set(0, 5, 0);
        this.controls.update();
    }

    setupLighting() {
        this.scene.add(new THREE.AmbientLight(0x0a0a0a, 0.3));
        const dir = new THREE.DirectionalLight(0x444444, 0.5);
        dir.position.set(10, 20, 10);
        this.scene.add(dir);
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        const bloom = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.6, 0.2, 0.25
        );
        this.composer.addPass(bloom);
    }

    setupFog() {
        this.scene.fog = new THREE.FogExp2(0x020208, 0.0008); // low so galaxy is visible at distance
    }

    createSceneElements() {
        if (!this.agentData) return;

        this.scene.add(createGrid());

        this.pillars = createPillars(this.agentData.agents);
        this.pillars.forEach(p => this.scene.add(p.group));

        this.connections = createConnections(
            this.agentData.agents,
            this.agentData.connections,
            this.agentData.activeConversations,
            this.pillars
        );
        this.connections.forEach(c => this.scene.add(c.line));

        this.particles = createParticles();
        this.scene.add(this.particles);

        // Spaceships
        this.ships = createShips();

        // Galaxy
        this.galaxy = createGalaxy();
        this.scene.add(this.galaxy);

        // (solar system removed — was bogging down performance)
    }

    setupUI() {
        initializeChat();
        createDataPanels(this.agentData.agents);
        this.startLiveRefresh();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const t = this.clock.getElapsedTime();
        const dt = t - this.lastTime;
        this.lastTime = t;

        this.controls.update();
        animatePillars(this.pillars, t);
        animateConnections(this.connections, t, this.pillars);

        // Animate particles (stars, meteors, milky way, orbs)
        animateParticles(this.particles, t, dt);

        // Spaceships
        animateShips(this.ships, this.scene, t, dt);

        // Galaxy
        animateGalaxy(this.galaxy, t);

        // (solar system removed)

        updateDataPanels(this.camera, this.pillars);
        this.composer.render();
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
}

const dashboard = new Dashboard();
dashboard.init().catch(console.error);
window.addEventListener('resize', () => dashboard.handleResize());
export { dashboard };
