import * as THREE from 'three';

// 3D info panels are now built into pillars.js as sprites
// This file kept for compatibility — no CSS panels needed

export function createDataPanels(agents) {
    // No-op — panels are now 3D sprites attached to each agent
}

export function updateDataPanels(camera, pillars) {
    // No-op — sprite panels auto-face camera via Three.js
}
