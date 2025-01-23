import * as THREE from 'three';

export class Explosion {
    private particles: THREE.Points;
    private geometry: THREE.BufferGeometry;
    private material: THREE.PointsMaterial;
    private velocities: THREE.Vector3[];
    private isActive: boolean = true;

    constructor(scene: THREE.Scene, position: THREE.Vector3) {
        const particleCount = 100;
        this.geometry = new THREE.BufferGeometry();
        this.velocities = [];
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;

            // Random velocities
            this.velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            ));

            // Orange to red colors
            colors[i3] = Math.random() * 0.5 + 0.5; // R
            colors[i3 + 1] = Math.random() * 0.3; // G
            colors[i3 + 2] = 0; // B
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        this.material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            opacity: 1,
            transparent: true,
        });

        this.particles = new THREE.Points(this.geometry, this.material);
        scene.add(this.particles);
    }

    update(delta: number): boolean {
        if (!this.isActive) return false;

        const positions = this.geometry.attributes.position.array as Float32Array;
        let alive = false;

        for (let i = 0; i < positions.length; i += 3) {
            const velocity = this.velocities[i / 3];
            
            positions[i] += velocity.x;
            positions[i + 1] += velocity.y;
            positions[i + 2] += velocity.z;

            // Apply "gravity" and slow down
            velocity.y -= 0.01;
            velocity.multiplyScalar(0.98);

            // Fade out
            this.material.opacity *= 0.99;

            if (this.material.opacity > 0.01) alive = true;
        }

        this.geometry.attributes.position.needsUpdate = true;
        
        if (!alive) {
            this.isActive = false;
            return false;
        }

        return true;
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
        this.particles.parent?.remove(this.particles);
    }
}
