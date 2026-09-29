/* Halaman cetak PDF modul Manajemen Siswa.
   {ADMIN_PATH}/cetak/siswa?q&kota&dari&sampai&jk  → daftar siswa sesuai pencarian/filter
   {ADMIN_PATH}/cetak/siswa/:id                     → biodata lengkap satu siswa
   Tambahkan ?auto=0 agar dialog cetak tidak terbuka otomatis. */
(function () {
  const { ADMIN_PATH, api, qs, esc, icon, photo, formatDate, genderLabel, genderTag, MONTHS } = S;
  const paper = document.getElementById('paper');
  const btnPrint = document.getElementById('print');
  const btnClose = document.getElementById('close');
  const params = new URLSearchParams(location.search);
  const m = /\/cetak\/siswa\/(\d+)\/?$/.exec(location.pathname);
  const studentId = m ? Number(m[1]) : null;

  btnPrint.innerHTML = `${icon('printer')} Cetak / Simpan PDF`;
  btnClose.innerHTML = `${icon('back')} Tutup`;
  btnClose.onclick = () => { window.close(); setTimeout(() => { location.href = `${ADMIN_PATH}/siswa`; }, 150); };
  btnPrint.onclick = () => window.print();

  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const printedAt = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}.${pad(now.getMinutes())}`;
  const isoToday = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const val = (x) => (x === null || x === undefined || x === '' ? '-' : String(x));

  const head = (title, admin, extra = '') => `
    <header class="doc-head">
      <div>
        <div class="doc-kicker"><span class="mark" aria-hidden="true"></span>Sistem Manajemen Data Siswa</div>
        <h1 class="doc-title">${esc(title)}</h1>
      </div>
      <div class="doc-meta">Dicetak: <b>${esc(printedAt)}</b><br>Oleh: <b>${esc(admin.nama)}</b>${extra}</div>
    </header>`;

  function filterText() {
    const parts = [];
    if (params.get('q')) parts.push(`Pencarian "${params.get('q')}"`);
    if (params.get('kota')) parts.push(`Tempat lahir: ${params.get('kota')}`);
    if (params.get('dari') || params.get('sampai')) {
      parts.push(`Tanggal lahir: ${params.get('dari') ? formatDate(params.get('dari')) : '…'} s.d. ${params.get('sampai') ? formatDate(params.get('sampai')) : '…'}`);
    }
    if (['L', 'P'].includes(params.get('jk'))) parts.push(`Jenis kelamin: ${genderLabel(params.get('jk'))}`);
    return parts.join(' · ');
  }

  async function renderList(admin) {
    const filters = { q: params.get('q') || '', kota: params.get('kota') || '', dari: params.get('dari') || '', sampai: params.get('sampai') || '', jk: params.get('jk') || '' };
    const r = await api(`/api/admin/cetak/siswa?${qs(filters)}`);
    const ft = filterText();
    document.title = `Daftar Siswa - ${isoToday}`;
    document.getElementById('tb-title').textContent = `Daftar Siswa (${r.total} data)`;
    paper.innerHTML = `
      ${head('Daftar Data Siswa', admin, `<br>Jumlah: <b>${r.total} siswa</b>`)}
      ${ft ? `<div class="doc-filter">Filter: ${esc(ft)}</div>` : ''}
      <table class="p-table">
        <thead><tr><th class="no">No</th><th class="ph">Foto</th><th>NIS</th><th>Nama</th><th>Tempat Lahir</th><th>Tanggal Lahir</th><th class="jk">J.K.</th><th>Agama</th></tr></thead>
        <tbody>${r.items.length ? r.items.map((s, i) => `<tr>
          <td class="no">${i + 1}</td>
          <td class="ph">${photo(s.foto, '', '')}</td>
          <td>${esc(val(s.nis))}</td>
          <td class="nm">${esc(s.nama)}</td>
          <td>${esc(s.tempatLahir)}</td>
          <td>${esc(formatDate(s.tanggalLahir))}</td>
          <td class="jk">${esc(s.jenisKelamin)}</td>
          <td>${esc(val(s.agama))}</td></tr>`).join('')
          : '<tr><td colspan="8"><div class="empty">Tidak ada data siswa yang cocok.</div></td></tr>'}</tbody>
      </table>
      ${r.truncated ? `<div class="doc-note">Hanya ${r.limit} data pertama yang dicetak dari ${r.total} data. Persempit pencarian untuk mencetak sisanya.</div>` : ''}`;
  }

  async function renderBio(admin) {
    const s = await api(`/api/admin/siswa/${studentId}`);
    document.title = `Biodata Siswa - ${s.nama}`;
    document.getElementById('tb-title').textContent = `Biodata: ${s.nama}`;
    const sec = (title, rows) => `<section class="bio-sec"><h2>${esc(title)}</h2>${rows.map(([k, v]) =>
      `<div class="bio-row"><span class="k">${esc(k)}</span><span class="v">${esc(val(v))}</span></div>`).join('')}</section>`;
    paper.innerHTML = `
      ${head('Biodata Siswa', admin)}
      <div class="bio-top">
        ${photo(s.foto)}
        <div>
          <div class="bio-name">${esc(s.nama)}</div>
          <span class="${genderTag(s.jenisKelamin)}">${esc(genderLabel(s.jenisKelamin))}</span>
          <div class="bio-ids"><span>NIS</span><b>${esc(val(s.nis))}</b><span>NISN</span><b>${esc(val(s.nisn))}</b></div>
        </div>
      </div>
      ${sec('Data Pribadi', [
        ['Tempat Lahir', s.tempatLahir], ['Tanggal Lahir', formatDate(s.tanggalLahir)], ['Jenis Kelamin', genderLabel(s.jenisKelamin)],
        ['Agama', s.agama], ['Kewarganegaraan', s.kewarganegaraan], ['Anak Ke-', s.anakKe], ['Jumlah Saudara Kandung', s.jumlahSaudara],
        ['Hobi', s.hobi],
      ])}
      ${sec('Kontak', [['No. Telepon/HP', s.telepon], ['Email', s.email], ['Alamat', s.alamat]])}
      ${sec('Data Orang Tua', [['Nama Ayah', s.namaAyah], ['Pekerjaan Ayah', s.pekerjaanAyah], ['Nama Ibu', s.namaIbu], ['Pekerjaan Ibu', s.pekerjaanIbu]])}
      ${sec('Riwayat Pendidikan', [['Pendidikan Formal', s.riwayatFormal], ['Pendidikan Informal', s.riwayatInformal]])}
      <div class="bio-foot">Dokumen ini dicetak dari Sistem Manajemen Data Siswa pada ${esc(printedAt)}.</div>`;
  }

  // Tunggu semua foto termuat agar tidak kosong di PDF.
  const imagesReady = () => Promise.all([...paper.querySelectorAll('img')].map((img) =>
    img.complete ? Promise.resolve() : new Promise((res) => { img.onload = img.onerror = res; })));

  (async () => {
    try {
      const { admin } = await api('/api/auth/me', { skipAuthRedirect: true });
      await (studentId ? renderBio(admin) : renderList(admin));
      paper.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
      await imagesReady();
      if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
      btnPrint.disabled = false;
      if (params.get('auto') !== '0') setTimeout(() => window.print(), 250);
    } catch (err) {
      if (err.status === 401) { location.href = `${ADMIN_PATH}/login`; return; }
      document.getElementById('tb-title').textContent = 'Gagal menyiapkan dokumen';
      paper.innerHTML = `<div class="empty">${err.status === 404 ? 'Data siswa tidak ditemukan.' : esc(err.message)}</div>`;
    }
  })();
})();
