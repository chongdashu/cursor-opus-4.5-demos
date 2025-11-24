import * as THREE from 'three';

/**
 * Easing functions for smooth animations.
 */
const Easing = {
  /**
   * Ease out cubic - decelerating to zero velocity.
   * @param {number} t - Progress (0-1).
   * @returns {number} Eased value.
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  },

  /**
   * Ease out elastic - overshoots slightly at the end.
   * @param {number} t - Progress (0-1).
   * @returns {number} Eased value.
   */
  easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : 
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  /**
   * Ease in out cubic - accelerating until halfway, then decelerating.
   * @param {number} t - Progress (0-1).
   * @returns {number} Eased value.
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  /**
   * Ease out back - overshoots target then returns.
   * @param {number} t - Progress (0-1).
   * @returns {number} Eased value.
   */
  easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  /**
   * Ease in expo - exponential acceleration.
   * @param {number} t - Progress (0-1).
   * @returns {number} Eased value.
   */
  easeInExpo(t) {
    return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
  },

  /**
   * Ease out expo - exponential deceleration.
   * @param {number} t - Progress (0-1).
   * @returns {number} Eased value.
   */
  easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }
};

/**
 * Explosion system that handles the explosion and reassembly animation of bricks.
 */
class ExplosionSystem {
  /**
   * Creates a new ExplosionSystem instance.
   * @param {Object} options - Configuration options.
   */
  constructor(options = {}) {
    this.bricks = [];
    this.isExploded = false;
    this.isAnimating = false;
    this.animationProgress = 0;
    this.animationDuration = options.duration || 1.5; // seconds
    this.explosionForce = options.force || 1;
    this.gravity = options.gravity || -20;
    
    this.onStateChange = null;
    
    // Bind update method
    this.update = this.update.bind(this);
  }

  /**
   * Sets the bricks to animate.
   * @param {THREE.Mesh[]} bricks - Array of brick meshes.
   */
  setBricks(bricks) {
    this.bricks = bricks;
    this.isExploded = false;
    this.isAnimating = false;
    this.animationProgress = 0;
    
    // Store initial positions
    for (const brick of this.bricks) {
      if (!brick.userData.originalPosition) {
        brick.userData.originalPosition = brick.position.clone();
        brick.userData.originalRotation = brick.rotation.clone();
      }
      
      // Calculate explosion target based on distance from center
      const distFromCenter = brick.userData.originalPosition.length();
      const direction = brick.userData.originalPosition.clone().normalize();
      
      // Add some randomness to the explosion direction
      direction.x += (Math.random() - 0.5) * 0.5;
      direction.y += Math.random() * 0.3 + 0.3; // Bias upward
      direction.z += (Math.random() - 0.5) * 0.5;
      direction.normalize();
      
      const explosionDistance = (distFromCenter * 0.5 + Math.random() * 20 + 15) * this.explosionForce;
      
      brick.userData.explosionTarget = brick.userData.originalPosition.clone().add(
        direction.multiplyScalar(explosionDistance)
      );
      
      // Random rotation for explosion
      brick.userData.explosionRotationTarget = new THREE.Euler(
        (Math.random() - 0.5) * Math.PI * 4,
        (Math.random() - 0.5) * Math.PI * 4,
        (Math.random() - 0.5) * Math.PI * 4
      );
      
      // Add slight delay based on distance for wave effect
      brick.userData.explosionDelay = distFromCenter * 0.01 + Math.random() * 0.1;
    }
  }

  /**
   * Toggles between exploded and assembled states.
   */
  toggle() {
    if (this.isAnimating) return;
    
    this.isExploded = !this.isExploded;
    this.isAnimating = true;
    this.animationProgress = 0;
    
    if (this.onStateChange) {
      this.onStateChange(this.isExploded);
    }
  }

  /**
   * Triggers explosion animation.
   */
  explode() {
    if (this.isExploded || this.isAnimating) return;
    this.toggle();
  }

  /**
   * Triggers reassembly animation.
   */
  reassemble() {
    if (!this.isExploded || this.isAnimating) return;
    this.toggle();
  }

  /**
   * Updates the animation state.
   * @param {number} delta - Time delta in seconds.
   */
  update(delta) {
    if (!this.isAnimating || this.bricks.length === 0) return;
    
    // Update progress
    this.animationProgress += delta / this.animationDuration;
    
    if (this.animationProgress >= 1) {
      this.animationProgress = 1;
      this.isAnimating = false;
    }
    
    // Animate each brick
    for (const brick of this.bricks) {
      const delay = brick.userData.explosionDelay || 0;
      const adjustedProgress = Math.max(0, Math.min(1, 
        (this.animationProgress - delay) / (1 - delay)
      ));
      
      if (this.isExploded) {
        // Exploding: from original to explosion target
        this.animateExplosion(brick, adjustedProgress);
      } else {
        // Reassembling: from current to original
        this.animateReassemble(brick, adjustedProgress);
      }
    }
  }

  /**
   * Animates a brick during explosion.
   * @param {THREE.Mesh} brick - The brick to animate.
   * @param {number} progress - Animation progress (0-1).
   */
  animateExplosion(brick, progress) {
    const original = brick.userData.originalPosition;
    const target = brick.userData.explosionTarget;
    const targetRotation = brick.userData.explosionRotationTarget;
    
    // Use easing for smooth animation
    const eased = Easing.easeOutCubic(progress);
    
    // Add gravity-like arc to the motion
    const arcHeight = Math.sin(progress * Math.PI) * 5;
    
    // Interpolate position
    brick.position.lerpVectors(original, target, eased);
    brick.position.y += arcHeight * (1 - progress);
    
    // Interpolate rotation with some spin
    const spinFactor = Easing.easeOutExpo(progress);
    brick.rotation.x = targetRotation.x * spinFactor;
    brick.rotation.y = targetRotation.y * spinFactor;
    brick.rotation.z = targetRotation.z * spinFactor;
  }

  /**
   * Animates a brick during reassembly.
   * @param {THREE.Mesh} brick - The brick to animate.
   * @param {number} progress - Animation progress (0-1).
   */
  animateReassemble(brick, progress) {
    const original = brick.userData.originalPosition;
    const originalRotation = brick.userData.originalRotation;
    
    // Store current position at start of reassembly
    if (!brick.userData.reassembleStart) {
      brick.userData.reassembleStart = brick.position.clone();
      brick.userData.reassembleRotationStart = brick.rotation.clone();
    }
    
    const start = brick.userData.reassembleStart;
    const startRotation = brick.userData.reassembleRotationStart;
    
    // Use elastic easing for satisfying snap-back
    const eased = Easing.easeOutBack(progress);
    
    // Interpolate position
    brick.position.lerpVectors(start, original, eased);
    
    // Interpolate rotation back to original
    brick.rotation.x = THREE.MathUtils.lerp(startRotation.x, originalRotation.x, eased);
    brick.rotation.y = THREE.MathUtils.lerp(startRotation.y, originalRotation.y, eased);
    brick.rotation.z = THREE.MathUtils.lerp(startRotation.z, originalRotation.z, eased);
    
    // Clear reassemble start when done
    if (progress >= 1) {
      delete brick.userData.reassembleStart;
      delete brick.userData.reassembleRotationStart;
    }
  }

  /**
   * Gets whether the system is currently exploded.
   * @returns {boolean} True if exploded.
   */
  getIsExploded() {
    return this.isExploded;
  }

  /**
   * Gets whether an animation is in progress.
   * @returns {boolean} True if animating.
   */
  getIsAnimating() {
    return this.isAnimating;
  }

  /**
   * Resets the system to initial state.
   */
  reset() {
    // Reset all bricks to original positions
    for (const brick of this.bricks) {
      if (brick.userData.originalPosition) {
        brick.position.copy(brick.userData.originalPosition);
      }
      if (brick.userData.originalRotation) {
        brick.rotation.copy(brick.userData.originalRotation);
      }
    }
    
    this.isExploded = false;
    this.isAnimating = false;
    this.animationProgress = 0;
  }

  /**
   * Sets a callback for state changes.
   * @param {Function} callback - Callback function(isExploded).
   */
  setStateChangeCallback(callback) {
    this.onStateChange = callback;
  }
}

export { ExplosionSystem, Easing };

