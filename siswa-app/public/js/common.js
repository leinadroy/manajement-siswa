/* Utilitas bersama: API, format, ikon, dialog, foto. */
(function () {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const ADMIN_PATH = (document.querySelector('meta[name="admin-path"]') || {}).content || '/backoffice';

  function formatDate(iso) {
    if (!iso) return '-';
    const [y, m, d] = String(iso).split('-');
    return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
  }
  const genderLabel = (jk) => (jk === 'L' ? 'Laki-laki' : jk === 'P' ? 'Perempuan' : '-');
  const genderTag = (jk) => (jk === 'L' ? 'tag tag-neutral' : 'tag tag-accent');

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

  // Ikon Lucide (inline SVG)
  const P = {
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    back: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
    chevron: '<path d="M9 18l6-6-6-6"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  };
  const icon = (name, size = 14, extra = '') =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[name]}</svg>`;

  function photo(url, cls = '', placeholder = 'foto siswa') {
    return `<div class="photo ${cls}">${url ? `<img src="${esc(url)}" alt="" loading="lazy">` : `<span class="ph">${esc(placeholder)}</span>`}</div>`;
  }

  // Fetch JSON. 401 pada API admin => onUnauthorized.
  let onUnauthorized = null;
  async function api(url, opts = {}) {
    const init = { method: opts.method || 'GET', headers: { Accept: 'application/json' }, credentials: 'same-origin' };
    if (opts.body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
    let res;
    try { res = await fetch(url, init); } catch (e) { const err = new Error('Tidak dapat terhubung ke server.'); err.status = 0; throw err; }
    let data = null;
    try { data = await res.json(); } catch (_) { /* kosong */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Kesalahan ${res.status}`);
      err.status = res.status; err.data = data;
      if (res.status === 401 && onUnauthorized && !opts.skipAuthRedirect) onUnauthorized();
      throw err;
    }
    return data;
  }

  const qs = (obj) => {
    const p = new URLSearchParams();
    Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined && v !== 'ALL') p.set(k, v); });
    return p.toString();
  };

  function debounce(fn, ms = 250) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  // Dialog konfirmasi (Ya/Tidak, Hapus/Batal). Resolve true/false.
  function confirmDialog({ title, body, yes = 'Ya', no = 'Tidak' }) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'dialog-backdrop';
      wrap.innerHTML = `<div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-b">
        <div class="dialog-title" id="dlg-t">${esc(title)}</div>
        <div class="dialog-body" id="dlg-b">${esc(body)}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary" data-a="no">${esc(no)}</button>
          <button type="button" class="btn btn-primary" data-a="yes">${esc(yes)}</button>
        </div></div>`;
      const prev = document.activeElement;
      const close = (v) => { wrap.remove(); document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape') close(false); };
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap) return close(false);
        const a = e.target.closest('[data-a]'); if (a) close(a.dataset.a === 'yes');
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(wrap);
      wrap.querySelector('[data-a="no"]').focus();
    });
  }

  function toast(msg, ms = 2600) {
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  // Resize gambar ke JPEG maks 800px -> data URL (hemat penyimpanan).
  function readPhoto(file, max = 800) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Pilih berkas gambar (JPG/PNG/WEBP).'));
      if (file.size > 15 * 1024 * 1024) return reject(new Error('Ukuran gambar terlalu besar (maks 15 MB).'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak dapat dibaca.')); };
      img.src = url;
    });
  }

  // Definisi field form siswa (dipakai desktop & mobile).
  const RELIGIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'];
  const EXTRA_FIELDS = [
    { key: 'nis', label: 'NIS' },
    { key: 'nisn', label: 'NISN' },
    { key: 'agama', label: 'Agama', type: 'select', options: RELIGIONS },
    { key: 'kewarganegaraan', label: 'Kewarganegaraan' },
    { key: 'anakKe', label: 'Anak Ke-', type: 'number' },
    { key: 'jumlahSaudara', label: 'Jumlah Saudara Kandung', type: 'number' },
    { key: 'telepon', label: 'No. Telepon/HP', type: 'tel' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'alamat', label: 'Alamat', type: 'textarea', wide: true },
    { key: 'namaAyah', label: 'Nama Ayah' },
    { key: 'namaIbu', label: 'Nama Ibu' },
    { key: 'pekerjaanAyah', label: 'Pekerjaan Ayah' },
    { key: 'pekerjaanIbu', label: 'Pekerjaan Ibu' },
    { key: 'hobi', label: 'Hobi' },
    { key: 'riwayatFormal', label: 'Riwayat Pendidikan Formal', wide: true },
    { key: 'riwayatInformal', label: 'Riwayat Pendidikan Informal', wide: true },
  ];

  // Semua atribut untuk halaman View/Detail admin (PRD 4.7.4).
  function detailRows(s) {
    const v = (x) => (x === null || x === undefined || x === '' ? '-' : String(x));
    return [
      ['NIS', v(s.nis)], ['NISN', v(s.nisn)], ['Tempat Lahir', v(s.tempatLahir)],
      ['Tanggal Lahir', formatDate(s.tanggalLahir)], ['Jenis Kelamin', genderLabel(s.jenisKelamin)],
      ['Agama', v(s.agama)], ['Kewarganegaraan', v(s.kewarganegaraan)], ['Anak Ke-', v(s.anakKe)],
      ['Jumlah Saudara Kandung', v(s.jumlahSaudara)], ['No. Telepon/HP', v(s.telepon)], ['Email', v(s.email)],
      ['Alamat', v(s.alamat)], ['Nama Ayah', v(s.namaAyah)], ['Nama Ibu', v(s.namaIbu)],
      ['Pekerjaan Ayah', v(s.pekerjaanAyah)], ['Pekerjaan Ibu', v(s.pekerjaanIbu)], ['Hobi', v(s.hobi)],
      ['Riwayat Pendidikan Formal', v(s.riwayatFormal)], ['Riwayat Pendidikan Informal', v(s.riwayatInformal)],
    ];
  }
  const rowsHtml = (rows) => rows.map(([k, v]) => `<div class="d-row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join('');

  // Paging bernomor dengan elipsis.
  function pagerHtml(page, pages) {
    if (pages <= 1) return '';
    const set = new Set([1, pages, page - 1, page, page + 1]);
    if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
    if (page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach((n) => set.add(n));
    const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
    let out = `<button type="button" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Sebelumnya">&lsaquo;</button>`;
    let last = 0;
    nums.forEach((n) => {
      if (n - last > 1) out += '<span class="gap">…</span>';
      out += `<button type="button" data-page="${n}" ${n === page ? 'aria-current="page"' : ''}>${n}</button>`;
      last = n;
    });
    out += `<button type="button" data-page="${page + 1}" ${page === pages ? 'disabled' : ''} aria-label="Berikutnya">&rsaquo;</button>`;
    return out;
  }

  window.S = {
    ADMIN_PATH, MONTHS, formatDate, genderLabel, genderTag, esc, icon, photo, api, qs, debounce,
    confirmDialog, toast, readPhoto, RELIGIONS, EXTRA_FIELDS, detailRows, rowsHtml, pagerHtml,
    setUnauthorizedHandler: (fn) => { onUnauthorized = fn; },
  };
})();
