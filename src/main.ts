import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import TWEEN from '@tweenjs/tween.js';
import { Explosion } from './explosion';

class Viewer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private sofa: THREE.Object3D | null = null;
  private enemy: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private explosions: Explosion[] = [];
  private score: number = 0;
  private shootSound: HTMLAudioElement;
  private explosionSound: HTMLAudioElement;
  private mouse: THREE.Vector2;

  constructor() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2c2c2c);

    // Mouse position
    this.mouse = new THREE.Vector2();

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

    // Raycaster setup
    this.raycaster = new THREE.Raycaster();

    // Load sounds
    this.shootSound = new Audio('/sounds/shoot.mp3');
    this.explosionSound = new Audio('/sounds/explosion.mp3');

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

    // Controls setup - limit rotation to horizontal only
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2; // Limit vertical rotation
    this.controls.minPolarAngle = Math.PI / 2;
    this.controls.enableZoom = false; // Disable zooming
    this.controls.enablePan = false; // Disable panning

    // Event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('click', this.onShoot.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));

    // Start animation loop
    this.animate();

    // Load models
    this.loadSofa();
    this.loadEnemy();
  }

  private onMouseMove(event: MouseEvent): void {
    // Update mouse position in normalized device coordinates (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update crosshair position
    const crosshair = document.querySelector('.crosshair') as HTMLElement;
    if (crosshair) {
      crosshair.style.left = `${event.clientX}px`;
      crosshair.style.top = `${event.clientY}px`;
      crosshair.style.transform = 'translate(-50%, -50%)';
    }
  }

  private onShoot(event: MouseEvent): void {
    if (!this.enemy) return;

    this.shootSound.currentTime = 0;
    this.shootSound.play();

    // Update the picking ray with the camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Calculate objects intersecting the picking ray
    const intersects = this.raycaster.intersectObject(this.enemy, true);

    if (intersects.length > 0) {
      // Enemy hit!
      this.explosionSound.currentTime = 0;
      this.explosionSound.play();

      // Create explosion at hit point
      const explosion = new Explosion(this.scene, intersects[0].point);
      this.explosions.push(explosion);

      // Remove enemy
      this.scene.remove(this.enemy);
      this.enemy = null;

      // Update score
      this.score += 100;
      document.getElementById('score')!.textContent = this.score.toString();

      // Respawn enemy after delay
      setTimeout(() => this.loadEnemy(), 2000);
    }
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
    if (this.enemy) return; // Prevent multiple enemies

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
        
        // Set up animation
        this.mixer = new THREE.AnimationMixer(this.enemy);
        if (gltf.animations.length > 0) {
          const action = this.mixer.clipAction(gltf.animations[0]);
          action.timeScale = 2;
          action.play();
        }
        
        // Scale and position enemy
        const scale = 0.8;
        this.enemy.scale.setScalar(scale);
        
        // Random position behind sofa
        const angle = Math.random() * Math.PI * 2;
        const radius = 3;
        this.enemy.position.set(
          Math.sin(angle) * radius,
          0,
          Math.cos(angle) * radius
        );
        
        // Face the center
        this.enemy.lookAt(0, 0, 0);
        
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

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    
    const delta = this.clock.getDelta();

    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // Update explosions
    this.explosions = this.explosions.filter(explosion => {
      const isAlive = explosion.update(delta);
      if (!isAlive) {
        explosion.dispose();
      }
      return isAlive;
    });
    
    this.controls.update();
    TWEEN.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the viewer
new Viewer();
