/* Landing publik: desktop (grid card + filter + paging 20) & mobile (list + search + filter + Muat Lebih Banyak). */
(function () {
  const { api, qs, esc, icon, photo, formatDate, genderLabel, genderTag, pagerHtml, debounce } = S;
  const $ = (id) => document.getElementById(id);
  const mq = window.matchMedia('(max-width: 720px)');
  const DESK_SIZE = 20;
  const MOB_SIZE = 15;

  // State filter bersama, disimpan di URL agar kembali dari Detail tidak mereset filter.
  const url = new URLSearchParams(location.search);
  const state = {
    kota: url.get('kota') || '', dari: url.get('dari') || '', sampai: url.get('sampai') || '',
    jk: ['L', 'P'].includes(url.get('jk')) ? url.get('jk') : 'ALL', q: url.get('q') || '',
    page: Math.max(1, parseInt(url.get('page'), 10) || 1),
    loaded: Math.max(1, parseInt(url.get('n'), 10) || 1), // jumlah "halaman" mobile yang sudah dimuat
  };
  let mode = null;
  let reqId = 0;
  let mobItems = [];

  function syncUrl() {
    const p = { kota: state.kota, dari: state.dari, sampai: state.sampai, jk: state.jk };
    if (mode === 'mob') { p.q = state.q; if (state.loaded > 1) p.n = state.loaded; }
    else if (state.page > 1) p.page = state.page;
    const s = qs(p);
    history.replaceState(null, '', s ? `/?${s}` : '/');
  }

  function filterParams() {
    const p = { kota: state.kota, dari: state.dari, sampai: state.sampai, jk: state.jk };
    if (mode === 'mob') p.q = state.q.trim();
    return p;
  }

  async function loadCities() {
    try {
      const cities = await api('/api/public/kota');
      ['d-kota', 'm-kota'].forEach((id) => {
        const sel = $(id);
        sel.insertAdjacentHTML('beforeend', cities.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join(''));
        sel.value = state.kota;
      });
    } catch (_) { /* dropdown tetap "Semua Kota" */ }
  }

  function syncControls() {
    $('d-kota').value = state.kota; $('m-kota').value = state.kota;
    $('d-dari').value = state.dari; $('m-dari').value = state.dari;
    $('d-sampai').value = state.sampai; $('m-sampai').value = state.sampai;
    $('m-q').value = state.q;
    document.querySelectorAll('input[name="d-jk"], input[name="m-jk"]').forEach((r) => { r.checked = r.value === state.jk; });
    const active = !!(state.kota || state.dari || state.sampai);
    const ft = $('m-ftoggle');
    ft.className = 'btn btn-icon ' + (active ? 'btn-primary' : 'btn-secondary');
    ft.innerHTML = icon('filter', 16);
    ft.setAttribute('aria-label', active ? 'Filter (aktif)' : 'Filter');
  }

  function showError(el, err) {
    el.innerHTML = `<div class="empty">Gagal memuat data: ${esc(err.message)}. <button type="button" class="link-btn" data-retry>Coba lagi</button></div>`;
    el.querySelector('[data-retry]').onclick = () => refresh();
  }

  // ---------------- Desktop ----------------
  async function renderDesk() {
    const id = ++reqId;
    const grid = $('d-grid');
    grid.classList.add('loading');
    try {
      const r = await api(`/api/public/siswa?${qs({ ...filterParams(), page: state.page, size: DESK_SIZE })}`);
      if (id !== reqId) return;
      state.page = r.page;
      $('d-count').textContent = `Menampilkan ${r.total} dari ${r.totalAll} siswa`;
      grid.innerHTML = r.items.length ? r.items.map((s) => `
        <a class="s-card" href="/siswa/${s.id}">
          ${photo(s.foto)}
          <div class="s-card-body">
            <div class="s-card-name">${esc(s.nama)}</div>
            <div class="s-card-line">Lahir di ${esc(s.tempatLahir)}</div>
            <div class="s-card-line">${esc(formatDate(s.tanggalLahir))}</div>
            <span class="tag tag-accent">${esc(genderLabel(s.jenisKelamin))}</span>
          </div>
        </a>`).join('') : '<div class="empty" style="grid-column:1/-1">Tidak ada siswa yang cocok dengan filter.</div>';
      $('d-pager').innerHTML = pagerHtml(r.page, r.pages);
      syncUrl();
    } catch (err) {
      if (id === reqId) { showError(grid, err); $('d-count').textContent = ''; $('d-pager').innerHTML = ''; }
    } finally { if (id === reqId) grid.classList.remove('loading'); }
  }

  // ---------------- Mobile ----------------
  const itemHtml = (s) => `
    <a class="m-item" href="/siswa/${s.id}">
      ${photo(s.foto, '', '')}
      <div class="m-item-main">
        <div class="m-item-name">${esc(s.nama)}</div>
        <div class="m-item-sub">${esc(s.tempatLahir)} &middot; ${esc(formatDate(s.tanggalLahir))}</div>
      </div>
      <span class="${genderTag(s.jenisKelamin)} tag-sm">${s.jenisKelamin}</span>
      ${icon('chevron', 16, 'class="chev"')}
    </a>`;

  async function renderMob(append) {
    const id = ++reqId;
    const list = $('m-list');
    const btn = $('m-more-btn');
    try {
      if (!append) {
        list.classList.add('loading');
        // Muat ulang sejumlah halaman yang sudah pernah dimuat (restore saat kembali dari Detail).
        const r = await api(`/api/public/siswa?${qs({ ...filterParams(), page: 1, size: MOB_SIZE * state.loaded })}`);
        if (id !== reqId) return;
        mobItems = r.items;
        finishMob(r.total, r.totalAll);
      } else {
        btn.disabled = true; btn.textContent = 'Memuat…';
        const r = await api(`/api/public/siswa?${qs({ ...filterParams(), page: state.loaded + 1, size: MOB_SIZE })}`);
        if (id !== reqId) return;
        state.loaded += 1;
        mobItems = mobItems.concat(r.items);
        finishMob(r.total, r.totalAll);
      }
    } catch (err) {
      if (id === reqId) { if (append) S.toast(err.message); else showError(list, err); }
    } finally {
      if (id === reqId) { list.classList.remove('loading'); btn.disabled = false; btn.textContent = 'Muat Lebih Banyak'; }
    }
  }

  function finishMob(total, totalAll) {
    $('m-count').textContent = `Menampilkan ${Math.min(mobItems.length, total)} dari ${total} siswa` + (total !== totalAll ? ` (total ${totalAll})` : '');
    $('m-list').innerHTML = mobItems.length ? mobItems.map(itemHtml).join('') : '<div class="empty">Tidak ada siswa yang cocok.</div>';
    $('m-more').hidden = mobItems.length >= total;
    syncUrl();
  }

  // ---------------- Umum ----------------
  function refresh() { return mode === 'mob' ? renderMob(false) : renderDesk(); }

  // Perubahan filter => kembali ke halaman 1 (PRD 4.1).
  function setFilter(patch) {
    Object.assign(state, patch, { page: 1, loaded: 1 });
    syncControls();
    refresh();
  }

  function applyMode() {
    const next = mq.matches ? 'mob' : 'desk';
    if (next === mode) return;
    mode = next;
    $('desk').hidden = mode !== 'desk';
    $('mob').hidden = mode !== 'mob';
    if (mode === 'desk') state.q = ''; // search box hanya di varian mobile
    syncControls();
    refresh();
  }

  // Desktop events
  $('d-kota').onchange = (e) => setFilter({ kota: e.target.value });
  $('d-dari').onchange = (e) => setFilter({ dari: e.target.value });
  $('d-sampai').onchange = (e) => setFilter({ sampai: e.target.value });
  document.querySelectorAll('input[name="d-jk"]').forEach((r) => { r.onchange = () => setFilter({ jk: r.value }); });
  $('d-reset').onclick = () => setFilter({ kota: '', dari: '', sampai: '', jk: 'ALL' });
  $('d-pager').onclick = (e) => {
    const b = e.target.closest('button[data-page]');
    if (!b || b.disabled) return;
    state.page = parseInt(b.dataset.page, 10);
    renderDesk().then(() => $('d-count').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  // Mobile events
  const onSearch = debounce(() => setFilter({ q: $('m-q').value }), 250);
  $('m-q').addEventListener('input', onSearch);
  document.querySelectorAll('input[name="m-jk"]').forEach((r) => { r.onchange = () => setFilter({ jk: r.value }); });
  $('m-ftoggle').onclick = () => {
    const panel = $('m-filters');
    panel.hidden = !panel.hidden;
    $('m-ftoggle').setAttribute('aria-expanded', String(!panel.hidden));
  };
  $('m-kota').onchange = (e) => setFilter({ kota: e.target.value });
  $('m-dari').onchange = (e) => setFilter({ dari: e.target.value });
  $('m-sampai').onchange = (e) => setFilter({ sampai: e.target.value });
  $('m-reset').onclick = () => setFilter({ kota: '', dari: '', sampai: '', jk: 'ALL', q: '' });
  $('m-more-btn').onclick = () => renderMob(true);

  if (state.kota || state.dari || state.sampai) $('m-filters').hidden = false;
  mq.addEventListener('change', applyMode);
  loadCities();
  applyMode();
})();
