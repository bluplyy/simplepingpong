import { soundManager } from './audio.js';
import confetti from 'canvas-confetti';

export class GameEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks; // onScoreUpdate, onGameOver, onRallyUpdate

    // Virtual game arena dimensions
    this.width = 800;
    this.height = 500;
    this.scaleX = 1;
    this.scaleY = 1;

    // Game states
    this.isRunning = false;
    this.isPaused = false;
    this.animFrameId = null;
    this.gameMode = 'vs_ai'; // 'vs_ai' | 'rally' | 'online_pvp'
    this.difficulty = 'normal'; // 'easy' | 'normal' | 'hard'
    this.winningScore = 7;

    // Online Multiplayer State
    this.isOnlineHost = true;
    this.localPaddleSide = 'left'; // 'left' (Host) | 'right' (Guest)
    this.lastPaddleSyncTime = 0;
    this.lastBallSyncTime = 0;

    // Scores & Stats
    this.playerScore = 0;
    this.aiScore = 0;
    this.rallyCount = 0;
    this.maxRallyInMatch = 0;

    // Paddle specifications
    this.paddleWidth = 14;
    this.paddleHeight = 84;
    this.paddleSpeed = 7.5;

    // Player Paddle (Left)
    this.player = {
      x: 30,
      y: (this.height - this.paddleHeight) / 2,
      w: this.paddleWidth,
      h: this.paddleHeight,
      vy: 0,
      targetY: (this.height - this.paddleHeight) / 2,
    };

    // AI Paddle (Right)
    this.ai = {
      x: this.width - 30 - this.paddleWidth,
      y: (this.height - this.paddleHeight) / 2,
      w: this.paddleWidth,
      h: this.paddleHeight,
      vy: 0,
      speed: 5.5,
    };

    // Ball
    this.ball = {
      x: this.width / 2,
      y: this.height / 2,
      radius: 8,
      speed: 6.5,
      baseSpeed: 6.5,
      vx: 6.5,
      vy: 3,
      trail: [],
    };

    // Particle system
    this.particles = [];

    // Controls
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      KeyW: false,
      KeyS: false,
    };

    this.touchActive = false;
    this.touchY = null;

    this.setupListeners();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Keep aspect ratio 16:10 or fill container width
    const targetAspect = this.width / this.height;
    let displayW = rect.width;
    let displayH = rect.width / targetAspect;

    if (displayH > rect.height) {
      displayH = rect.height;
      displayW = displayH * targetAspect;
    }

    this.canvas.width = Math.floor(displayW * dpr);
    this.canvas.height = Math.floor(displayH * dpr);

    this.canvas.style.width = `${Math.floor(displayW)}px`;
    this.canvas.style.height = `${Math.floor(displayH)}px`;

    this.scaleX = (displayW * dpr) / this.width;
    this.scaleY = (displayH * dpr) / this.height;

    this.ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
  }

  setupListeners() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.code in this.keys) {
        this.keys[e.code] = true;
        if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
          e.preventDefault();
        }
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.callbacks && this.callbacks.onRequestTogglePause) {
          this.callbacks.onRequestTogglePause();
        } else {
          this.togglePause();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code in this.keys) {
        this.keys[e.code] = false;
      }
    });

    // Mouse control on canvas
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isRunning || this.isPaused) return;
      const rect = this.canvas.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const virtualY = (relativeY / rect.height) * this.height;
      this.setLocalPaddleTarget(virtualY);
    });

    // Touch controls for mobile / tablet
    const handleTouch = (e) => {
      if (!this.isRunning || this.isPaused) return;
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const relativeY = touch.clientY - rect.top;
        const virtualY = (relativeY / rect.height) * this.height;
        this.setLocalPaddleTarget(virtualY);
        this.touchActive = true;
      }
    };

    this.canvas.addEventListener('touchstart', handleTouch, { passive: false });
    this.canvas.addEventListener('touchmove', handleTouch, { passive: false });
    this.canvas.addEventListener('touchend', () => {
      this.touchActive = false;
    });

    // Click canvas to resume when paused
    this.canvas.addEventListener('click', () => {
      if (this.isRunning && this.isPaused) {
        if (this.callbacks && this.callbacks.onRequestTogglePause) {
          this.callbacks.onRequestTogglePause();
        } else {
          this.togglePause();
        }
      }
    });
  }

  setLocalPaddleTarget(virtualY) {
    const targetPaddle = this.localPaddleSide === 'left' ? this.player : this.ai;
    targetPaddle.targetY = Math.max(0, Math.min(this.height - targetPaddle.h, virtualY - targetPaddle.h / 2));
  }

  setOpponentPaddle(y) {
    const oppPaddle = this.localPaddleSide === 'left' ? this.ai : this.player;
    oppPaddle.y = y;
    oppPaddle.targetY = y;
  }

  syncBallFromHost(ballState) {
    if (this.gameMode === 'online_pvp' && !this.isOnlineHost) {
      this.ball.x = ballState.x;
      this.ball.y = ballState.y;
      this.ball.vx = ballState.vx;
      this.ball.vy = ballState.vy;
      this.ball.speed = ballState.speed;
      if (ballState.sound) {
        if (ballState.sound === 'paddle') soundManager.playPaddleHit();
        else if (ballState.sound === 'wall') soundManager.playWallHit();
      }
      if (ballState.spark) {
        this.createSparks(ballState.spark.x, ballState.spark.y, 8, ballState.spark.dir || 0);
      }
    }
  }

  syncScoreFromHost(scoreData) {
    if (this.gameMode === 'online_pvp' && !this.isOnlineHost) {
      this.playerScore = scoreData.playerScore;
      this.aiScore = scoreData.aiScore;
      this.rallyCount = scoreData.rallyCount || 0;
      this.notifyScore();
    }
  }

  setOnlineMode(isOnline, isHost = true) {
    if (isOnline) {
      this.gameMode = 'online_pvp';
      this.isOnlineHost = isHost;
      this.localPaddleSide = isHost ? 'left' : 'right';
    } else {
      this.gameMode = 'vs_ai';
      this.isOnlineHost = true;
      this.localPaddleSide = 'left';
    }
    this.resetMatch();
  }

  setDifficulty(diff) {
    this.difficulty = diff;
    if (diff === 'easy') {
      this.ai.speed = 4.2;
    } else if (diff === 'normal') {
      this.ai.speed = 6.0;
    } else if (diff === 'hard') {
      this.ai.speed = 7.8;
    }
  }

  setGameMode(mode) {
    this.gameMode = mode;
    this.resetMatch();
  }

  start() {
    this.stop(); // Batalkan loop sebelumnya jika sedang berjalan agar tidak terjadi penumpukan frame
    this.resetMatch();
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
    this.notifyStateChange();
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.notifyStateChange();
  }

  togglePause() {
    if (!this.isRunning) return;
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.lastTime = performance.now();
    }
    this.notifyStateChange();
  }

  notifyStateChange() {
    if (this.callbacks && this.callbacks.onStateChange) {
      this.callbacks.onStateChange({
        isRunning: this.isRunning,
        isPaused: this.isPaused,
      });
    }
  }

  resetMatch() {
    this.playerScore = 0;
    this.aiScore = 0;
    this.rallyCount = 0;
    this.maxRallyInMatch = 0;
    this.particles = [];
    this.resetBall(1);
    this.player.y = (this.height - this.player.h) / 2;
    this.player.targetY = this.player.y;
    this.ai.y = (this.height - this.ai.h) / 2;
    this.notifyScore();
  }

  resetBall(direction = 1) {
    this.ball.x = this.width / 2;
    this.ball.y = this.height / 2;
    this.ball.trail = [];

    // Calculate angle (-30 to 30 deg)
    const angle = ((Math.random() * 60 - 30) * Math.PI) / 180;
    this.ball.speed = this.ball.baseSpeed;
    this.ball.vx = Math.cos(angle) * this.ball.speed * direction;
    this.ball.vy = Math.sin(angle) * this.ball.speed;

    this.rallyCount = 0;
    if (this.callbacks.onRallyUpdate) {
      this.callbacks.onRallyUpdate(this.rallyCount);
    }
  }

  createSparks(x, y, count = 12, directionX = 1) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI - Math.PI / 2) * 0.9;
      const speed = Math.random() * 5 + 2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed * directionX + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1.5,
        alpha: 1,
        life: Math.random() * 18 + 12,
      });
    }
  }

  notifyScore() {
    if (this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate({
        playerScore: this.playerScore,
        aiScore: this.aiScore,
        rallyCount: this.rallyCount,
        maxRally: this.maxRallyInMatch,
      });
    }
  }

  update(dt) {
    // 1. Move Local Paddle (Player in Host mode, or Right paddle in Guest mode)
    const localPaddle = this.localPaddleSide === 'left' ? this.player : this.ai;
    if (this.keys.ArrowUp || this.keys.KeyW) {
      localPaddle.y -= this.paddleSpeed;
      localPaddle.targetY = localPaddle.y;
    } else if (this.keys.ArrowDown || this.keys.KeyS) {
      localPaddle.y += this.paddleSpeed;
      localPaddle.targetY = localPaddle.y;
    } else if (localPaddle.targetY !== undefined) {
      // Smooth interpolation to touch/mouse target
      const dy = localPaddle.targetY - localPaddle.y;
      localPaddle.y += dy * 0.35;
    }
    localPaddle.y = Math.max(0, Math.min(this.height - localPaddle.h, localPaddle.y));

    // 2. Move Opponent Paddle or Sync Network
    if (this.gameMode === 'vs_ai') {
      const aiTarget = this.ball.y - this.ai.h / 2;
      let aiFollowSpeed = this.ai.speed;
      if (this.difficulty === 'easy') {
        if (Math.abs(this.ai.y - aiTarget) > 10) {
          this.ai.y += Math.sign(aiTarget - this.ai.y) * aiFollowSpeed;
        }
      } else {
        const diffY = aiTarget - this.ai.y;
        this.ai.y += Math.sign(diffY) * Math.min(Math.abs(diffY) * 0.2, aiFollowSpeed);
      }
      this.ai.y = Math.max(0, Math.min(this.height - this.ai.h, this.ai.y));
    } else if (this.gameMode === 'rally') {
      this.ai.y = Math.max(0, Math.min(this.height - this.ai.h, this.ball.y - this.ai.h / 2));
    } else if (this.gameMode === 'online_pvp') {
      // Broadcast local paddle position
      const now = performance.now();
      if (now - this.lastPaddleSyncTime > 30) {
        this.lastPaddleSyncTime = now;
        if (this.callbacks.onLocalPaddleMove) {
          this.callbacks.onLocalPaddleMove(localPaddle.y);
        }
      }
    }

    // 3. Update Ball Trail
    this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
    if (this.ball.trail.length > 7) {
      this.ball.trail.shift();
    }

    // 4. Move Ball & Physics (Simulated by Host or Solo mode)
    if (this.gameMode !== 'online_pvp' || this.isOnlineHost) {
      this.ball.x += this.ball.vx;
      this.ball.y += this.ball.vy;

      let eventSound = null;
      let sparkData = null;

      // Ball collision with top and bottom walls
      if (this.ball.y - this.ball.radius <= 0) {
        this.ball.y = this.ball.radius;
        this.ball.vy *= -1;
        soundManager.playWallHit();
        this.createSparks(this.ball.x, 0, 8, 0);
        eventSound = 'wall';
        sparkData = { x: this.ball.x, y: 0, dir: 0 };
      } else if (this.ball.y + this.ball.radius >= this.height) {
        this.ball.y = this.height - this.ball.radius;
        this.ball.vy *= -1;
        soundManager.playWallHit();
        this.createSparks(this.ball.x, this.height, 8, 0);
        eventSound = 'wall';
        sparkData = { x: this.ball.x, y: this.height, dir: 0 };
      }

      // Collision with Player Paddle (Left)
      if (
        this.ball.x - this.ball.radius <= this.player.x + this.player.w &&
        this.ball.x + this.ball.radius >= this.player.x &&
        this.ball.y >= this.player.y &&
        this.ball.y <= this.player.y + this.player.h
      ) {
        if (this.ball.vx < 0) {
          this.ball.x = this.player.x + this.player.w + this.ball.radius;
          const hitOffset = (this.ball.y - (this.player.y + this.player.h / 2)) / (this.player.h / 2);
          const bounceAngle = hitOffset * (Math.PI / 3);

          this.ball.speed = Math.min(this.ball.speed + 0.35, 15);
          this.ball.vx = Math.cos(bounceAngle) * this.ball.speed;
          this.ball.vy = Math.sin(bounceAngle) * this.ball.speed;

          this.rallyCount++;
          if (this.rallyCount > this.maxRallyInMatch) {
            this.maxRallyInMatch = this.rallyCount;
          }
          if (this.callbacks.onRallyUpdate) {
            this.callbacks.onRallyUpdate(this.rallyCount);
          }

          soundManager.playPaddleHit(this.ball.speed / this.ball.baseSpeed);
          this.createSparks(this.player.x + this.player.w, this.ball.y, 14, 1);
          eventSound = 'paddle';
          sparkData = { x: this.player.x + this.player.w, y: this.ball.y, dir: 1 };
        }
      }

      // Collision with Right Paddle (AI / Guest)
      if (
        this.ball.x + this.ball.radius >= this.ai.x &&
        this.ball.x - this.ball.radius <= this.ai.x + this.ai.w &&
        this.ball.y >= this.ai.y &&
        this.ball.y <= this.ai.y + this.ai.h
      ) {
        if (this.ball.vx > 0) {
          this.ball.x = this.ai.x - this.ball.radius;
          const hitOffset = (this.ball.y - (this.ai.y + this.ai.h / 2)) / (this.ai.h / 2);
          const bounceAngle = hitOffset * (Math.PI / 3);

          this.ball.speed = Math.min(this.ball.speed + 0.35, 15);
          this.ball.vx = -Math.cos(bounceAngle) * this.ball.speed;
          this.ball.vy = Math.sin(bounceAngle) * this.ball.speed;

          this.rallyCount++;
          if (this.rallyCount > this.maxRallyInMatch) {
            this.maxRallyInMatch = this.rallyCount;
          }
          if (this.callbacks.onRallyUpdate) {
            this.callbacks.onRallyUpdate(this.rallyCount);
          }

          soundManager.playPaddleHit(this.ball.speed / this.ball.baseSpeed);
          this.createSparks(this.ai.x, this.ball.y, 14, -1);
          eventSound = 'paddle';
          sparkData = { x: this.ai.x, y: this.ball.y, dir: -1 };
        }
      }

      // Broadcast Ball state from Host to Guest
      if (this.gameMode === 'online_pvp' && this.isOnlineHost) {
        const now = performance.now();
        if (now - this.lastBallSyncTime > 25) {
          this.lastBallSyncTime = now;
          if (this.callbacks.onHostBallSync) {
            this.callbacks.onHostBallSync({
              x: Math.round(this.ball.x * 10) / 10,
              y: Math.round(this.ball.y * 10) / 10,
              vx: Math.round(this.ball.vx * 10) / 10,
              vy: Math.round(this.ball.vy * 10) / 10,
              speed: this.ball.speed,
              sound: eventSound,
              spark: sparkData,
            });
          }
        }
      }

      // Scoring & Out of Bounds
      if (this.ball.x + this.ball.radius < 0) {
        // Right side (AI / Guest) scored
        this.aiScore++;
        soundManager.playWallHit();
        this.notifyScore();
        if (this.callbacks.onHostScoreSync) {
          this.callbacks.onHostScoreSync({
            playerScore: this.playerScore,
            aiScore: this.aiScore,
            rallyCount: this.rallyCount,
          });
        }
        if (this.gameMode === 'rally') {
          this.handleGameOver(false);
          return;
        } else if (this.aiScore >= this.winningScore) {
          this.handleGameOver(this.localPaddleSide === 'right');
          return;
        }
        this.resetBall(1);
      } else if (this.ball.x - this.ball.radius > this.width) {
        // Left side (Player / Host) scored
        this.playerScore++;
        soundManager.playScorePoint();
        this.notifyScore();
        if (this.callbacks.onHostScoreSync) {
          this.callbacks.onHostScoreSync({
            playerScore: this.playerScore,
            aiScore: this.aiScore,
            rallyCount: this.rallyCount,
          });
        }
        if (this.playerScore >= this.winningScore) {
          this.handleGameOver(this.localPaddleSide === 'left');
          return;
        }
        this.resetBall(-1);
      }
    } else {
      // Guest ball extrapolation
      this.ball.x += this.ball.vx;
      this.ball.y += this.ball.vy;
    }

    // 9. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.alpha = Math.max(0, p.life / 25);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  handleGameOver(isPlayerWon) {
    this.isRunning = false;
    if (isPlayerWon) {
      soundManager.playVictory();
      this.triggerMonochromeConfetti();
    } else {
      soundManager.playGameOver();
    }

    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver({
        won: isPlayerWon,
        playerScore: this.playerScore,
        aiScore: this.aiScore,
        maxRally: this.maxRallyInMatch,
        gameMode: this.gameMode,
        finalScore: this.gameMode === 'rally' ? this.maxRallyInMatch : this.playerScore,
      });
    }
  }

  triggerMonochromeConfetti() {
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#cccccc', '#999999', '#ffffff'],
        shapes: ['square', 'circle'],
        ticks: 200,
      });
    } catch {
      // Fallback silent
    }
  }

  render() {
    const ctx = this.ctx;

    // Clear canvas
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Center divider dotted line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(this.width / 2, 0);
    ctx.lineTo(this.width / 2, this.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center Circle outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.width / 2, this.height / 2, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Particles
    for (const p of this.particles) {
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Ball Trail
    for (let i = 0; i < this.ball.trail.length; i++) {
      const pt = this.ball.trail[i];
      const ratio = (i + 1) / this.ball.trail.length;
      ctx.fillStyle = `rgba(255, 255, 255, ${ratio * 0.22})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, this.ball.radius * (0.6 + ratio * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Ball
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Player Paddle
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    this.drawRoundedRect(ctx, this.player.x, this.player.y, this.player.w, this.player.h, 4);
    ctx.shadowBlur = 0;

    // Draw AI / Wall Paddle
    if (this.gameMode === 'rally') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      this.drawRoundedRect(ctx, this.ai.x, 0, this.ai.w, this.height, 4, true);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.drawRoundedRect(ctx, this.ai.x, this.ai.y, this.ai.w, this.ai.h, 4);
    }

    // Paused Overlay
    if (this.isPaused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', this.width / 2, this.height / 2 - 10);
      ctx.font = '14px "Space Grotesk", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText('Tekan Mulai, SPASI, atau sentuh arena untuk lanjut', this.width / 2, this.height / 2 + 25);
    }
  }

  drawRoundedRect(ctx, x, y, width, height, radius, strokeOnly = false) {
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
    if (strokeOnly) {
      ctx.stroke();
    } else {
      ctx.fill();
    }
  }

  loop(timestamp) {
    if (!this.isRunning) {
      this.animFrameId = null;
      return;
    }

    if (!this.isPaused) {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.update(dt);
      this.render();
    } else {
      this.render();
    }

    this.lastTime = timestamp;
    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }
}
