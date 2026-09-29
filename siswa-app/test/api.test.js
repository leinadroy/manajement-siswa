// Uji otomatis API: npm test  (memakai database sementara, tidak menyentuh data/)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'siswa-test-'));
process.env.DATA_DIR = tmp;
process.env.DB_FILE = path.join(tmp, 'test.db');
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.SEED_SISWA = '45';

const { app, ADMIN_PATH } = require('../server');
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

let base, server, cookie = '';
test.before(() => new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
test.after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

async function call(method, url, body, opts = {}) {
  const res = await fetch(base + url, {
    method, redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(opts.noCookie ? {} : { Cookie: cookie }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get('set-cookie');
  if (set && !opts.noCookie) cookie = set.split(';')[0];
  let data = null; try { data = await res.json(); } catch (_) {}
  return { status: res.status, data, headers: res.headers };
}

test('landing publik: paging 20 & field terbatas', async () => {
  const r = await call('GET', '/api/public/siswa?size=20&page=3');
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 45);
  assert.equal(r.data.pages, 3);
  assert.equal(r.data.items.length, 5);
  assert.equal(r.data.items[0].nis, undefined, 'field privat tidak boleh bocor ke publik');
});

test('filter kombinasi AND + rentang tanggal', async () => {
  const r = await call('GET', '/api/public/siswa?kota=Bandung&jk=P&size=100');
  assert.ok(r.data.items.every((s) => s.tempatLahir === 'Bandung' && s.jenisKelamin === 'P'));
  const d = await call('GET', '/api/public/siswa?dari=2015-01-01&sampai=2015-12-31&size=100');
  assert.ok(d.data.total > 0);
  assert.ok(d.data.items.every((s) => s.tanggalLahir >= '2015-01-01' && s.tanggalLahir <= '2015-12-31'));
});

test('API admin & halaman back office menolak tanpa sesi', async () => {
  assert.equal((await call('GET', '/api/admin/siswa', null, { noCookie: true })).status, 401);
  const page = await call('GET', ADMIN_PATH + '/siswa', null, { noCookie: true });
  assert.equal(page.status, 302);
  assert.equal(page.headers.get('location'), ADMIN_PATH + '/login');
});

test('login salah ditolak, login benar membuat sesi', async () => {
  assert.equal((await call('POST', '/api/auth/login', { username: 'admin', password: 'x' }, { noCookie: true })).status, 401);
  const r = await call('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  assert.equal(r.status, 200);
  assert.equal(r.data.admin.nama, 'Budi Santoso');
  assert.match(cookie, /^sid=[0-9a-f]{64}$/);
  assert.equal((await call('GET', ADMIN_PATH + '/siswa')).status, 200);
});

test('search grid lintas kolom (nama, kota, tanggal, J.K.)', async () => {
  const kota = await call('GET', '/api/admin/siswa?q=BANDUNG&size=100');
  assert.ok(kota.data.total > 0 && kota.data.items.every((s) => s.tempatLahir === 'Bandung'));
  const jk = await call('GET', '/api/admin/siswa?q=perempuan&size=100');
  assert.ok(jk.data.items.every((s) => s.jenisKelamin === 'P'));
  const tgl = await call('GET', '/api/admin/siswa?q=apr%202014&size=100');
  assert.ok(tgl.data.total > 0 && tgl.data.items.every((s) => s.tanggalLahir.startsWith('2014-04')));
});

test('CRUD: validasi, tambah, ubah, hapus', async () => {
  const bad = await call('POST', '/api/admin/siswa', { nama: '' });
  assert.equal(bad.status, 422);
  assert.deepEqual(Object.keys(bad.data.errors).sort(), ['foto', 'jenisKelamin', 'nama', 'tanggalLahir', 'tempatLahir']);

  const add = await call('POST', '/api/admin/siswa', { nama: 'Uji Coba', tempatLahir: 'Bogor', tanggalLahir: '2016-01-02', jenisKelamin: 'L', anakKe: '1', email: 'uji@contoh.id', fotoData: PNG });
  assert.equal(add.status, 201);
  const id = add.data.id;
  assert.equal(add.data.anakKe, 1);
  assert.ok(fs.existsSync(path.join(process.env.UPLOAD_DIR, path.basename(add.data.foto))));

  const top = await call('GET', '/api/admin/siswa?size=1');
  assert.equal(top.data.items[0].id, id, 'data baru muncul di atas');

  const upd = await call('PUT', `/api/admin/siswa/${id}`, { nama: 'Uji Ubah', tempatLahir: 'Bogor', tanggalLahir: '2016-01-02', jenisKelamin: 'P' });
  assert.equal(upd.status, 200);
  assert.equal(upd.data.nama, 'Uji Ubah');
  assert.equal(upd.data.foto, add.data.foto, 'foto lama dipertahankan');
  assert.equal(upd.data.email, null);

  const pub = await call('GET', `/api/public/siswa/${id}`);
  assert.equal(pub.data.nama, 'Uji Ubah', 'perubahan tercermin di landing');

  assert.equal((await call('DELETE', `/api/admin/siswa/${id}`)).status, 200);
  assert.equal((await call('GET', `/api/public/siswa/${id}`)).status, 404);
});

test('logout menghapus sesi', async () => {
  const old = cookie;
  assert.equal((await call('POST', '/api/auth/logout')).status, 200);
  cookie = old; // pakai token lama
  assert.equal((await call('GET', '/api/auth/me')).status, 401);
});
