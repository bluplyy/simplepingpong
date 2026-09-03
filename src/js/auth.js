import { supabase, isSupabaseConfigured } from './supabaseClient.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
    this.init();
  }

  async init() {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured yet. Running in offline/guest mode.');
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      this.currentUser = session?.user || null;
      this.notifyListeners();

      supabase.auth.onAuthStateChange((_event, session) => {
        this.currentUser = session?.user || null;
        this.notifyListeners();
      });
    } catch (err) {
      console.error('Error initializing auth:', err);
    }
  }

  onAuthChange(callback) {
    this.listeners.push(callback);
    callback(this.currentUser);
  }

  notifyListeners() {
    this.listeners.forEach((cb) => cb(this.currentUser));
  }

  getUserName() {
    if (!this.currentUser) return 'Tamu (Guest)';
    return (
      this.currentUser.user_metadata?.username ||
      this.currentUser.email?.split('@')[0] ||
      'Player'
    );
  }

  async signUp(email, password, username) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const cleanUsername = username.trim().toUpperCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Username minimal 3 karakter.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
        },
      },
    });

    if (error) {
      throw new Error(this.translateAuthError(error.message));
    }

    this.currentUser = data.user;
    return data.user;
  }

  async signIn(email, password) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(this.translateAuthError(error.message));
    }

    this.currentUser = data.user;
    return data.user;
  }

  async signOut() {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    this.currentUser = null;
    this.notifyListeners();
  }

  translateAuthError(msg) {
    if (msg.includes('Invalid login credentials')) {
      return 'Email atau password salah.';
    }
    if (msg.includes('User already registered')) {
      return 'Email sudah terdaftar. Silakan login.';
    }
    if (msg.includes('Password should be at least')) {
      return 'Password minimal 6 karakter.';
    }
    if (msg.includes('rate limit')) {
      return 'Terlalu banyak percobaan. Harap tunggu sebentar.';
    }
    return msg;
  }
}

export const authManager = new AuthManager();
