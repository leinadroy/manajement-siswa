/* Form Input Siswa (Add & Edit) — dipakai back office desktop & aplikasi mobile.
   PRD 4.5 / 4.7.5: 5 field wajib + 16 field tambahan opsional di balik toggle "Data Tambahan". */
(function () {
  const { esc, EXTRA_FIELDS, readPhoto } = S;
  let uid = 0;

  function control(f, value, id) {
    const v = value === null || value === undefined ? '' : value;
    if (f.type === 'select') {
      return `<select id="${id}" class="input" data-k="${f.key}"><option value="">— Pilih —</option>${f.options.map((o) =>
        `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    }
    if (f.type === 'textarea') return `<textarea id="${id}" class="input" rows="2" data-k="${f.key}">${esc(v)}</textarea>`;
    const extra = f.type === 'number' ? 'min="0" max="99" inputmode="numeric"' : '';
    return `<input id="${id}" type="${f.type || 'text'}" class="input" data-k="${f.key}" value="${esc(v)}" ${extra}>`;
  }

  function mount(container, { data, layout = 'desk', cities = [] }) {
    const p = `sf${++uid}`;
    const d = Object.assign({ kewarganegaraan: 'Indonesia' }, data || {});
    const isDesk = layout === 'desk';
    const state = { fotoData: null, fotoUrl: d.foto || null, showExtra: false };

    const req = (key, label, inner) => `<div class="field" data-field="${key}"><label for="${p}-${key}">${label} *</label>${inner}<div class="field-error" hidden></div></div>`;
    const reqFields = `
      ${req('nama', 'Nama', `<input id="${p}-nama" type="text" class="input" data-k="nama" value="${esc(d.nama)}" autocomplete="off" maxlength="200">`)}
      ${req('tempatLahir', 'Tempat Lahir', `<input id="${p}-tempatLahir" type="text" class="input" data-k="tempatLahir" value="${esc(d.tempatLahir)}" list="${p}-cities" autocomplete="off" maxlength="200"><datalist id="${p}-cities">${cities.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>`)}
      ${req('tanggalLahir', 'Tanggal Lahir', `<input id="${p}-tanggalLahir" type="date" class="input" data-k="tanggalLahir" value="${esc(d.tanggalLahir)}">`)}
      <div class="field" data-field="jenisKelamin"><span class="label" id="${p}-jk-l">Jenis Kelamin *</span>
        <div class="seg" role="radiogroup" aria-labelledby="${p}-jk-l">
          <label class="seg-opt"><input type="radio" name="${p}-jk" value="L" ${d.jenisKelamin === 'L' ? 'checked' : ''}>Laki-laki</label>
          <label class="seg-opt"><input type="radio" name="${p}-jk" value="P" ${d.jenisKelamin === 'P' ? 'checked' : ''}>Perempuan</label>
        </div><div class="field-error" hidden></div></div>`;

    const extraFields = EXTRA_FIELDS.map((f) =>
      `<div class="field ${isDesk && f.wide ? 'span-all' : ''}" data-field="${f.key}"><label for="${p}-${f.key}">${f.label}</label>${control(f, d[f.key], `${p}-${f.key}`)}<div class="field-error" hidden></div></div>`).join('');

    const photoBox = `<label class="photo" id="${p}-photo" data-field="foto" title="Pilih foto">
        <span class="ph">${isDesk ? 'klik unggah foto' : 'unggah foto'}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" id="${p}-file"></label>`;

    container.innerHTML = `
      <div class="form-error" hidden></div>
      ${isDesk
        ? `<div class="photo-pick">${photoBox}<div class="photo-hint">Foto siswa (wajib). Klik kotak untuk memilih berkas gambar JPG/PNG/WEBP.<div class="field-error" data-err="foto" hidden></div></div></div>
           <div class="grid-2">${reqFields}</div>`
        : `<div class="m-form-photo">${photoBox}<div class="field-error" data-err="foto" hidden></div></div>${reqFields}`}
      <div class="extra-toggle"><button type="button" class="link-btn" aria-expanded="false" aria-controls="${p}-extra"></button></div>
      <div id="${p}-extra" class="${isDesk ? 'grid-3' : 'm-form-body'}" style="${isDesk ? 'padding-top:12px' : 'padding:0'}" hidden>${extraFields}</div>`;

    const q = (sel) => container.querySelector(sel);
    const photoEl = q(`#${p}-photo`);
    const toggleBtn = q('.extra-toggle button');
    const extraEl = q(`#${p}-extra`);

    function renderPhoto() {
      const src = state.fotoData || state.fotoUrl;
      const old = photoEl.querySelector('img'); if (old) old.remove();
      photoEl.querySelector('.ph').hidden = !!src;
      if (src) { const img = document.createElement('img'); img.src = src; img.alt = 'Foto siswa'; photoEl.prepend(img); }
    }
    function renderToggle() {
      extraEl.hidden = !state.showExtra;
      toggleBtn.setAttribute('aria-expanded', String(state.showExtra));
      toggleBtn.textContent = state.showExtra ? 'Sembunyikan Data Tambahan ▴'
        : (isDesk ? 'Tampilkan Data Tambahan (opsional) ▾' : 'Data Tambahan (opsional) ▾');
    }
    toggleBtn.onclick = () => { state.showExtra = !state.showExtra; renderToggle(); };
    q(`#${p}-file`).addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try { state.fotoData = await readPhoto(file); renderPhoto(); setError('foto', null); if (!container.querySelector('.invalid')) q('.form-error').hidden = true; }
      catch (err) { setError('foto', err.message); }
      e.target.value = '';
    });
    // Hapus tanda error saat field diubah.
    const clearOnEdit = (e) => {
      const f = e.target.closest('[data-field]');
      if (f) setError(f.dataset.field, null);
      if (!container.querySelector('.invalid')) q('.form-error').hidden = true;
    };
    container.addEventListener('input', clearOnEdit);
    container.addEventListener('change', clearOnEdit);

    function setError(key, msg) {
      const box = key === 'foto' ? q('[data-err="foto"]') : q(`[data-field="${key}"] .field-error`);
      if (box) { box.hidden = !msg; box.textContent = msg || ''; }
      if (key === 'foto') photoEl.classList.toggle('invalid', !!msg);
      else {
        const ctl = q(`[data-field="${key}"] .input, [data-field="${key}"] .seg`);
        if (ctl) ctl.classList.toggle('invalid', !!msg);
      }
    }

    function payload() {
      const out = {};
      container.querySelectorAll('[data-k]').forEach((el) => { out[el.dataset.k] = el.value.trim(); });
      const jk = q(`input[name="${p}-jk"]:checked`);
      out.jenisKelamin = jk ? jk.value : '';
      if (state.fotoData) out.fotoData = state.fotoData;
      return out;
    }

    function validate() {
      const v = payload();
      const errors = {};
      if (!state.fotoData && !state.fotoUrl) errors.foto = 'Foto wajib diunggah.';
      if (!v.nama) errors.nama = 'Nama wajib diisi.';
      if (!v.tempatLahir) errors.tempatLahir = 'Tempat lahir wajib diisi.';
      if (!v.tanggalLahir) errors.tanggalLahir = 'Tanggal lahir wajib diisi.';
      if (!v.jenisKelamin) errors.jenisKelamin = 'Pilih jenis kelamin.';
      if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = 'Format email tidak valid.';
      return errors;
    }

    function showErrors(errors, message) {
      ['foto', 'nama', 'tempatLahir', 'tanggalLahir', 'jenisKelamin', ...EXTRA_FIELDS.map((f) => f.key)].forEach((k) => setError(k, errors[k] || null));
      const extraKeys = EXTRA_FIELDS.map((f) => f.key);
      if (Object.keys(errors).some((k) => extraKeys.includes(k)) && !state.showExtra) { state.showExtra = true; renderToggle(); }
      const fe = q('.form-error');
      const n = Object.keys(errors).length;
      fe.hidden = !n && !message;
      fe.textContent = message || (n ? 'Lengkapi field yang wajib diisi (ditandai *).' : '');
      const first = container.querySelector('.invalid');
      if (first) {
        const target = first.matches('input, select, textarea') ? first : first.querySelector('input');
        if (target) target.focus({ preventScroll: true });
      }
      if (n || message) fe.scrollIntoView({ block: 'nearest' });
    }

    renderPhoto();
    renderToggle();
    return { payload, validate, showErrors };
  }

  S.studentForm = { mount };
})();
