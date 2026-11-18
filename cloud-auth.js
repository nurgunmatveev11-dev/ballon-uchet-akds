(function () {
  const config = window.BALLOON_CLOUD_CONFIG;
  if (!config?.url || !config?.publishableKey) { document.body.classList.remove('auth-pending'); return; }

  const sessionKey = 'balloon-cloud-session';
  const roleNames = {
    warehouseman: 'Кладовщик',
    akds_head: 'Начальник АКДС', skk_head: 'Начальник СКК', operator: 'Оператор'
  };
  const status = document.getElementById('syncStatus');
  const setStatus = (text, online = false) => {
    status.innerHTML = `<span class="sync-dot" style="background:${online ? '#71a436' : '#d08b42'}"></span>${text}`;
  };
  const activateProfile = profile => {
    const activeProfile = { ...profile, role: roleNames[profile.role] ? profile.role : 'operator' };
    setStatus(`${activeProfile.full_name} · ${roleNames[activeProfile.role]}`, true);
    window.dispatchEvent(new CustomEvent('balloon:profile', { detail: activeProfile }));
  };
  const request = async (path, options = {}, token = '') => {
    const headers = { apikey: config.publishableKey, ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${config.url}${path}`, { ...options, headers });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error_description || body?.message || 'Ошибка подключения');
    return body;
  };
  const gate = (initialMessage = '') => {
    const node = document.createElement('div');
    node.className = 'modal-backdrop';
    node.id = 'authGate';
    node.innerHTML = `<div class="modal auth-modal"><h2>Учёт баллонов</h2><p>Для работы войдите или зарегистрируйтесь.</p><div class="auth-tabs"><button type="button" class="button" id="showLogin">Вход</button><button type="button" class="button secondary" id="showSignup">Регистрация</button></div><p class="warning" id="authMessage" hidden></p><div id="authPanel"></div></div>`;
    document.body.append(node);
    const message = node.querySelector('#authMessage');
    const showMessage = text => { message.textContent = text; message.hidden = !text; };
    showMessage(initialMessage);
    const panel = node.querySelector('#authPanel');
    const submitAuth = async auth => {
      if (!auth?.access_token || !auth?.user?.id) throw new Error('Почта ещё не подтверждена. Введите код из письма.');
      const rows = await request(`/rest/v1/profiles?select=full_name,role,active&id=eq.${auth.user.id}`, {}, auth.access_token);
      const profile = rows[0];
      if (!profile?.active) { showMessage('Почта подтверждена. Заявку должен одобрить начальник АКДС. После одобрения войдите снова.'); return; }
      await request('/rest/v1/rpc/record_app_login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},auth.access_token);
      sessionStorage.setItem(sessionKey, JSON.stringify({ token: auth.access_token, refreshToken: auth.refresh_token, expiresAt: Date.now() + (auth.expires_in || 3600) * 1000, userId: auth.user.id, profile }));
      node.remove(); activateProfile(profile);
    };
    const selectTab = tab => { node.querySelector('#showLogin').classList.toggle('secondary',tab!=='login');node.querySelector('#showSignup').classList.toggle('secondary',tab!=='signup');showMessage(''); };
    const login = () => {
      selectTab('login');
      panel.innerHTML = `<form id="cloudLogin" class="form-grid"><label class="field full">Электронная почта<input required type="email" name="email" autocomplete="username"></label><label class="field full">Пароль<input required type="password" name="password" autocomplete="current-password"></label><div class="form-actions full"><button class="button">Войти</button></div></form>`;
      panel.querySelector('form').onsubmit = async e => { e.preventDefault(); const button=e.target.querySelector('button');button.disabled=true;showMessage('');try { const auth=await request('/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});await submitAuth(auth); } catch(err){showMessage(err.message)} finally {button.disabled=false} };
    };
    const verify = (email, password) => {
      panel.innerHTML = `<h3>Подтверждение почты</h3><p>Введите код из письма. Без подтверждения приложение не откроется.</p><form id="verifySignup" class="form-grid"><label class="field full">Код из письма<input required name="token" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" maxlength="8"></label><div class="form-actions full"><button class="button">Подтвердить</button></div></form><button type="button" class="link" id="resendSignup">Отправить код повторно</button>`;
      panel.querySelector('form').onsubmit = async e => { e.preventDefault(); const button=e.target.querySelector('button');button.disabled=true;showMessage('');try { const data=await request('/auth/v1/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,token:e.target.elements.token.value.trim(),type:'email'})});const auth=data.access_token?data:await request('/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});await submitAuth(auth); } catch(err){showMessage(err.message)} finally {button.disabled=false} };
      panel.querySelector('#resendSignup').onclick = async e => {e.target.disabled=true;try{await request('/auth/v1/resend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,type:'signup'})});showMessage('Новый код отправлен на почту.')}catch(err){showMessage(err.message)}finally{e.target.disabled=false}};
    };
    const signup = () => {
      selectTab('signup');
      panel.innerHTML = `<form id="cloudSignup" class="form-grid"><label class="field full">Электронная почта<input required type="email" name="email" autocomplete="email"></label><label class="field full">Новый пароль<input required type="password" name="password" minlength="8" autocomplete="new-password"></label><label class="field full">ФИО<input required name="full_name" minlength="2" maxlength="100" autocomplete="name"></label><label class="field full">Роль<select required name="requested_role"><option value="akds_head">Начальник АКДС</option><option value="skk_head">Начальник СКК</option><option value="warehouseman">Кладовщик</option><option value="operator">Оператор</option></select></label><p class="full">После подтверждения почты начальник АКДС одобрит доступ.</p><div class="form-actions full"><button class="button">Зарегистрироваться</button></div></form>`;
      panel.querySelector('form').onsubmit = async e => {e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;showMessage('');const data=Object.fromEntries(new FormData(e.target));try{const result=await request('/auth/v1/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:data.email,password:data.password,data:{full_name:data.full_name.trim(),requested_role:data.requested_role}})});if(result.access_token)throw new Error('На сервере отключено обязательное подтверждение почты. Обратитесь к администратору.');verify(data.email,data.password);showMessage('Мы отправили код подтверждения на указанную почту.')}catch(err){showMessage(err.message)}finally{button.disabled=false}};
    };
    node.querySelector('#showLogin').onclick=login;node.querySelector('#showSignup').onclick=signup;login();if(initialMessage)showMessage(initialMessage);
  };
  const start = async () => {
    let saved = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    if (!saved?.token) { setStatus('Требуется вход'); gate(); return; }
    try {
      if (saved.refreshToken && saved.expiresAt < Date.now() + 60000) {
        const auth=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:saved.refreshToken})});
        saved={...saved,token:auth.access_token,refreshToken:auth.refresh_token,expiresAt:Date.now()+(auth.expires_in||3600)*1000};sessionStorage.setItem(sessionKey,JSON.stringify(saved));
      }
      const profile = await request(`/rest/v1/profiles?select=full_name,role,active&id=eq.${saved.userId}`, {}, saved.token);
      if (!profile[0]?.active) throw new Error('Сессия недействительна');
      activateProfile(profile[0]);
    } catch { sessionStorage.removeItem(sessionKey); setStatus('Требуется вход'); gate(); }
  };
  const accountRequest = (path, body) => {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    if (!saved?.token) throw new Error('Сначала войдите в приложение.');
    return request(`/rest/v1/rpc/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, saved.token);
  };
  window.BALLOON_ACCOUNT_API = {
    async saveName(fullName) {
      const name = await accountRequest('set_my_name', { new_full_name: fullName.trim() });
      const saved = JSON.parse(sessionStorage.getItem(sessionKey));
      saved.profile.full_name = name;
      sessionStorage.setItem(sessionKey, JSON.stringify(saved));
      activateProfile(saved.profile);
      return name;
    },
    listStaff: () => accountRequest('list_staff_profiles', {}),
    assignRole: (userId, role) => accountRequest('assign_staff_role', { target_id: userId, new_role: role }),
    deactivateStaff: userId => accountRequest('deactivate_staff_account', { target_id: userId })
  };
  window.BALLOON_DOCUMENTS_API = {
    async upload(file, kind) {
      const saved = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
      if (!saved?.token) throw new Error('Сначала войдите в приложение.');
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf','doc','docx','jpg','jpeg','png','webp'].includes(extension)) throw new Error('Допустимые форматы: PDF, Word или изображение.');
      if (file.size > 10 * 1024 * 1024) throw new Error('Размер документа не должен превышать 10 МБ.');
      const path = `${kind}/${crypto.randomUUID()}.${extension}`;
      const response = await fetch(`${config.url}/storage/v1/object/batch-documents/${path}`, {
        method: 'POST', headers: { apikey: config.publishableKey, Authorization: `Bearer ${saved.token}`, 'Content-Type': file.type || 'application/octet-stream' }, body: file
      });
      if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.message || 'Не удалось загрузить документ'); }
      return path;
    },
    async read(path) {
      const saved = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
      if (!saved?.token) throw new Error('Сначала войдите в приложение.');
      const response = await fetch(`${config.url}/storage/v1/object/authenticated/batch-documents/${path}`, {
        headers: { apikey: config.publishableKey, Authorization: `Bearer ${saved.token}` }, cache: 'no-store'
      });
      if (!response.ok) throw new Error('Не удалось открыть документ. Проверьте доступ и соединение.');
      return response.blob();
    },
    async download(path, filename) {
      const blob = await this.read(path), url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  };
  window.addEventListener('balloon:signout', () => {
    sessionStorage.removeItem(sessionKey);
    location.reload();
  });
  const verificationToken = new URLSearchParams(location.search).get('verify');
  if (verificationToken) {
    document.querySelector('.app-shell')?.remove();
    document.body.classList.remove('auth-pending');
    const page = document.createElement('main');
    page.className = 'verify-page';
    page.innerHTML = '<div class="verify-card"><div class="brand"><span class="brand-mark">◉</span><span>Баллон.учёт</span></div><h1>Проверка протокола</h1><p id="verifyMessage">Проверяем запись…</p><div id="verifyDetails" class="detail-grid" hidden></div><a class="button secondary" href="./">Открыть приложение</a></div>';
    document.body.append(page);
    const message = page.querySelector('#verifyMessage'), details = page.querySelector('#verifyDetails');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(verificationToken)) {
      message.textContent = 'Некорректная ссылка проверки.';
    } else {
      request('/rest/v1/rpc/verify_protocol', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookup_token: verificationToken })
      }).then(rows => {
        const record = rows[0];
        if (!record) { message.textContent = 'Протокол не найден. Проверьте ссылку у поставщика.'; return; }
        message.textContent = record.is_cancelled ? 'Протокол аннулирован' : 'Протокол подтверждён';
        message.className = record.is_cancelled ? 'verify-status invalid' : 'verify-status valid';
        const fields = [
          ['Номер протокола', record.protocol_number || '—'],
          ['Дата выдачи', record.issue_date || '—'],
          ['Серия', record.series || '—'],
          ['Количество баллонов', String(record.cylinders_count)]
        ];
        for (const [label, value] of fields) {
          const cell = document.createElement('div'); cell.className = 'detail';
          const caption = document.createElement('span'); caption.textContent = label;
          const data = document.createElement('strong'); data.textContent = value;
          cell.append(caption, data); details.append(cell);
        }
        details.hidden = false;
      }).catch(error => { message.textContent = `Проверка недоступна: ${error.message}`; });
    }
  } else start();
})();

