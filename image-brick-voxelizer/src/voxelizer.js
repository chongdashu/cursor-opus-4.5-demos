import * as THREE from 'three';
import { ImageProcessor } from './imageProcessor.js';

/**
 * Voxelizer module that creates LEGO-style 3D brick representations from pixel data.
 */
class Voxelizer {
  /**
   * Creates a new Voxelizer instance.
   * @param {THREE.Scene} scene - The Three.js scene to add bricks to.
   * @param {Object} options - Configuration options.
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.brickSize = options.brickSize || 1;
    this.brickHeight = options.brickHeight || 0.6;
    this.studRadius = options.studRadius || 0.3;
    this.studHeight = options.studHeight || 0.15;
    this.gap = options.gap || 0.02;
    
    this.bricks = [];
    this.group = new THREE.Group();
    this.group.userData.isVoxel = true;
    
    // Create shared geometries for performance
    this.createGeometries();
  }

  /**
   * Creates shared geometries for LEGO bricks.
   */
  createGeometries() {
    // Main brick body with slight bevel
    const brickWidth = this.brickSize - this.gap * 2;
    const brickDepth = this.brickSize - this.gap * 2;
    
    // Create a beveled box using a custom shape
    this.brickGeometry = this.createBeveledBox(brickWidth, this.brickHeight, brickDepth, 0.03);
    
    // Stud on top of brick
    this.studGeometry = new THREE.CylinderGeometry(
      this.studRadius,
      this.studRadius,
      this.studHeight,
      16
    );
    
    // Merged geometry for single brick with stud (more efficient)
    this.mergedBrickGeometry = this.createMergedBrickGeometry();
  }

  /**
   * Creates a beveled box geometry.
   * @param {number} width - Box width.
   * @param {number} height - Box height.
   * @param {number} depth - Box depth.
   * @param {number} bevel - Bevel size.
   * @returns {THREE.BufferGeometry} The beveled box geometry.
   */
  createBeveledBox(width, height, depth, bevel) {
    // Use BoxGeometry with slightly rounded edges via shader or simple box for performance
    const geometry = new THREE.BoxGeometry(width, height, depth);
    return geometry;
  }

  /**
   * Creates a merged geometry with brick body and stud.
   * @returns {THREE.BufferGeometry} The merged geometry.
   */
  createMergedBrickGeometry() {
    const brickWidth = this.brickSize - this.gap * 2;
    const brickDepth = this.brickSize - this.gap * 2;
    
    // Create brick body
    const brickGeo = new THREE.BoxGeometry(brickWidth, this.brickHeight, brickDepth);
    
    // Create stud
    const studGeo = new THREE.CylinderGeometry(
      this.studRadius,
      this.studRadius,
      this.studHeight,
      12
    );
    studGeo.translate(0, this.brickHeight / 2 + this.studHeight / 2, 0);
    
    // Merge geometries
    const mergedGeo = new THREE.BufferGeometry();
    
    // Get attributes from both geometries
    const brickPos = brickGeo.attributes.position.array;
    const brickNorm = brickGeo.attributes.normal.array;
    const studPos = studGeo.attributes.position.array;
    const studNorm = studGeo.attributes.normal.array;
    
    // Combine position arrays
    const positions = new Float32Array(brickPos.length + studPos.length);
    positions.set(brickPos, 0);
    positions.set(studPos, brickPos.length);
    
    // Combine normal arrays
    const normals = new Float32Array(brickNorm.length + studNorm.length);
    normals.set(brickNorm, 0);
    normals.set(studNorm, brickNorm.length);
    
    // Combine indices
    const brickIndices = brickGeo.index.array;
    const studIndices = studGeo.index.array;
    const vertexOffset = brickPos.length / 3;
    
    const indices = new Uint32Array(brickIndices.length + studIndices.length);
    indices.set(brickIndices, 0);
    for (let i = 0; i < studIndices.length; i++) {
      indices[brickIndices.length + i] = studIndices[i] + vertexOffset;
    }
    
    mergedGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    mergedGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    mergedGeo.setIndex(new THREE.BufferAttribute(indices, 1));
    
    brickGeo.dispose();
    studGeo.dispose();
    
    return mergedGeo;
  }

  /**
   * Creates LEGO bricks from processed image data.
   * @param {Object} imageData - The processed image data from ImageProcessor.
   * @returns {THREE.Group} The group containing all bricks.
   */
  createBricks(imageData) {
    // Clear existing bricks
    this.clear();
    
    const { pixels, width, height } = imageData;
    
    // Calculate offset to center the model
    const offsetX = (width * this.brickSize) / 2 - this.brickSize / 2;
    const offsetZ = (height * this.brickSize) / 2 - this.brickSize / 2;
    
    // Create bricks for each pixel
    for (const pixel of pixels) {
      const brick = this.createSingleBrick(pixel.color);
      
      // Position brick - flip Y to match image orientation
      const posX = pixel.x * this.brickSize - offsetX;
      const posY = 0;
      const posZ = pixel.y * this.brickSize - offsetZ;
      
      brick.position.set(posX, posY, posZ);
      
      // Store original position for explosion animation
      brick.userData.originalPosition = brick.position.clone();
      brick.userData.originalRotation = brick.rotation.clone();
      brick.userData.gridPosition = { x: pixel.x, y: pixel.y };
      brick.userData.color = pixel.color;
      brick.userData.isVoxel = true;
      
      // Add random values for explosion
      brick.userData.explosionVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        Math.random() * 30 + 10,
        (Math.random() - 0.5) * 40
      );
      brick.userData.explosionRotation = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      
      this.bricks.push(brick);
      this.group.add(brick);
    }
    
    // Add group to scene
    this.scene.add(this.group);
    
    // Calculate and return bounding box
    const boundingBox = new THREE.Box3().setFromObject(this.group);
    
    return {
      group: this.group,
      bricks: this.bricks,
      boundingBox
    };
  }

  /**
   * Creates a single LEGO brick mesh.
   * @param {number[]} color - RGB color array.
   * @returns {THREE.Mesh} The brick mesh.
   */
  createSingleBrick(color) {
    const hexColor = ImageProcessor.rgbToHex(color);
    
    // Create material with plastic-like appearance
    const material = new THREE.MeshStandardMaterial({
      color: hexColor,
      roughness: 0.3,
      metalness: 0.0,
      envMapIntensity: 0.5
    });
    
    const brick = new THREE.Mesh(this.mergedBrickGeometry, material);
    brick.castShadow = true;
    brick.receiveShadow = true;
    
    return brick;
  }

  /**
   * Gets all brick meshes.
   * @returns {THREE.Mesh[]} Array of brick meshes.
   */
  getBricks() {
    return this.bricks;
  }

  /**
   * Gets the brick group.
   * @returns {THREE.Group} The brick group.
   */
  getGroup() {
    return this.group;
  }

  /**
   * Clears all bricks from the scene.
   */
  clear() {
    for (const brick of this.bricks) {
      if (brick.geometry !== this.mergedBrickGeometry) {
        brick.geometry.dispose();
      }
      brick.material.dispose();
      this.group.remove(brick);
    }
    
    this.bricks = [];
    
    if (this.group.parent) {
      this.scene.remove(this.group);
    }
    
    this.group = new THREE.Group();
    this.group.userData.isVoxel = true;
  }

  /**
   * Disposes of all resources.
   */
  dispose() {
    this.clear();
    this.brickGeometry.dispose();
    this.studGeometry.dispose();
    this.mergedBrickGeometry.dispose();
  }
}

export { Voxelizer };

