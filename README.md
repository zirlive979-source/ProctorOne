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


## Yang belum ada (di luar scope permintaan awal)

- Panel admin untuk CRUD soal dari UI (saat ini lewat Firestore Console manual).
- Dukungan soal esai/isian (saat ini hanya pilihan ganda dengan auto-grading).
