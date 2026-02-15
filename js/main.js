import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { createGrid } from './grid.js?v=7';
import { createPillars, animatePillars } from './pillars.js?v=7';
import { createConnections, animateConnections } from './connections.js?v=7';
import { createParticles } from './particles.js?v=7';
import { createDataPanels, updateDataPanels } from './panels.js?v=7';
import { initializeChat } from './chat.js?v=7';

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
            const response = await fetch('data/mock-agents.json?v=7');
            this.agentData = await response.json();
        } catch (error) {
            console.error('Failed to load agent data:', error);
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020208);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
        this.camera.position.set(16, 12, 24);
        this.camera.lookAt(0, 5, 0);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 0.5;

        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 60;
        this.controls.maxPolarAngle = Math.PI * 0.48;
        this.controls.target.set(0, 5, 0);
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
            1.0, 0.3, 0.15
        );
        this.composer.addPass(bloom);
    }

    setupFog() {
        this.scene.fog = new THREE.FogExp2(0x020208, 0.008);
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
    }

    setupUI() {
        initializeChat();
        createDataPanels(this.agentData.agents);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const t = this.clock.getElapsedTime();

        this.controls.update();
        animatePillars(this.pillars, t);
        animateConnections(this.connections, t, this.pillars);

        // Animate floating orbs
        if (this.particles) {
            this.particles.children.forEach(child => {
                if (child.userData && child.userData.floatSpeed) {
                    const d = child.userData;
                    child.position.y = d.baseY + Math.sin(t * d.floatSpeed + d.floatPhase) * 0.4;
                    child.rotation.x += d.rotSpeed * 0.008;
                    child.rotation.y += d.rotSpeed * 0.012;
                }
            });
        }

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
