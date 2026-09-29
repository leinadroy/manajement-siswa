// Logika data siswa: list + filter + search + paging, validasi, simpan foto.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, UPLOAD_DIR } = require('./db');
const { buildSearchText } = require('./format');

const REQUIRED = ['nama', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin'];
const OPTIONAL_TEXT = ['nis', 'nisn', 'agama', 'kewarganegaraan', 'telepon', 'email', 'alamat',
  'nama_ayah', 'nama_ibu', 'pekerjaan_ayah', 'pekerjaan_ibu', 'hobi', 'riwayat_formal', 'riwayat_informal'];
const OPTIONAL_INT = ['anak_ke', 'jumlah_saudara'];
const ALL_FIELDS = [...REQUIRED, ...OPTIONAL_TEXT, ...OPTIONAL_INT];
const PUBLIC_COLS = 'id, foto, nama, tempat_lahir, tanggal_lahir, jenis_kelamin';
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function fotoUrl(foto) { return foto ? `/uploads/${encodeURIComponent(foto)}` : null; }

function toApi(row, full) {
  if (!row) return null;
  const out = {
    id: row.id, foto: fotoUrl(row.foto), nama: row.nama, tempatLahir: row.tempat_lahir,
    tanggalLahir: row.tanggal_lahir, jenisKelamin: row.jenis_kelamin,
  };
  if (full) {
    Object.assign(out, {
      nis: row.nis, nisn: row.nisn, agama: row.agama, kewarganegaraan: row.kewarganegaraan,
      anakKe: row.anak_ke, jumlahSaudara: row.jumlah_saudara, telepon: row.telepon, email: row.email,
      alamat: row.alamat, namaAyah: row.nama_ayah, namaIbu: row.nama_ibu,
      pekerjaanAyah: row.pekerjaan_ayah, pekerjaanIbu: row.pekerjaan_ibu, hobi: row.hobi,
      riwayatFormal: row.riwayat_formal, riwayatInformal: row.riwayat_informal,
      createdAt: row.created_at, updatedAt: row.updated_at,
    });
  }
  return out;
}

// camelCase (API) -> snake_case (DB)
const API_TO_DB = {
  nama: 'nama', tempatLahir: 'tempat_lahir', tanggalLahir: 'tanggal_lahir', jenisKelamin: 'jenis_kelamin',
  nis: 'nis', nisn: 'nisn', agama: 'agama', kewarganegaraan: 'kewarganegaraan', anakKe: 'anak_ke',
  jumlahSaudara: 'jumlah_saudara', telepon: 'telepon', email: 'email', alamat: 'alamat',
  namaAyah: 'nama_ayah', namaIbu: 'nama_ibu', pekerjaanAyah: 'pekerjaan_ayah', pekerjaanIbu: 'pekerjaan_ibu',
  hobi: 'hobi', riwayatFormal: 'riwayat_formal', riwayatInformal: 'riwayat_informal',
};

function clampInt(v, def, min, max) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

// Bangun WHERE untuk filter (AND) + search (substring, tidak case-sensitive).
function buildWhere(q) {
  const where = [];
  const params = [];
  if (q.kota) { where.push('tempat_lahir = ?'); params.push(String(q.kota)); }
  if (q.dari && ISO_DATE.test(q.dari)) { where.push('tanggal_lahir >= ?'); params.push(q.dari); }
  if (q.sampai && ISO_DATE.test(q.sampai)) { where.push('tanggal_lahir <= ?'); params.push(q.sampai); }
  if (q.jk === 'L' || q.jk === 'P') { where.push('jenis_kelamin = ?'); params.push(q.jk); }
  const term = String(q.q || '').trim().toLowerCase();
  if (term) {
    const like = '%' + term.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
    if (q.searchScope === 'public') {
      // Mobile publik: cari nama atau tempat lahir (PRD 4.1.1)
      where.push("(lower(nama) LIKE ? ESCAPE '\\' OR lower(tempat_lahir) LIKE ? ESCAPE '\\')");
      params.push(like, like);
    } else {
      where.push("search_text LIKE ? ESCAPE '\\'");
      params.push(like);
    }
  }
  return { sql: where.length ? 'WHERE ' + where.join(' AND ') : '', params };
}

function list(q, { full = false, order = 'nama' } = {}) {
  const size = clampInt(q.size, 20, 1, 300);
  const { sql, params } = buildWhere(q);
  const total = db.prepare(`SELECT COUNT(*) AS n FROM siswa ${sql}`).get(...params).n;
  const totalAll = db.prepare('SELECT COUNT(*) AS n FROM siswa').get().n;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = clampInt(q.page, 1, 1, pages);
  const orderBy = order === 'newest' ? 'id DESC' : 'nama COLLATE NOCASE ASC, id ASC';
  const rows = db.prepare(`SELECT ${full ? '*' : PUBLIC_COLS} FROM siswa ${sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, size, (page - 1) * size);
  return { items: rows.map((r) => toApi(r, full)), total, totalAll, page, pages, size };
}

// Semua data yang cocok (untuk cetak PDF), dibatasi agar tetap ringan.
const PRINT_LIMIT = 2000;
function listForPrint(q) {
  const { sql, params } = buildWhere({ ...q, searchScope: 'admin' });
  const total = db.prepare(`SELECT COUNT(*) AS n FROM siswa ${sql}`).get(...params).n;
  const rows = db.prepare(`SELECT * FROM siswa ${sql} ORDER BY nama COLLATE NOCASE ASC, id ASC LIMIT ?`).all(...params, PRINT_LIMIT);
  return { items: rows.map((r) => toApi(r, true)), total, limit: PRINT_LIMIT, truncated: total > PRINT_LIMIT };
}

function get(id, full) {
  const row = db.prepare(`SELECT ${full ? '*' : PUBLIC_COLS} FROM siswa WHERE id = ?`).get(Number(id));
  return toApi(row, full);
}

function cities() {
  return db.prepare('SELECT DISTINCT tempat_lahir AS k FROM siswa ORDER BY tempat_lahir COLLATE NOCASE').all().map((r) => r.k);
}

function count() { return db.prepare('SELECT COUNT(*) AS n FROM siswa').get().n; }
function countByGender(jk) { return db.prepare('SELECT COUNT(*) AS n FROM siswa WHERE jenis_kelamin = ?').get(jk).n; }

// ---------- Validasi & simpan ----------
function normalize(body) {
  const data = {};
  for (const [apiKey, col] of Object.entries(API_TO_DB)) {
    let v = body[apiKey];
    if (v === undefined || v === null) v = '';
    v = String(v).trim();
    if (OPTIONAL_INT.includes(col)) data[col] = v === '' ? null : parseInt(v, 10);
    else if (OPTIONAL_TEXT.includes(col)) data[col] = v === '' ? null : v.slice(0, 2000);
    else data[col] = v.slice(0, 200);
  }
  return data;
}

function validate(data, { hasPhoto }) {
  const errors = {};
  if (!hasPhoto) errors.foto = 'Foto wajib diunggah.';
  if (!data.nama) errors.nama = 'Nama wajib diisi.';
  if (!data.tempat_lahir) errors.tempatLahir = 'Tempat lahir wajib diisi.';
  if (!data.tanggal_lahir || !ISO_DATE.test(data.tanggal_lahir) || Number.isNaN(Date.parse(data.tanggal_lahir))) {
    errors.tanggalLahir = 'Tanggal lahir wajib diisi dengan benar.';
  }
  if (data.jenis_kelamin !== 'L' && data.jenis_kelamin !== 'P') errors.jenisKelamin = 'Pilih jenis kelamin.';
  for (const col of OPTIONAL_INT) {
    if (data[col] !== null && (Number.isNaN(data[col]) || data[col] < 0 || data[col] > 99)) {
      errors[col === 'anak_ke' ? 'anakKe' : 'jumlahSaudara'] = 'Harus angka 0–99.';
    }
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Format email tidak valid.';
  return errors;
}

// Foto dikirim sebagai data URL (image/jpeg|png|webp). Disimpan ke uploads/.
function savePhoto(dataUrl) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) { const e = new Error('Format foto tidak didukung (gunakan JPG, PNG, atau WEBP).'); e.status = 400; throw e; }
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_PHOTO_BYTES) { const e = new Error('Ukuran foto maksimal 3 MB.'); e.status = 400; throw e; }
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const file = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, file), buf);
  return file;
}

function removePhoto(file) {
  if (!file) return;
  const p = path.join(UPLOAD_DIR, path.basename(file));
  fs.promises.unlink(p).catch(() => {});
}

function create(body) {
  const data = normalize(body);
  const errors = validate(data, { hasPhoto: !!body.fotoData });
  if (Object.keys(errors).length) return { errors };
  const foto = savePhoto(body.fotoData);
  const cols = ['foto', ...ALL_FIELDS, 'search_text'];
  const vals = [foto, ...ALL_FIELDS.map((c) => data[c]), buildSearchText(data)];
  const r = db.prepare(`INSERT INTO siswa (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...vals);
  return { item: get(r.lastInsertRowid, true) };
}

function update(id, body) {
  const existing = db.prepare('SELECT id, foto FROM siswa WHERE id = ?').get(Number(id));
  if (!existing) return { notFound: true };
  const data = normalize(body);
  const errors = validate(data, { hasPhoto: !!body.fotoData || !!existing.foto });
  if (Object.keys(errors).length) return { errors };
  let foto = existing.foto;
  if (body.fotoData) foto = savePhoto(body.fotoData);
  const sets = ['foto = ?', ...ALL_FIELDS.map((c) => `${c} = ?`), 'search_text = ?', "updated_at = datetime('now')"];
  db.prepare(`UPDATE siswa SET ${sets.join(', ')} WHERE id = ?`)
    .run(foto, ...ALL_FIELDS.map((c) => data[c]), buildSearchText(data), existing.id);
  if (foto !== existing.foto) removePhoto(existing.foto);
  return { item: get(existing.id, true) };
}

function remove(id) {
  const existing = db.prepare('SELECT id, foto FROM siswa WHERE id = ?').get(Number(id));
  if (!existing) return false;
  db.prepare('DELETE FROM siswa WHERE id = ?').run(existing.id);
  removePhoto(existing.foto);
  return true;
}

module.exports = { list, listForPrint, get, cities, count, countByGender, create, update, remove };
