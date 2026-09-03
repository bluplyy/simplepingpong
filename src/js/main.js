import { GameEngine } from './gameEngine.js';
import { soundManager } from './audio.js';
import { authManager } from './auth.js';
import { leaderboardManager } from './leaderboard.js';
import { multiplayerManager } from './multiplayer.js';

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const arenaOverlay = document.getElementById('arenaOverlay');
const btnStartGame = document.getElementById('btnStartGame');
const btnRestartGame = document.getElementById('btnRestartGame');
const btnPlayPauseGame = document.getElementById('btnPlayPauseGame');
const playPauseIcon = document.getElementById('playPauseIcon');
const playPauseText = document.getElementById('playPauseText');

const hudPlayerName = document.getElementById('hudPlayerName');
const hudOpponentName = document.getElementById('hudOpponentName');
const hudPlayerScore = document.getElementById('hudPlayerScore');
const hudAiScore = document.getElementById('hudAiScore');
const hudRallyCount = document.getElementById('hudRallyCount');

const btnSoundToggle = document.getElementById('btnSoundToggle');
const soundIcon = document.getElementById('soundIcon');
const btnScanlineToggle = document.getElementById('btnScanlineToggle');
const scanlinesOverlay = document.getElementById('scanlinesOverlay');

const modeSelector = document.getElementById('modeSelector');
const difficultyGroup = document.getElementById('difficultyGroup');
const difficultySelector = document.getElementById('difficultySelector');

// Online DOM Elements
const btnOpenOnlineLobby = document.getElementById('btnOpenOnlineLobby');
const modalOnlineLobby = document.getElementById('modalOnlineLobby');
const offlineModeControls = document.getElementById('offlineModeControls');
const onlineMatchBar = document.getElementById('onlineMatchBar');
const onlineRoomCodeDisplay = document.getElementById('onlineRoomCodeDisplay');
const btnExitOnlineMatch = document.getElementById('btnExitOnlineMatch');

const tabQuickMatch = document.getElementById('tabQuickMatch');
const tabPrivateRoom = document.getElementById('tabPrivateRoom');
const sectionQuickMatch = document.getElementById('sectionQuickMatch');
const sectionPrivateRoom = document.getElementById('sectionPrivateRoom');

const panelQuickMatchInitial = document.getElementById('panelQuickMatchInitial');
const panelQuickMatchSearching = document.getElementById('panelQuickMatchSearching');
const btnStartQuickMatch = document.getElementById('btnStartQuickMatch');
const btnCancelQuickMatch = document.getElementById('btnCancelQuickMatch');

const subtabCreateRoom = document.getElementById('subtabCreateRoom');
const subtabJoinRoom = document.getElementById('subtabJoinRoom');
const subpanelCreateRoom = document.getElementById('subpanelCreateRoom');
const subpanelJoinRoom = document.getElementById('subpanelJoinRoom');
const displayRoomCode = document.getElementById('displayRoomCode');
const btnCopyInviteLink = document.getElementById('btnCopyInviteLink');
const slotHostName = document.getElementById('slotHostName');
const slotGuestName = document.getElementById('slotGuestName');
const slotGuestStatus = document.getElementById('slotGuestStatus');
const btnCancelCreateRoom = document.getElementById('btnCancelCreateRoom');
const inputRoomCode = document.getElementById('inputRoomCode');
const btnSubmitJoinRoom = document.getElementById('btnSubmitJoinRoom');
const joinRoomAlert = document.getElementById('joinRoomAlert');

const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const countdownSubtext = document.getElementById('countdownSubtext');

// Mobile touch buttons
const touchUpBtn = document.getElementById('touchUpBtn');
const touchDownBtn = document.getElementById('touchDownBtn');

// Modals
const modalLeaderboard = document.getElementById('modalLeaderboard');
const btnOpenLeaderboard = document.getElementById('btnOpenLeaderboard');
const leaderboardList = document.getElementById('leaderboardList');

const modalAuth = document.getElementById('modalAuth');
const btnOpenAuth = document.getElementById('btnOpenAuth');
const authContainer = document.getElementById('authContainer');
const tabAuthLogin = document.getElementById('tabAuthLogin');
const tabAuthRegister = document.getElementById('tabAuthRegister');
const authForm = document.getElementById('authForm');
const groupUsername = document.getElementById('groupUsername');
const inputUsername = document.getElementById('inputUsername');
const inputEmail = document.getElementById('inputEmail');
const inputPassword = document.getElementById('inputPassword');
const btnSubmitAuth = document.getElementById('btnSubmitAuth');
const authAlert = document.getElementById('authAlert');

const modalGameOver = document.getElementById('modalGameOver');
const gameoverResultTitle = document.getElementById('gameoverResultTitle');
const gameoverResultDesc = document.getElementById('gameoverResultDesc');
const statFinalScore = document.getElementById('statFinalScore');
const statMaxRally = document.getElementById('statMaxRally');
const saveScoreStatus = document.getElementById('saveScoreStatus');
const btnPlayAgain = document.getElementById('btnPlayAgain');
const btnViewRankingsFromGameOver = document.getElementById('btnViewRankingsFromGameOver');

const toastContainer = document.getElementById('toastContainer');

// State
let authMode = 'login'; // 'login' | 'register'
let activeLeaderboardMode = 'vs_ai';
let isSearchingMatch = false;

// Toast Utility
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>●</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Initialize Game Engine with Online Sync Callbacks
const game = new GameEngine(canvas, {
  onScoreUpdate: ({ playerScore, aiScore, rallyCount }) => {
    hudPlayerScore.textContent = playerScore;
    hudAiScore.textContent = aiScore;
    hudRallyCount.textContent = rallyCount;
  },
  onRallyUpdate: (count) => {
    hudRallyCount.textContent = count;
  },
  onGameOver: async (result) => {
    handleGameOver(result);
  },
  onLocalPaddleMove: (y) => {
    multiplayerManager.sendPaddleUpdate(y);
  },
  onHostBallSync: (ballState) => {
    multiplayerManager.sendBallUpdate(ballState);
  },
  onHostScoreSync: (scoreData) => {
    multiplayerManager.sendScoreUpdate(scoreData);
  },
  onStateChange: ({ isRunning, isPaused }) => {
    updatePlayPauseButtonUI(isRunning, isPaused);
  },
  onRequestTogglePause: () => {
    handlePlayPauseToggle();
  },
});

function updatePlayPauseButtonUI(isRunning, isPaused) {
  if (!btnPlayPauseGame || !playPauseIcon || !playPauseText) return;
  if (!isRunning || isPaused) {
    playPauseIcon.textContent = '►';
    playPauseText.textContent = 'Mulai';
    btnPlayPauseGame.classList.remove('btn-secondary');
    btnPlayPauseGame.classList.add('btn-primary');
    btnPlayPauseGame.title = 'Mulai / Lanjutkan Permainan';
  } else {
    playPauseIcon.textContent = '■';
    playPauseText.textContent = 'Berhenti';
    btnPlayPauseGame.classList.remove('btn-primary');
    btnPlayPauseGame.classList.add('btn-secondary');
    btnPlayPauseGame.title = 'Berhenti / Jeda Permainan';
  }
}

// Game Over Handler
async function handleGameOver(result) {
  statFinalScore.textContent = result.finalScore;
  statMaxRally.textContent = result.maxRally;

  if (result.gameMode === 'online_pvp') {
    if (result.won) {
      gameoverResultTitle.textContent = 'VICTORY! MENANG DUEL ONLINE';
      gameoverResultTitle.className = 'gameover-result-title won';
      gameoverResultDesc.textContent = `Luar biasa! Kamu memenangkan duel PvP online dengan skor ${result.playerScore} - ${result.aiScore}.`;
    } else {
      gameoverResultTitle.textContent = 'DEFEAT! KALAH DUEL ONLINE';
      gameoverResultTitle.className = 'gameover-result-title lost';
      gameoverResultDesc.textContent = `Lawan memenangkan duel PvP online dengan skor ${result.aiScore} - ${result.playerScore}.`;
    }
  } else if (result.gameMode === 'vs_ai') {
    if (result.won) {
      gameoverResultTitle.textContent = 'VICTORY! KAMU MENANG';
      gameoverResultTitle.className = 'gameover-result-title won';
      gameoverResultDesc.textContent = `Hebat! Kamu mengalahkan AI dengan skor ${result.playerScore} - ${result.aiScore}.`;
    } else {
      gameoverResultTitle.textContent = 'GAME OVER! AI MENANG';
      gameoverResultTitle.className = 'gameover-result-title lost';
      gameoverResultDesc.textContent = `AI memenangkan pertandingan dengan skor ${result.aiScore} - ${result.playerScore}.`;
    }
  } else {
    gameoverResultTitle.textContent = 'RALLY SELESAI';
    gameoverResultTitle.className = 'gameover-result-title won';
    gameoverResultDesc.textContent = `Kamu berhasil mempertahankan ${result.maxRally} pantulan berturut-turut!`;
  }

  modalGameOver.classList.add('active');
  saveScoreStatus.textContent = 'Menyimpan skor ke Supabase Leaderboard...';

  const submitRes = await leaderboardManager.submitScore({
    score: result.finalScore,
    gameMode: result.gameMode,
    maxRally: result.maxRally,
  });

  if (submitRes && submitRes.success) {
    saveScoreStatus.textContent = '[OK] Skor berhasil tercatat di Leaderboard!';
    showToast('Skor pertandingan berhasil disimpan!');
  } else {
    saveScoreStatus.textContent = '[OK] Skor tersimpan di memori lokal.';
  }
}

// Modal Control Helpers
function openModal(modal) {
  soundManager.playButtonTick();
  modal.classList.add('active');
}

function closeModal(modal) {
  modal.classList.remove('active');
}

// Close modals when clicking close button or background backdrop
document.querySelectorAll('.modal-close-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const modalId = btn.dataset.close;
    if (modalId) {
      closeModal(document.getElementById(modalId));
    }
  });
});

document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeModal(backdrop);
    }
  });
});

let isCountingDown = false;
let localCountdownTimer = null;

function runStartCountdown(onComplete) {
  if (isCountingDown) return;
  isCountingDown = true;

  let count = 3;
  arenaOverlay.classList.add('hidden');
  showCountdown(count);
  soundManager.playButtonTick();

  if (localCountdownTimer) clearInterval(localCountdownTimer);
  localCountdownTimer = setInterval(() => {
    count--;
    if (count > 0) {
      showCountdown(count);
      soundManager.playButtonTick();
    } else {
      clearInterval(localCountdownTimer);
      localCountdownTimer = null;
      showCountdown('START!');
      soundManager.playScorePoint();
      setTimeout(() => {
        countdownOverlay.classList.add('hidden');
        isCountingDown = false;
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }, 600);
    }
  }, 1000);
}

function handlePlayPauseToggle() {
  if (isCountingDown) return;

  if (!game.isRunning) {
    // Game belum jalan sama sekali -> jalankan countdown 3 detik lalu start
    runStartCountdown(() => {
      game.start();
      showToast('Game Dimulai');
    });
  } else if (game.isPaused) {
    // Game sedang berhenti/jeda -> jalankan countdown 3 detik lalu resume
    runStartCountdown(() => {
      game.togglePause();
      showToast('Game Dilanjutkan');
    });
  } else {
    // Game sedang berjalan -> jeda seketika
    game.togglePause();
    showToast('Game Dihentikan');
  }
}

// Start & Restart & Stop/Resume Game Controls
btnPlayPauseGame.addEventListener('click', () => {
  soundManager.playButtonTick();
  handlePlayPauseToggle();
});

btnStartGame.addEventListener('click', () => {
  soundManager.playButtonTick();
  if (isCountingDown) return;
  runStartCountdown(() => {
    game.start();
  });
});

btnRestartGame.addEventListener('click', () => {
  soundManager.playButtonTick();
  game.start();
  arenaOverlay.classList.add('hidden');
  showToast('Game di-reset');
});

btnPlayAgain.addEventListener('click', () => {
  closeModal(modalGameOver);
  if (isCountingDown) return;
  runStartCountdown(() => {
    game.start();
    arenaOverlay.classList.add('hidden');
  });
});

btnViewRankingsFromGameOver.addEventListener('click', () => {
  closeModal(modalGameOver);
  renderLeaderboard(game.gameMode);
  openModal(modalLeaderboard);
});

// Sound Toggle
btnSoundToggle.addEventListener('click', () => {
  const isMuted = soundManager.toggleMute();
  soundIcon.textContent = isMuted ? '[MUTE]' : '[♪]';
  showToast(isMuted ? 'Suara Dinonaktifkan' : 'Suara Diaktifkan');
});

// Scanline Effect Toggle
btnScanlineToggle.addEventListener('click', () => {
  scanlinesOverlay.classList.toggle('hidden');
  const isEnabled = !scanlinesOverlay.classList.contains('hidden');
  showToast(isEnabled ? 'CRT Scanline: ON' : 'CRT Scanline: OFF');
});

// Game Mode Switcher
modeSelector.addEventListener('click', (e) => {
  const btn = e.target.closest('.segmented-btn');
  if (!btn) return;
  soundManager.playButtonTick();

  modeSelector.querySelectorAll('.segmented-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');

  const mode = btn.dataset.mode;
  game.setGameMode(mode);

  if (mode === 'rally') {
    difficultyGroup.style.display = 'none';
    hudOpponentName.textContent = 'WALL [BOUNCE]';
  } else {
    difficultyGroup.style.display = 'flex';
    updateOpponentName();
  }

  showToast(`Mode: ${mode === 'rally' ? 'Solo Rally' : 'VS AI'}`);
});

function updateOpponentName() {
  const diff = game.difficulty.toUpperCase();
  hudOpponentName.textContent = `CPU [${diff}]`;
}

// Difficulty Switcher
difficultySelector.addEventListener('click', (e) => {
  const btn = e.target.closest('.segmented-btn');
  if (!btn) return;
  soundManager.playButtonTick();

  difficultySelector.querySelectorAll('.segmented-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');

  game.setDifficulty(btn.dataset.diff);
  updateOpponentName();
  showToast(`Tingkat kesulitan: ${btn.dataset.diff.toUpperCase()}`);
});

// Mobile On-screen Touch Controls
let touchMoveInterval = null;

const startTouchMove = (direction) => {
  if (!game.isRunning || game.isPaused) return;
  if (direction === 'up') {
    game.keys.ArrowUp = true;
  } else {
    game.keys.ArrowDown = true;
  }
};

const stopTouchMove = () => {
  game.keys.ArrowUp = false;
  game.keys.ArrowDown = false;
};

touchUpBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startTouchMove('up');
}, { passive: false });

touchUpBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  stopTouchMove();
});

touchDownBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startTouchMove('down');
}, { passive: false });

touchDownBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  stopTouchMove();
});

// Leaderboard Modal & Rendering
btnOpenLeaderboard.addEventListener('click', () => {
  renderLeaderboard(activeLeaderboardMode);
  openModal(modalLeaderboard);
});

document.querySelectorAll('.leaderboard-tab-btn').forEach((tab) => {
  tab.addEventListener('click', () => {
    soundManager.playButtonTick();
    document.querySelectorAll('.leaderboard-tab-btn').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    activeLeaderboardMode = tab.dataset.leadMode;
    renderLeaderboard(activeLeaderboardMode);
  });
});

async function renderLeaderboard(mode) {
  leaderboardList.innerHTML = `<tr><td colspan="4" class="empty-leaderboard">Memuat data papan peringkat...</td></tr>`;

  const scores = await leaderboardManager.fetchScores(mode, 25);

  if (!scores || scores.length === 0) {
    leaderboardList.innerHTML = `<tr><td colspan="4" class="empty-leaderboard">Belum ada skor tercatat. Jadilah yang pertama!</td></tr>`;
    return;
  }

  const currentUserId = authManager.currentUser?.id;

  leaderboardList.innerHTML = scores
    .map((item, index) => {
      const rank = index + 1;
      let badgeClass = '';
      if (rank === 1) badgeClass = 'top-1';
      else if (rank === 2) badgeClass = 'top-2';
      else if (rank === 3) badgeClass = 'top-3';

      const isMe = currentUserId && item.user_id === currentUserId;
      const rankText = rank < 10 ? `0${rank}` : `${rank}`;

      return `
        <tr class="${isMe ? 'highlight-user' : ''}">
          <td>
            <span class="rank-badge ${badgeClass}">#${rankText}</span>
          </td>
          <td>
            <strong>${escapeHtml(item.player_name)}</strong>
            ${isMe ? ' <span style="font-size:10px; color:#a3a3a3;">(Kamu)</span>' : ''}
          </td>
          <td style="text-align: right; font-weight: bold; color: #fff;">
            ${item.score}
          </td>
          <td style="text-align: right; color: #a3a3a3;">
            ${item.max_rally || 0}
          </td>
        </tr>
      `;
    })
    .join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Auth Tabs & Handlers
btnOpenAuth.addEventListener('click', () => {
  authAlert.style.display = 'none';
  openModal(modalAuth);
});

tabAuthLogin.addEventListener('click', () => {
  authMode = 'login';
  tabAuthLogin.classList.add('active');
  tabAuthRegister.classList.remove('active');
  groupUsername.style.display = 'none';
  btnSubmitAuth.textContent = 'MASUK';
  authAlert.style.display = 'none';
});

tabAuthRegister.addEventListener('click', () => {
  authMode = 'register';
  tabAuthRegister.classList.add('active');
  tabAuthLogin.classList.remove('active');
  groupUsername.style.display = 'flex';
  btnSubmitAuth.textContent = 'DAFTAR SEKARANG';
  authAlert.style.display = 'none';
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  soundManager.playButtonTick();

  const email = inputEmail.value.trim();
  const password = inputPassword.value;
  const username = inputUsername.value.trim();

  btnSubmitAuth.disabled = true;
  btnSubmitAuth.textContent = 'MEMPROSES...';
  authAlert.style.display = 'none';

  try {
    if (authMode === 'register') {
      await authManager.signUp(email, password, username);
      authAlert.className = 'auth-alert success';
      authAlert.textContent = 'Akun berhasil dibuat! Silakan cek email Anda untuk konfirmasi jika diminta.';
      showToast('Registrasi berhasil!');
      setTimeout(() => {
        closeModal(modalAuth);
      }, 1500);
    } else {
      await authManager.signIn(email, password);
      authAlert.className = 'auth-alert success';
      authAlert.textContent = 'Login berhasil!';
      showToast(`Selamat datang, ${authManager.getUserName()}!`);
      setTimeout(() => {
        closeModal(modalAuth);
      }, 1000);
    }
  } catch (err) {
    authAlert.className = 'auth-alert error';
    authAlert.textContent = err.message || 'Terjadi kesalahan autentikasi.';
  } finally {
    btnSubmitAuth.disabled = false;
    btnSubmitAuth.textContent = authMode === 'register' ? 'DAFTAR SEKARANG' : 'MASUK';
  }
});

// Update Auth UI on state change
authManager.onAuthChange((user) => {
  if (user) {
    const name = authManager.getUserName();
    hudPlayerName.textContent = name;
    authContainer.innerHTML = `
      <div class="user-badge" id="userBadge">
        <div class="user-status-dot"></div>
        <span class="user-name-text">${escapeHtml(name)}</span>
        <button id="btnSignOut" class="btn btn-secondary" style="padding: 2px 6px; font-size: 10px; margin-left: 4px;" title="Keluar">
          Logout
        </button>
      </div>
    `;

    document.getElementById('btnSignOut').addEventListener('click', async () => {
      soundManager.playButtonTick();
      await authManager.signOut();
      showToast('Anda telah logout.');
    });
  } else {
    hudPlayerName.textContent = 'PLAYER';
    authContainer.innerHTML = `
      <button id="btnOpenAuth" class="btn btn-primary">
        <span>[USR]</span>
        <span class="btn-text">Login</span>
      </button>
    `;
    document.getElementById('btnOpenAuth').addEventListener('click', () => {
      authAlert.style.display = 'none';
      openModal(modalAuth);
    });
  }
});

// ==========================================
// ONLINE MULTIPLAYER LOGIC & LOBBY UI
// ==========================================

btnOpenOnlineLobby.addEventListener('click', () => {
  openModal(modalOnlineLobby);
});

// Setup Multiplayer Network Callbacks
multiplayerManager.setCallbacks({
  onOpponentJoined: (guestName) => {
    soundManager.playScorePoint();
    showToast(`Lawan bergabung: ${guestName}!`);
    slotGuestName.textContent = guestName;
    slotGuestStatus.textContent = '[OK] Terhubung';
    slotGuestStatus.className = 'slot-status';

    if (panelQuickMatchSearching.style.display !== 'none') {
      quickMatchStatusText.textContent = `Lawan ditemukan: ${guestName}!`;
    }

    // Host starts the countdown automatically!
    setTimeout(() => {
      triggerCountdownSequence();
    }, 1200);
  },

  onOpponentPaddleUpdate: (y) => {
    game.setOpponentPaddle(y);
  },

  onBallSync: (ballState) => {
    game.syncBallFromHost(ballState);
  },

  onScoreSync: (scoreData) => {
    game.syncScoreFromHost(scoreData);
  },

  onCountdown: (count) => {
    showCountdown(count);
    if (count === 'START!') {
      soundManager.playScorePoint();
    } else {
      soundManager.playButtonTick();
    }
  },

  onGameStart: () => {
    startOnlineMatchGame();
  },

  onOpponentLeft: () => {
    showToast('Lawan telah keluar / terputus.');
    soundManager.playGameOver();
    exitOnlineMode();
  },
});

function triggerCountdownSequence() {
  let count = 3;
  showCountdown(count);
  multiplayerManager.sendCountdown(count);
  soundManager.playButtonTick();

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      showCountdown(count);
      multiplayerManager.sendCountdown(count);
      soundManager.playButtonTick();
    } else {
      clearInterval(timer);
      showCountdown('START!');
      multiplayerManager.sendCountdown('START!');
      soundManager.playScorePoint();
      setTimeout(() => {
        countdownOverlay.classList.add('hidden');
        multiplayerManager.sendGameStart();
        startOnlineMatchGame();
      }, 700);
    }
  }, 1000);
}

function showCountdown(val) {
  countdownOverlay.classList.remove('hidden');
  countdownNumber.textContent = val;
  countdownSubtext.textContent = val === 'START!' ? 'SEMOGA BERHASIL!' : 'Pertandingan Dimulai Dalam...';
}

function startOnlineMatchGame() {
  countdownOverlay.classList.add('hidden');
  closeModal(modalOnlineLobby);
  arenaOverlay.classList.add('hidden');

  // Set online mode in GameEngine
  game.setOnlineMode(true, multiplayerManager.isHost);
  game.start();

  // Update UI for online match
  offlineModeControls.style.display = 'none';
  difficultyGroup.style.display = 'none';
  onlineMatchBar.style.display = 'flex';
  onlineRoomCodeDisplay.textContent = `ROOM: ${multiplayerManager.currentRoom}`;

  if (multiplayerManager.isHost) {
    hudPlayerName.textContent = `${multiplayerManager.getPlayerName()} [HOST]`;
    hudOpponentName.textContent = `${multiplayerManager.opponentName} [GUEST]`;
  } else {
    hudPlayerName.textContent = `${multiplayerManager.opponentName} [HOST]`;
    hudOpponentName.textContent = `${multiplayerManager.getPlayerName()} [GUEST]`;
  }
  showToast(`Pertandingan Online dimulai! Room: ${multiplayerManager.currentRoom}`);
}

async function exitOnlineMode() {
  await multiplayerManager.leaveRoom();
  game.setOnlineMode(false);
  game.start();
  offlineModeControls.style.display = 'flex';
  if (game.gameMode === 'vs_ai') {
    difficultyGroup.style.display = 'flex';
  }
  onlineMatchBar.style.display = 'none';
  hudPlayerName.textContent = authManager.currentUser ? authManager.getUserName() : 'PLAYER';
  updateOpponentName();
  resetQuickMatchUI();
}

btnExitOnlineMatch.addEventListener('click', async () => {
  soundManager.playButtonTick();
  await exitOnlineMode();
  showToast('Anda telah keluar dari pertandingan online.');
});

// Quick Match handlers
btnStartQuickMatch.addEventListener('click', async () => {
  soundManager.playButtonTick();
  panelQuickMatchInitial.style.display = 'none';
  panelQuickMatchSearching.style.display = 'flex';
  isSearchingMatch = true;

  try {
    const res = await multiplayerManager.findOrCreateQuickMatch();
    if (res.status === 'matched') {
      quickMatchStatusText.textContent = `Lawan Ditemukan: ${res.opponentName}!`;
      showToast(`Terhubung dengan ${res.opponentName}!`);
      // Guest waits for host countdown
    } else {
      quickMatchStatusText.textContent = `Menunggu lawan bergabung (Room: ${res.roomCode})...`;
    }
  } catch (err) {
    showToast('Gagal matchmaking: ' + err.message);
    resetQuickMatchUI();
  }
});

btnCancelQuickMatch.addEventListener('click', async () => {
  soundManager.playButtonTick();
  await multiplayerManager.leaveRoom();
  resetQuickMatchUI();
  showToast('Pencarian lawan dibatalkan.');
});

function resetQuickMatchUI() {
  isSearchingMatch = false;
  panelQuickMatchSearching.style.display = 'none';
  panelQuickMatchInitial.style.display = 'flex';
  quickMatchStatusText.textContent = 'Mencari lawan online...';
}

// Private Room tabs
tabQuickMatch.addEventListener('click', () => {
  soundManager.playButtonTick();
  tabQuickMatch.classList.add('active');
  tabPrivateRoom.classList.remove('active');
  sectionQuickMatch.style.display = 'flex';
  sectionPrivateRoom.style.display = 'none';
});

tabPrivateRoom.addEventListener('click', async () => {
  soundManager.playButtonTick();
  tabPrivateRoom.classList.add('active');
  tabQuickMatch.classList.remove('active');
  sectionPrivateRoom.style.display = 'flex';
  sectionQuickMatch.style.display = 'none';

  if (isSearchingMatch) {
    await multiplayerManager.leaveRoom();
    resetQuickMatchUI();
  }

  if (!multiplayerManager.currentRoom || !multiplayerManager.isHost) {
    setupNewPrivateRoom();
  }
});

async function setupNewPrivateRoom() {
  try {
    const res = await multiplayerManager.createPrivateRoom();
    displayRoomCode.textContent = res.roomCode;
    slotHostName.textContent = res.hostName;
    slotGuestName.textContent = 'Menunggu lawan...';
    slotGuestStatus.textContent = '[...] Menunggu';
    slotGuestStatus.className = 'slot-status waiting';
  } catch (err) {
    showToast('Error membuat room: ' + err.message);
  }
}

btnCancelCreateRoom.addEventListener('click', async () => {
  soundManager.playButtonTick();
  await multiplayerManager.leaveRoom();
  closeModal(modalOnlineLobby);
});

btnCopyInviteLink.addEventListener('click', () => {
  soundManager.playButtonTick();
  const code = displayRoomCode.textContent;
  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;
  navigator.clipboard.writeText(inviteUrl).then(() => {
    showToast('Tautan undangan disalin ke clipboard!');
  }).catch(() => {
    showToast(`Kode room: ${code}`);
  });
});

subtabCreateRoom.addEventListener('click', () => {
  soundManager.playButtonTick();
  subtabCreateRoom.classList.add('active');
  subtabJoinRoom.classList.remove('active');
  subpanelCreateRoom.style.display = 'flex';
  subpanelJoinRoom.style.display = 'none';
});

subtabJoinRoom.addEventListener('click', () => {
  soundManager.playButtonTick();
  subtabJoinRoom.classList.add('active');
  subtabCreateRoom.classList.remove('active');
  subpanelJoinRoom.style.display = 'flex';
  subpanelCreateRoom.style.display = 'none';
  joinRoomAlert.style.display = 'none';
});

btnSubmitJoinRoom.addEventListener('click', async (e) => {
  e.preventDefault();
  soundManager.playButtonTick();
  const code = inputRoomCode.value.trim();
  if (!code) {
    joinRoomAlert.className = 'auth-alert error';
    joinRoomAlert.textContent = 'Masukkan kode room terlebih dahulu.';
    return;
  }

  btnSubmitJoinRoom.disabled = true;
  btnSubmitJoinRoom.textContent = 'MENGHUBUNGKAN...';

  try {
    const res = await multiplayerManager.joinPrivateRoom(code);
    joinRoomAlert.className = 'auth-alert success';
    joinRoomAlert.textContent = `Berhasil masuk ke room ${res.roomCode}! Menunggu Host memulai...`;
    showToast(`Terhubung ke Host: ${res.hostName}!`);
  } catch (err) {
    joinRoomAlert.className = 'auth-alert error';
    joinRoomAlert.textContent = err.message || 'Gagal bergabung ke room.';
  } finally {
    btnSubmitJoinRoom.disabled = false;
    btnSubmitJoinRoom.textContent = 'GABUNG PERTANDINGAN';
  }
});

// Detect shareable invite URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const inviteRoomCode = urlParams.get('room');
if (inviteRoomCode) {
  setTimeout(() => {
    openModal(modalOnlineLobby);
    tabPrivateRoom.click();
    subtabJoinRoom.click();
    inputRoomCode.value = inviteRoomCode.toUpperCase();
    showToast(`Membuka undangan room: ${inviteRoomCode}`);
  }, 600);
}

