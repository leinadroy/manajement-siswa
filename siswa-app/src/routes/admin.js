// API back office (wajib sesi valid): CRUD data siswa.
const express = require('express');
const siswa = require('../siswa');
const { requireApiAuth } = require('../auth');

const router = express.Router();
router.use(requireApiAuth);

router.get('/stats', (_req, res) => res.json({ totalSiswa: siswa.count() }));
router.get('/kota', (_req, res) => res.json(siswa.cities()));

// Data untuk halaman cetak PDF: daftar (sesuai pencarian/filter) & biodata.
router.get('/cetak/siswa', (req, res) => res.json(siswa.listForPrint(req.query)));

router.get('/siswa', (req, res) => {
  const q = { ...req.query, searchScope: 'admin' };
  res.json(siswa.list(q, { full: false, order: 'newest' }));
});

router.get('/siswa/:id', (req, res) => {
  const item = siswa.get(req.params.id, true);
  if (!item) return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
  res.json(item);
});

router.post('/siswa', (req, res) => {
  const r = siswa.create(req.body || {});
  if (r.errors) return res.status(422).json({ error: 'Periksa kembali isian form.', errors: r.errors });
  res.status(201).json(r.item);
});

router.put('/siswa/:id', (req, res) => {
  const r = siswa.update(req.params.id, req.body || {});
  if (r.notFound) return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
  if (r.errors) return res.status(422).json({ error: 'Periksa kembali isian form.', errors: r.errors });
  res.json(r.item);
});

router.delete('/siswa/:id', (req, res) => {
  if (!siswa.remove(req.params.id)) return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
  res.json({ ok: true });
});

module.exports = router;
