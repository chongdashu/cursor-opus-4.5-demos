/**
 * BREAKOUT GAME
 * Bounce the ball to destroy all bricks
 */

class BreakoutGame extends BaseGame {
    /**
     * Create a new Breakout game instance
     * @param {Object} controller - The arcade controller
     */
    constructor(controller) {
        super(controller);
        
        // Paddle settings
        this.paddle = {
            width: 80,
            height: 12,
            x: 0,
            y: 0,
            speed: 8
        };
        
        // Ball settings
        this.ball = {
            x: 0,
            y: 0,
            radius: 8,
            dx: 0,
            dy: 0,
            speed: 5
        };
        
        // Brick settings
        this.brickRowCount = 6;
        this.brickColumnCount = 8;
        this.brickWidth = 45;
        this.brickHeight = 18;
        this.brickPadding = 4;
        this.brickOffsetTop = 50;
        this.brickOffsetLeft = 10;
        
        this.bricks = [];
        this.lives = 3;
        this.ballLaunched = false;
        
        // Input state
        this.keys = {
            left: false,
            right: false
        };
        
        // Colors for brick rows
        this.brickColors = [
            { fill: '#ff1493', border: '#ff69b4' }, // Pink
            { fill: '#ff6600', border: '#ff9933' }, // Orange
            { fill: '#ffff00', border: '#ffff66' }, // Yellow
            { fill: '#00ff41', border: '#66ff66' }, // Green
            { fill: '#00ffff', border: '#66ffff' }, // Cyan
            { fill: '#ff00ff', border: '#ff66ff' }  // Magenta
        ];
    }

    /**
     * Initialize the game state
     */
    init() {
        // Position paddle
        this.paddle.x = (this.canvas.width - this.paddle.width) / 2;
        this.paddle.y = this.canvas.height - 30;
        
        // Reset ball
        this.resetBall();
        
        // Calculate brick dimensions based on canvas
        this.brickWidth = (this.canvas.width - this.brickOffsetLeft * 2 - 
            (this.brickColumnCount - 1) * this.brickPadding) / this.brickColumnCount;
        
        // Create bricks
        this.createBricks();
        
        this.lives = 3;
        this.ballLaunched = false;
    }

    /**
     * Reset ball to paddle position
     */
    resetBall() {
        this.ball.x = this.paddle.x + this.paddle.width / 2;
        this.ball.y = this.paddle.y - this.ball.radius - 2;
        this.ball.dx = 0;
        this.ball.dy = 0;
        this.ballLaunched = false;
    }

    /**
     * Launch the ball
     */
    launchBall() {
        if (this.ballLaunched) return;
        
        this.ballLaunched = true;
        // Random angle between -45 and 45 degrees
        const angle = (Math.random() * 90 - 45) * Math.PI / 180;
        this.ball.dx = Math.sin(angle) * this.ball.speed;
        this.ball.dy = -Math.cos(angle) * this.ball.speed;
        this.playSound('shoot');
    }

    /**
     * Create the brick grid
     */
    createBricks() {
        this.bricks = [];
        
        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < this.brickRowCount; r++) {
                const brickX = c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft;
                const brickY = r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop;
                
                this.bricks[c][r] = {
                    x: brickX,
                    y: brickY,
                    status: 1, // 1 = active, 0 = destroyed
                    color: this.brickColors[r % this.brickColors.length],
                    points: (this.brickRowCount - r) * 10 // Top bricks worth more
                };
            }
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
                this.launchBall();
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
     * Update game state
     */
    update() {
        // Move paddle
        if (this.keys.left && this.paddle.x > 0) {
            this.paddle.x -= this.paddle.speed;
        }
        if (this.keys.right && this.paddle.x < this.canvas.width - this.paddle.width) {
            this.paddle.x += this.paddle.speed;
        }
        
        // Keep paddle in bounds
        this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.paddle.x));
        
        // Ball follows paddle if not launched
        if (!this.ballLaunched) {
            this.ball.x = this.paddle.x + this.paddle.width / 2;
            this.ball.y = this.paddle.y - this.ball.radius - 2;
            return;
        }
        
        // Move ball
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        
        // Wall collision (left/right)
        if (this.ball.x - this.ball.radius < 0 || 
            this.ball.x + this.ball.radius > this.canvas.width) {
            this.ball.dx = -this.ball.dx;
            this.ball.x = Math.max(this.ball.radius, 
                Math.min(this.canvas.width - this.ball.radius, this.ball.x));
            this.playSound('bounce');
        }
        
        // Top wall collision
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
            this.ball.y = this.ball.radius;
            this.playSound('bounce');
        }
        
        // Bottom - lose life
        if (this.ball.y + this.ball.radius > this.canvas.height) {
            this.lives--;
            this.playSound('hit');
            
            if (this.lives <= 0) {
                this.triggerGameOver();
                return;
            }
            
            this.resetBall();
        }
        
        // Paddle collision
        this.checkPaddleCollision();
        
        // Brick collision
        this.checkBrickCollision();
        
        // Check win condition
        if (this.checkWin()) {
            // Create new level with faster ball
            this.ball.speed += 1;
            this.createBricks();
            this.resetBall();
            this.addScore(100); // Bonus for clearing level
            this.playSound('line');
        }
    }

    /**
     * Check and handle paddle collision
     */
    checkPaddleCollision() {
        if (this.ball.dy > 0 && // Ball moving down
            this.ball.y + this.ball.radius >= this.paddle.y &&
            this.ball.y - this.ball.radius <= this.paddle.y + this.paddle.height &&
            this.ball.x >= this.paddle.x &&
            this.ball.x <= this.paddle.x + this.paddle.width) {
            
            // Calculate bounce angle based on hit position
            const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
            const angle = (hitPos - 0.5) * Math.PI * 0.7; // -63 to +63 degrees
            
            const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
            this.ball.dx = Math.sin(angle) * speed;
            this.ball.dy = -Math.cos(angle) * speed;
            
            // Ensure ball is above paddle
            this.ball.y = this.paddle.y - this.ball.radius;
            
            this.playSound('bounce');
        }
    }

    /**
     * Check and handle brick collision
     */
    checkBrickCollision() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const brick = this.bricks[c][r];
                
                if (brick.status !== 1) continue;
                
                // Check collision
                if (this.ball.x + this.ball.radius > brick.x &&
                    this.ball.x - this.ball.radius < brick.x + this.brickWidth &&
                    this.ball.y + this.ball.radius > brick.y &&
                    this.ball.y - this.ball.radius < brick.y + this.brickHeight) {
                    
                    // Determine bounce direction
                    const overlapLeft = this.ball.x + this.ball.radius - brick.x;
                    const overlapRight = brick.x + this.brickWidth - (this.ball.x - this.ball.radius);
                    const overlapTop = this.ball.y + this.ball.radius - brick.y;
                    const overlapBottom = brick.y + this.brickHeight - (this.ball.y - this.ball.radius);
                    
                    const minOverlapX = Math.min(overlapLeft, overlapRight);
                    const minOverlapY = Math.min(overlapTop, overlapBottom);
                    
                    if (minOverlapX < minOverlapY) {
                        this.ball.dx = -this.ball.dx;
                    } else {
                        this.ball.dy = -this.ball.dy;
                    }
                    
                    // Destroy brick
                    brick.status = 0;
                    this.addScore(brick.points);
                    this.playSound('destroy');
                    
                    return; // Only hit one brick per frame
                }
            }
        }
    }

    /**
     * Check if all bricks are destroyed
     * @returns {boolean} True if all bricks destroyed
     */
    checkWin() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (this.bricks[c][r].status === 1) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Render the game
     */
    render() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw bricks
        this.drawBricks();
        
        // Draw paddle
        this.drawPaddle();
        
        // Draw ball
        this.drawBall();
        
        // Draw lives
        this.drawLives();
        
        // Draw launch prompt if not launched
        if (!this.ballLaunched) {
            this.drawLaunchPrompt();
        }
        
        // Draw border
        this.drawBorder();
    }

    /**
     * Draw all bricks
     */
    drawBricks() {
        const ctx = this.ctx;
        
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const brick = this.bricks[c][r];
                
                if (brick.status !== 1) continue;
                
                // Glow effect
                ctx.shadowBlur = 8;
                ctx.shadowColor = brick.color.fill;
                
                // Brick body
                ctx.fillStyle = brick.color.fill;
                ctx.fillRect(brick.x, brick.y, this.brickWidth, this.brickHeight);
                
                // Brick border
                ctx.strokeStyle = brick.color.border;
                ctx.lineWidth = 2;
                ctx.strokeRect(brick.x, brick.y, this.brickWidth, this.brickHeight);
                
                // Highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(brick.x + 2, brick.y + 2, this.brickWidth - 4, 4);
                
                ctx.shadowBlur = 0;
            }
        }
    }

    /**
     * Draw the paddle
     */
    drawPaddle() {
        const ctx = this.ctx;
        
        // Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff';
        
        // Gradient
        const gradient = ctx.createLinearGradient(
            this.paddle.x, this.paddle.y,
            this.paddle.x, this.paddle.y + this.paddle.height
        );
        gradient.addColorStop(0, '#00ffff');
        gradient.addColorStop(1, '#0088aa');
        
        // Draw paddle
        ctx.fillStyle = gradient;
        this.roundRect(ctx, this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 6);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        this.roundRect(ctx, this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 6);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
    }

    /**
     * Draw the ball
     */
    drawBall() {
        const ctx = this.ctx;
        
        // Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffffff';
        
        // Ball
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(this.ball.x - 2, this.ball.y - 2, this.ball.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }

    /**
     * Draw remaining lives
     */
    drawLives() {
        const ctx = this.ctx;
        
        ctx.fillStyle = '#ff1493';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ff1493';
        
        for (let i = 0; i < this.lives; i++) {
            ctx.beginPath();
            ctx.arc(20 + i * 25, 25, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
    }

    /**
     * Draw launch prompt
     */
    drawLaunchPrompt() {
        const ctx = this.ctx;
        const pulse = Math.sin(performance.now() / 300) * 0.3 + 0.7;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('PRESS SPACE TO LAUNCH', this.canvas.width / 2, this.canvas.height - 60);
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

    /**
     * Draw a rounded rectangle path
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} radius - Corner radius
     */
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}
