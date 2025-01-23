import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import TWEEN from '@tweenjs/tween.js';

class Viewer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private sofa: THREE.Object3D | null = null;
  private enemy: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clock: THREE.Clock;

  constructor() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2c2c2c);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 3, 5);

    // Clock for animations
    this.clock = new THREE.Clock();

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('app')?.appendChild(this.renderer.domElement);

    // Add environment map for better texture rendering
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    
    // Create a simple environment map
    const environmentMap = pmremGenerator.fromScene(
      new THREE.Scene().add(
        new THREE.Mesh(
          new THREE.SphereGeometry(5, 10, 10),
          new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide })
        )
      )
    ).texture;
    
    this.scene.environment = environmentMap;
    pmremGenerator.dispose();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(-5, 3, -5);
    this.scene.add(backLight);

    // Controls setup
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.setupNavigationButtons();

    // Start animation loop
    this.animate();

    // Load models
    this.loadSofa();
    this.loadEnemy();
  }

  private loadSofa(): void {
    const loader = new GLTFLoader();
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading';
    loadingElement.textContent = 'Loading sofa...';
    document.body.appendChild(loadingElement);

    loader.load(
      '/assets/sofa_01.glb',
      (gltf) => {
        this.sofa = gltf.scene;
        this.scene.add(this.sofa);
        
        // Center and scale model
        const box = new THREE.Box3().setFromObject(this.sofa);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;
        this.sofa.scale.setScalar(scale);
        this.sofa.position.sub(center.multiplyScalar(scale));
        
        // Rotate model to face front
        this.sofa.rotation.y = Math.PI;

        // Enable shadows
        this.sofa.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        document.body.removeChild(loadingElement);
      },
      (xhr) => {
        const progress = (xhr.loaded / xhr.total) * 100;
        loadingElement.textContent = `Loading sofa... ${Math.round(progress)}%`;
      },
      (error) => {
        console.error('Error loading sofa:', error);
        loadingElement.textContent = 'Error loading sofa';
      }
    );
  }

  private loadEnemy(): void {
    const loader = new GLTFLoader();
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading';
    loadingElement.textContent = 'Loading enemy...';
    document.body.appendChild(loadingElement);

    loader.load(
      '/assets/enemy.glb',
      (gltf) => {
        this.enemy = gltf.scene;
        this.scene.add(this.enemy);
        
        // Set up animation with increased speed
        this.mixer = new THREE.AnimationMixer(this.enemy);
        if (gltf.animations.length > 0) {
          const action = this.mixer.clipAction(gltf.animations[0]);
          action.timeScale = 2; // Speed up animation 2x
          action.play();
        }
        
        // Scale and position enemy behind sofa
        const scale = 1.5;
        this.enemy.scale.setScalar(scale);
        this.enemy.position.set(0, 0, -3);
        
        // Enable shadows and ensure proper texture rendering
        this.enemy.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            
            // Ensure materials are properly configured for textures
            if (node.material) {
              const material = node.material as THREE.Material;
              material.needsUpdate = true;
              
              // If it's a MeshStandardMaterial, configure for better texture appearance
              if (material instanceof THREE.MeshStandardMaterial) {
                material.roughness = 0.8;
                material.metalness = 0.2;
                material.envMapIntensity = 1.0;
              }
            }
          }
        });

        document.body.removeChild(loadingElement);
      },
      (xhr) => {
        const progress = (xhr.loaded / xhr.total) * 100;
        loadingElement.textContent = `Loading enemy... ${Math.round(progress)}%`;
      },
      (error) => {
        console.error('Error loading enemy:', error);
        loadingElement.textContent = 'Error loading enemy';
      }
    );
  }

  private setupNavigationButtons(): void {
    const buttons = document.querySelectorAll('.nav-button');
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const view = (button as HTMLElement).dataset.view;
        this.moveCamera(view as string);
      });
    });
  }

  private moveCamera(view: string): void {
    const positions = {
      front: { x: 0, y: 0, z: 8 },
      back: { x: 0, y: 0, z: -8 },
      left: { x: -8, y: 0, z: 0 },
      right: { x: 8, y: 0, z: 0 },
      top: { x: 0, y: 8, z: 0 }
    };

    const target = positions[view as keyof typeof positions];
    new TWEEN.Tween(this.camera.position)
      .to(target, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    
    // Update animation mixer
    if (this.mixer) {
      const delta = this.clock.getDelta();
      this.mixer.update(delta);
    }
    
    this.controls.update();
    TWEEN.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the viewer
new Viewer();
