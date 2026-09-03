import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { authManager } from './auth.js';

class LeaderboardManager {
  constructor() {
    this.cache = {
      vs_ai: [],
      rally: [],
      online_pvp: [],
    };
  }

  async fetchScores(gameMode = 'vs_ai', limit = 25) {
    if (!isSupabaseConfigured()) {
      return this.getLocalScores(gameMode);
    }

    try {
      const { data, error } = await supabase
        .from('pingpong_scores')
        .select('id, player_name, score, game_mode, max_rally, created_at, user_id')
        .eq('game_mode', gameMode)
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      this.cache[gameMode] = data || [];
      return this.cache[gameMode];
    } catch (err) {
      console.warn('Gagal memuat leaderboard dari Supabase, memakai data lokal:', err);
      return this.getLocalScores(gameMode);
    }
  }

  async submitScore({ score, gameMode = 'vs_ai', maxRally = 0, customName = null }) {
    if (score <= 0 && maxRally <= 0) return null;

    const user = authManager.currentUser;
    const playerName = (
      customName ||
      (user ? authManager.getUserName() : 'GUEST_' + Math.floor(Math.random() * 899 + 100))
    ).toUpperCase();

    // Save locally first
    this.saveLocalScore({
      player_name: playerName,
      score,
      game_mode: gameMode,
      max_rally: maxRally,
      created_at: new Date().toISOString(),
      user_id: user?.id || null,
    });

    if (!isSupabaseConfigured()) {
      return { success: true, localOnly: true };
    }

    try {
      const { data, error } = await supabase
        .from('pingpong_scores')
        .insert([
          {
            player_name: playerName,
            score,
            game_mode: gameMode,
            max_rally: maxRally,
            user_id: user?.id || null,
          },
        ])
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error submitting score to Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  getLocalScores(gameMode) {
    const raw = localStorage.getItem(`pong_scores_${gameMode}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveLocalScore(entry) {
    const mode = entry.game_mode;
    const scores = this.getLocalScores(mode);
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem(`pong_scores_${mode}`, JSON.stringify(scores.slice(0, 50)));

    // Track personal best
    const currentBest = parseInt(localStorage.getItem(`pong_best_${mode}`) || '0', 10);
    if (entry.score > currentBest) {
      localStorage.setItem(`pong_best_${mode}`, entry.score.toString());
    }
  }

  getPersonalBest(gameMode = 'vs_ai') {
    return parseInt(localStorage.getItem(`pong_best_${gameMode}`) || '0', 10);
  }
}

export const leaderboardManager = new LeaderboardManager();
