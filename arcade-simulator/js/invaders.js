/**
 * SPACE INVADERS GAME
 * Destroy the alien invasion before they reach you
 */

class SpaceInvadersGame extends BaseGame {
    /**
     * Create a new Space Invaders game instance
     * @param {Object} controller - The arcade controller
     */
    constructor(controller) {
        super(controller);
        
        // Player ship
        this.player = {
            x: 0,
            y: 0,
            width: 40,
            height: 20,
            speed: 6
        };
        
        // Aliens
        this.aliens = [];
        this.alienRows = 5;
        this.alienCols = 8;
        this.alienWidth = 30;
        this.alienHeight = 24;
        this.alienPadding = 10;
        this.alienDirection = 1; // 1 = right, -1 = left
        this.alienSpeed = 1;
        this.alienDropAmount = 20;
        this.alienMoveTimer = 0;
        this.alienMoveInterval = 1000; // ms between moves
        
        // Bullets
        this.playerBullets = [];
        this.alienBullets = [];
        this.bulletSpeed = 8;
        this.alienBulletSpeed = 4;
        this.canShoot = true;
        this.shootCooldown = 300; // ms
        
        // Shields
        this.shields = [];
        
        // Input state
        this.keys = {
            left: false,
            right: false
        };
        
        // Wave
        this.wave = 1;
        
        // Animation
        this.alienFrame = 0;
        this.lastFrameTime = 0;
    }

    /**
     * Initialize the game state
     */
    init() {
        // Position player
        this.player.x = (this.canvas.width - this.player.width) / 2;
        this.player.y = this.canvas.height - 40;
        
        // Create aliens
        this.createAliens();
        
        // Create shields
        this.createShields();
        
        // Reset bullets
        this.playerBullets = [];
        this.alienBullets = [];
        
        this.wave = 1;
        this.alienSpeed = 1;
        this.alienMoveInterval = 1000;
        this.canShoot = true;
    }

    /**
     * Create the alien grid
     */
    createAliens() {
        this.aliens = [];
        
        const startX = (this.canvas.width - (this.alienCols * (this.alienWidth + this.alienPadding))) / 2;
        const startY = 50;
        
        for (let row = 0; row < this.alienRows; row++) {
            for (let col = 0; col < this.alienCols; col++) {
                this.aliens.push({
                    x: startX + col * (this.alienWidth + this.alienPadding),
                    y: startY + row * (this.alienHeight + this.alienPadding),
                    width: this.alienWidth,
                    height: this.alienHeight,
                    type: row < 1 ? 2 : (row < 3 ? 1 : 0), // Different alien types
                    alive: true,
                    points: (this.alienRows - row) * 10
                });
            }
        }
        
        this.alienDirection = 1;
        this.alienMoveTimer = 0;
    }

    /**
     * Create defensive shields
     */
    createShields() {
        this.shields = [];
        const shieldCount = 4;
        const shieldWidth = 50;
        const shieldHeight = 35;
        const spacing = this.canvas.width / (shieldCount + 1);
        
        for (let i = 0; i < shieldCount; i++) {
            const shieldX = spacing * (i + 1) - shieldWidth / 2;
            const shieldY = this.canvas.height - 100;
            
            // Create shield as grid of blocks
            const blocks = [];
            const blockSize = 5;
            
            for (let y = 0; y < shieldHeight / blockSize; y++) {
                for (let x = 0; x < shieldWidth / blockSize; x++) {
                    // Create arch shape
                    const centerX = shieldWidth / 2 / blockSize;
                    const isArch = y >= shieldHeight / blockSize - 2 && 
                                   x >= centerX - 2 && x <= centerX + 1;
                    
                    if (!isArch) {
                        blocks.push({
                            x: shieldX + x * blockSize,
                            y: shieldY + y * blockSize,
                            width: blockSize,
                            height: blockSize,
                            health: 3
                        });
                    }
                }
            }
            
            this.shields.push({ blocks });
        }
    }

    /**
     * Handle key down events
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleKeyDown(e) {
        switch (e.code) {
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case 'Space':
                this.shoot();
                break;
        }
    }

    /**
     * Handle key up events
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleKeyUp(e) {
        switch (e.code) {
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'ArrowRight':
                this.keys.right = false;
                break;
        }
    }

    /**
     * Fire a bullet from the player
     */
    shoot() {
        if (!this.canShoot) return;
        
        this.playerBullets.push({
            x: this.player.x + this.player.width / 2 - 2,
            y: this.player.y,
            width: 4,
            height: 12
        });
        
        this.canShoot = false;
        this.playSound('shoot');
        
        setTimeout(() => {
            this.canShoot = true;
        }, this.shootCooldown);
    }

    /**
     * Alien shoots a bullet
     */
    alienShoot() {
        const aliveAliens = this.aliens.filter(a => a.alive);
        if (aliveAliens.length === 0) return;
        
        // Random alien shoots
        const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
        
        this.alienBullets.push({
            x: shooter.x + shooter.width / 2 - 2,
            y: shooter.y + shooter.height,
            width: 4,
            height: 12
        });
    }

    /**
     * Update game state
     */
    update() {
        const now = performance.now();
        
        // Move player
        if (this.keys.left && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        if (this.keys.right && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.player.speed;
        }
        
        // Update alien animation
        if (now - this.lastFrameTime > 500) {
            this.alienFrame = (this.alienFrame + 1) % 2;
            this.lastFrameTime = now;
        }
        
        // Move aliens
        this.alienMoveTimer += 16; // Approximate frame time
        if (this.alienMoveTimer >= this.alienMoveInterval) {
            this.alienMoveTimer = 0;
            this.moveAliens();
        }
        
        // Alien shooting (random chance each frame)
        if (Math.random() < 0.02) {
            this.alienShoot();
        }
        
        // Update player bullets
        this.updatePlayerBullets();
        
        // Update alien bullets
        this.updateAlienBullets();
        
        // Check win condition
        if (this.aliens.every(a => !a.alive)) {
            this.nextWave();
        }
    }

    /**
     * Move all aliens
     */
    moveAliens() {
        let shouldDrop = false;
        let shouldReverse = false;
        
        // Check if any alien hit the edge
        for (const alien of this.aliens) {
            if (!alien.alive) continue;
            
            const nextX = alien.x + this.alienSpeed * this.alienDirection;
            
            if (nextX <= 0 || nextX + alien.width >= this.canvas.width) {
                shouldDrop = true;
                shouldReverse = true;
                break;
            }
        }
        
        // Move aliens
        for (const alien of this.aliens) {
            if (!alien.alive) continue;
            
            if (shouldDrop) {
                alien.y += this.alienDropAmount;
                
                // Check if aliens reached player
                if (alien.y + alien.height >= this.player.y) {
                    this.triggerGameOver();
                    return;
                }
            } else {
                alien.x += this.alienSpeed * this.alienDirection;
            }
        }
        
        if (shouldReverse) {
            this.alienDirection *= -1;
        }
        
        this.playSound('move');
    }

    /**
     * Update player bullets
     */
    updatePlayerBullets() {
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const bullet = this.playerBullets[i];
            bullet.y -= this.bulletSpeed;
            
            // Remove if off screen
            if (bullet.y + bullet.height < 0) {
                this.playerBullets.splice(i, 1);
                continue;
            }
            
            // Check alien collision
            for (const alien of this.aliens) {
                if (!alien.alive) continue;
                
                if (this.checkCollision(bullet, alien)) {
                    alien.alive = false;
                    this.playerBullets.splice(i, 1);
                    this.addScore(alien.points);
                    this.playSound('destroy');
                    
                    // Speed up remaining aliens
                    const aliveCount = this.aliens.filter(a => a.alive).length;
                    this.alienMoveInterval = Math.max(100, 1000 - (this.aliens.length - aliveCount) * 20);
                    break;
                }
            }
            
            // Check shield collision
            this.checkShieldCollision(bullet, i, this.playerBullets);
        }
    }

    /**
     * Update alien bullets
     */
    updateAlienBullets() {
        for (let i = this.alienBullets.length - 1; i >= 0; i--) {
            const bullet = this.alienBullets[i];
            bullet.y += this.alienBulletSpeed;
            
            // Remove if off screen
            if (bullet.y > this.canvas.height) {
                this.alienBullets.splice(i, 1);
                continue;
            }
            
            // Check player collision
            if (this.checkCollision(bullet, this.player)) {
                this.playSound('hit');
                this.triggerGameOver();
                return;
            }
            
            // Check shield collision
            this.checkShieldCollision(bullet, i, this.alienBullets);
        }
    }

    /**
     * Check collision between two rectangles
     * @param {Object} a - First rectangle
     * @param {Object} b - Second rectangle
     * @returns {boolean} True if colliding
     */
    checkCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    /**
     * Check bullet collision with shields
     * @param {Object} bullet - The bullet
     * @param {number} bulletIndex - Index in bullet array
     * @param {Array} bulletArray - The bullet array
     */
    checkShieldCollision(bullet, bulletIndex, bulletArray) {
        for (const shield of this.shields) {
            for (let j = shield.blocks.length - 1; j >= 0; j--) {
                const block = shield.blocks[j];
                
                if (this.checkCollision(bullet, block)) {
                    block.health--;
                    bulletArray.splice(bulletIndex, 1);
                    
                    if (block.health <= 0) {
                        shield.blocks.splice(j, 1);
                    }
                    
                    return;
                }
            }
        }
    }

    /**
     * Start next wave
     */
    nextWave() {
        this.wave++;
        this.alienSpeed += 0.5;
        this.alienMoveInterval = Math.max(200, 1000 - this.wave * 100);
        this.createAliens();
        this.playerBullets = [];
        this.alienBullets = [];
        this.addScore(100 * this.wave); // Wave bonus
        this.playSound('line');
    }

    /**
     * Render the game
     */
    render() {
        const ctx = this.ctx;
        
        // Clear canvas with space background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars
        this.drawStars();
        
        // Draw shields
        this.drawShields();
        
        // Draw aliens
        this.drawAliens();
        
        // Draw player
        this.drawPlayer();
        
        // Draw bullets
        this.drawBullets();
        
        // Draw wave indicator
        this.drawWaveIndicator();
        
        // Draw border
        this.drawBorder();
    }

    /**
     * Draw background stars
     */
    drawStars() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        
        // Use score as seed for consistent star positions
        const seed = this.wave;
        for (let i = 0; i < 30; i++) {
            const x = ((seed * 17 + i * 31) % this.canvas.width);
            const y = ((seed * 13 + i * 47) % this.canvas.height);
            const size = (i % 3) + 1;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Draw defensive shields
     */
    drawShields() {
        const ctx = this.ctx;
        
        for (const shield of this.shields) {
            for (const block of shield.blocks) {
                // Color based on health
                const healthColor = block.health === 3 ? '#00ff41' : 
                                   block.health === 2 ? '#ffff00' : '#ff6600';
                
                ctx.fillStyle = healthColor;
                ctx.fillRect(block.x, block.y, block.width, block.height);
            }
        }
    }

    /**
     * Draw all aliens
     */
    drawAliens() {
        const ctx = this.ctx;
        
        for (const alien of this.aliens) {
            if (!alien.alive) continue;
            
            ctx.shadowBlur = 10;
            
            // Different colors and shapes for alien types
            switch (alien.type) {
                case 0: // Bottom rows - simple invaders
                    ctx.shadowColor = '#00ff41';
                    ctx.fillStyle = '#00ff41';
                    this.drawAlienType0(alien);
                    break;
                case 1: // Middle rows
                    ctx.shadowColor = '#00ffff';
                    ctx.fillStyle = '#00ffff';
                    this.drawAlienType1(alien);
                    break;
                case 2: // Top row - special
                    ctx.shadowColor = '#ff1493';
                    ctx.fillStyle = '#ff1493';
                    this.drawAlienType2(alien);
                    break;
            }
            
            ctx.shadowBlur = 0;
        }
    }

    /**
     * Draw type 0 alien (basic)
     * @param {Object} alien - The alien to draw
     */
    drawAlienType0(alien) {
        const ctx = this.ctx;
        const x = alien.x;
        const y = alien.y;
        const w = alien.width;
        const h = alien.height;
        
        ctx.beginPath();
        
        // Body
        ctx.fillRect(x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.6);
        
        // Arms
        if (this.alienFrame === 0) {
            ctx.fillRect(x, y + h * 0.3, w * 0.2, h * 0.4);
            ctx.fillRect(x + w * 0.8, y + h * 0.3, w * 0.2, h * 0.4);
        } else {
            ctx.fillRect(x, y + h * 0.1, w * 0.2, h * 0.4);
            ctx.fillRect(x + w * 0.8, y + h * 0.1, w * 0.2, h * 0.4);
        }
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(x + w * 0.3, y + h * 0.35, w * 0.15, h * 0.15);
        ctx.fillRect(x + w * 0.55, y + h * 0.35, w * 0.15, h * 0.15);
    }

    /**
     * Draw type 1 alien (medium)
     * @param {Object} alien - The alien to draw
     */
    drawAlienType1(alien) {
        const ctx = this.ctx;
        const x = alien.x;
        const y = alien.y;
        const w = alien.width;
        const h = alien.height;
        
        // Head
        ctx.fillRect(x + w * 0.25, y, w * 0.5, h * 0.3);
        
        // Body
        ctx.fillRect(x + w * 0.1, y + h * 0.3, w * 0.8, h * 0.4);
        
        // Legs
        if (this.alienFrame === 0) {
            ctx.fillRect(x + w * 0.1, y + h * 0.7, w * 0.2, h * 0.3);
            ctx.fillRect(x + w * 0.7, y + h * 0.7, w * 0.2, h * 0.3);
        } else {
            ctx.fillRect(x, y + h * 0.7, w * 0.2, h * 0.3);
            ctx.fillRect(x + w * 0.8, y + h * 0.7, w * 0.2, h * 0.3);
        }
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(x + w * 0.3, y + h * 0.4, w * 0.15, h * 0.15);
        ctx.fillRect(x + w * 0.55, y + h * 0.4, w * 0.15, h * 0.15);
    }

    /**
     * Draw type 2 alien (special)
     * @param {Object} alien - The alien to draw
     */
    drawAlienType2(alien) {
        const ctx = this.ctx;
        const x = alien.x;
        const y = alien.y;
        const w = alien.width;
        const h = alien.height;
        
        // UFO-like shape
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Dome
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.3, w * 0.3, h * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Lights
        ctx.fillStyle = '#ffff00';
        const lightY = y + h * 0.55;
        ctx.beginPath();
        ctx.arc(x + w * 0.25, lightY, 3, 0, Math.PI * 2);
        ctx.arc(x + w * 0.5, lightY, 3, 0, Math.PI * 2);
        ctx.arc(x + w * 0.75, lightY, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw the player ship
     */
    drawPlayer() {
        const ctx = this.ctx;
        const x = this.player.x;
        const y = this.player.y;
        const w = this.player.width;
        const h = this.player.height;
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff';
        
        // Ship body
        ctx.fillStyle = '#00ffff';
        
        // Main hull
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y); // Top point
        ctx.lineTo(x + w, y + h);  // Bottom right
        ctx.lineTo(x, y + h);       // Bottom left
        ctx.closePath();
        ctx.fill();
        
        // Cockpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.5, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Engine glow
        ctx.fillStyle = '#ff6600';
        ctx.shadowColor = '#ff6600';
        ctx.fillRect(x + w * 0.3, y + h - 3, w * 0.15, 6);
        ctx.fillRect(x + w * 0.55, y + h - 3, w * 0.15, 6);
        
        ctx.shadowBlur = 0;
    }

    /**
     * Draw all bullets
     */
    drawBullets() {
        const ctx = this.ctx;
        
        // Player bullets
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ffff';
        
        for (const bullet of this.playerBullets) {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
        
        // Alien bullets
        ctx.fillStyle = '#ff1493';
        ctx.shadowColor = '#ff1493';
        
        for (const bullet of this.alienBullets) {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
        
        ctx.shadowBlur = 0;
    }

    /**
     * Draw wave indicator
     */
    drawWaveIndicator() {
        const ctx = this.ctx;
        
        ctx.fillStyle = '#ffff00';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'right';
        ctx.fillText(`WAVE ${this.wave}`, this.canvas.width - 10, 20);
    }

    /**
     * Draw game border
     */
    drawBorder() {
        const ctx = this.ctx;
        
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, this.canvas.width - 2, this.canvas.height - 2);
    }
}
