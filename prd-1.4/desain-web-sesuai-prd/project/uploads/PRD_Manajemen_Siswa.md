# PRD: Sistem Manajemen Data Siswa
**Challenge:** GeneXus Next (CLI) + Integrasi Claude
**Versi:** 1.4
**Tanggal:** 30 Agustus 2026

> **Update v1.4:** varian mobile (publik di 4.1.1 dan admin di 4.7.3) kini punya **filter penuh** yang sama seperti desktop — Tempat Lahir, rentang Tanggal Lahir (dari–sampai), dan Jenis Kelamin — dibuka lewat ikon filter di sebelah search box, agar tetap dapat menyaring data secara efisien saat volume data besar (ribuan siswa), bukan hanya mengandalkan search + "Muat Lebih Banyak".
>
> **Update v1.3:** ditambahkan **Aplikasi Mobile Manajemen Siswa** untuk admin (terpisah dari landing page publik) yang mereplikasi alur back office desktop di form factor mobile: Login → Dashboard → menu Manajemen Siswa → List siswa (search) → tap baris → **Halaman View/Detail Siswa** (kini menampilkan **seluruh atribut siswa**, termasuk NIS, NISN, agama, dst — lihat 4.7.4) → tombol **Edit** dan **Hapus** di halaman itu; tombol **Add** tersedia di List. CRUD (Create/Update/Delete) berjalan penuh di mobile, bukan hanya read-only.
>
> **Update v1.1:** menu sidebar "Welcome" diganti nama menjadi **Dashboard** dan urutannya dipindah **di atas** menu Manajemen Siswa; Logout kini wajib menampilkan **dialog konfirmasi Ya/Tidak** sebelum sesi ditutup; Grid Manajemen Siswa mendapat **field pencarian (search box)** yang mencari di semua kolom yang tampil di grid (nama, tempat lahir, tanggal lahir, jenis kelamin).
>
> **Update v1.2:** ditambahkan varian **tampilan mobile** untuk landing page publik (lihat 4.1.1) — list siswa dengan search + filter jenis kelamin, "Muat Lebih Banyak" sebagai pengganti paging bernomor, dan **halaman Detail Siswa** yang terbuka saat sebuah baris/kartu siswa diklik/di-tap.

---

## 1. Latar Belakang & Tujuan

Proyek ini dibuat sebagai bagian dari challenge GeneXus Next menggunakan CLI dan integrasi dengan Claude. Skopnya sederhana: membangun sebuah **landing page publik** yang menampilkan data siswa, serta **backend/back office** untuk mengelola (input, lihat) data siswa tersebut.

Karena GeneXus Next (versi CLI) belum mendukung GAM (GeneXus Access Manager), autentikasi dibangun menggunakan **logic kustom** dengan tabel sesi (session) sendiri.

### Tujuan
- Menyediakan halaman publik yang menampilkan daftar siswa dalam bentuk kartu (card), lengkap dengan foto dan biodata dasar.
- Menyediakan mekanisme filter agar pengunjung mudah mencari siswa berdasarkan kota lahir, tanggal lahir, dan jenis kelamin.
- Menyediakan back office sederhana bagi admin untuk mengelola data siswa (CRUD dasar, dimulai dari input/create).
- Memisahkan akses admin (login) dari halaman publik demi keamanan sederhana (security through obscurity untuk level challenge ini).

---

## 2. Ruang Lingkup (Scope)

### Termasuk dalam scope
- 1 halaman landing page publik (Home) dengan grid card siswa + filter + paging.
- 1 halaman login admin (URL terpisah dari landing page).
- 1 halaman **Dashboard** (sebelumnya disebut "Welcome") setelah login berhasil.
- Menu sidebar berurutan: **Dashboard** (teratas) → **Manajemen Siswa**, dengan alur Grid → Add/Edit/Delete → Form Input (CRUD penuh untuk data siswa).
- Grid Manajemen Siswa dilengkapi **field pencarian** lintas kolom (nama, tempat lahir, tanggal lahir, jenis kelamin).
- Fungsi Logout dengan **dialog konfirmasi** ("Apakah Anda yakin ingin keluar dari sistem?" — Ya/Tidak) sebelum membersihkan session dan redirect ke login.

### Di luar scope (v1)
- Multi-role/multi-level admin (hanya 1 jenis akun admin).
- Reset password / lupa password.
- Notifikasi email.

---

## 3. Peran Pengguna (User Roles)

| Role | Deskripsi | Akses |
|---|---|---|
| **Pengunjung (Publik)** | Siapa saja yang membuka landing page | Lihat & filter data siswa (read-only) |
| **Admin** | Pengguna yang mengetahui URL login khusus | Login, kelola (input) data siswa, logout |

---

## 4. Kebutuhan Fungsional

### 4.1 Landing Page (Publik)

**URL:** terpisah dan berbeda dari URL login admin (misalnya `/` atau `/siswa`, sedangkan login di path tersendiri yang tidak ditautkan/di-link dari halaman publik manapun).

**Konten Home:**
- Grid/list berisi **card** untuk tiap siswa, menampilkan:
  - Foto siswa
  - Nama
  - Tempat lahir
  - Tanggal lahir
  - Jenis kelamin
- **Filter** (di atas grid atau sidebar filter):
  - Kota/Tempat Lahir
  - Tanggal Lahir — menggunakan **date range picker** (dari tanggal – sampai tanggal)
  - Jenis Kelamin
- **Paging**: 20 siswa per halaman.

**Perilaku:**
- Filter bisa dikombinasikan (AND) — misal filter kota + jenis kelamin sekaligus.
- Saat filter diterapkan, paging kembali ke halaman 1.
- Tidak perlu login untuk mengakses halaman ini.
- Klik/tap pada card siswa membuka **Halaman Detail Siswa** (lihat 4.1.2).

#### 4.1.1 Varian Tampilan Mobile

- Pada breakpoint mobile, grid card diganti **list** vertikal (1 kolom): thumbnail foto, nama, tempat lahir, tanggal lahir, dan tag jenis kelamin per baris.
- Search box (cari nama/tempat lahir) selalu terlihat, dengan **filter jenis kelamin** (segmented control Semua / Laki-laki / Perempuan) di bawahnya.
- **Ikon filter** di samping search box membuka panel filter tambahan yang setara dengan desktop: **Tempat Lahir** (dropdown kota) dan **Tanggal Lahir** (rentang dari–sampai), plus tombol Reset Filter. Ikon berubah warna (aktif) saat ada filter kota/tanggal yang terpasang. Ini memastikan pencarian tetap efisien walau data siswa berjumlah ribuan.
- **Paging diganti tombol "Muat Lebih Banyak"** di bagian bawah list (infinite-load bertahap) — bukan paging bernomor seperti di desktop.
- Tap pada baris siswa membuka Halaman Detail Siswa.

#### 4.1.2 Halaman Detail Siswa

- Diakses dengan klik/tap pada card (desktop) atau baris (mobile) di landing page.
- Menampilkan: foto siswa (ukuran besar), nama, tag jenis kelamin, tempat lahir, tanggal lahir.
- Tombol/ikon **kembali** untuk balik ke list/grid landing page.
- Read-only, tidak memerlukan login (bagian dari halaman publik).

### 4.2 Login Admin

**URL:** path khusus, terpisah dari landing page, tidak ditautkan di navigasi publik (hanya diketahui admin).

**Field Login:**
- Username
- Password

**Perilaku:**
- Autentikasi menggunakan logic kustom (bukan GAM), karena GAM belum didukung GeneXus Next CLI.
- Saat login berhasil: sistem membuat/menyimpan record session ke **tabel sesi kustom**, lalu redirect ke halaman **Welcome**.
- Saat login gagal: tampilkan pesan error, tetap di halaman login.

### 4.3 Halaman Dashboard (sebelumnya "Welcome")

- Menampilkan pesan sambutan + nama admin yang login (contoh: "Selamat datang, Budi").
- Menampilkan sidebar menu di sisi kiri.
- Menyediakan tombol **Logout**.
- Ini adalah halaman default yang tampil setelah login berhasil.

### 4.4 Sidebar Menu

- Urutan menu (dari atas ke bawah):
  1. **Dashboard** — menuju halaman Dashboard/Welcome.
  2. **Manajemen Siswa** — menuju Grid data siswa.
- Tombol/link **Logout** (selalu terlihat, misal di bagian bawah sidebar atau header). Lihat perilaku konfirmasi di 4.6.

### 4.5 Manajemen Siswa (Back Office)

**Alur:** Grid (daftar siswa) → **Add** (Form Input kosong) / **Edit** (Form Input terisi data existing) / **Delete** (hapus data, dengan konfirmasi).

**Halaman Grid:**
- Menampilkan daftar siswa dalam bentuk tabel standar back office (kolom: foto/thumbnail, nama, tempat lahir, tanggal lahir, jenis kelamin, dst).
- **Field pencarian (search box)** di atas tabel: mencari secara live/on-change di **semua kolom yang tampil di grid** (nama, tempat lahir, tanggal lahir, jenis kelamin) — pencarian bersifat OR antar kata pada satu keyword yang sama (substring match, tidak case-sensitive).
- Saat pencarian diterapkan, paging grid kembali ke halaman 1.
- Tombol "Add" untuk menambah siswa baru.
- Aksi per baris: **Edit** dan **Delete**.
- Delete menampilkan konfirmasi sebelum data benar-benar terhapus.
- Paging standar back office (jumlah baris per halaman bisa mengikuti default GeneXus).

**Form Input Siswa** (dipakai untuk Add & Edit) — field minimal (wajib):
- Foto
- Nama
- Tempat Lahir
- Tanggal Lahir
- Jenis Kelamin

**Field tambahan — daftar final (fixed, ditetapkan sekarang agar tidak perlu ubah struktur data GeneXus di tengah jalan):**
- NIS (Nomor Induk Siswa)
- NISN (Nomor Induk Siswa Nasional)
- Agama
- Kewarganegaraan
- Anak ke- (urutan anak dalam keluarga)
- Jumlah Saudara Kandung
- No. Telepon/HP (siswa atau wali)
- Email
- Alamat
- Nama Ayah
- Nama Ibu
- Pekerjaan Ayah
- Pekerjaan Ibu
- Hobi
- Riwayat Pendidikan Formal (misal: nama sekolah asal/sebelumnya)
- Riwayat Pendidikan Informal (misal: kursus, pelatihan, sertifikasi non-formal)

> Catatan: Semua field tambahan di atas disarankan **opsional/nullable** (tidak wajib diisi saat input), kecuali 5 field minimal di atas yang wajib.

### 4.7 Aplikasi Mobile Manajemen Siswa (Admin)

Aplikasi terpisah (native/mobile-web) khusus untuk admin, mereplikasi alur back office desktop dalam form factor mobile. Bukan bagian dari landing page publik (4.1/4.1.1), yang tetap read-only.

#### 4.7.1 Login
- Field: Username, Password.
- Sukses → buat session → masuk ke **Dashboard**. Gagal → pesan error, tetap di Login.

#### 4.7.2 Dashboard
- Sambutan + nama admin.
- Satu entri menu: **Manajemen Siswa** → membuka List.
- Ikon Logout di header, dengan dialog konfirmasi Ya/Tidak (sama seperti 4.6).

#### 4.7.3 List Siswa
- Search box: cari lintas kolom yang tampil (nama, tempat lahir, tanggal lahir, jenis kelamin), on-change, tidak case-sensitive.
- **Ikon filter** di samping search box membuka panel filter: **Tempat Lahir** (dropdown kota), **Tanggal Lahir** (rentang dari–sampai), dan **Jenis Kelamin** (segmented control), plus tombol Reset Filter — bisa dikombinasikan dengan search, agar tetap efisien untuk data siswa dalam jumlah besar.
- Tombol **Add** → Form Input kosong.
- Tap baris siswa → **Halaman View/Detail** (4.7.4).
- Paging: tombol "Muat Lebih Banyak" (bukan paging bernomor), konsisten dengan pola mobile di 4.1.1.

#### 4.7.4 Halaman View/Detail Siswa (Admin)
- Menampilkan foto (besar), nama, tag jenis kelamin di header, lalu **seluruh atribut siswa** dalam daftar label–value:
  NIS, NISN, Tempat Lahir, Tanggal Lahir, Jenis Kelamin, Agama, Kewarganegaraan, Anak Ke-, Jumlah Saudara Kandung, No. Telepon/HP, Email, Alamat, Nama Ayah, Nama Ibu, Pekerjaan Ayah, Pekerjaan Ibu, Hobi, Riwayat Pendidikan Formal, Riwayat Pendidikan Informal.
- Tombol **Edit** → Form Input terisi data existing; simpan → kembali ke halaman View dengan data terbarui.
- Tombol **Hapus** → dialog konfirmasi → konfirmasi → data terhapus, kembali ke List.
- Tombol kembali (back) di header → ke List.

#### 4.7.5 Form Input (Add & Edit)
- Field wajib: Foto, Nama, Tempat Lahir, Tanggal Lahir, Jenis Kelamin.
- Field opsional (dapat disembunyikan/expand di bawah toggle "Data Tambahan"): sama seperti daftar field tambahan di 4.5.
- Simpan dari Add → kembali ke List (data baru muncul di atas).
- Simpan dari Edit (dibuka dari View) → kembali ke halaman View siswa tersebut dengan data terbarui.
- Tombol Batal → kembali tanpa menyimpan perubahan.

### 4.6 Logout

- Tombol Logout tersedia di halaman-halaman back office (Dashboard, Grid, Form).
- Saat diklik: sistem menampilkan **dialog konfirmasi** berisi pertanyaan "Apakah Anda yakin ingin keluar dari sistem?" dengan dua pilihan aksi: **Ya** dan **Tidak**.
  - Klik **Tidak** → dialog ditutup, tetap di halaman semula, session tidak berubah.
  - Klik **Ya** → sistem menghapus/membersihkan record session dari tabel sesi, lalu redirect kembali ke halaman Login.

---

## 5. Model Data (Entitas Awal)

### Tabel `Siswa`
| Field | Tipe | Keterangan |
|---|---|---|
| ID Siswa | Numeric/GUID | Primary Key |
| Foto | Image/Blob | Wajib |
| Nama | Character | Wajib |
| Tempat Lahir | Character | Wajib. Kota kelahiran, dipakai untuk filter |
| Tanggal Lahir | Date | Wajib. Dipakai untuk filter (date range picker: dari–sampai) |
| Jenis Kelamin | Enum (L/P) | Wajib. Dipakai untuk filter |
| NIS | Character | Opsional |
| NISN | Character | Opsional |
| Agama | Character/Enum | Opsional |
| Kewarganegaraan | Character | Opsional |
| Anak Ke- | Numeric | Opsional |
| Jumlah Saudara Kandung | Numeric | Opsional |
| No. Telepon/HP | Character | Opsional |
| Email | Character | Opsional |
| Alamat | Character | Opsional |
| Nama Ayah | Character | Opsional |
| Nama Ibu | Character | Opsional |
| Pekerjaan Ayah | Character | Opsional |
| Pekerjaan Ibu | Character | Opsional |
| Hobi | Character | Opsional |
| Riwayat Pendidikan Formal | Character/Longtext | Opsional |
| Riwayat Pendidikan Informal | Character/Longtext | Opsional |

### Tabel `Admin` (Akun)
| Field | Tipe | Keterangan |
|---|---|---|
| ID Admin | Numeric/GUID | Primary Key |
| Username | Character | Unique |
| Password | Character | Disimpan ter-hash |
| Nama | Character | Ditampilkan di halaman Welcome |

> Catatan: Untuk v1, hanya **1 akun admin** (single admin), tidak ada fitur registrasi/tambah admin baru. Akun ini bisa di-seed langsung ke database.

### Tabel `Session` (custom, pengganti GAM)
| Field | Tipe | Keterangan |
|---|---|---|
| Session ID/Token | Character/GUID | Primary Key |
| ID Admin | Numeric/GUID | Foreign Key ke Admin |
| Waktu Login | DateTime | |
| Status/Expired | Boolean/DateTime | Untuk validasi sesi masih aktif |

---

## 6. Desain & UX

- **Skema warna:** Biru & putih, gaya clean/minimalis (khas web korporat/edukasi).
- **Landing page:** tampilan card grid, responsif, foto siswa menonjol.
- **Back office:** mengikuti pola standar admin panel — sidebar kiri untuk navigasi, area konten grid/form di kanan.
- URL landing page dan URL login **dipisahkan** secara sengaja, sehingga URL login tidak terekspos/ditautkan dari halaman publik.

---

## 7. Kebutuhan Non-Fungsional

- **Keamanan:** Password admin tidak boleh disimpan dalam plain text (minimal hashing). Validasi session pada setiap akses halaman back office.
- **Performa:** Paging wajib diterapkan baik di landing page (20/halaman) maupun grid back office, agar tidak memuat seluruh data sekaligus.
- **Platform:** Dibangun menggunakan GeneXus Next (CLI), dengan integrasi Claude sebagai bagian dari proses development/challenge.

---

## 8. Alur Pengguna Utama (User Flow)

**Pengunjung publik:**
1. Buka landing page → lihat grid card siswa (20 per halaman).
2. Terapkan filter (kota lahir / tanggal lahir / jenis kelamin) → hasil ter-filter, paging reset ke halaman 1.
3. Navigasi antar halaman via paging.

**Admin:**
1. Buka URL login (khusus, tidak dipublikasikan) → input username & password.
2. Login berhasil → session tersimpan → redirect ke halaman **Dashboard** (tampil nama admin).
3. Klik menu "Manajemen Siswa" di sidebar (di bawah menu Dashboard) → tampil Grid data siswa.
4. (Opsional) Ketik kata kunci di field pencarian → grid ter-filter lintas kolom, paging reset ke halaman 1.
5. Klik "Add" → tampil Form Input Siswa (kosong) → isi data → simpan → kembali ke Grid (data baru muncul).
6. Klik "Edit" pada salah satu baris → tampil Form Input Siswa (terisi data existing) → ubah data → simpan → kembali ke Grid (data terupdate).
7. Klik "Delete" pada salah satu baris → muncul konfirmasi → konfirmasi hapus → data terhapus dari Grid.
8. Klik "Logout" → muncul dialog konfirmasi (Ya/Tidak) → klik "Ya" → session dibersihkan → redirect ke halaman Login.

---

## 9. Metrik Keberhasilan (untuk konteks challenge)

- Landing page berhasil menampilkan data siswa dengan filter & paging berfungsi.
- Login/logout custom (tanpa GAM) berjalan aman dan sesi tervalidasi dengan benar.
- Admin dapat berhasil menambah (Add), mengubah (Edit), dan menghapus (Delete) data siswa melalui Grid & Form, dan perubahan langsung tercermin di Grid & landing page.
- Aplikasi berjalan sesuai skema warna biru-putih yang diminta.

---

## 10. Status
Semua poin klarifikasi awal sudah dikonfirmasi dan tercermin di dokumen ini (Edit/Delete masuk v1, filter tanggal lahir pakai date range picker, single admin). PRD ini siap dijadikan acuan development.
