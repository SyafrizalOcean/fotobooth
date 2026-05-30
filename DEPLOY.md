# 🚀 Deploy Nailong Photobooth ke Vercel (GRATIS)

Panduan lengkap deploy ke Vercel pakai GitHub. Total waktu: ~10 menit.

## ✅ Prerequisites

- Akun GitHub (sudah punya ✓)
- Akun Resend untuk email — daftar gratis di [resend.com](https://resend.com)
- Project sudah ada di komputer Anda

---

## 📝 Step 1: Daftar Vercel & Connect GitHub

1. Buka [vercel.com](https://vercel.com) → klik **Sign Up**
2. Pilih **"Continue with GitHub"** → authorize Vercel akses GitHub Anda
3. Pilih plan **Hobby** (gratis) saat ditanya

---

## 📦 Step 2: Push Project ke GitHub

Di terminal, di folder project `photobooth/`:

```bash
# Inisialisasi git (kalau belum)
git init

# Tambahkan semua file
git add .

# Commit
git commit -m "Initial commit: Nailong Photobooth"

# Bikin repo di GitHub dulu via web (klik New repository di github.com)
# Lalu connect:
git branch -M main
git remote add origin https://github.com/USERNAME/nama-repo.git
git push -u origin main
```

**Penting**: pastikan `.env` Anda **TIDAK ter-push** (sudah di-gitignore). Cek:
```bash
git status
```
File `.env` tidak boleh muncul di list.

---

## 🌐 Step 3: Import Project ke Vercel

1. Login ke [vercel.com/dashboard](https://vercel.com/dashboard)
2. Klik **"Add New..."** → **"Project"**
3. Pilih repo `nama-repo` yang baru di-push → **Import**
4. Di halaman config:
   - **Framework Preset**: pilih **Other** (atau biarkan auto)
   - **Root Directory**: biarkan kosong (default: `./`)
   - **Build Command**: biarkan kosong
   - **Output Directory**: biarkan kosong
5. **JANGAN klik Deploy dulu!** Scroll ke bawah, expand **Environment Variables**:

---

## 🔐 Step 4: Set Environment Variables (PENTING!)

Di section "Environment Variables", tambahkan:

| Key | Value |
|---|---|
| `RESEND_API_KEY` | `re_xxx...` (copy dari Resend Dashboard) |
| `FROM_EMAIL` | `onboarding@resend.dev` (atau email domain Anda kalau sudah verified) |

Klik **Add** untuk setiap variable.

Setelah itu klik **Deploy**.

---

## ⏱ Step 5: Tunggu Build (~30-60 detik)

Vercel akan:
1. Clone repo Anda
2. Detect folder `/api/` → setup serverless function
3. Serve folder `/public/` sebagai static files
4. Kasih URL public

Setelah selesai, dapat URL kayak:
```
https://nailong-photobooth-username.vercel.app
```

🎉 **Selesai! Photobooth Anda udah online!**

---

## ✅ Test Deployment

1. Buka URL Vercel-nya di browser
2. Izinkan akses kamera waktu di-tanya
3. Coba ambil foto → coba kirim email
4. Kalau email gagal: cek di Vercel Dashboard → Project → **Logs** untuk lihat error

---

## 🔄 Update Code Setelah Deploy

Setiap kali Anda update kode:

```bash
git add .
git commit -m "Update fitur xxx"
git push
```

Vercel **otomatis deploy ulang** dalam ~30 detik. Tanpa perlu apa-apa lagi.

---

## ⚠️ Catatan Penting

### 1. Limit Free Tier Vercel
- ✅ **Bandwidth**: 100 GB/bulan (cukup untuk ribuan pengunjung)
- ✅ **Serverless functions**: 100k execution/bulan
- ⚠️ **Function timeout**: 10 detik di free tier (sudah cukup untuk kirim email)
- ⚠️ **Function size**: 4.5 MB request/response (email dengan attachment >4MB akan gagal — biasanya foto/GIF kita di bawah 2MB)

### 2. Limit Free Tier Resend
- 100 email/hari
- 3.000 email/bulan
- Dari domain `onboarding@resend.dev` cuma bisa kirim ke email yang **sudah verified di Resend dashboard**

**Mau kirim ke email siapapun?** Verifikasi domain sendiri:
- Beli domain di Cloudflare/Niagahoster (~Rp 150rb/tahun untuk `.com`)
- Di Resend → Domains → Add → ikuti instruksi DNS
- Update env `FROM_EMAIL` di Vercel jadi `hi@domainkamu.com`
- Redeploy

### 3. HTTPS Otomatis
Vercel auto-provide HTTPS. **Kamera browser butuh HTTPS untuk jalan** — di Vercel ini otomatis ✓. Berbeda dengan kalau Anda host di server biasa.

### 4. Gambar Nailong
Folder `public/images/nailong1.png` ... `nailong4.png` harus sudah ada di repo sebelum push. Otherwise akan fallback ke emoji 🐲 di hasil deploy.

---

## 🐛 Troubleshooting

### Build gagal di Vercel
- Cek tab **Deployments** → klik deployment yang gagal → baca log
- Common issue: file size terlalu besar (gambar Nailong jangan > 1 MB masing-masing, kompres dulu di tinypng.com)

### Email gagal terkirim setelah deploy
- Buka **Logs** di Vercel dashboard → cari error message
- Common issue: lupa set `RESEND_API_KEY` di Environment Variables (kalau gini, Settings → Environment Variables → add → redeploy)
- Atau coba kirim ke email Anda sendiri yang sudah verified di Resend

### "404 Not Found" saat akses URL Vercel
- Pastikan `vercel.json` sudah ada di root project
- Pastikan struktur folder: `public/index.html`, `api/send-email.js` (case-sensitive!)

### Kamera tetap error di production
- Buka via HTTPS (URL Vercel selalu HTTPS — pastikan tidak ada warning di address bar)
- Test di Chrome/Edge (browser desktop), Safari mobile, Chrome mobile
- DI device pengunjung — bukan masalah laptop Anda lagi

---

## 🎁 Bonus: Custom Domain (kalau nanti mau)

Kalau nanti udah punya domain:
1. Vercel Dashboard → Project → **Settings** → **Domains**
2. Add domain → ikuti instruksi DNS
3. SSL otomatis di-setup

---

**Made with ♥ by Syafrizal**
