# ProctorOne Client (POC)

Exam browser berbasis web (mirip EBC — Exam Browser Client) untuk ujian online jenjang **SD**, **SMP**, dan **SMA/SMK**. Login wajib pakai akun Google (Firebase Authentication), soal & jawaban tersimpan real-time di Cloud Firestore.

## Struktur folder

```
proctorone-client/
├── index.html              # Halaman utama (login, dashboard, ujian, hasil)
├── css/
│   └── style.css           # Semua styling
├── js/
│   ├── firebase-config.js  # Inisialisasi Firebase (config proyek "proctorone0")
│   └── app.js               # Seluruh logika app: auth, dashboard, anti-cheat, grading
├── assets/
│   ├── logo.png             # Logo ProctorOne (dari file yang kamu kirim)
│   └── icons/               # Favicon & app icon berbagai ukuran (16–512px)
├── firestore.rules          # Aturan keamanan Firestore siap pakai
├── seed-exam-example.json   # Contoh struktur 1 dokumen ujian
└── README.md
```

## Cara menjalankan lokal

Butuh server lokal (bukan buka file langsung via `file://`, karena Firebase Auth popup akan gagal):

```bash
cd proctorone-client
npx serve .
# atau: python3 -m http.server 5500
```

Buka `http://localhost:5500` (atau port yang muncul).

## Wajib disetel di Firebase Console sebelum dipakai

1. **Authentication → Sign-in method** → aktifkan provider **Google**.
2. **Authentication → Settings → Authorized domains** → tambahkan domain tempat kamu deploy (contoh: `localhost`, `namadomainmu.com`, atau domain hosting pilihanmu). Tanpa ini, login Google akan gagal dengan error `auth/unauthorized-domain`.
3. **Firestore Database** → buat database (mode production).
4. **Firestore → Rules** → tempel isi `firestore.rules` di sini, lalu Publish. Aturan ini memastikan: user hanya bisa baca/tulis data miliknya sendiri, dan hanya kamu (lewat Console) yang bisa menulis ke koleksi `exams`.

## Menambahkan soal ujian

App membaca ujian dari koleksi `exams`. Belum ada panel admin di versi ini (sengaja tidak dibuat data palsu) — tambahkan manual:

1. Firestore Database → Start collection → nama `exams`.
2. Add document, isi field sesuai contoh di `seed-exam-example.json`:
   - `title` (string)
   - `level` (string): `"SD"`, `"SMP"`, atau `"SMA"`
   - `durationSeconds` (number)
   - `questions` (array of map): tiap soal punya `id`, `text`, `options` (array string), `correctIndex` (number)

Dashboard otomatis menampilkan ujian sesuai jenjang yang dipilih user saat login.

## Fitur anti-kecurangan yang benar-benar berjalan

- Wajib fullscreen saat ujian dimulai; keluar fullscreen → overlay peringatan + 1 strike.
- Deteksi ganti tab / pindah jendela (`visibilitychange` + `blur`) → 1 strike.
- Blokir klik kanan, copy, cut, paste.
- Blokir shortcut DevTools (F12, Ctrl+Shift+I/J/C, Ctrl+U/S/P) → 1 strike.
- Heuristik deteksi DevTools terbuka (selisih ukuran window) → 1 strike. Ini heuristik, bukan jaminan mutlak — batasan yang sama juga berlaku di exam browser berbasis web manapun; untuk lockdown yang benar-benar tidak bisa ditembus, solusi native/kiosk-mode OS (seperti EBC/SEB asli) tetap lebih kuat daripada berbasis browser.
- 3 strike → ujian otomatis dikumpulkan (`autoSubmitted: true`).
- Timer countdown → habis waktu = otomatis dikumpulkan.
- Auto-grading pilihan ganda, skor tersimpan ke `submissions`.

## Deploy ke hosting

Karena ini murni file statis, bisa langsung di-deploy ke:
- **Firebase Hosting** (paling nyambung dengan project ini): `firebase init hosting` → `firebase deploy`
- Netlify / Vercel / GitHub Pages (drag & drop folder ini)

Ingat: domain hosting final wajib ditambahkan ke **Authorized domains** (langkah 2 di atas).

## Yang belum ada (di luar scope permintaan awal)

- Panel admin untuk CRUD soal dari UI (saat ini lewat Firestore Console manual).
- Dukungan soal esai/isian (saat ini hanya pilihan ganda dengan auto-grading).
