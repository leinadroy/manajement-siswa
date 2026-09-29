// API autentikasi kustom: login, logout, me.
const express = require('express');
const auth = require('../auth');

const router = express.Router();

// Pembatas percobaan login sederhana (per IP, in-memory).
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
function tooMany(ip) {
  const now = Date.now();
  const a = (attempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  attempts.set(ip, a);
  return a.length >= MAX_ATTEMPTS;
}

router.post('/login', (req, res) => {
  const ip = req.ip;
  if (tooMany(ip)) return res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' });
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  const result = auth.login(username, password);
  if (!result) {
    attempts.get(ip).push(Date.now());
    return res.status(401).json({ error: 'Username atau password salah.' });
  }
  attempts.delete(ip);
  auth.setCookie(res, result.token, req);
  res.json({ admin: { nama: result.admin.nama, username: result.admin.username } });
});

router.post('/logout', (req, res) => {
  auth.logout(req.sessionToken);
  auth.clearCookie(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.admin) return res.status(401).json({ error: 'Belum login.' });
  res.json({ admin: { nama: req.admin.nama, username: req.admin.username } });
});

module.exports = router;
