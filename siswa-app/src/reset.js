// Hapus database & foto lalu buat ulang dengan data contoh: npm run reset-db
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const uploadDir = process.env.UPLOAD_DIR || path.join(root, 'uploads');
for (const f of ['siswa.db', 'siswa.db-wal', 'siswa.db-shm']) fs.rmSync(path.join(dataDir, f), { force: true });
if (fs.existsSync(uploadDir)) for (const f of fs.readdirSync(uploadDir)) if (f !== '.gitkeep') fs.rmSync(path.join(uploadDir, f), { force: true });
require('./db');
console.log('Database direset.');
