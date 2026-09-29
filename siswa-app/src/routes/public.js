// API publik (read-only) — landing page & detail siswa.
const express = require('express');
const siswa = require('../siswa');

const router = express.Router();

router.get('/siswa', (req, res) => {
  const q = { ...req.query };
  q.searchScope = 'public';
  res.json(siswa.list(q, { full: false, order: 'nama' }));
});

router.get('/siswa/:id', (req, res) => {
  const item = siswa.get(req.params.id, false);
  if (!item) return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
  res.json(item);
});

router.get('/kota', (_req, res) => res.json(siswa.cities()));

module.exports = router;
