# Sistem Manajemen Data Siswa

Implementasi PRD v1.4 (`../PRD_Manajemen_Siswa.md`) dengan **Node.js + Express + SQLite** (`node:sqlite` bawaan Node) dan frontend HTML/CSS/JS tanpa build step. Tampilan mengikuti desain Modernist di `../prd-1.4/`, dengan skema warna **biru-putih** sesuai PRD bagian 6.

## Syarat
- Node.js **22.13 atau lebih baru** (disarankan Node 24 LTS). Cek: `node -v`

## Menjalankan
```bash
cd siswa-app
npm install
npm start
```
Buka:

| Halaman | URL |
| --- | --- |
| Landing publik (desktop & mobile) | http://localhost:4000/ |
| Login back office desktop | http://localhost:4000/backoffice/login |
| Aplikasi mobile admin | http://localhost:4000/backoffice/m |

Akun admin awal: **admin / admin123** (nama "Budi Santoso"). Ganti sebelum dipakai sungguhan — lihat variabel lingkungan di bawah, lalu `npm run reset-db`.

Saat start pertama, database `data/siswa.db` dan 60 data siswa contoh (dengan foto avatar) dibuat otomatis.

## Perintah
| Perintah | Fungsi |
| --- | --- |
| `npm start` | Menjalankan server |
| `npm run dev` | Server dengan auto-restart saat file berubah |
| `npm test` | Uji otomatis API (database sementara) |
| `npm run reset-db` | Hapus database & foto, buat ulang dengan data contoh |

## Variabel lingkungan (opsional)
| Nama | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `4000` | Port server |
| `ADMIN_PATH` | `backoffice` | Path rahasia back office (tidak ditautkan dari halaman publik) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_NAME` | `admin` / `admin123` / `Budi Santoso` | Akun admin yang di-seed saat database kosong |
| `SESSION_TTL_MINUTES` | `480` | Masa aktif sesi (diperpanjang setiap dipakai) |
| `SEED_SISWA` | `60` | Jumlah data contoh saat database kosong (`0` = tanpa data contoh) |

Contoh (PowerShell): `$env:ADMIN_PATH="kelola-rahasia"; $env:ADMIN_PASSWORD="GantiIni!"; npm run reset-db; npm start`

## Struktur
```
server.js            Express: halaman, guard sesi, error handler
src/db.js            Skema SQLite (siswa, admin, session) + seed
src/auth.js          Login/logout/validasi sesi kustom (pengganti GAM)
src/crypto.js        Hash password scrypt
src/siswa.js         Query list/filter/search/paging, validasi, foto
src/routes/          API: public.js, auth.js, admin.js
views/               index.html, siswa.html, admin.html, mobile.html
public/css/app.css   Design tokens biru-putih + komponen
public/js/           common.js, landing.js, form.js, admin.js, mobile.js
test/api.test.js     Uji otomatis
```

## Catatan keamanan
- Password disimpan sebagai hash scrypt + salt; cookie sesi HttpOnly + SameSite=Lax (+Secure di HTTPS).
- Setiap halaman & API back office memvalidasi token terhadap tabel `session`; logout menghapus barisnya.
- Login dibatasi 10 percobaan gagal / 15 menit per IP.
- URL login tidak ditautkan dari halaman publik (tombol "Portal Staf" pada mockup sengaja dihilangkan sesuai PRD 4.2).
