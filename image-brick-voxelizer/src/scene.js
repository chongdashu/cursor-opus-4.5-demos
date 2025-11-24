import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Scene manager class that handles Three.js scene setup,
 * camera, renderer, lighting, and controls.
 */
class SceneManager {
  /**
   * Creates a new SceneManager instance.
   * @param {HTMLElement} container - The DOM element to render into.
   */
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.animationId = null;
    this.updateCallbacks = [];
    
    this.init();
  }

  /**
   * Initializes the Three.js scene, camera, renderer, and controls.
   */
  init() {
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create gradient background
    const bgColor1 = new THREE.Color(0x0a0a12);
    const bgColor2 = new THREE.Color(0x15151f);
    this.scene.background = bgColor1;
    
    // Add subtle fog for depth
    this.scene.fog = new THREE.Fog(0x0a0a12, 50, 150);
    
    // Create camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.camera.position.set(0, 30, 50);
    this.camera.lookAt(0, 0, 0);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
    
    // Create controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 1.2;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 200;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.target.set(0, 0, 0);
    
    // Setup lighting
    this.setupLighting();
    
    // Add ground grid reference (subtle)
    this.addGroundReference();
    
    // Handle window resize
    window.addEventListener('resize', this.onResize.bind(this));
    
    // Start animation loop
    this.animate();
  }

  /**
   * Sets up the scene lighting with ambient and directional lights.
   */
  setupLighting() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);
    
    // Main directional light (sun-like)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(30, 50, 30);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 200;
    mainLight.shadow.camera.left = -60;
    mainLight.shadow.camera.right = 60;
    mainLight.shadow.camera.top = 60;
    mainLight.shadow.camera.bottom = -60;
    mainLight.shadow.bias = -0.0001;
    this.scene.add(mainLight);
    
    // Fill light from the opposite side
    const fillLight = new THREE.DirectionalLight(0x8080ff, 0.4);
    fillLight.position.set(-20, 20, -20);
    this.scene.add(fillLight);
    
    // Rim light for edge definition
    const rimLight = new THREE.DirectionalLight(0xff8060, 0.3);
    rimLight.position.set(0, -10, -30);
    this.scene.add(rimLight);
    
    // Hemisphere light for natural sky/ground coloring
    const hemiLight = new THREE.HemisphereLight(0x606080, 0x202030, 0.5);
    this.scene.add(hemiLight);
  }

  /**
   * Adds a subtle ground plane reference.
   */
  addGroundReference() {
    // Create a subtle circular ground shadow catcher
    const groundGeometry = new THREE.CircleGeometry(100, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a12,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  /**
   * Registers a callback to be called every animation frame.
   * @param {Function} callback - The callback function.
   */
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  /**
   * Removes an update callback.
   * @param {Function} callback - The callback to remove.
   */
  offUpdate(callback) {
    const index = this.updateCallbacks.indexOf(callback);
    if (index > -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  /**
   * Main animation loop.
   */
  animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    
    // Update controls
    this.controls.update();
    
    // Call update callbacks
    const delta = 1 / 60; // Approximate delta time
    for (const callback of this.updateCallbacks) {
      callback(delta);
    }
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Handles window resize events.
   */
  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  /**
   * Resets the camera to its default position.
   * @param {THREE.Vector3} target - Optional target to look at.
   */
  resetCamera(target = null) {
    if (target) {
      this.controls.target.copy(target);
    } else {
      this.controls.target.set(0, 0, 0);
    }
    this.camera.position.set(0, 30, 50);
    this.controls.update();
  }

  /**
   * Adjusts camera position based on model size.
   * @param {THREE.Box3} boundingBox - The bounding box of the model.
   */
  fitCameraToModel(boundingBox) {
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    boundingBox.getCenter(center);
    boundingBox.getSize(size);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5;
    
    this.controls.target.copy(center);
    this.camera.position.set(
      center.x + distance * 0.5,
      center.y + distance * 0.5,
      center.z + distance
    );
    this.controls.update();
  }

  /**
   * Clears all objects from the scene except lights and ground.
   */
  clearModel() {
    const toRemove = [];
    this.scene.traverse((child) => {
      if (child.isMesh && child.geometry && child.userData.isVoxel) {
        toRemove.push(child);
      }
    });
    
    for (const obj of toRemove) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
      this.scene.remove(obj);
    }
  }

  /**
   * Disposes of all resources and stops the animation loop.
   */
  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    window.removeEventListener('resize', this.onResize.bind(this));
    
    this.controls.dispose();
    this.renderer.dispose();
    
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

export { SceneManager };

