import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import TWEEN from '@tweenjs/tween.js';

class Viewer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private model: THREE.Object3D | null = null;

  constructor() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('app')?.appendChild(this.renderer.domElement);

    // Controls setup
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.setupNavigationButtons();

    // Start animation loop
    this.animate();

    // Load model
    this.loadModel();
  }

  private loadModel(): void {
    const loader = new GLTFLoader();
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading';
    loadingElement.textContent = 'Loading model...';
    document.body.appendChild(loadingElement);

    loader.load(
      '/assets/scene.gltf',
      (gltf) => {
        this.model = gltf.scene;
        this.scene.add(this.model);
        
        // Center and scale model
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        this.model.scale.setScalar(scale);
        this.model.position.sub(center.multiplyScalar(scale));

        document.body.removeChild(loadingElement);
      },
      (xhr) => {
        const progress = (xhr.loaded / xhr.total) * 100;
        loadingElement.textContent = `Loading model... ${Math.round(progress)}%`;
      },
      (error) => {
        console.error('Error loading model:', error);
        loadingElement.textContent = 'Error loading model';
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
      front: { x: 0, y: 0, z: 5 },
      back: { x: 0, y: 0, z: -5 },
      left: { x: -5, y: 0, z: 0 },
      right: { x: 5, y: 0, z: 0 },
      top: { x: 0, y: 5, z: 0 }
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
    this.controls.update();
    TWEEN.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the viewer
new Viewer();
