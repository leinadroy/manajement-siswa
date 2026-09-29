# Implementation Plan — Sistem Manajemen Data Siswa

Sep 28, 2026 · @Roy Daniel

## Ringkasan

Aplikasi dibangun dengan **Node.js (Express) + SQLite bawaan Node (`node:sqlite`)**, frontend HTML/CSS/JS murni tanpa build step, mengikuti layout desain Modernist tetapi dengan **skema warna biru-putih** sesuai PRD v1.4.

- **Pengganti GeneXus Next:** GeneXus tidak terpasang, jadi logika PRD (tabel sesi kustom pengganti GAM, paging, filter) diimplementasikan langsung di Node.js. Struktur data mengikuti PRD bagian 5 apa adanya.
- **Cakupan v1 (semua modul):** landing publik desktop + mobile, detail siswa publik, login admin, Dashboard, CRUD Manajemen Siswa (desktop), dan aplikasi mobile admin (mobile-web) dengan View/Detail, Edit, Hapus.
- **Dependensi minimal:** hanya `express`. Hashing password pakai `crypto.scrypt` bawaan, foto disimpan sebagai file di `uploads/`.
- **Syarat:** Node.js 22.13 atau lebih baru (untuk `node:sqlite` tanpa flag).

## Arsitektur & struktur folder

Satu server Express melayani tiga klien; semua halaman dan API admin melewati session guard yang memvalidasi cookie terhadap tabel `session`.

&#91;embedded content: arsitektur aplikasi · 3 klien, 1 server, SQLite\]

URL admin (`ADMIN_PATH`, default `/backoffice`) tidak ditautkan dari halaman publik mana pun.

```text
siswa-app/
├── server.js              # entry: Express, routing halaman, guard
├── src/
│   ├── db.js              # koneksi node:sqlite, skema, seed
│   ├── auth.js            # hash scrypt, sesi, middleware
│   ├── siswa.js           # query list/filter/search, validasi, foto
│   └── routes/            # public.js, auth.js, admin.js
├── public/
│   ├── css/               # tokens.css (biru-putih), app.css
│   ├── js/                # common.js, landing.js, detail.js, admin.js, mobile.js
│   ├── index.html         # landing publik
│   ├── siswa.html         # detail siswa publik
│   ├── admin.html         # back office desktop (login, dashboard, grid, form)
│   └── mobile.html        # aplikasi mobile admin
├── data/siswa.db          # dibuat otomatis
└── uploads/               # foto siswa
```

## Model data (SQLite)

Tiga tabel mengikuti PRD bagian 5; 5 field siswa wajib, 16 field tambahan nullable.

| Tabel | Kolom | Catatan |
| --- | --- | --- |
| `siswa` | `id` INTEGER PK, `foto`, `nama`, `tempat_lahir`, `tanggal_lahir` (ISO `YYYY-MM-DD`), `jenis_kelamin` (`L`/`P`) | Wajib; index di `tempat_lahir`, `tanggal_lahir`, `jenis_kelamin` untuk filter |
| `siswa` (lanjutan) | `nis`, `nisn`, `agama`, `kewarganegaraan`, `anak_ke`, `jumlah_saudara`, `telepon`, `email`, `alamat`, `nama_ayah`, `nama_ibu`, `pekerjaan_ayah`, `pekerjaan_ibu`, `hobi`, `riwayat_formal`, `riwayat_informal` | Opsional (nullable) |
| `siswa` (teknis) | `search_text`, `created_at`, `updated_at` | `search_text` = nama, kota, tanggal (ISO + label "12 Jan 2015"), label J.K., huruf kecil; dipakai pencarian lintas kolom |
| `admin` | `id`, `username` UNIQUE, `password_hash`, `nama` | Single admin di-seed: `admin` / `admin123`, nama "Budi Santoso" |
| `session` | `token` PK (32 byte acak, hex), `admin_id` FK, `login_at`, `expires_at` | Valid bila `expires_at` > sekarang; masa aktif 8 jam, diperpanjang saat dipakai; dihapus saat logout |

Password disimpan sebagai `scrypt$salt$hash`. Cookie `sid` bersifat HttpOnly + SameSite=Lax.

## Endpoint API

Semua endpoint mengembalikan JSON; endpoint `/api/admin/*` menolak dengan 401 bila sesi tidak valid.

| Method | Path | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/public/siswa?kota&dari&sampai&jk&q&page&size` | Publik | List + filter AND + paging (desktop 20/halaman, mobile "muat lebih") |
| GET | `/api/public/siswa/:id` | Publik | Detail publik: foto, nama, J.K., tempat & tanggal lahir |
| GET | `/api/public/kota` | Publik | Daftar kota unik untuk dropdown filter |
| POST | `/api/auth/login` | Publik | Cek username/password, buat baris `session`, set cookie |
| POST | `/api/auth/logout` | Admin | Hapus baris `session`, hapus cookie |
| GET | `/api/auth/me` | Admin | Nama admin untuk Dashboard |
| GET | `/api/admin/siswa?q&kota&dari&sampai&jk&page&size` | Admin | Grid: search lintas kolom + filter, terbaru di atas |
| GET | `/api/admin/siswa/:id` | Admin | Semua atribut siswa |
| POST | `/api/admin/siswa` | Admin | Tambah (foto dikirim sebagai data URL JPEG hasil resize) |
| PUT | `/api/admin/siswa/:id` | Admin | Ubah; foto lama dipertahankan bila tidak diganti |
| DELETE | `/api/admin/siswa/:id` | Admin | Hapus data + file foto |

## Tahapan implementasi (step by step)

Delapan fase berurutan; tiap fase selesai bila kriteria "Selesai jika" terpenuhi dan diuji sebelum lanjut.

- [ ] **Fase 0 — Setup proyek.** `package.json`, Express, struktur folder, skrip `npm start`. Selesai jika server menyala di port 3000.
- [ ] **Fase 1 — Database & seed.** Skema 3 tabel, index, seed 1 admin + 60 siswa contoh dengan foto avatar. Selesai jika `data/siswa.db` terbentuk otomatis saat start pertama.
- [ ] **Fase 2 — Autentikasi kustom (pengganti GAM).** Hash scrypt, login membuat sesi, logout menghapus sesi, guard untuk halaman & API admin. Selesai jika akses back office tanpa login dialihkan ke Login.
- [ ] **Fase 3 — API siswa.** Endpoint publik & admin, filter AND, search lintas kolom, paging, validasi 5 field wajib, simpan/hapus file foto. Selesai jika semua endpoint lolos uji otomatis.
- [ ] **Fase 4 — Design tokens & komponen.** `tokens.css` biru-putih (ramp 100–900), komponen Modernist: btn, input, seg, tag, table, dialog; sudut 0, garis 2px. Selesai jika semua halaman memakai token, tanpa hex lepas.
- [ ] **Fase 5 — Landing publik + Detail.** Desktop: filter bar 4 kolom, grid card, paging bernomor 20/halaman. Mobile (≤ 720px): list, search, segmented J.K., panel filter kota + rentang tanggal, "Muat Lebih Banyak". Detail publik dengan tombol kembali. Selesai jika filter/paging sesuai 4.1.
- [ ] **Fase 6 — Back office desktop.** Login, Dashboard ("Selamat datang, nama"), sidebar Dashboard → Manajemen Siswa, grid + search + paging, form Add/Edit dengan "Data Tambahan", dialog hapus, dialog logout Ya/Tidak. Selesai jika alur admin di PRD bagian 8 berjalan end-to-end.
- [ ] **Fase 7 — Aplikasi mobile admin.** Login → Dashboard → List (search + filter) → View seluruh atribut → Edit/Hapus; Add dari List; simpan dari Edit kembali ke View. Selesai jika alur 4.7 berjalan di viewport 390px.
- [ ] **Fase 8 — Verifikasi.** Uji API otomatis + uji UI dengan browser headless (desktop 1440px & mobile 390px), cek sesi kedaluwarsa, README cara menjalankan.

## Pemetaan PRD → halaman

Setiap kebutuhan fungsional PRD v1.4 punya satu URL dan satu file frontend.

| PRD | Kebutuhan | URL | File |
| --- | --- | --- | --- |
| 4.1 | Landing publik: card grid, filter kota/tanggal/J.K., paging 20 | `/` | `index.html`, `landing.js` |
| 4.1.1 | Varian mobile: list, search, filter panel, Muat Lebih Banyak | `/` (≤ 720px) | `landing.js` |
| 4.1.2 | Detail siswa publik | `/siswa/:id` | `siswa.html`, `detail.js` |
| 4.2 | Login admin (URL tak ditautkan) | `/backoffice/login` | `admin.html`, `admin.js` |
| 4.3 / 4.4 | Dashboard + sidebar (Dashboard di atas) | `/backoffice` | `admin.js` |
| 4.5 | Grid + search, Add/Edit/Delete, form 5 wajib + 16 opsional | `/backoffice/siswa`, `/siswa/baru`, `/siswa/:id/edit` | `admin.js` |
| 4.6 | Logout dengan dialog Ya/Tidak | semua halaman back office | `common.js` |
| 4.7 | Aplikasi mobile admin: Login, Dashboard, List, View, Form | `/backoffice/m` | `mobile.html`, `mobile.js` |
| 5 | Tabel Siswa, Admin, Session | — | `src/db.js` |
| 7 | Hash password, validasi sesi tiap akses, paging | — | `src/auth.js`, `server.js` |

Satu penyimpangan dari desain: tombol "Portal Staf" di footer landing dihilangkan karena PRD 4.2 melarang tautan ke halaman login.
