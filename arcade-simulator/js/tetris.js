/**
 * TETRIS GAME
 * Stack falling blocks, clear lines
 */

class TetrisGame extends BaseGame {
    /**
     * Create a new Tetris game instance
     * @param {Object} controller - The arcade controller
     */
    constructor(controller) {
        super(controller);
        
        // Board dimensions
        this.cols = 10;
        this.rows = 20;
        this.blockSize = 0; // Calculated in init
        
        // Game board (0 = empty, color string = filled)
        this.board = [];
        
        // Current piece
        this.currentPiece = null;
        this.currentX = 0;
        this.currentY = 0;
        this.currentRotation = 0;
        
        // Next piece
        this.nextPiece = null;
        
        // Timing
        this.dropTimer = 0;
        this.dropInterval = 1000; // ms
        this.lastTime = 0;
        
        // Piece definitions (each rotation state)
        this.pieces = {
            I: {
                shape: [
                    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
                    [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
                    [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]],
                    [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]]
                ],
                color: '#00ffff'
            },
            O: {
                shape: [
                    [[1,1], [1,1]],
                    [[1,1], [1,1]],
                    [[1,1], [1,1]],
                    [[1,1], [1,1]]
                ],
                color: '#ffff00'
            },
            T: {
                shape: [
                    [[0,1,0], [1,1,1], [0,0,0]],
                    [[0,1,0], [0,1,1], [0,1,0]],
                    [[0,0,0], [1,1,1], [0,1,0]],
                    [[0,1,0], [1,1,0], [0,1,0]]
                ],
                color: '#ff00ff'
            },
            S: {
                shape: [
                    [[0,1,1], [1,1,0], [0,0,0]],
                    [[0,1,0], [0,1,1], [0,0,1]],
                    [[0,0,0], [0,1,1], [1,1,0]],
                    [[1,0,0], [1,1,0], [0,1,0]]
                ],
                color: '#00ff41'
            },
            Z: {
                shape: [
                    [[1,1,0], [0,1,1], [0,0,0]],
                    [[0,0,1], [0,1,1], [0,1,0]],
                    [[0,0,0], [1,1,0], [0,1,1]],
                    [[0,1,0], [1,1,0], [1,0,0]]
                ],
                color: '#ff1493'
            },
            J: {
                shape: [
                    [[1,0,0], [1,1,1], [0,0,0]],
                    [[0,1,1], [0,1,0], [0,1,0]],
                    [[0,0,0], [1,1,1], [0,0,1]],
                    [[0,1,0], [0,1,0], [1,1,0]]
                ],
                color: '#0066ff'
            },
            L: {
                shape: [
                    [[0,0,1], [1,1,1], [0,0,0]],
                    [[0,1,0], [0,1,0], [0,1,1]],
                    [[0,0,0], [1,1,1], [1,0,0]],
                    [[1,1,0], [0,1,0], [0,1,0]]
                ],
                color: '#ff6600'
            }
        };
        
        this.pieceTypes = Object.keys(this.pieces);
        
        // Level and lines
        this.level = 1;
        this.lines = 0;
        
        // Soft drop
        this.softDropping = false;
    }

    /**
     * Initialize the game state
     */
    init() {
        // Calculate block size based on canvas
        const boardWidth = this.canvas.width * 0.6;
        const boardHeight = this.canvas.height * 0.9;
        
        this.blockSize = Math.min(
            Math.floor(boardWidth / this.cols),
            Math.floor(boardHeight / this.rows)
        );
        
        // Calculate board position (centered, with room for next piece preview)
        this.boardX = (this.canvas.width - this.cols * this.blockSize) / 2 - 30;
        this.boardY = (this.canvas.height - this.rows * this.blockSize) / 2;
        
        // Initialize empty board
        this.board = [];
        for (let y = 0; y < this.rows; y++) {
            this.board[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.board[y][x] = 0;
            }
        }
        
        // Reset game state
        this.level = 1;
        this.lines = 0;
        this.dropInterval = 1000;
        this.lastTime = performance.now();
        this.dropTimer = 0;
        
        // Spawn first pieces
        this.nextPiece = this.randomPiece();
        this.spawnPiece();
    }

    /**
     * Get a random piece type
     * @returns {string} Piece type key
     */
    randomPiece() {
        return this.pieceTypes[Math.floor(Math.random() * this.pieceTypes.length)];
    }

    /**
     * Spawn a new piece at the top
     */
    spawnPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.randomPiece();
        this.currentRotation = 0;
        
        const shape = this.getPieceShape();
        this.currentX = Math.floor((this.cols - shape[0].length) / 2);
        this.currentY = 0;
        
        // Check for game over
        if (this.checkCollision(this.currentX, this.currentY, this.currentRotation)) {
            this.triggerGameOver();
        }
    }

    /**
     * Get the current piece's shape matrix
     * @param {number} rotation - Optional rotation override
     * @returns {Array} Shape matrix
     */
    getPieceShape(rotation = this.currentRotation) {
        return this.pieces[this.currentPiece].shape[rotation];
    }

    /**
     * Get the current piece's color
     * @returns {string} Color value
     */
    getPieceColor() {
        return this.pieces[this.currentPiece].color;
    }

    /**
     * Check if piece collides at position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} rotation - Rotation state
     * @returns {boolean} True if collision
     */
    checkCollision(x, y, rotation) {
        const shape = this.pieces[this.currentPiece].shape[rotation];
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const newX = x + col;
                    const newY = y + row;
                    
                    // Check bounds
                    if (newX < 0 || newX >= this.cols || newY >= this.rows) {
                        return true;
                    }
                    
                    // Check board collision (only if on board)
                    if (newY >= 0 && this.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    /**
     * Lock the current piece to the board
     */
    lockPiece() {
        const shape = this.getPieceShape();
        const color = this.getPieceColor();
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardY = this.currentY + row;
                    const boardX = this.currentX + col;
                    
                    if (boardY >= 0 && boardY < this.rows && boardX >= 0 && boardX < this.cols) {
                        this.board[boardY][boardX] = color;
                    }
                }
            }
        }
        
        this.playSound('drop');
        this.clearLines();
        this.spawnPiece();
    }

    /**
     * Clear completed lines
     */
    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.rows - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                // Remove line
                this.board.splice(y, 1);
                // Add empty line at top
                this.board.unshift(new Array(this.cols).fill(0));
                linesCleared++;
                y++; // Check same row again
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            
            // Score based on lines cleared
            const points = [0, 100, 300, 500, 800][linesCleared] * this.level;
            this.addScore(points);
            
            // Level up every 10 lines
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            }
            
            this.playSound('line');
        }
    }

    /**
     * Move piece left
     */
    moveLeft() {
        if (!this.checkCollision(this.currentX - 1, this.currentY, this.currentRotation)) {
            this.currentX--;
            this.playSound('move');
        }
    }

    /**
     * Move piece right
     */
    moveRight() {
        if (!this.checkCollision(this.currentX + 1, this.currentY, this.currentRotation)) {
            this.currentX++;
            this.playSound('move');
        }
    }

    /**
     * Rotate piece clockwise
     */
    rotate() {
        const newRotation = (this.currentRotation + 1) % 4;
        
        // Try normal rotation
        if (!this.checkCollision(this.currentX, this.currentY, newRotation)) {
            this.currentRotation = newRotation;
            this.playSound('move');
            return;
        }
        
        // Wall kick - try shifting left or right
        const kicks = [-1, 1, -2, 2];
        for (const kick of kicks) {
            if (!this.checkCollision(this.currentX + kick, this.currentY, newRotation)) {
                this.currentX += kick;
                this.currentRotation = newRotation;
                this.playSound('move');
                return;
            }
        }
    }

    /**
     * Soft drop - move piece down faster
     */
    softDrop() {
        if (!this.checkCollision(this.currentX, this.currentY + 1, this.currentRotation)) {
            this.currentY++;
            this.addScore(1);
        }
    }

    /**
     * Hard drop - instantly drop piece to bottom
     */
    hardDrop() {
        let dropDistance = 0;
        
        while (!this.checkCollision(this.currentX, this.currentY + 1, this.currentRotation)) {
            this.currentY++;
            dropDistance++;
        }
        
        this.addScore(dropDistance * 2);
        this.lockPiece();
    }

    /**
     * Handle key down events
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleKeyDown(e) {
        switch (e.code) {
            case 'ArrowLeft':
                this.moveLeft();
                break;
            case 'ArrowRight':
                this.moveRight();
                break;
            case 'ArrowUp':
                this.rotate();
                break;
            case 'ArrowDown':
                this.softDropping = true;
                this.softDrop();
                break;
            case 'Space':
                this.hardDrop();
                break;
        }
    }

    /**
     * Handle key up events
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleKeyUp(e) {
        if (e.code === 'ArrowDown') {
            this.softDropping = false;
        }
    }

    /**
     * Update game state
     */
    update() {
        const now = performance.now();
        const delta = now - this.lastTime;
        this.lastTime = now;
        
        // Update drop timer
        this.dropTimer += delta;
        
        const effectiveInterval = this.softDropping ? this.dropInterval / 10 : this.dropInterval;
        
        if (this.dropTimer >= effectiveInterval) {
            this.dropTimer = 0;
            
            // Try to move piece down
            if (!this.checkCollision(this.currentX, this.currentY + 1, this.currentRotation)) {
                this.currentY++;
            } else {
                // Lock piece
                this.lockPiece();
            }
        }
    }

    /**
     * Render the game
     */
    render() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board background
        this.drawBoardBackground();
        
        // Draw ghost piece (where piece will land)
        this.drawGhostPiece();
        
        // Draw locked blocks
        this.drawBoard();
        
        // Draw current piece
        this.drawCurrentPiece();
        
        // Draw next piece preview
        this.drawNextPiece();
        
        // Draw level and lines
        this.drawStats();
        
        // Draw border
        this.drawBorder();
    }

    /**
     * Draw the board background grid
     */
    drawBoardBackground() {
        const ctx = this.ctx;
        
        // Board outline
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(
            this.boardX - 2,
            this.boardY - 2,
            this.cols * this.blockSize + 4,
            this.rows * this.blockSize + 4
        );
        
        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.cols; x++) {
            ctx.beginPath();
            ctx.moveTo(this.boardX + x * this.blockSize, this.boardY);
            ctx.lineTo(this.boardX + x * this.blockSize, this.boardY + this.rows * this.blockSize);
            ctx.stroke();
        }
        
        for (let y = 0; y <= this.rows; y++) {
            ctx.beginPath();
            ctx.moveTo(this.boardX, this.boardY + y * this.blockSize);
            ctx.lineTo(this.boardX + this.cols * this.blockSize, this.boardY + y * this.blockSize);
            ctx.stroke();
        }
        
        // Board border
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            this.boardX - 2,
            this.boardY - 2,
            this.cols * this.blockSize + 4,
            this.rows * this.blockSize + 4
        );
    }

    /**
     * Draw the locked blocks on the board
     */
    drawBoard() {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(
                        this.boardX + x * this.blockSize,
                        this.boardY + y * this.blockSize,
                        this.board[y][x]
                    );
                }
            }
        }
    }

    /**
     * Draw the ghost piece (preview of where piece will land)
     */
    drawGhostPiece() {
        if (!this.currentPiece) return;
        
        // Find ghost position
        let ghostY = this.currentY;
        while (!this.checkCollision(this.currentX, ghostY + 1, this.currentRotation)) {
            ghostY++;
        }
        
        // Don't draw if at same position
        if (ghostY === this.currentY) return;
        
        const shape = this.getPieceShape();
        const ctx = this.ctx;
        
        ctx.globalAlpha = 0.3;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    this.drawBlock(
                        this.boardX + (this.currentX + col) * this.blockSize,
                        this.boardY + (ghostY + row) * this.blockSize,
                        this.getPieceColor()
                    );
                }
            }
        }
        
        ctx.globalAlpha = 1;
    }

    /**
     * Draw the current falling piece
     */
    drawCurrentPiece() {
        if (!this.currentPiece) return;
        
        const shape = this.getPieceShape();
        const color = this.getPieceColor();
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const x = this.boardX + (this.currentX + col) * this.blockSize;
                    const y = this.boardY + (this.currentY + row) * this.blockSize;
                    
                    if (this.currentY + row >= 0) {
                        this.drawBlock(x, y, color);
                    }
                }
            }
        }
    }

    /**
     * Draw the next piece preview
     */
    drawNextPiece() {
        const ctx = this.ctx;
        const previewX = this.boardX + this.cols * this.blockSize + 25;
        const previewY = this.boardY + 20;
        
        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText('NEXT', previewX, previewY);
        
        // Preview box
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(previewX - 5, previewY + 10, 80, 80);
        
        // Draw piece
        if (this.nextPiece) {
            const piece = this.pieces[this.nextPiece];
            const shape = piece.shape[0];
            const color = piece.color;
            const previewBlockSize = this.blockSize * 0.8;
            
            // Center the piece in preview
            const pieceWidth = shape[0].length * previewBlockSize;
            const pieceHeight = shape.length * previewBlockSize;
            const offsetX = previewX + (70 - pieceWidth) / 2;
            const offsetY = previewY + 20 + (70 - pieceHeight) / 2;
            
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        this.drawBlock(
                            offsetX + col * previewBlockSize,
                            offsetY + row * previewBlockSize,
                            color,
                            previewBlockSize
                        );
                    }
                }
            }
        }
    }

    /**
     * Draw game statistics
     */
    drawStats() {
        const ctx = this.ctx;
        const statsX = this.boardX + this.cols * this.blockSize + 25;
        const statsY = this.boardY + 130;
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'left';
        
        // Level
        ctx.fillText('LEVEL', statsX, statsY);
        ctx.fillStyle = '#00ffff';
        ctx.fillText(String(this.level), statsX, statsY + 20);
        
        // Lines
        ctx.fillStyle = '#ffffff';
        ctx.fillText('LINES', statsX, statsY + 50);
        ctx.fillStyle = '#ff00ff';
        ctx.fillText(String(this.lines), statsX, statsY + 70);
    }

    /**
     * Draw a single block
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} color - Block color
     * @param {number} size - Optional custom size
     */
    drawBlock(x, y, color, size = this.blockSize) {
        const ctx = this.ctx;
        const padding = 1;
        
        // Glow effect
        ctx.shadowBlur = 5;
        ctx.shadowColor = color;
        
        // Main block
        ctx.fillStyle = color;
        ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
        
        // Highlight (top-left)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(x + padding, y + padding, size - padding * 2, 3);
        ctx.fillRect(x + padding, y + padding, 3, size - padding * 2);
        
        // Shadow (bottom-right)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x + padding, y + size - padding - 3, size - padding * 2, 3);
        ctx.fillRect(x + size - padding - 3, y + padding, 3, size - padding * 2);
        
        ctx.shadowBlur = 0;
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
