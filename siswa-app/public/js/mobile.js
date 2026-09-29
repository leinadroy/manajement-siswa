/* Aplikasi Mobile Manajemen Siswa (admin) — PRD 4.7.
   Alur: Login → Dashboard → List (search + filter + Muat Lebih Banyak) → View/Detail → Edit / Hapus; Add dari List. */
(function () {
  const { api, qs, esc, icon, photo, formatDate, genderLabel, genderTag, detailRows, rowsHtml, debounce, confirmDialog, toast } = S;
  const app = document.getElementById('app');
  const SIZE = 15;
  let admin = null;
  let cities = null;
  let dirty = true; // list perlu dimuat ulang
  const list = { q: '', kota: '', dari: '', sampai: '', jk: 'ALL', showFilters: false, items: [], total: 0, totalAll: 0, loaded: 0, scroll: 0 };

  S.setUnauthorizedHandler(() => { admin = null; nav('#/login'); toast('Sesi berakhir. Silakan login kembali.'); });

  const nav = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };
  window.addEventListener('hashchange', route);

  async function route() {
    const h = location.hash.replace(/^#/, '') || '/';
    if (h === '/login') return renderLogin();
    if (!admin) {
      try { admin = (await api('/api/auth/me', { skipAuthRedirect: true })).admin; }
      catch (_) { return nav('#/login'); }
    }
    let m;
    if (h === '/') return renderDashboard();
    if (h === '/siswa') return renderList();
    if (h === '/siswa/baru') return renderForm(null);
    if ((m = /^\/siswa\/(\d+)$/.exec(h))) return renderDetail(Number(m[1]));
    if ((m = /^\/siswa\/(\d+)\/edit$/.exec(h))) return renderForm(Number(m[1]));
    nav('#/');
  }

  // ---------- Header ----------
  function shell({ title, back, logout = true }, body) {
    app.innerHTML = `<div class="app-top"><div class="d-bar">
        ${back ? `<button type="button" class="btn btn-icon" id="back" aria-label="Kembali">${icon('back', 18)}</button>` : ''}
        <div class="d-bar-title" style="font-size:17px">${esc(title)}</div>
        ${logout ? `<button type="button" class="btn btn-icon" id="logout" aria-label="Logout" style="margin-left:auto">${icon('logout', 18)}</button>` : ''}
      </div></div><div class="app-content" id="content">${body}</div>`;
    if (back) app.querySelector('#back').onclick = back;
    if (logout) app.querySelector('#logout').onclick = askLogout;
    window.scrollTo(0, 0);
    return app.querySelector('#content');
  }

  async function askLogout() {
    const ok = await confirmDialog({ title: 'Keluar dari sistem?', body: 'Apakah Anda yakin ingin keluar dari sistem?', yes: 'Ya', no: 'Tidak' });
    if (!ok) return;
    try { await api('/api/auth/logout', { method: 'POST', skipAuthRedirect: true }); } catch (_) {}
    admin = null; dirty = true;
    Object.assign(list, { q: '', kota: '', dari: '', sampai: '', jk: 'ALL', showFilters: false, items: [], loaded: 0 });
    nav('#/login');
  }

  // ---------- 4.7.1 Login ----------
  function renderLogin() {
    document.title = 'Masuk Admin — Manajemen Siswa';
    app.innerHTML = `<div class="app-login">
      <div><h1>Masuk Admin</h1><div class="muted" style="font-size:13px;margin-top:4px">Kelola data siswa dari perangkat Anda.</div></div>
      <form id="login" style="display:flex;flex-direction:column;gap:14px" novalidate>
        <div class="field"><label for="u">Username</label><input id="u" class="input" autocomplete="username" autocapitalize="none"></div>
        <div class="field"><label for="pw">Password</label><input id="pw" type="password" class="input" autocomplete="current-password"></div>
        <div class="field-error" id="err" role="alert" hidden></div>
        <button type="submit" class="btn btn-primary btn-lg btn-block">Masuk</button>
      </form></div>`;
    const f = app.querySelector('#login');
    f.onsubmit = async (e) => {
      e.preventDefault();
      const err = app.querySelector('#err');
      const btn = f.querySelector('button');
      const username = f.u.value.trim(), password = f.pw.value;
      if (!username || !password) { err.hidden = false; err.textContent = 'Username dan password wajib diisi.'; return; }
      btn.disabled = true; btn.textContent = 'Memeriksa…';
      try {
        admin = (await api('/api/auth/login', { method: 'POST', body: { username, password }, skipAuthRedirect: true })).admin;
        dirty = true;
        location.replace('#/');
      } catch (ex) {
        err.hidden = false; err.textContent = ex.message; f.pw.value = '';
        btn.disabled = false; btn.textContent = 'Masuk';
      }
    };
  }

  // ---------- 4.7.2 Dashboard ----------
  async function renderDashboard() {
    document.title = 'Dashboard — Manajemen Siswa';
    const c = shell({ title: 'Dashboard' }, `<div class="m-dash">
        <div><div class="muted" style="font-size:14px">Selamat datang,</div><div class="m-title">${esc(admin.nama)}</div></div>
        <div class="hr"></div>
        <button type="button" class="card elev-sm m-menu-card" id="menu-siswa">
          <div class="m-menu-row">${icon('users', 24, 'style="color:var(--color-accent-700);flex:none"')}
            <div style="min-width:0;flex:1"><div class="card-title" style="font-size:15px">Manajemen Siswa</div><div class="card-meta" id="cnt">– data siswa</div></div>
            ${icon('chevron', 16, 'style="color:var(--color-neutral-700)"')}</div>
        </button></div>`);
    c.querySelector('#menu-siswa').onclick = () => nav('#/siswa');
    try { c.querySelector('#cnt').textContent = `${(await api('/api/admin/stats')).totalSiswa} data siswa`; } catch (_) {}
  }

  // ---------- 4.7.3 List ----------
  const filterParams = () => ({ q: list.q.trim(), kota: list.kota, dari: list.dari, sampai: list.sampai, jk: list.jk });
  const filterActive = () => !!(list.kota || list.dari || list.sampai || list.jk !== 'ALL');

  async function renderList() {
    document.title = 'Manajemen Siswa — Mobile';
    const c = shell({ title: 'Manajemen Siswa', back: () => nav('#/') }, `
      <div class="m-tools">
        <div class="m-search">
          <label for="q" class="sr-only">Cari</label>
          <input id="q" type="search" class="input" placeholder="Cari nama, tempat, tanggal, J.K..." value="${esc(list.q)}" autocomplete="off">
          <button type="button" id="ft" class="btn btn-icon" aria-controls="filters"></button>
        </div>
        <div class="m-filters" id="filters" ${list.showFilters ? '' : 'hidden'}>
          <div class="field"><label for="kota">Tempat Lahir</label><select id="kota" class="input"><option value="">Semua Kota</option></select></div>
          <div class="m-row2">
            <div class="field"><label for="dari">Dari Tanggal</label><input id="dari" type="date" class="input" value="${esc(list.dari)}"></div>
            <div class="field"><label for="sampai">Sampai Tanggal</label><input id="sampai" type="date" class="input" value="${esc(list.sampai)}"></div>
          </div>
          <div class="seg" role="radiogroup" aria-label="Jenis kelamin">
            ${[['ALL', 'Semua'], ['L', 'Laki-laki'], ['P', 'Perempuan']].map(([v, l]) =>
              `<label class="seg-opt"><input type="radio" name="jk" value="${v}" ${list.jk === v ? 'checked' : ''}>${l}</label>`).join('')}
          </div>
          <button type="button" id="reset" class="btn btn-secondary btn-block">Reset Filter</button>
        </div>
        <div class="m-add-row"><span id="count">Memuat…</span>
          <button type="button" id="add" class="btn btn-primary">${icon('plus')} Add</button></div>
      </div>
      <div id="items"></div>
      <div class="m-more" id="more" hidden style="border-top:0"><button type="button" id="more-btn" class="btn btn-secondary btn-block">Muat Lebih Banyak</button></div>`);

    const $ = (s) => c.querySelector(s);
    const ft = $('#ft');
    function paintFilterBtn() {
      ft.className = 'btn btn-icon ' + (filterActive() ? 'btn-primary' : 'btn-secondary');
      ft.innerHTML = icon('filter', 16);
      ft.setAttribute('aria-expanded', String(list.showFilters));
      ft.setAttribute('aria-label', filterActive() ? 'Filter (aktif)' : 'Filter');
    }
    function paint() {
      $('#count').textContent = `${list.total} dari ${list.totalAll} siswa`;
      $('#items').innerHTML = list.items.length ? list.items.map((s) => `
        <a class="m-item" href="#/siswa/${s.id}">
          ${photo(s.foto, '', '')}
          <div class="m-item-main"><div class="m-item-name" style="font-size:14px">${esc(s.nama)}</div>
            <div class="m-item-sub">${esc(s.tempatLahir)} &middot; ${esc(formatDate(s.tanggalLahir))}</div></div>
          <span class="${genderTag(s.jenisKelamin)} tag-sm">${s.jenisKelamin}</span>
          ${icon('chevron', 16, 'class="chev"')}
        </a>`).join('') : '<div class="empty">Tidak ada siswa yang cocok.</div>';
      c.querySelectorAll('.m-item .photo').forEach((p) => { p.style.width = '48px'; p.style.height = '48px'; });
      $('#more').hidden = list.items.length >= list.total;
    }

    let reqId = 0;
    async function load(append) {
      const id = ++reqId;
      const btn = $('#more-btn');
      if (append) { btn.disabled = true; btn.textContent = 'Memuat…'; } else $('#items').classList.add('loading');
      try {
        const page = append ? list.loaded + 1 : 1;
        const r = await api(`/api/admin/siswa?${qs({ ...filterParams(), page, size: SIZE })}`);
        if (id !== reqId) return;
        list.items = append ? list.items.concat(r.items) : r.items;
        list.loaded = page; list.total = r.total; list.totalAll = r.totalAll;
        dirty = false;
        paint();
      } catch (err) {
        if (id === reqId && err.status !== 401) { if (append) toast(err.message); else $('#items').innerHTML = `<div class="empty">Gagal memuat: ${esc(err.message)}</div>`; }
      } finally { if (id === reqId) { $('#items').classList.remove('loading'); btn.disabled = false; btn.textContent = 'Muat Lebih Banyak'; } }
    }
    const reload = () => { list.scroll = 0; load(false); };

    paintFilterBtn();
    ft.onclick = () => { list.showFilters = !list.showFilters; $('#filters').hidden = !list.showFilters; paintFilterBtn(); };
    $('#q').addEventListener('input', debounce((e) => { list.q = e.target.value; reload(); }, 250));
    $('#kota').onchange = (e) => { list.kota = e.target.value; paintFilterBtn(); reload(); };
    $('#dari').onchange = (e) => { list.dari = e.target.value; paintFilterBtn(); reload(); };
    $('#sampai').onchange = (e) => { list.sampai = e.target.value; paintFilterBtn(); reload(); };
    c.querySelectorAll('input[name="jk"]').forEach((r) => { r.onchange = () => { list.jk = r.value; paintFilterBtn(); reload(); }; });
    $('#reset').onclick = () => {
      Object.assign(list, { q: '', kota: '', dari: '', sampai: '', jk: 'ALL' });
      $('#q').value = ''; $('#kota').value = ''; $('#dari').value = ''; $('#sampai').value = '';
      c.querySelectorAll('input[name="jk"]').forEach((r) => { r.checked = r.value === 'ALL'; });
      paintFilterBtn(); reload();
    };
    $('#add').onclick = () => nav('#/siswa/baru');
    $('#more-btn').onclick = () => load(true);
    $('#items').addEventListener('click', () => { list.scroll = window.scrollY; });

    // Kota
    (cities ? Promise.resolve(cities) : api('/api/admin/kota')).then((cs) => {
      cities = cs;
      $('#kota').insertAdjacentHTML('beforeend', cs.map((k) => `<option value="${esc(k)}">${esc(k)}</option>`).join(''));
      $('#kota').value = list.kota;
    }).catch(() => {});

    if (dirty || !list.loaded) load(false);
    else { paint(); window.scrollTo(0, list.scroll); }
  }

  // ---------- 4.7.4 View/Detail ----------
  async function renderDetail(id) {
    document.title = 'Detail Siswa — Mobile';
    const c = shell({ title: 'Detail Siswa', back: () => nav('#/siswa') }, '<div class="empty">Memuat…</div>');
    let s;
    try { s = await api(`/api/admin/siswa/${id}`); }
    catch (err) {
      if (err.status !== 401) c.innerHTML = `<div class="empty">${err.status === 404 ? 'Data siswa tidak ditemukan.' : esc(err.message)}</div>`;
      return;
    }
    c.innerHTML = `
      <div class="d-hero" style="gap:12px">
        ${photo(s.foto)}
        <div style="text-align:center"><div class="d-name" style="font-size:19px">${esc(s.nama)}</div>
          <span class="${genderTag(s.jenisKelamin)}" style="margin-top:6px">${esc(genderLabel(s.jenisKelamin))}</span></div>
        <div class="m-detail-actions">
          <button type="button" class="btn btn-secondary" id="edit">${icon('edit')} Edit</button>
          <button type="button" class="btn btn-secondary btn-danger" id="del">${icon('trash')} Hapus</button>
        </div>
      </div>
      <div class="d-fields">${rowsHtml(detailRows(s))}</div>`;
    c.querySelector('#edit').onclick = () => nav(`#/siswa/${id}/edit`);
    c.querySelector('#del').onclick = async () => {
      const ok = await confirmDialog({ title: 'Hapus data siswa?', body: `Data ${s.nama} akan dihapus secara permanen dan tidak dapat dikembalikan.`, yes: 'Hapus', no: 'Batal' });
      if (!ok) return;
      try {
        await api(`/api/admin/siswa/${id}`, { method: 'DELETE' });
        dirty = true; cities = null; toast('Data siswa dihapus.');
        location.replace('#/siswa');
      } catch (err) { if (err.status !== 401) toast(err.message); }
    };
  }

  // ---------- 4.7.5 Form ----------
  async function renderForm(id) {
    const isEdit = id !== null;
    const cancel = () => (isEdit ? location.replace(`#/siswa/${id}`) : location.replace('#/siswa'));
    const c = shell({ title: isEdit ? 'Edit Siswa' : 'Tambah Siswa', back: cancel, logout: false }, '<div class="empty">Memuat…</div>');
    let data = null;
    try {
      [data, cities] = await Promise.all([
        isEdit ? api(`/api/admin/siswa/${id}`) : Promise.resolve(null),
        cities ? Promise.resolve(cities) : api('/api/admin/kota').catch(() => []),
      ]);
    } catch (err) { if (err.status !== 401) c.innerHTML = `<div class="empty">${esc(err.message)}</div>`; return; }
    c.innerHTML = `<form class="m-form" id="form" novalidate>
        <div class="m-form-body" id="fields"></div>
        <div class="m-form-actions">
          <button type="button" class="btn btn-secondary" id="cancel">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan</button>
        </div></form>`;
    const ctl = S.studentForm.mount(c.querySelector('#fields'), { data, layout: 'mob', cities });
    c.querySelector('#cancel').onclick = cancel;
    c.querySelector('#form').onsubmit = async (e) => {
      e.preventDefault();
      const errors = ctl.validate();
      if (Object.keys(errors).length) return ctl.showErrors(errors);
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Menyimpan…';
      try {
        await api(isEdit ? `/api/admin/siswa/${id}` : '/api/admin/siswa', { method: isEdit ? 'PUT' : 'POST', body: ctl.payload() });
        dirty = true; cities = null;
        toast(isEdit ? 'Perubahan disimpan.' : 'Siswa baru ditambahkan.');
        // Add → List (data baru di atas); Edit → kembali ke View dengan data terbarui.
        location.replace(isEdit ? `#/siswa/${id}` : '#/siswa');
      } catch (err) {
        if (err.status === 401) return;
        ctl.showErrors((err.data && err.data.errors) || {}, err.message);
        btn.disabled = false; btn.textContent = 'Simpan';
      }
    };
  }

  route();
})();
