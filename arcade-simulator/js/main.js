/**
 * PIXEL PALACE - Main Game Controller
 * Handles game selection, audio, and shared utilities
 */

// ========================================
// GAME STATE & CONFIGURATION
// ========================================

const GameState = {
    MENU: 'menu',
    INSTRUCTIONS: 'instructions',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameover'
};

const ArcadeController = {
    canvas: null,
    ctx: null,
    currentGame: null,
    currentGameInstance: null,
    state: GameState.MENU,
    selectedIndex: 0,
    soundEnabled: true,
    audioContext: null,
    
    games: [
        { id: 'snake', name: 'SNAKE', icon: '🐍' },
        { id: 'breakout', name: 'BREAKOUT', icon: '🧱' },
        { id: 'invaders', name: 'SPACE INVADERS', icon: '👾' },
        { id: 'tetris', name: 'TETRIS', icon: '🟦' }
    ],
    
    instructions: {
        snake: {
            title: 'SNAKE',
            content: `
                <p><span class="key">↑ ↓ ← →</span> MOVE</p>
                <p><span class="key">P</span> PAUSE</p>
                <p>EAT FOOD TO GROW</p>
                <p>DON'T HIT WALLS OR YOURSELF!</p>
            `
        },
        breakout: {
            title: 'BREAKOUT',
            content: `
                <p><span class="key">← →</span> MOVE PADDLE</p>
                <p><span class="key">SPACE</span> LAUNCH BALL</p>
                <p><span class="key">P</span> PAUSE</p>
                <p>DESTROY ALL BRICKS!</p>
            `
        },
        invaders: {
            title: 'SPACE INVADERS',
            content: `
                <p><span class="key">← →</span> MOVE SHIP</p>
                <p><span class="key">SPACE</span> FIRE</p>
                <p><span class="key">P</span> PAUSE</p>
                <p>DESTROY THE ALIEN INVASION!</p>
            `
        },
        tetris: {
            title: 'TETRIS',
            content: `
                <p><span class="key">← →</span> MOVE</p>
                <p><span class="key">↑</span> ROTATE</p>
                <p><span class="key">↓</span> SOFT DROP</p>
                <p><span class="key">SPACE</span> HARD DROP</p>
                <p><span class="key">P</span> PAUSE</p>
            `
        }
    },

    /**
     * Initialize the arcade controller
     */
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize audio context on first user interaction
        this.initAudio();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update menu display
        this.updateMenuSelection();
        
        // Load high scores
        this.loadHighScores();
        
        console.log('🕹️ PIXEL PALACE initialized!');
    },

    /**
     * Initialize Web Audio API context
     */
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    },

    /**
     * Set up keyboard and UI event listeners
     */
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Sound toggle
        const soundToggle = document.getElementById('soundToggle');
        soundToggle.addEventListener('click', () => this.toggleSound());
        
        // Menu item clicks
        const gameItems = document.querySelectorAll('.game-item');
        gameItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectedIndex = index;
                this.updateMenuSelection();
                this.selectGame();
            });
        });
        
        // Resume audio context on user interaction
        document.addEventListener('click', () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }, { once: true });
    },

    /**
     * Handle key down events
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleKeyDown(e) {
        // Prevent default for game keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape', 'KeyP'].includes(e.code)) {
            e.preventDefault();
        }
        
        // Update joystick visual
        this.updateJoystickVisual(e.code, true);
        
        switch (this.state) {
            case GameState.MENU:
                this.handleMenuInput(e.code);
                break;
            case GameState.INSTRUCTIONS:
                this.handleInstructionsInput(e.code);
                break;
            case GameState.PLAYING:
                this.handleGameInput(e);
                break;
            case GameState.PAUSED:
                this.handlePausedInput(e.code);
                break;
            case GameState.GAME_OVER:
                this.handleGameOverInput(e.code);
                break;
        }
    },

    /**
     * Handle key up events
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleKeyUp(e) {
        this.updateJoystickVisual(e.code, false);
        
        if (this.state === GameState.PLAYING && this.currentGameInstance) {
            this.currentGameInstance.handleKeyUp(e);
        }
    },

    /**
     * Update joystick visual based on key press
     * @param {string} code - The key code
     * @param {boolean} pressed - Whether the key is pressed
     */
    updateJoystickVisual(code, pressed) {
        const stick = document.querySelector('.joystick-stick');
        const redBtn = document.querySelector('.arcade-button.red');
        const blueBtn = document.querySelector('.arcade-button.blue');
        
        stick.classList.remove('up', 'down', 'left', 'right');
        
        if (pressed) {
            switch (code) {
                case 'ArrowUp':
                    stick.classList.add('up');
                    break;
                case 'ArrowDown':
                    stick.classList.add('down');
                    break;
                case 'ArrowLeft':
                    stick.classList.add('left');
                    break;
                case 'ArrowRight':
                    stick.classList.add('right');
                    break;
                case 'Space':
                    redBtn.classList.add('pressed');
                    setTimeout(() => redBtn.classList.remove('pressed'), 100);
                    break;
                case 'Enter':
                    blueBtn.classList.add('pressed');
                    setTimeout(() => blueBtn.classList.remove('pressed'), 100);
                    break;
            }
        }
    },

    /**
     * Handle menu navigation
     * @param {string} code - The key code
     */
    handleMenuInput(code) {
        switch (code) {
            case 'ArrowUp':
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                this.updateMenuSelection();
                this.playSound('select');
                break;
            case 'ArrowDown':
                this.selectedIndex = Math.min(this.games.length - 1, this.selectedIndex + 1);
                this.updateMenuSelection();
                this.playSound('select');
                break;
            case 'Enter':
            case 'Space':
                this.selectGame();
                break;
        }
    },

    /**
     * Handle instructions screen input
     * @param {string} code - The key code
     */
    handleInstructionsInput(code) {
        switch (code) {
            case 'Enter':
            case 'Space':
                this.startGame();
                break;
            case 'Escape':
                this.showMenu();
                break;
        }
    },

    /**
     * Handle game input - delegate to current game
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleGameInput(e) {
        if (e.code === 'KeyP') {
            this.pauseGame();
            return;
        }
        if (e.code === 'Escape') {
            this.endGame();
            return;
        }
        
        if (this.currentGameInstance) {
            this.currentGameInstance.handleKeyDown(e);
        }
    },

    /**
     * Handle paused state input
     * @param {string} code - The key code
     */
    handlePausedInput(code) {
        switch (code) {
            case 'KeyP':
            case 'Enter':
            case 'Space':
                this.resumeGame();
                break;
            case 'Escape':
                this.endGame();
                break;
        }
    },

    /**
     * Handle game over input
     * @param {string} code - The key code
     */
    handleGameOverInput(code) {
        switch (code) {
            case 'Enter':
            case 'Space':
                this.startGame();
                break;
            case 'Escape':
                this.showMenu();
                break;
        }
    },

    /**
     * Update menu selection visuals
     */
    updateMenuSelection() {
        const items = document.querySelectorAll('.game-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    },

    /**
     * Select and show instructions for current game
     */
    selectGame() {
        this.currentGame = this.games[this.selectedIndex].id;
        this.showInstructions();
        this.playSound('confirm');
    },

    /**
     * Show instructions overlay
     */
    showInstructions() {
        this.state = GameState.INSTRUCTIONS;
        
        const overlay = document.getElementById('instructionsOverlay');
        const title = document.getElementById('instructionsTitle');
        const content = document.getElementById('instructionsContent');
        
        const instructions = this.instructions[this.currentGame];
        title.textContent = instructions.title;
        content.innerHTML = instructions.content;
        
        document.getElementById('menuOverlay').classList.add('hidden');
        overlay.classList.remove('hidden');
    },

    /**
     * Show main menu
     */
    showMenu() {
        this.state = GameState.MENU;
        
        // Stop current game if any
        if (this.currentGameInstance) {
            this.currentGameInstance.stop();
            this.currentGameInstance = null;
        }
        
        // Hide all overlays and show menu
        document.getElementById('instructionsOverlay').classList.add('hidden');
        document.getElementById('gameOverOverlay').classList.add('hidden');
        document.getElementById('pauseOverlay').classList.add('hidden');
        document.getElementById('menuOverlay').classList.remove('hidden');
        
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update marquee text
        document.querySelector('.marquee-text').textContent = 'SELECT YOUR GAME';
    },

    /**
     * Start the selected game
     */
    startGame() {
        this.state = GameState.PLAYING;
        
        // Hide all overlays
        document.getElementById('instructionsOverlay').classList.add('hidden');
        document.getElementById('gameOverOverlay').classList.add('hidden');
        document.getElementById('pauseOverlay').classList.add('hidden');
        document.getElementById('menuOverlay').classList.add('hidden');
        
        // Update marquee
        document.querySelector('.marquee-text').textContent = this.instructions[this.currentGame].title;
        
        // Create game instance
        switch (this.currentGame) {
            case 'snake':
                this.currentGameInstance = new SnakeGame(this);
                break;
            case 'breakout':
                this.currentGameInstance = new BreakoutGame(this);
                break;
            case 'invaders':
                this.currentGameInstance = new SpaceInvadersGame(this);
                break;
            case 'tetris':
                this.currentGameInstance = new TetrisGame(this);
                break;
        }
        
        this.currentGameInstance.start();
        this.playSound('start');
    },

    /**
     * Pause the current game
     */
    pauseGame() {
        if (this.state !== GameState.PLAYING) return;
        
        this.state = GameState.PAUSED;
        document.getElementById('pauseOverlay').classList.remove('hidden');
        
        if (this.currentGameInstance) {
            this.currentGameInstance.pause();
        }
        
        this.playSound('pause');
    },

    /**
     * Resume the current game
     */
    resumeGame() {
        if (this.state !== GameState.PAUSED) return;
        
        this.state = GameState.PLAYING;
        document.getElementById('pauseOverlay').classList.add('hidden');
        
        if (this.currentGameInstance) {
            this.currentGameInstance.resume();
        }
        
        this.playSound('confirm');
    },

    /**
     * End the current game and return to menu
     */
    endGame() {
        if (this.currentGameInstance) {
            this.currentGameInstance.stop();
        }
        this.showMenu();
    },

    /**
     * Handle game over
     * @param {number} score - The final score
     */
    gameOver(score) {
        this.state = GameState.GAME_OVER;
        
        const highScore = this.getHighScore(this.currentGame);
        const isNewHighScore = score > highScore;
        
        if (isNewHighScore) {
            this.setHighScore(this.currentGame, score);
        }
        
        document.getElementById('finalScore').textContent = score;
        document.getElementById('highScoreDisplay').textContent = Math.max(score, highScore);
        document.getElementById('gameOverOverlay').classList.remove('hidden');
        
        this.updateScoreDisplay(score);
        this.playSound(isNewHighScore ? 'highscore' : 'gameover');
    },

    /**
     * Update score display
     * @param {number} score - The current score
     */
    updateScoreDisplay(score) {
        document.getElementById('currentScore').textContent = score;
        document.getElementById('currentHighScore').textContent = this.getHighScore(this.currentGame);
    },

    /**
     * Get high score for a game
     * @param {string} gameId - The game identifier
     * @returns {number} The high score
     */
    getHighScore(gameId) {
        const scores = JSON.parse(localStorage.getItem('pixelPalaceScores') || '{}');
        return scores[gameId] || 0;
    },

    /**
     * Set high score for a game
     * @param {string} gameId - The game identifier
     * @param {number} score - The score to set
     */
    setHighScore(gameId, score) {
        const scores = JSON.parse(localStorage.getItem('pixelPalaceScores') || '{}');
        scores[gameId] = score;
        localStorage.setItem('pixelPalaceScores', JSON.stringify(scores));
    },

    /**
     * Load and display high scores
     */
    loadHighScores() {
        // Initial display update
        document.getElementById('currentScore').textContent = '0';
        document.getElementById('currentHighScore').textContent = '0';
    },

    /**
     * Toggle sound on/off
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        
        const soundOn = document.querySelector('.sound-on');
        const soundOff = document.querySelector('.sound-off');
        
        soundOn.classList.toggle('hidden', !this.soundEnabled);
        soundOff.classList.toggle('hidden', this.soundEnabled);
        
        this.playSound('select');
    },

    /**
     * Play a sound effect
     * @param {string} type - The type of sound to play
     */
    playSound(type) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        const now = this.audioContext.currentTime;
        
        switch (type) {
            case 'select':
                oscillator.frequency.setValueAtTime(440, now);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialDecayToValueAtTime(0.01, now + 0.1);
                oscillator.start(now);
                oscillator.stop(now + 0.1);
                break;
            case 'confirm':
                oscillator.frequency.setValueAtTime(523.25, now);
                oscillator.frequency.setValueAtTime(659.25, now + 0.1);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialDecayToValueAtTime(0.01, now + 0.2);
                oscillator.start(now);
                oscillator.stop(now + 0.2);
                break;
            case 'start':
                oscillator.frequency.setValueAtTime(261.63, now);
                oscillator.frequency.setValueAtTime(329.63, now + 0.1);
                oscillator.frequency.setValueAtTime(392, now + 0.2);
                oscillator.frequency.setValueAtTime(523.25, now + 0.3);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialDecayToValueAtTime(0.01, now + 0.4);
                oscillator.start(now);
                oscillator.stop(now + 0.4);
                break;
            case 'gameover':
                oscillator.frequency.setValueAtTime(392, now);
                oscillator.frequency.setValueAtTime(349.23, now + 0.15);
                oscillator.frequency.setValueAtTime(329.63, now + 0.3);
                oscillator.frequency.setValueAtTime(261.63, now + 0.45);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialDecayToValueAtTime(0.01, now + 0.6);
                oscillator.start(now);
                oscillator.stop(now + 0.6);
                break;
            case 'highscore':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(523.25, now);
                oscillator.frequency.setValueAtTime(659.25, now + 0.1);
                oscillator.frequency.setValueAtTime(783.99, now + 0.2);
                oscillator.frequency.setValueAtTime(1046.50, now + 0.3);
                gainNode.gain.setValueAtTime(0.08, now);
                gainNode.gain.exponentialDecayToValueAtTime(0.01, now + 0.5);
                oscillator.start(now);
                oscillator.stop(now + 0.5);
                break;
            case 'pause':
                oscillator.frequency.setValueAtTime(220, now);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialDecayToValueAtTime(0.01, now + 0.15);
                oscillator.start(now);
                oscillator.stop(now + 0.15);
                break;
            case 'eat':
            case 'collect':
                oscillator.frequency.setValueAtTime(880, now);
                oscillator.frequency.exponentialRampToValueAtTime(1760, now + 0.05);
                gainNode.gain.setValueAtTime(0.08, now);
                gainNode.gain.exponentialDecayToValueAtTime(0.01, now + 0.1);
                oscillator.start(now);
                oscillator.stop(now + 0.1);
                break;
            case 'hit':
            case 'destroy':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(150, now);
                oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialDecayToValueAtTime(0.01, now + 0.1);
                oscillator.start(now);
                oscillator.stop(now + 0.1);
                break;
            case 'shoot':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(600, now);
                oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.1);
                gainNode.gain.setValueAtTime(0.05, now);
                gainNode.gain.exponentialDecayToValueAtTime(0.01, now + 0.1);
                oscillator.start(now);
                oscillator.stop(now + 0.1);
                break;
            case 'bounce':
                oscillator.frequency.setValueAtTime(440, now);
                gainNode.gain.setValueAtTime(0.05, now);
                gainNode.gain.exponentialDecayToValueAtTime(0.01, now + 0.05);
                oscillator.start(now);
                oscillator.stop(now + 0.05);
                break;
            case 'line':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(523.25, now);
                oscillator.frequency.setValueAtTime(659.25, now + 0.05);
                oscillator.frequency.setValueAtTime(783.99, now + 0.1);
                gainNode.gain.setValueAtTime(0.08, now);
                gainNode.gain.exponentialDecayToValueAtTime(0.01, now + 0.2);
                oscillator.start(now);
                oscillator.stop(now + 0.2);
                break;
            case 'drop':
                oscillator.frequency.setValueAtTime(200, now);
                oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.05);
                gainNode.gain.setValueAtTime(0.05, now);
                gainNode.gain.exponentialDecayToValueAtTime(0.01, now + 0.05);
                oscillator.start(now);
                oscillator.stop(now + 0.05);
                break;
            case 'move':
                oscillator.frequency.setValueAtTime(150, now);
                gainNode.gain.setValueAtTime(0.02, now);
                gainNode.gain.exponentialDecayToValueAtTime(0.01, now + 0.03);
                oscillator.start(now);
                oscillator.stop(now + 0.03);
                break;
        }
    }
};

// Polyfill for exponentialDecayToValueAtTime
if (!AudioParam.prototype.exponentialDecayToValueAtTime) {
    AudioParam.prototype.exponentialDecayToValueAtTime = function(value, endTime) {
        this.exponentialRampToValueAtTime(Math.max(value, 0.0001), endTime);
    };
}

// ========================================
// BASE GAME CLASS
// ========================================

/**
 * Base class for all arcade games
 */
class BaseGame {
    /**
     * Create a new game instance
     * @param {Object} controller - The arcade controller
     */
    constructor(controller) {
        this.controller = controller;
        this.canvas = controller.canvas;
        this.ctx = controller.ctx;
        this.score = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.animationId = null;
    }

    /**
     * Start the game
     */
    start() {
        this.score = 0;
        this.isRunning = true;
        this.isPaused = false;
        this.controller.updateScoreDisplay(0);
        this.init();
        this.gameLoop();
    }

    /**
     * Stop the game
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Pause the game
     */
    pause() {
        this.isPaused = true;
    }

    /**
     * Resume the game
     */
    resume() {
        this.isPaused = false;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.isRunning || this.isPaused) return;
        
        this.update();
        this.render();
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * Add to score and update display
     * @param {number} points - Points to add
     */
    addScore(points) {
        this.score += points;
        this.controller.updateScoreDisplay(this.score);
    }

    /**
     * Trigger game over
     */
    triggerGameOver() {
        this.stop();
        this.controller.gameOver(this.score);
    }

    /**
     * Play a sound effect
     * @param {string} type - Sound type
     */
    playSound(type) {
        this.controller.playSound(type);
    }

    // Abstract methods to be implemented by subclasses
    init() { throw new Error('init() must be implemented'); }
    update() { throw new Error('update() must be implemented'); }
    render() { throw new Error('render() must be implemented'); }
    handleKeyDown(e) { }
    handleKeyUp(e) { }
}

// ========================================
// INITIALIZE ON DOM LOAD
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    ArcadeController.init();
});
