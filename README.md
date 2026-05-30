# 🐲 Nailong Photobooth

Photobooth web profesional dengan kamera, frame lucu, GIF, video, dan kirim ke email.
Made with ♥ by Syafrizal.

## ✨ Fitur

- 📸 Foto 3 atau 4 grid dengan countdown 5 detik
- 🔄 **Retake up to 3 kali** per foto
- 🎥 Video recording dengan audio
- 🎞 Convert ke GIF animated
- 🔄 Boomerang style (maju-mundur)
- 📷 **Multi-camera support** dengan testing
- 🎨 10 warna strip + 27 frame lucu (border, scene, character, scrapbook)
- 📧 **Kirim ke email langsung dengan attachment** (via Resend API)
- ⬇ Download semua hasil
- 🧙 Wizard step-by-step interaktif

## 📁 Struktur Folder

```
photobooth/
├── package.json
├── .env                        ← bikin sendiri dari .env.example
├── .env.example
├── public/                     ← frontend (HTML/CSS/JS)
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── frames.js
│   │   └── gif-encoder.js
│   └── images/                 ← TARUH GAMBAR NAILONG DI SINI
│       ├── nailong1.png        ← (pojok kiri atas frame)
│       ├── nailong2.png        ← (pojok kanan atas frame)
│       ├── nailong3.png        ← (pojok kiri bawah frame)
│       └── nailong4.png        ← (pojok kanan bawah frame)
└── server/
    └── server.js               ← backend Express
```

## 🚀 Setup (Pertama Kali)

### 1. Install Node.js
Download dari https://nodejs.org (versi 18 atau lebih baru).
Cek di terminal: `node --version`

### 2. Taruh gambar Nailong
Letakkan **4 file gambar Nailong** di folder `public/images/`:
- `nailong1.png` — akan muncul di pojok kiri atas + sebagai maskot di header
- `nailong2.png` — pojok kanan atas
- `nailong3.png` — pojok kiri bawah
- `nailong4.png` — pojok kanan bawah

**Catatan**:
- Kalau cuma punya 1 gambar Nailong, copy 4x dengan nama berbeda
- Format PNG dengan background transparan paling bagus
- Ukuran disarankan 200x200px atau lebih (square)
- Kalau file gak ada, otomatis pakai emoji 🐲

### 3. Daftar Resend (untuk fitur kirim email)
1. Buka https://resend.com → Sign up (gratis)
2. Pergi ke **API Keys** → Create API Key
3. Copy API key-nya (format `re_xxx...`)

### 4. Bikin file `.env`
Copy file `.env.example` jadi `.env`:

```bash
cp .env.example .env
```

Edit file `.env`, isi API key Resend:
```
RESEND_API_KEY=re_apikey_kamu_disini
FROM_EMAIL=onboarding@resend.dev
PORT=3000
```

> ℹ️ `onboarding@resend.dev` adalah email default Resend untuk testing.
> Untuk production, verifikasi domain kamu sendiri di Resend dashboard.

### 5. Install dependencies
```bash
npm install
```

### 6. Run server
```bash
npm start
```

Server akan jalan di **http://localhost:3000**.
Buka URL itu di browser (Chrome/Edge recommended).

## 🎬 Cara Pakai

1. Buka http://localhost:3000
2. Welcome modal muncul → klik **Start Wizard**
3. **Step 1**: Pilih kamera dari dropdown → Test Camera → Confirm Camera
4. **Step 2**: Pilih layout (3 atau 4 grid) → Confirm Layout
5. **Step 3**: Pilih warna strip → Confirm Color
6. **Step 4**: Pilih frame (4 kategori: Border / Scene / Chara / Scrap) → Confirm Frame
7. Klik **📷 Take Photos** atau **🎥 Record Video**
8. Setelah tiap foto, pilih: **Pakai** atau **Retake** (max 3x retake per slot)
9. Hasil keluar → pilih: Download / Kirim Email / Bikin GIF / Boomerang

## 🐛 Troubleshooting

**Kamera tidak terdeteksi?**
- Pastikan izinkan akses kamera di browser
- Coba browser lain (Chrome paling kompatibel)
- Akses harus pakai `http://localhost` atau `https://` (tidak bisa `file://`)

**Email tidak terkirim?**
- Cek file `.env` API key sudah benar
- Cek terminal apakah ada error message
- Domain `onboarding@resend.dev` hanya bisa kirim ke email yang sudah diverifikasi di Resend dashboard

**Mau pakai email dengan domain sendiri?**
- Login Resend → Domains → Add domain
- Ikuti instruksi setup DNS
- Update `FROM_EMAIL` di `.env`

**Error saat install?**
- Pastikan Node.js v18+
- Hapus folder `node_modules` dan file `package-lock.json`, lalu `npm install` lagi

## 🚢 Deploy ke Production

Bisa di-deploy ke:
- **Vercel** (gratis): set environment variables di dashboard
- **Railway**: connect repo, set env vars
- **Render**: similar
- **VPS**: pakai PM2 atau systemd

Pastikan setting `RESEND_API_KEY` di environment variable production.

---

**Made with ♥ by Syafrizal**
