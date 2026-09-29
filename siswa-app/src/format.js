// Format tanggal & teks pencarian — dipakai server (dan dicerminkan di public/js/common.js).
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function formatDate(iso) {
  if (!iso) return '-';
  const [y, m, d] = String(iso).split('-');
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

const genderLabel = (jk) => (jk === 'L' ? 'Laki-laki' : jk === 'P' ? 'Perempuan' : '-');

// Teks gabungan untuk pencarian lintas kolom yang tampil di grid:
// nama, tempat lahir, tanggal lahir (ISO + label), jenis kelamin (kode + label).
function buildSearchText(s) {
  return [
    s.nama, s.tempat_lahir, s.tanggal_lahir, formatDate(s.tanggal_lahir),
    s.jenis_kelamin, genderLabel(s.jenis_kelamin),
  ].join(' | ').toLowerCase();
}

module.exports = { MONTHS, formatDate, genderLabel, buildSearchText };
