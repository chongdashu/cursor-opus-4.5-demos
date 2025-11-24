import { SceneManager } from './scene.js';
import { ImageProcessor } from './imageProcessor.js';
import { Voxelizer } from './voxelizer.js';
import { ExplosionSystem } from './explosion.js';
import './style.css';

/**
 * Main application class that orchestrates all components.
 */
class LegoVoxelizerApp {
  /**
   * Creates a new LegoVoxelizerApp instance.
   */
  constructor() {
    // DOM Elements
    this.container = document.getElementById('canvas-container');
    this.uploadOverlay = document.getElementById('upload-overlay');
    this.uploadZone = document.getElementById('upload-zone');
    this.fileInput = document.getElementById('file-input');
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.controlsHint = document.getElementById('controls-hint');
    this.actionButtons = document.getElementById('action-buttons');
    this.resetBtn = document.getElementById('reset-btn');
    
    // Core components
    this.sceneManager = null;
    this.imageProcessor = null;
    this.voxelizer = null;
    this.explosionSystem = null;
    
    // State
    this.isModelLoaded = false;
    
    // Initialize
    this.init();
  }

  /**
   * Initializes the application.
   */
  init() {
    // Create scene manager
    this.sceneManager = new SceneManager(this.container);
    
    // Create image processor
    this.imageProcessor = new ImageProcessor({
      maxBricks: 60,
      quantizeColors: false
    });
    
    // Create voxelizer
    this.voxelizer = new Voxelizer(this.sceneManager.scene);
    
    // Create explosion system
    this.explosionSystem = new ExplosionSystem({
      duration: 1.2,
      force: 1
    });
    
    // Register explosion system update with scene manager
    this.sceneManager.onUpdate(this.explosionSystem.update);
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup explosion state change callback
    this.explosionSystem.setStateChangeCallback((isExploded) => {
      this.updateExplosionIndicator(isExploded);
    });
  }

  /**
   * Sets up all event listeners.
   */
  setupEventListeners() {
    // File input change
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleFile(file);
    });
    
    // Upload zone click
    this.uploadZone.addEventListener('click', () => {
      this.fileInput.click();
    });
    
    // Drag and drop
    this.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.uploadZone.classList.add('dragover');
    });
    
    this.uploadZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.uploadZone.classList.remove('dragover');
    });
    
    this.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.uploadZone.classList.remove('dragover');
      
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.handleFile(file);
      }
    });
    
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.isModelLoaded) {
        e.preventDefault();
        this.explosionSystem.toggle();
      }
    });
    
    // Reset button
    this.resetBtn.addEventListener('click', () => {
      this.reset();
    });
    
    // Prevent default drag behavior on window
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    window.addEventListener('drop', (e) => {
      e.preventDefault();
    });
  }

  /**
   * Handles an uploaded image file.
   * @param {File} file - The uploaded file.
   */
  async handleFile(file) {
    // Show loading overlay
    this.showLoading();
    
    try {
      // Process image
      const imageData = await this.imageProcessor.processFile(file);
      
      // Clear any existing model
      this.voxelizer.clear();
      
      // Create voxel bricks
      const { bricks, boundingBox } = this.voxelizer.createBricks(imageData);
      
      // Setup explosion system with bricks
      this.explosionSystem.setBricks(bricks);
      
      // Adjust camera to fit model
      this.sceneManager.fitCameraToModel(boundingBox);
      
      // Update state
      this.isModelLoaded = true;
      
      // Hide loading and upload overlay
      this.hideLoading();
      this.hideUploadOverlay();
      
      // Show controls
      this.showControls();
      
    } catch (error) {
      console.error('Error processing image:', error);
      this.hideLoading();
      alert('Failed to process image. Please try another file.');
    }
  }

  /**
   * Resets the app to initial state.
   */
  reset() {
    // Clear model
    this.voxelizer.clear();
    this.explosionSystem.reset();
    this.explosionSystem.setBricks([]);
    
    // Reset state
    this.isModelLoaded = false;
    
    // Reset camera
    this.sceneManager.resetCamera();
    
    // Clear file input
    this.fileInput.value = '';
    
    // Hide controls
    this.hideControls();
    
    // Show upload overlay
    this.showUploadOverlay();
  }

  /**
   * Shows the loading overlay.
   */
  showLoading() {
    this.loadingOverlay.classList.add('visible');
  }

  /**
   * Hides the loading overlay.
   */
  hideLoading() {
    this.loadingOverlay.classList.remove('visible');
  }

  /**
   * Shows the upload overlay.
   */
  showUploadOverlay() {
    this.uploadOverlay.classList.add('visible');
  }

  /**
   * Hides the upload overlay.
   */
  hideUploadOverlay() {
    this.uploadOverlay.classList.remove('visible');
  }

  /**
   * Shows the controls hint and action buttons.
   */
  showControls() {
    this.controlsHint.classList.remove('hidden');
    this.actionButtons.classList.remove('hidden');
  }

  /**
   * Hides the controls hint and action buttons.
   */
  hideControls() {
    this.controlsHint.classList.add('hidden');
    this.actionButtons.classList.add('hidden');
  }

  /**
   * Updates the explosion indicator UI.
   * @param {boolean} isExploded - Whether the model is exploded.
   */
  updateExplosionIndicator(isExploded) {
    const spaceHintKey = this.controlsHint.querySelector('.hint-item:last-child .hint-key');
    if (spaceHintKey) {
      if (isExploded) {
        spaceHintKey.style.background = 'var(--accent-primary)';
        spaceHintKey.style.color = 'var(--bg-primary)';
        spaceHintKey.textContent = 'Space';
      } else {
        spaceHintKey.style.background = '';
        spaceHintKey.style.color = '';
        spaceHintKey.textContent = 'Space';
      }
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new LegoVoxelizerApp();
});

