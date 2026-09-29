/* Back office desktop: Login, Dashboard, Manajemen Siswa (Grid, Add, Edit, Delete), Logout. PRD 4.2–4.6 */
(function () {
  const { ADMIN_PATH, api, qs, esc, icon, photo, formatDate, pagerHtml, debounce, confirmDialog, toast } = S;
  const root = document.getElementById('root');
  const PAGE_SIZE = 10;
  let admin = null;
  let cities = null;
  let lastGrid = '/siswa';

  S.setUnauthorizedHandler(() => { admin = null; go('/login', true); toast('Sesi berakhir. Silakan login kembali.'); });

  // ---------- Router ----------
  function rel() {
    const p = location.pathname.slice(ADMIN_PATH.length) || '/';
    return p.replace(/\/+$/, '') || '/';
  }
  function go(path, replace) {
    const url = ADMIN_PATH + (path === '/' ? '' : path);
    history[replace ? 'replaceState' : 'pushState'](null, '', url);
    route();
  }
  window.addEventListener('popstate', route);
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-nav]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault(); go(a.dataset.nav);
  });

  async function route() {
    const p = rel();
    if (p === '/login') return renderLogin();
    if (!admin) {
      try { admin = (await api('/api/auth/me', { skipAuthRedirect: true })).admin; }
      catch (_) { return go('/login', true); }
    }
    let m;
    if (p === '/') return renderDashboard();
    if (p === '/siswa') return renderGrid();
    if (p === '/siswa/baru') return renderForm(null);
    if ((m = /^\/siswa\/(\d+)\/edit$/.exec(p))) return renderForm(Number(m[1]));
    go('/', true);
  }

  // ---------- Login (4.2) ----------
  function renderLogin() {
    document.title = 'Login Admin — Manajemen Siswa';
    root.innerHTML = `<div class="login-wrap">
      <form class="login-card" id="login" novalidate>
        <div><h1>Login Admin</h1><p>Halaman ini tidak ditautkan dari halaman publik.</p></div>
        <div class="field"><label for="u">Username</label><input id="u" class="input" autocomplete="username" required></div>
        <div class="field"><label for="pw">Password</label><input id="pw" type="password" class="input" autocomplete="current-password" required></div>
        <div class="field-error" id="err" role="alert" hidden></div>
        <button type="submit" class="btn btn-primary btn-lg btn-block">Masuk</button>
      </form></div>`;
    const f = document.getElementById('login');
    document.getElementById('u').focus();
    f.onsubmit = async (e) => {
      e.preventDefault();
      const err = document.getElementById('err');
      const btn = f.querySelector('button[type=submit]');
      const username = f.u.value.trim(), password = f.pw.value;
      if (!username || !password) { err.hidden = false; err.textContent = 'Username dan password wajib diisi.'; return; }
      btn.disabled = true; btn.textContent = 'Memeriksa…';
      try {
        admin = (await api('/api/auth/login', { method: 'POST', body: { username, password }, skipAuthRedirect: true })).admin;
        go('/', true);
      } catch (ex) {
        err.hidden = false; err.textContent = ex.message; f.pw.value = ''; f.pw.focus();
        btn.disabled = false; btn.textContent = 'Masuk';
      }
    };
  }

  // ---------- Layout (sidebar 4.4) ----------
  function shell(active, content) {
    root.innerHTML = `<div class="bo">
      <aside class="bo-side">
        <div class="bo-side-kicker">Back Office</div>
        <div class="bo-side-name">${esc(admin.nama)}</div>
        <a href="${ADMIN_PATH}" data-nav="/" class="bo-menu" ${active === 'dash' ? 'aria-current="page"' : ''}>Dashboard</a>
        <a href="${ADMIN_PATH}/siswa" data-nav="/siswa" class="bo-menu" ${active === 'siswa' ? 'aria-current="page"' : ''}>Manajemen Siswa</a>
        <button type="button" class="btn btn-secondary bo-logout" id="logout">${icon('logout')} Logout</button>
      </aside>
      <main class="bo-main" id="main">${content}</main></div>`;
    document.getElementById('logout').onclick = askLogout;
    return document.getElementById('main');
  }

  // Logout dengan konfirmasi Ya/Tidak (4.6)
  async function askLogout() {
    const ok = await confirmDialog({ title: 'Keluar dari sistem?', body: 'Apakah Anda yakin ingin keluar dari sistem?', yes: 'Ya', no: 'Tidak' });
    if (!ok) return;
    try { await api('/api/auth/logout', { method: 'POST', skipAuthRedirect: true }); } catch (_) {}
    admin = null;
    go('/login', true);
  }

  // ---------- Dashboard (4.3) ----------
  async function renderDashboard() {
    document.title = 'Dashboard — Back Office';
    const main = shell('dash', `<div class="welcome">
      <h1>Selamat datang, ${esc(admin.nama)}</h1>
      <p>Gunakan menu di sisi kiri untuk mengelola data siswa. Sesi Anda tervalidasi melalui tabel sesi kustom.</p>
      <div class="stat"><b id="total">–</b><span>data siswa terdaftar</span></div><br>
      <a href="${ADMIN_PATH}/siswa" data-nav="/siswa" class="btn btn-primary btn-lg">Buka Manajemen Siswa</a>
    </div>`);
    try { main.querySelector('#total').textContent = (await api('/api/admin/stats')).totalSiswa; } catch (_) {}
  }

  // ---------- Grid (4.5) ----------
  async function renderGrid() {
    document.title = 'Manajemen Siswa — Back Office';
    const params = new URLSearchParams(location.search);
    const st = { q: params.get('q') || '', page: Math.max(1, parseInt(params.get('page'), 10) || 1) };
    const main = shell('siswa', `
      <div class="bo-titlebar"><h1>Manajemen Siswa</h1>
        <a href="${ADMIN_PATH}/siswa/baru" data-nav="/siswa/baru" class="btn btn-primary">${icon('plus')} Add</a></div>
      <div class="bo-search"><label for="q" class="sr-only">Cari</label>
        <input id="q" type="search" class="input" placeholder="Cari nama, tempat lahir, tanggal lahir, J.K..." value="${esc(st.q)}" autocomplete="off"></div>
      <div class="bo-count" id="count" aria-live="polite">Memuat…</div>
      <table class="table bo-table">
        <thead><tr><th style="width:52px">Foto</th><th>Nama</th><th>Tempat Lahir</th><th>Tanggal Lahir</th><th class="hide-sm">J.K.</th><th style="text-align:right">Aksi</th></tr></thead>
        <tbody id="rows"></tbody>
      </table>
      <nav class="pager bo-pager" id="pager" aria-label="Halaman"></nav>`);
    const $rows = main.querySelector('#rows');
    let reqId = 0;

    async function load() {
      const id = ++reqId;
      $rows.classList.add('loading');
      try {
        const r = await api(`/api/admin/siswa?${qs({ q: st.q.trim(), page: st.page, size: PAGE_SIZE })}`);
        if (id !== reqId) return;
        st.page = r.page;
        main.querySelector('#count').textContent = st.q.trim() ? `Menampilkan ${r.total} dari ${r.totalAll} data` : `Menampilkan ${r.total} data`;
        $rows.innerHTML = r.items.length ? r.items.map((s) => `<tr>
            <td>${photo(s.foto, '', '')}</td>
            <td class="name">${esc(s.nama)}</td>
            <td>${esc(s.tempatLahir)}</td>
            <td>${esc(formatDate(s.tanggalLahir))}</td>
            <td class="hide-sm">${esc(s.jenisKelamin)}</td>
            <td class="bo-actions">
              <a href="${ADMIN_PATH}/siswa/${s.id}/edit" data-nav="/siswa/${s.id}/edit" class="btn btn-secondary btn-icon-sm" aria-label="Edit ${esc(s.nama)}" title="Edit">${icon('edit')}</a>
              <button type="button" class="btn btn-secondary btn-icon-sm btn-danger" data-del="${s.id}" data-name="${esc(s.nama)}" aria-label="Delete ${esc(s.nama)}" title="Delete">${icon('trash')}</button>
            </td></tr>`).join('')
          : `<tr><td colspan="6"><div class="empty">${st.q.trim() ? 'Tidak ada data yang cocok dengan pencarian.' : 'Belum ada data siswa.'}</div></td></tr>`;
        main.querySelector('#pager').innerHTML = pagerHtml(r.page, r.pages);
        const search = qs({ q: st.q.trim(), page: st.page > 1 ? st.page : '' });
        lastGrid = '/siswa' + (search ? '?' + search : '');
        history.replaceState(null, '', ADMIN_PATH + lastGrid);
      } catch (err) {
        if (id === reqId && err.status !== 401) $rows.innerHTML = `<tr><td colspan="6"><div class="empty">Gagal memuat data: ${esc(err.message)}</div></td></tr>`;
      } finally { if (id === reqId) $rows.classList.remove('loading'); }
    }

    // Pencarian live; paging kembali ke halaman 1.
    main.querySelector('#q').addEventListener('input', debounce((e) => { st.q = e.target.value; st.page = 1; load(); }, 250));
    main.querySelector('#pager').onclick = (e) => {
      const b = e.target.closest('button[data-page]'); if (!b || b.disabled) return;
      st.page = parseInt(b.dataset.page, 10); load();
    };
    $rows.onclick = async (e) => {
      const b = e.target.closest('button[data-del]'); if (!b) return;
      const ok = await confirmDialog({ title: 'Hapus data siswa?', body: `Data ${b.dataset.name} akan dihapus secara permanen dan tidak dapat dikembalikan.`, yes: 'Hapus', no: 'Batal' });
      if (!ok) return;
      try { await api(`/api/admin/siswa/${b.dataset.del}`, { method: 'DELETE' }); toast('Data siswa dihapus.'); cities = null; load(); }
      catch (err) { if (err.status !== 401) toast(err.message); }
    };
    load();
  }

  // ---------- Form Add/Edit (4.5) ----------
  async function renderForm(id) {
    const isEdit = id !== null;
    document.title = (isEdit ? 'Edit Data Siswa' : 'Tambah Siswa Baru') + ' — Back Office';
    const main = shell('siswa', '<div class="empty">Memuat…</div>');
    let data = null;
    try {
      const [item, cityList] = await Promise.all([
        isEdit ? api(`/api/admin/siswa/${id}`) : Promise.resolve(null),
        cities ? Promise.resolve(cities) : api('/api/admin/kota').catch(() => []),
      ]);
      data = item; cities = cityList;
    } catch (err) {
      if (err.status === 401) return;
      main.innerHTML = `<div class="empty">${esc(err.message)}<br><br><a href="${ADMIN_PATH}/siswa" data-nav="/siswa">Kembali ke Manajemen Siswa</a></div>`;
      return;
    }
    main.innerHTML = `<form class="bo-form" id="form" novalidate>
        <h1>${isEdit ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h1>
        <div id="fields"></div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-lg">Simpan</button>
          <button type="button" class="btn btn-secondary btn-lg" id="cancel">Batal</button>
        </div></form>`;
    const ctl = S.studentForm.mount(main.querySelector('#fields'), { data, layout: 'desk', cities });
    main.querySelector('#cancel').onclick = () => go(isEdit ? lastGrid : '/siswa');
    main.querySelector('#form').onsubmit = async (e) => {
      e.preventDefault();
      const errors = ctl.validate();
      if (Object.keys(errors).length) return ctl.showErrors(errors);
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Menyimpan…';
      try {
        await api(isEdit ? `/api/admin/siswa/${id}` : '/api/admin/siswa', { method: isEdit ? 'PUT' : 'POST', body: ctl.payload() });
        cities = null;
        toast(isEdit ? 'Perubahan data siswa disimpan.' : 'Siswa baru ditambahkan.');
        go(isEdit ? lastGrid : '/siswa'); // Add: data baru muncul di atas halaman 1
      } catch (err) {
        if (err.status === 401) return;
        ctl.showErrors((err.data && err.data.errors) || {}, err.message);
        btn.disabled = false; btn.textContent = 'Simpan';
      }
    };
  }

  route();
})();
