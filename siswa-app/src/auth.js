// Autentikasi kustom berbasis tabel session (pengganti GAM — PRD 4.2 & 7).
const { db } = require('./db');
const { verifyPassword, newToken } = require('./crypto');

const COOKIE = 'sid';
const TTL_MS = Number(process.env.SESSION_TTL_MINUTES || 480) * 60 * 1000; // default 8 jam

const nowIso = () => new Date().toISOString();
const expIso = () => new Date(Date.now() + TTL_MS).toISOString();

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function setCookie(res, token, req) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(TTL_MS / 1000)}${secure ? '; Secure' : ''}`);
}
function clearCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function login(username, password) {
  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(String(username || '').trim());
  if (!admin || !verifyPassword(password, admin.password_hash)) return null;
  const token = newToken();
  db.prepare('INSERT INTO session (token, admin_id, login_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(token, admin.id, nowIso(), expIso());
  // Bersihkan sesi yang sudah kedaluwarsa.
  db.prepare('DELETE FROM session WHERE expires_at <= ?').run(nowIso());
  return { token, admin: { id: admin.id, nama: admin.nama, username: admin.username } };
}

function logout(token) {
  if (token) db.prepare('DELETE FROM session WHERE token = ?').run(token);
}

// Validasi sesi: token harus ada di tabel session dan belum kedaluwarsa. Sliding expiry.
function validate(token) {
  if (!token) return null;
  const row = db.prepare(`SELECT s.token, s.expires_at, a.id, a.nama, a.username
    FROM session s JOIN admin a ON a.id = s.admin_id WHERE s.token = ?`).get(token);
  if (!row) return null;
  if (row.expires_at <= nowIso()) {
    db.prepare('DELETE FROM session WHERE token = ?').run(token);
    return null;
  }
  db.prepare('UPDATE session SET expires_at = ? WHERE token = ?').run(expIso(), token);
  return { id: row.id, nama: row.nama, username: row.username };
}

// Middleware: tempel req.admin bila sesi valid.
function attachSession(req, _res, next) {
  req.sessionToken = parseCookies(req.headers.cookie)[COOKIE] || null;
  req.admin = validate(req.sessionToken);
  next();
}

function requireApiAuth(req, res, next) {
  if (!req.admin) return res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.' });
  next();
}

module.exports = { login, logout, validate, attachSession, requireApiAuth, setCookie, clearCookie };
