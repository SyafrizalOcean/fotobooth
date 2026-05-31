# 🐲 Nailong Photobooth v3

Photobooth web profesional dengan kamera, frame mencolok, strip double, dan kirim ke email.
Made with ♥ by Syafrizal.

## ✨ Fitur

- 📸 Foto 3 atau 4 grid, hasilnya **strip double (×2) dengan urutan diacak**
- 🔄 Retake max 3x per foto, countdown 5 detik
- 🎥 Video recording dengan audio
- 📷 Multi-camera support dengan testing
- 🎨 10 warna strip + **25 frame mencolok** (Themed, Scene, Layered, Border)
- 📧 Kirim ke email manapun via EmailJS (tanpa backend!)
- 📱 Mobile responsive (skala otomatis di HP)
- ⬇ Download PNG photo strip & video WebM
- 🧙 Wizard step-by-step interaktif

## 🚀 Setup Pertama Kali

### 1. Daftar EmailJS (untuk fitur kirim email)

EmailJS = service yang biarin web kirim email via Gmail Anda, tanpa server.

1. Daftar gratis: https://www.emailjs.com/
2. **Connect Gmail**: Dashboard → Email Services → **Add New Service** → pilih **Gmail** → connect akun Gmail Anda → catat **Service ID** (format `service_xxx`)
3. **Bikin Template**: Dashboard → Email Templates → **Create New Template**
   - **Subject**: `🐲 Photo dari Nailong Photobooth!`
   - **Content**: paste template di bawah ini
   - **To Email**: `{{to_email}}`
   - **From Name**: `{{from_name}}`
   - Save → catat **Template ID** (format `template_xxx`)
4. **Get Public Key**: Dashboard → Account → General → copy **Public Key**

#### Template Email (copy-paste ke EmailJS Template Editor)
```html
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#fff5d6;">
  <div style="background:#fffdf5;border:3px solid #1a1a1a;border-radius:20px;padding:30px;">
    <h1 style="text-align:center;color:#1a1a1a;">🐲 Nailong Photobooth</h1>
    <p>Hai <strong>{{to_name}}</strong>!</p>
    <p>{{message}}</p>
    <div style="text-align:center;margin:20px 0;">
      <img src="{{photo_url}}" alt="Photo Strip" style="max-width:100%;border:3px solid #1a1a1a;border-radius:12px;" />
    </div>
    <p style="text-align:center;font-size:13px;color:#666;margin-top:30px;">
      Made with ♥ by Syafrizal
    </p>
  </div>
</div>
```

### 2. Daftar ImgBB (untuk upload gambar ke email)

ImgBB = free image hosting (untuk attach foto di email tanpa quota EmailJS).

1. Buka https://api.imgbb.com/
2. Sign up (gratis, langsung)
3. Klik **"Get API key"** → copy API key-nya

### 3. Isi kredensial di `public/js/app.js`

Edit file `public/js/app.js`, cari bagian paling atas:

```js
const EMAILJS_CONFIG = {
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY_HERE',      // <- ganti
  SERVICE_ID: 'YOUR_SERVICE_ID_HERE',      // <- ganti
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID_HERE'     // <- ganti
};
```

dan:

```js
const IMGBB_API_KEY = 'YOUR_IMGBB_API_KEY_HERE';  // <- ganti
```

Isi 4 kredensial itu dengan yang dari step 1 & 2.

### 4. Taro gambar Nailong

Letakkan 4 file PNG di `public/images/`:
- `nailong1.png`, `nailong2.png`, `nailong3.png`, `nailong4.png`
- Format PNG transparan, ukuran 200×200px+ recommended

Kalau gak ada file, auto fallback ke emoji 🐲.

### 5. Deploy

**Lokal (untuk test)**: buka `public/index.html` di browser, atau pake Live Server di VS Code.

**Vercel**:
1. Push ke GitHub
2. Import di vercel.com → Deploy
3. **Tidak perlu Environment Variables!** Semua kredensial ada di JS file.

## 📁 Struktur

```
photobooth/
├── public/
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── app.js          ← isi EmailJS + ImgBB key di sini
│   │   └── frames.js
│   └── images/
│       └── nailong1-4.png  ← gambar Nailong Anda
├── vercel.json
└── README.md
```

## 🐛 Troubleshooting

### Email gagal kirim
- Cek EmailJS dashboard → Logs untuk lihat error
- Pastikan template variable cocok: `{{to_email}}`, `{{to_name}}`, `{{message}}`, `{{photo_url}}`
- Cek quota EmailJS (200/bulan free)

### Foto/photo strip tidak muncul di email
- Cek ImgBB API key
- Cek size foto, ImgBB max 32MB

### Kamera error
- HTTPS only di production (Vercel auto-provide)
- Lihat detail di console (F12)

### Frame tidak keren / terlalu sederhana
- Coba category **Themed** (paling mencolok)
- Coba frame Birthday, Galaxy, Tropical, Sakura, Rainbow

---

**Made with ♥ by Syafrizal**
