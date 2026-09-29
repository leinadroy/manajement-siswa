// Sistem Manajemen Data Siswa — entry point.
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { UPLOAD_DIR } = require('./src/db');
const auth = require('./src/auth');

const PORT = Number(process.env.PORT || 4000);
// URL back office sengaja terpisah & tidak ditautkan dari halaman publik (PRD 4.2 / 6).
const ADMIN_PATH = '/' + String(process.env.ADMIN_PATH || 'backoffice').replace(/^\/+|\/+$/g, '');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(express.json({ limit: '6mb' }));

// Aset statis & foto — cache 1 jam di production, tapi dimatikan saat development
// (NODE_ENV != 'production') supaya perubahan JS/CSS langsung kelihatan tanpa hard refresh.
const isDev = process.env.NODE_ENV !== 'production';
app.use('/assets', express.static(path.join(__dirname, 'public'), { index: false, maxAge: isDev ? 0 : '1h' }));
app.use('/uploads', express.static(UPLOAD_DIR, { index: false, maxAge: '1d' }));

// ---------- API ----------
app.use('/api', auth.attachSession);
app.use('/api/public', require('./src/routes/public'));
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

// ---------- Halaman ----------
const VIEWS = path.join(__dirname, 'views');
function sendView(res, name) {
  const html = fs.readFileSync(path.join(VIEWS, name), 'utf8').replaceAll('%ADMIN_PATH%', ADMIN_PATH);
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(html);
}

// Publik
app.get('/', (_req, res) => sendView(res, 'index.html'));
app.get('/siswa/:id', (_req, res) => sendView(res, 'siswa.html'));

// Back office desktop — sesi divalidasi di setiap akses halaman (PRD 7).
app.get(`${ADMIN_PATH}/login`, auth.attachSession, (req, res) => {
  if (req.admin) return res.redirect(ADMIN_PATH);
  sendView(res, 'admin.html');
});
const guardPage = (req, res, next) => {
  auth.attachSession(req, res, () => {
    if (!req.admin) return res.redirect(`${ADMIN_PATH}/login`);
    next();
  });
};
app.get([ADMIN_PATH, `${ADMIN_PATH}/siswa`, `${ADMIN_PATH}/siswa/baru`, `${ADMIN_PATH}/siswa/:id/edit`, `${ADMIN_PATH}/kelas`],
  guardPage, (_req, res) => sendView(res, 'admin.html'));

// Aplikasi mobile admin (PRD 4.7) — satu halaman; view login/app ditentukan oleh /api/auth/me.
app.get(`${ADMIN_PATH}/m`, (_req, res) => sendView(res, 'mobile.html'));
app.get(`${ADMIN_PATH}/m/manifest.webmanifest`, (_req, res) => {
  res.type('application/manifest+json').send(JSON.stringify({
    name: 'Manajemen Siswa', short_name: 'Siswa', start_url: `${ADMIN_PATH}/m`, scope: `${ADMIN_PATH}/m`,
    display: 'standalone', background_color: '#ffffff', theme_color: '#1f5bd6',
    icons: [{ src: '/assets/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }));
});

app.use((_req, res) => res.status(404).type('html').send(
  '<!doctype html><meta charset="utf-8"><title>404</title><link rel="stylesheet" href="/assets/css/app.css">' +
  '<div style="padding:40px"><h1>404</h1><p>Halaman tidak ditemukan.</p><a href="/">Kembali ke Direktori Siswa</a></div>'));

app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Terjadi kesalahan pada server.' : err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Direktori Siswa  : http://localhost:${PORT}/`);
    console.log(`Back office      : http://localhost:${PORT}${ADMIN_PATH}/login`);
    console.log(`Mobile admin app : http://localhost:${PORT}${ADMIN_PATH}/m`);
  });
}

module.exports = { app, ADMIN_PATH };
