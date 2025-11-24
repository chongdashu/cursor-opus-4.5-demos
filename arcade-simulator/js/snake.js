/**
 * SNAKE GAME
 * Classic snake game - eat food, grow longer, don't hit walls or yourself
 */

class SnakeGame extends BaseGame {
    /**
     * Create a new Snake game instance
     * @param {Object} controller - The arcade controller
     */
    constructor(controller) {
        super(controller);
        this.gridSize = 20;
        this.tileCount = { x: 20, y: 25 };
        this.snake = [];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.food = { x: 0, y: 0 };
        this.lastMoveTime = 0;
        this.moveInterval = 120; // ms between moves
        this.growPending = 0;
        
        // Colors
        this.colors = {
            snake: '#00ff41',
            snakeHead: '#00ff88',
            snakeBorder: '#00aa2a',
            food: '#ff1493',
            foodGlow: 'rgba(255, 20, 147, 0.5)',
            grid: 'rgba(0, 255, 255, 0.05)',
            background: '#0a0a0a'
        };
    }

    /**
     * Initialize the game state
     */
    init() {
        // Calculate actual dimensions
        this.tileCount.x = Math.floor(this.canvas.width / this.gridSize);
        this.tileCount.y = Math.floor(this.canvas.height / this.gridSize);
        
        // Initialize snake in the middle
        const startX = Math.floor(this.tileCount.x / 2);
        const startY = Math.floor(this.tileCount.y / 2);
        
        this.snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ];
        
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.growPending = 0;
        this.lastMoveTime = performance.now();
        
        this.spawnFood();
    }

    /**
     * Spawn food at a random location not occupied by the snake
     */
    spawnFood() {
        let validPosition = false;
        let attempts = 0;
        
        while (!validPosition && attempts < 100) {
            this.food = {
                x: Math.floor(Math.random() * this.tileCount.x),
                y: Math.floor(Math.random() * this.tileCount.y)
            };
            
            // Check if position is not on the snake
            validPosition = !this.snake.some(
                segment => segment.x === this.food.x && segment.y === this.food.y
            );
            attempts++;
        }
    }

    /**
     * Handle key down events
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleKeyDown(e) {
        switch (e.code) {
            case 'ArrowUp':
                if (this.direction.y !== 1) {
                    this.nextDirection = { x: 0, y: -1 };
                }
                break;
            case 'ArrowDown':
                if (this.direction.y !== -1) {
                    this.nextDirection = { x: 0, y: 1 };
                }
                break;
            case 'ArrowLeft':
                if (this.direction.x !== 1) {
                    this.nextDirection = { x: -1, y: 0 };
                }
                break;
            case 'ArrowRight':
                if (this.direction.x !== -1) {
                    this.nextDirection = { x: 1, y: 0 };
                }
                break;
        }
    }

    /**
     * Update game state
     */
    update() {
        const now = performance.now();
        
        if (now - this.lastMoveTime < this.moveInterval) {
            return;
        }
        
        this.lastMoveTime = now;
        
        // Apply queued direction change
        this.direction = { ...this.nextDirection };
        
        // Calculate new head position
        const head = this.snake[0];
        const newHead = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y
        };
        
        // Check wall collision
        if (newHead.x < 0 || newHead.x >= this.tileCount.x ||
            newHead.y < 0 || newHead.y >= this.tileCount.y) {
            this.playSound('hit');
            this.triggerGameOver();
            return;
        }
        
        // Check self collision
        if (this.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
            this.playSound('hit');
            this.triggerGameOver();
            return;
        }
        
        // Move snake
        this.snake.unshift(newHead);
        
        // Check food collision
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.addScore(10);
            this.growPending += 1;
            this.playSound('eat');
            this.spawnFood();
            
            // Speed up slightly
            this.moveInterval = Math.max(50, this.moveInterval - 2);
        }
        
        // Remove tail unless growing
        if (this.growPending > 0) {
            this.growPending--;
        } else {
            this.snake.pop();
        }
    }

    /**
     * Render the game
     */
    render() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw food with glow effect
        this.drawFood();
        
        // Draw snake
        this.drawSnake();
        
        // Draw border
        this.drawBorder();
    }

    /**
     * Draw the background grid
     */
    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.tileCount.x; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.gridSize, 0);
            ctx.lineTo(x * this.gridSize, this.canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y <= this.tileCount.y; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.gridSize);
            ctx.lineTo(this.canvas.width, y * this.gridSize);
            ctx.stroke();
        }
    }

    /**
     * Draw the food with pulsing glow effect
     */
    drawFood() {
        const ctx = this.ctx;
        const x = this.food.x * this.gridSize + this.gridSize / 2;
        const y = this.food.y * this.gridSize + this.gridSize / 2;
        const pulse = Math.sin(performance.now() / 200) * 0.2 + 0.8;
        const radius = (this.gridSize / 2 - 2) * pulse;
        
        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.colors.food;
        
        // Draw food
        ctx.fillStyle = this.colors.food;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(x - 2, y - 2, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }

    /**
     * Draw the snake
     */
    drawSnake() {
        const ctx = this.ctx;
        
        this.snake.forEach((segment, index) => {
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            const isHead = index === 0;
            
            // Glow effect for head
            if (isHead) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.colors.snakeHead;
            }
            
            // Body gradient based on position
            const gradient = ctx.createLinearGradient(x, y, x + this.gridSize, y + this.gridSize);
            if (isHead) {
                gradient.addColorStop(0, this.colors.snakeHead);
                gradient.addColorStop(1, this.colors.snake);
            } else {
                const alpha = 1 - (index / this.snake.length) * 0.3;
                gradient.addColorStop(0, `rgba(0, 255, 65, ${alpha})`);
                gradient.addColorStop(1, `rgba(0, 200, 50, ${alpha})`);
            }
            
            // Draw segment
            ctx.fillStyle = gradient;
            ctx.strokeStyle = this.colors.snakeBorder;
            ctx.lineWidth = 2;
            
            // Rounded rectangle
            const padding = 1;
            const cornerRadius = 4;
            this.roundRect(
                ctx,
                x + padding,
                y + padding,
                this.gridSize - padding * 2,
                this.gridSize - padding * 2,
                cornerRadius
            );
            ctx.fill();
            ctx.stroke();
            
            // Draw eyes on head
            if (isHead) {
                this.drawEyes(x, y);
            }
            
            ctx.shadowBlur = 0;
        });
    }

    /**
     * Draw snake eyes
     * @param {number} x - Head x position
     * @param {number} y - Head y position
     */
    drawEyes(x, y) {
        const ctx = this.ctx;
        const eyeSize = 3;
        const eyeOffset = 5;
        
        ctx.fillStyle = '#ffffff';
        
        // Position eyes based on direction
        let eye1, eye2;
        
        if (this.direction.x === 1) { // Right
            eye1 = { x: x + this.gridSize - eyeOffset, y: y + eyeOffset };
            eye2 = { x: x + this.gridSize - eyeOffset, y: y + this.gridSize - eyeOffset };
        } else if (this.direction.x === -1) { // Left
            eye1 = { x: x + eyeOffset, y: y + eyeOffset };
            eye2 = { x: x + eyeOffset, y: y + this.gridSize - eyeOffset };
        } else if (this.direction.y === -1) { // Up
            eye1 = { x: x + eyeOffset, y: y + eyeOffset };
            eye2 = { x: x + this.gridSize - eyeOffset, y: y + eyeOffset };
        } else { // Down
            eye1 = { x: x + eyeOffset, y: y + this.gridSize - eyeOffset };
            eye2 = { x: x + this.gridSize - eyeOffset, y: y + this.gridSize - eyeOffset };
        }
        
        // Draw eyes
        ctx.beginPath();
        ctx.arc(eye1.x, eye1.y, eyeSize, 0, Math.PI * 2);
        ctx.arc(eye2.x, eye2.y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(eye1.x + this.direction.x, eye1.y + this.direction.y, eyeSize / 2, 0, Math.PI * 2);
        ctx.arc(eye2.x + this.direction.x, eye2.y + this.direction.y, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();
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
     * Draw a rounded rectangle
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
