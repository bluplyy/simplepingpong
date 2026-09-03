# 🏓 PONG // NOIR — Simple Ping Pong Monochrome Arcade

Website game Ping Pong retro-modern bertema hitam-putih (*monochrome noir*) dengan simulasi fisika 60FPS di HTML5 Canvas, sound effect prosedural 8-bit (Web Audio API), sistem autentikasi & leaderboard global bertenaga **Supabase**, serta konfigurasi siap deploy ke **Vercel** dan **GitHub**.

---

## ✨ Fitur Utama

- 🎨 **Desain Monokrom Aesthetic**: Palet warna hitam pekat, aksen putih minimalis, tipografi retro arcade modern (*Press Start 2P*, *Space Grotesk*, *JetBrains Mono*), dan efek opsional *CRT Scanlines*.
- 🎮 **Mode Permainan Lengkap**:
  - **Player vs AI**: Hadapi komputer dengan 3 tingkat kesulitan (*Rookie*, *Pro*, *Master*).
  - **Solo Rally**: Mode tanpa henti (*endless bounce*) untuk menguji fokus dan meraih rally tertinggi.
  - **Online Multiplayer 1 vs 1**:
    - **⚡ Quick Match (Random Matchmaking)**: Satu klik otomatis mencocokkan Anda dengan pemain online lain secara instan dengan radar animasi.
    - **🔑 Private Room**: Buat room bertautan/berkode unik (misal: `NOIR-539`) dan kirim link undangan langsung ke teman.
- 🌐 **Supabase Realtime Broadcast**: Sinkronisasi pergerakan paddle dan bola berkecepatan tinggi tanpa lag via WebSocket in-memory Supabase (gratis dan tanpa server backend tambahan).
- 📱 **Multi-Device Responsive**:
  - **Desktop & Laptop**: Kontrol Keyboard (`W`/`S` atau `↑`/`↓`), Mouse movement, dan Spacebar untuk pause.
  - **Smartphone (HP) & Tablet**: Dukungan drag sentuh langsung pada arena canvas, serta tombol virtual (*▲ Naik / ▼ Turun*) yang otomatis aktif pada layar sentuh.
  - **Dynamic Canvas Scaling**: Resolusi tajam di layar Retina/OLED maupun monitor ultrawide.
- 🔊 **Web Audio API Procedural**: Efek suara sintetis 8-bit built-in (*paddle blip*, *wall bounce*, *score chime*, *victory fanfare*) tanpa aset audio eksternal yang berat.
- 🔐 **Autentikasi Supabase**:
  - Pendaftaran akun baru (*Sign Up*) & Masuk (*Sign In*).
  - Mode Tamu (*Guest*) tetap dapat langsung bermain tanpa login.
- 🏆 **Global Leaderboard**:
  - Menyimpan skor pertandingan langsung ke database Supabase.
  - Ranking real-time dengan pembeda badge rank (`#01`, `#02`, `#03`).

---

## 🚀 Menjalankan di Lokal (Local Development)

### 1. Prasyarat
- Node.js (v18 ke atas)

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variable
File `.env` sudah terisi dengan kredensial Supabase aktif:
```env
VITE_SUPABASE_URL=https://eakwpdrmrwjksyknhlgy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Jalankan Dev Server
```bash
npm run dev
```
Buka browser di `http://localhost:3000`.

---

## 🗄️ Skema Database Supabase

Jika ingin melihat struktur tabel skor di database Supabase:
```sql
CREATE TABLE IF NOT EXISTS public.pingpong_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    game_mode TEXT NOT NULL DEFAULT 'vs_ai',
    max_rally INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pingpong_scores_leaderboard 
ON public.pingpong_scores (game_mode, score DESC, created_at ASC);

ALTER TABLE public.pingpong_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read pingpong_scores" ON public.pingpong_scores FOR SELECT USING (true);
CREATE POLICY "Allow insert pingpong_scores" ON public.pingpong_scores FOR INSERT WITH CHECK (true);

-- Tabel Lobi & Matchmaking Online
CREATE TABLE IF NOT EXISTS public.pingpong_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT UNIQUE NOT NULL,
    host_name TEXT NOT NULL,
    guest_name TEXT,
    status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'playing' | 'finished'
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pingpong_rooms_matchmaking 
ON public.pingpong_rooms (status, is_private, created_at);

ALTER TABLE public.pingpong_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pingpong_rooms" ON public.pingpong_rooms FOR SELECT USING (true);
CREATE POLICY "Public insert pingpong_rooms" ON public.pingpong_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update pingpong_rooms" ON public.pingpong_rooms FOR UPDATE USING (true);
```

---

## 🐙 Panduan Upload ke GitHub

### Langkah 1: Pasang Git (Jika belum terpasang di sistem)
Buka terminal PowerShell dan jalankan:
```powershell
winget install --id Git.Git -e --source winget
```
*Tutup dan buka kembali terminal setelah instalasi selesai.*

### Langkah 2: Buat Repositori Baru di GitHub
1. Buka [github.com/new](https://github.com/new).
2. Beri nama repositori, misalnya: `simple-pingpong-noir`.
3. Biarkan opsi "Initialize with README" tidak dicentang.
4. Klik **Create repository**.

### Langkah 3: Inisialisasi & Push dari Komputer Anda
Buka PowerShell di folder proyek ini (`e:\Project AI\Simple ping pong`):
```bash
git init
git add .
git commit -m "feat: initial commit simple ping pong noir edition"
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/simple-pingpong-noir.git
git push -u origin main
```

---

## ⚡ Panduan Deploy ke Vercel

Proyek ini sudah dilengkapi file `vercel.json` sehingga langsung siap dideploy ke Vercel dalam hitungan detik.

### Opsi A: Deploy Otomatis via GitHub (Sangat Direkomendasikan)
1. Buka [vercel.com](https://vercel.com) dan login menggunakan akun GitHub Anda.
2. Klik tombol **"Add New..."** -> **"Project"**.
3. Pilih repositori `simple-pingpong-noir` yang baru saja Anda push ke GitHub.
4. Pada bagian **Environment Variables**, tambahkan 2 variabel berikut:
   - `VITE_SUPABASE_URL`: `https://eakwpdrmrwjksyknhlgy.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVha3dwZHJtcndqa3N5a25obGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzOTY2MzIsImV4cCI6MjEwMzk3MjYzMn0.VTwVFEzHvWJDNRgITnEMgYW_XPjGJe8Zek6OA_E9UlI`
5. Klik **"Deploy"**. Vercel akan otomatis melakukan build dan memberikan tautan URL publik (misal: `simple-pingpong-noir.vercel.app`).
6. Setiap kali Anda melakukan `git push`, Vercel akan otomatis meng-update aplikasinya!

### Opsi B: Deploy Langsung via Vercel CLI
```bash
npx vercel
```
Ikuti instruksi interaktif di terminal, pilih default options, dan deploy akan langsung berjalan.

---

## 🕹️ Panduan Kontrol

| Kontrol | Desktop / Laptop | HP / Tablet |
| :--- | :--- | :--- |
| **Gerak Paddle** | Tombol `W` / `S` atau `↑` / `↓` | Drag jari langsung pada arena / Tombol `▲` & `▼` |
| **Arah Presisi** | Gerakkan Mouse di atas canvas | Sentuh & geser pada layar |
| **Pause / Lanjut** | Tombol `SPACE` | Tekan tombol pause pada layar |
