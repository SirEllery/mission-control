import * as THREE from 'three';

// 3D info panels are now built into pillars.js as sprites
// This file kept for compatibility — no CSS panels needed

export function createDataPanels(agents) {
    // No-op — panels are now 3D sprites attached to each agent
}

export function updateDataPanels(camera, pillars) {
    if (!camera || !pillars) return;
    // Position info panels on the side of the pillar facing the camera
    for (const p of pillars) {
        if (!p.infoPanel || !p.group) continue;
        // Get direction from pillar to camera in world space
        const pillarPos = new THREE.Vector3();
        p.group.getWorldPosition(pillarPos);
        const dir = new THREE.Vector3().subVectors(camera.position, pillarPos);
        dir.y = 0; // only horizontal
        dir.normalize();
        // Place panel 5 units out from pillar center, toward camera
        p.infoPanel.position.x = dir.x * 5.0;
        p.infoPanel.position.z = dir.z * 5.0;
    }
}
