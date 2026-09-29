// Koneksi database, skema, dan seed data awal (PRD bagian 5).
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { hashPassword } = require('./crypto');
const { buildSearchText } = require('./format');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'siswa.db');

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(DB_FILE);
// WAL lebih cepat, tapi tidak didukung di sebagian file system (folder jaringan/VM) -> fallback.
try { db.exec('PRAGMA journal_mode = WAL;'); } catch (_) { db.exec('PRAGMA journal_mode = DELETE;'); }
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS admin (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nama          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
  token      TEXT PRIMARY KEY,
  admin_id   INTEGER NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  login_at   TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS siswa (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  foto             TEXT,
  nama             TEXT NOT NULL,
  tempat_lahir     TEXT NOT NULL,
  tanggal_lahir    TEXT NOT NULL,
  jenis_kelamin    TEXT NOT NULL CHECK (jenis_kelamin IN ('L','P')),
  nis              TEXT,
  nisn             TEXT,
  agama            TEXT,
  kewarganegaraan  TEXT,
  anak_ke          INTEGER,
  jumlah_saudara   INTEGER,
  telepon          TEXT,
  email            TEXT,
  alamat           TEXT,
  nama_ayah        TEXT,
  nama_ibu         TEXT,
  pekerjaan_ayah   TEXT,
  pekerjaan_ibu    TEXT,
  hobi             TEXT,
  riwayat_formal   TEXT,
  riwayat_informal TEXT,
  search_text      TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_siswa_kota    ON siswa(tempat_lahir);
CREATE INDEX IF NOT EXISTS idx_siswa_tanggal ON siswa(tanggal_lahir);
CREATE INDEX IF NOT EXISTS idx_siswa_jk      ON siswa(jenis_kelamin);
CREATE INDEX IF NOT EXISTS idx_siswa_nama    ON siswa(nama);
CREATE INDEX IF NOT EXISTS idx_session_exp   ON session(expires_at);
`);

// ---------- Seed ----------
const MALE = ['Andi','Budi','Rizki','Fajar','Bayu','Dimas','Agus','Hendra','Yusuf','Fadli','Arya','Wahyu','Rian','Doni','Eko'];
const FEMALE = ['Siti','Putri','Ayu','Rina','Dewi','Fitri','Wulan','Nadia','Indah','Sri','Maya','Lestari','Ratna','Yuni','Intan'];
const LAST = ['Saputra','Wijaya','Kurniawan','Pratama','Santoso','Hidayat','Nugroho','Setiawan','Firmansyah','Susanto','Permadi','Gunawan','Yulianto','Rahmawati','Anggraini'];
const CITIES = ['Jakarta','Surabaya','Bandung','Medan','Semarang','Makassar','Palembang','Yogyakarta','Malang','Denpasar','Bekasi','Depok'];
const RELIGIONS = ['Islam','Kristen','Katolik','Hindu','Buddha','Konghucu'];
const JOBS = ['Wiraswasta','PNS','Guru','Petani','Karyawan Swasta','Dokter','Pedagang','Sopir','Nelayan','TNI/Polri'];
const HOBBIES = ['Membaca','Sepak Bola','Menggambar','Musik','Berenang','Bulu Tangkis','Memasak','Fotografi','Menari','Catur'];
const SCHOOLS = ['SD Negeri 1','SD Negeri 2','SD Islam Terpadu','SD Kristen','MI Nurul Huda'];
const COURSES = ['Kursus Bahasa Inggris','Les Musik','Pramuka','Kursus Komputer','Sanggar Tari',null];

const pad = (n) => String(n).padStart(2, '0');

// Foto avatar sederhana (SVG inisial) agar data contoh memenuhi aturan "foto wajib".
function avatarSvg(nama, i) {
  const initials = nama.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const shades = ['#c9d6ea', '#b7c7e0', '#d6dfee', '#a9bcd9'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
<rect width="400" height="400" fill="${shades[i % shades.length]}"/>
<circle cx="200" cy="160" r="72" fill="#8fa3c2"/>
<rect x="88" y="252" width="224" height="148" rx="0" fill="#8fa3c2"/>
<text x="200" y="176" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff" text-anchor="middle">${initials}</text>
</svg>`;
}

function seed() {
  const adminCount = db.prepare('SELECT COUNT(*) AS n FROM admin').get().n;
  if (adminCount === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const nama = process.env.ADMIN_NAME || 'Budi Santoso';
    db.prepare('INSERT INTO admin (username, password_hash, nama) VALUES (?, ?, ?)')
      .run(username, hashPassword(password), nama);
    console.log(`[seed] Akun admin dibuat: ${username}`);
  }

  const siswaCount = db.prepare('SELECT COUNT(*) AS n FROM siswa').get().n;
  const n = Number(process.env.SEED_SISWA ?? 60);
  if (siswaCount === 0 && n > 0) {
    const insert = db.prepare(`INSERT INTO siswa
      (foto, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, nis, nisn, agama, kewarganegaraan,
       anak_ke, jumlah_saudara, telepon, email, alamat, nama_ayah, nama_ibu, pekerjaan_ayah,
       pekerjaan_ibu, hobi, riwayat_formal, riwayat_informal, search_text)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    db.exec('BEGIN');
    for (let i = 1; i <= n; i++) {
      const jk = i % 2 === 0 ? 'P' : 'L';
      const first = jk === 'L' ? MALE[i % MALE.length] : FEMALE[i % FEMALE.length];
      const last = LAST[(i * 3) % LAST.length];
      const nama = `${first} ${last}`;
      const kota = CITIES[i % CITIES.length];
      const tgl = `${2013 + (i % 5)}-${pad(1 + ((i * 3) % 12))}-${pad(1 + ((i * 7) % 28))}`;
      const file = `seed-${i}.svg`;
      fs.writeFileSync(path.join(UPLOAD_DIR, file), avatarSvg(nama, i));
      insert.run(
        file, nama, kota, tgl, jk,
        `10${2200 + i}`, `00${31000 + i * 7}`, RELIGIONS[i % RELIGIONS.length], 'Indonesia',
        1 + (i % 4), i % 3, `08${String(1100000000 + i * 137).slice(0, 10)}`,
        `${first}.${last}`.toLowerCase() + '@contoh.sch.id',
        `Jl. Mawar No. ${i + 1}, ${kota}`,
        `${MALE[(i + 2) % MALE.length]} ${last}`, `${FEMALE[(i + 5) % FEMALE.length]} ${last}`,
        JOBS[i % JOBS.length], JOBS[(i + 3) % JOBS.length], HOBBIES[i % HOBBIES.length],
        SCHOOLS[i % SCHOOLS.length], COURSES[i % COURSES.length],
        buildSearchText({ nama, tempat_lahir: kota, tanggal_lahir: tgl, jenis_kelamin: jk })
      );
    }
    db.exec('COMMIT');
    console.log(`[seed] ${n} data siswa contoh dibuat`);
  }
}

seed();

module.exports = { db, UPLOAD_DIR, DB_FILE, DATA_DIR };
