import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { authManager } from './auth.js';

export class MultiplayerManager {
  constructor() {
    this.currentRoom = null;
    this.channel = null;
    this.isHost = false;
    this.role = null; // 'host' | 'guest'
    this.opponentName = 'Menunggu Lawan...';
    this.callbacks = {};
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  generateRoomCode() {
    const num = Math.floor(100 + Math.random() * 900);
    return `NOIR-${num}`;
  }

  getPlayerName() {
    const user = authManager.currentUser;
    if (user) return authManager.getUserName();
    let saved = localStorage.getItem('pong_guest_name');
    if (!saved) {
      saved = 'PONG_' + Math.floor(100 + Math.random() * 900);
      localStorage.setItem('pong_guest_name', saved);
    }
    return saved;
  }

  async findOrCreateQuickMatch() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum terkonfigurasi untuk mode online.');
    }

    const myName = this.getPlayerName();

    // 1. Check for available waiting rooms created in the last 60 seconds
    const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: waitingRooms, error: searchErr } = await supabase
      .from('pingpong_rooms')
      .select('*')
      .eq('status', 'waiting')
      .eq('is_private', false)
      .gt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(1);

    if (searchErr) {
      console.error('Error finding quick match:', searchErr);
    }

    if (waitingRooms && waitingRooms.length > 0) {
      const room = waitingRooms[0];
      // Join as guest
      const { error: updateErr } = await supabase
        .from('pingpong_rooms')
        .update({
          guest_name: myName,
          status: 'playing',
          updated_at: new Date().toISOString(),
        })
        .eq('room_code', room.room_code);

      if (!updateErr) {
        this.isHost = false;
        this.role = 'guest';
        this.opponentName = room.host_name;
        this.currentRoom = room.room_code;
        await this.connectChannel(room.room_code);

        // Notify host that we joined
        setTimeout(() => {
          this.sendEvent('player_joined', { guestName: myName });
        }, 500);

        return {
          isHost: false,
          roomCode: room.room_code,
          opponentName: room.host_name,
          status: 'matched',
        };
      }
    }

    // 2. No open room found: create a new waiting room as Host
    const roomCode = this.generateRoomCode();
    const { error: insertErr } = await supabase
      .from('pingpong_rooms')
      .insert([
        {
          room_code: roomCode,
          host_name: myName,
          status: 'waiting',
          is_private: false,
        },
      ]);

    if (insertErr) {
      throw new Error('Gagal membuat antrian matchmaking: ' + insertErr.message);
    }

    this.isHost = true;
    this.role = 'host';
    this.opponentName = 'Menunggu Lawan...';
    this.currentRoom = roomCode;
    await this.connectChannel(roomCode);

    return {
      isHost: true,
      roomCode: roomCode,
      opponentName: null,
      status: 'waiting',
    };
  }

  async createPrivateRoom() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum terkonfigurasi.');
    }

    const myName = this.getPlayerName();
    const roomCode = this.generateRoomCode();

    const { error } = await supabase.from('pingpong_rooms').insert([
      {
        room_code: roomCode,
        host_name: myName,
        status: 'waiting',
        is_private: true,
      },
    ]);

    if (error) {
      throw new Error('Gagal membuat room: ' + error.message);
    }

    this.isHost = true;
    this.role = 'host';
    this.opponentName = 'Menunggu Lawan...';
    this.currentRoom = roomCode;
    await this.connectChannel(roomCode);

    return {
      roomCode,
      hostName: myName,
    };
  }

  async joinPrivateRoom(code) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum terkonfigurasi.');
    }

    const cleanCode = code.trim().toUpperCase();
    const myName = this.getPlayerName();

    const { data: room, error: fetchErr } = await supabase
      .from('pingpong_rooms')
      .select('*')
      .eq('room_code', cleanCode)
      .single();

    if (fetchErr || !room) {
      throw new Error('Room dengan kode ' + cleanCode + ' tidak ditemukan.');
    }

    if (room.status !== 'waiting') {
      throw new Error('Room ini sedang bermain atau sudah penuh.');
    }

    // Update room as playing
    const { error: updateErr } = await supabase
      .from('pingpong_rooms')
      .update({
        guest_name: myName,
        status: 'playing',
        updated_at: new Date().toISOString(),
      })
      .eq('room_code', cleanCode);

    if (updateErr) {
      throw new Error('Gagal bergabung ke room: ' + updateErr.message);
    }

    this.isHost = false;
    this.role = 'guest';
    this.opponentName = room.host_name;
    this.currentRoom = cleanCode;
    await this.connectChannel(cleanCode);

    setTimeout(() => {
      this.sendEvent('player_joined', { guestName: myName });
    }, 500);

    return {
      roomCode: cleanCode,
      hostName: room.host_name,
    };
  }

  async connectChannel(roomCode) {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
    }

    this.channel = supabase.channel(`pong_room_${roomCode}`, {
      config: {
        broadcast: { ack: false, self: false },
      },
    });

    this.channel
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
        if (this.isHost) {
          this.opponentName = payload.guestName;
          if (this.callbacks.onOpponentJoined) {
            this.callbacks.onOpponentJoined(payload.guestName);
          }
        }
      })
      .on('broadcast', { event: 'game_countdown' }, ({ payload }) => {
        if (this.callbacks.onCountdown) {
          this.callbacks.onCountdown(payload.count);
        }
      })
      .on('broadcast', { event: 'game_start' }, () => {
        if (this.callbacks.onGameStart) {
          this.callbacks.onGameStart();
        }
      })
      .on('broadcast', { event: 'paddle_update' }, ({ payload }) => {
        if (this.callbacks.onOpponentPaddleUpdate) {
          this.callbacks.onOpponentPaddleUpdate(payload.y);
        }
      })
      .on('broadcast', { event: 'ball_update' }, ({ payload }) => {
        if (!this.isHost && this.callbacks.onBallSync) {
          this.callbacks.onBallSync(payload);
        }
      })
      .on('broadcast', { event: 'score_update' }, ({ payload }) => {
        if (this.callbacks.onScoreSync) {
          this.callbacks.onScoreSync(payload);
        }
      })
      .on('broadcast', { event: 'player_left' }, () => {
        if (this.callbacks.onOpponentLeft) {
          this.callbacks.onOpponentLeft();
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Terhubung ke Realtime channel: pong_room_${roomCode}`);
        }
      });
  }

  sendEvent(event, payload) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  }

  sendPaddleUpdate(y) {
    this.sendEvent('paddle_update', { y });
  }

  sendBallUpdate(ballState) {
    if (this.isHost) {
      this.sendEvent('ball_update', ballState);
    }
  }

  sendScoreUpdate(scores) {
    if (this.isHost) {
      this.sendEvent('score_update', scores);
    }
  }

  sendCountdown(count) {
    if (this.isHost) {
      this.sendEvent('game_countdown', { count });
    }
  }

  sendGameStart() {
    if (this.isHost) {
      this.sendEvent('game_start', {});
    }
  }

  async leaveRoom() {
    if (this.channel) {
      this.sendEvent('player_left', {});
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }

    if (this.currentRoom) {
      try {
        await supabase
          .from('pingpong_rooms')
          .update({ status: 'finished' })
          .eq('room_code', this.currentRoom);
      } catch (err) {
        console.warn('Error closing room:', err);
      }
    }

    this.currentRoom = null;
    this.isHost = false;
    this.role = null;
    this.opponentName = 'Menunggu Lawan...';
  }
}

export const multiplayerManager = new MultiplayerManager();
