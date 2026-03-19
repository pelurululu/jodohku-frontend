/* ══════════════════════════════════════
   JODOHKU.MY — API Layer
   Connects to FastAPI backend
   ══════════════════════════════════════ */

var API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8000/api/v1'
  : 'https://api.jodohku.my/api/v1';

/* ── Token / Auth Storage ── */
var Auth = {
  getToken:   function() { return localStorage.getItem('jk_token'); },
  getRefresh: function() { return localStorage.getItem('jk_refresh'); },
  setTokens:  function(a, r) { localStorage.setItem('jk_token', a); if (r) localStorage.setItem('jk_refresh', r); },
  clear:      function() { ['jk_token','jk_refresh','jk_user'].forEach(function(k) { localStorage.removeItem(k); }); },
  isLoggedIn: function() { return !!localStorage.getItem('jk_token'); },
  getUser:    function() { try { return JSON.parse(localStorage.getItem('jk_user') || 'null'); } catch(e) { return null; } },
  setUser:    function(u) { localStorage.setItem('jk_user', JSON.stringify(u)); },
};

/* ── Core Fetch ── */
async function apiFetch(path, opts) {
  opts = opts || {};
  var headers = { 'Content-Type': 'application/json' };
  if (opts.headers) Object.assign(headers, opts.headers);
  var token = Auth.getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    var res = await fetch(API_BASE + path, Object.assign({}, opts, { headers: headers }));
    if (res.status === 401 && Auth.getRefresh()) {
      var r = await fetch(API_BASE + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: Auth.getRefresh() })
      });
      if (r.ok) {
        var d = await r.json();
        Auth.setTokens(d.access_token, d.refresh_token);
        headers['Authorization'] = 'Bearer ' + d.access_token;
        return fetch(API_BASE + path, Object.assign({}, opts, { headers: headers }));
      }
      Auth.clear(); _go('login'); return null;
    }
    return res;
  } catch(err) {
    console.error('API Error:', err);
    showToast('Ralat sambungan. Cuba semula.', 'error');
    return null;
  }
}

/* ── Toast ── */
function showToast(msg, type) {
  var old = document.getElementById('jk-toast');
  if (old) old.remove();
  var t = document.createElement('div');
  t.id = 'jk-toast';
  var colors = { info: '#1B2A4A', error: '#EF4444', success: '#1A7A45', warn: '#C8A23C' };
  t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:' + (colors[type] || colors.info) + ';color:#fff;padding:12px 22px;border-radius:12px;font-size:14px;font-weight:500;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.2);white-space:nowrap;max-width:90vw';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.remove(); }, 3500);
}

/* ── Button Loading ── */
function setLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) { btn.dataset.orig = btn.textContent; btn.textContent = 'Sila tunggu...'; }
  else btn.textContent = label || btn.dataset.orig || btn.textContent;
}

/* ══════════════
   AUTH
══════════════ */
var regEmail = '', regPassword = '';

async function apiLogin() {
  var email = document.getElementById('login-email') ? document.getElementById('login-email').value.trim() : '';
  var pass  = document.getElementById('login-password') ? document.getElementById('login-password').value : '';
  var btn   = document.getElementById('login-btn');
  if (!email || !pass) return showToast('Sila isi semua medan.', 'warn');
  setLoading(btn, true);
  var res = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email: email, password: pass }) });
  setLoading(btn, false, 'Log Masuk');
  if (!res) return;
  var d = await res.json();
  if (res.ok) {
    Auth.setTokens(d.access_token, d.refresh_token);
    Auth.setUser(d);
    currentUser = d;
    unreadN = 0;
    showToast('Selamat datang kembali!', 'success');
    _go('gallery');
    apiLoadGallery();
  } else {
    showToast(d.detail || 'Emel atau kata laluan tidak sah.', 'error');
  }
}

async function apiRegister() {
  regEmail    = document.getElementById('reg-email') ? document.getElementById('reg-email').value.trim() : '';
  regPassword = document.getElementById('reg-password') ? document.getElementById('reg-password').value : '';
  var conf    = document.getElementById('reg-confirm') ? document.getElementById('reg-confirm').value : '';
  var btn     = document.getElementById('reg-btn');
  if (!regEmail || !regPassword) return showToast('Sila isi semua medan.', 'warn');
  if (regPassword !== conf)      return showToast('Kata laluan tidak sepadan.', 'warn');
  if (regPassword.length < 8)    return showToast('Kata laluan minimum 8 aksara.', 'warn');
  if (!/[A-Z]/.test(regPassword)) return showToast('Mesti ada huruf besar. Contoh: Jodoh123', 'warn');
  if (!/[0-9]/.test(regPassword)) return showToast('Mesti ada nombor. Contoh: Jodoh123', 'warn');
  setLoading(btn, true);
  var res = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ email: regEmail, password: regPassword }) });
  setLoading(btn, false, 'Teruskan');
  if (!res) return;
  var d = await res.json();
  if (res.ok) { showToast('OTP dihantar! Semak emel anda.', 'success'); regStep(2); }
  else showToast(d.detail || 'Pendaftaran gagal. Cuba semula.', 'error');
}

async function apiVerifyOTP() {
  var otp = document.getElementById('reg-otp') ? document.getElementById('reg-otp').value.trim() : '';
  var btn = document.getElementById('otp-btn');
  if (!otp || otp.length !== 6) return showToast('Sila masukkan kod OTP 6 digit.', 'warn');
  setLoading(btn, true);
  var res = await apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email: regEmail, otp_code: otp }) });
  setLoading(btn, false, 'Sahkan OTP');
  if (!res) return;
  var d = await res.json();
  if (res.ok) { showToast('OTP disahkan!', 'success'); regStep(3); }
  else showToast(d.detail || 'Kod OTP tidak sah.', 'error');
}

async function apiLogout() {
  await apiFetch('/auth/logout', { method: 'POST' });
  Auth.clear();
  currentUser = null;
  showToast('Berjaya log keluar.', 'info');
  _go('landing');
}

/* ══════════════
   GALLERY
══════════════ */
var galleryPage = 1, galleryLoading = false, galleryDone = false;

async function apiLoadGallery(reset) {
  if (reset === undefined) reset = true;
  if (galleryLoading) return;
  if (reset) { galleryPage = 1; galleryDone = false; profiles = []; }
  if (galleryDone) return;
  galleryLoading = true;
  var res = await apiFetch('/gallery/?page=' + galleryPage + '&page_size=10');
  galleryLoading = false;
  if (!res || !res.ok) { showToast('Gagal memuatkan galeri.', 'error'); _go('gallery'); return; }
  var d = await res.json();
  var items = (d.profiles || d.items || []).map(function(p) {
    return {
      id:     p.user_id || p.id,
      code:   p.code_name || p.code || '???',
      name:   p.display_name || p.name || '',
      age:    p.age || '?',
      state:  p.state_of_residence || p.state || '',
      edu:    p.education_level || p.edu || '',
      job:    p.occupation || p.job || '',
      status: p.marital_status || p.status || '',
      tier:   (p.current_tier || p.tier || 'rahmah').toLowerCase(),
      t20:    p.is_verified_t20 || false,
      score:  p.compatibility_score ? Math.round(p.compatibility_score * 100) : '?',
      online: p.is_online || false,
      bio:    p.bio_text || p.bio || '',
      tip:    p.wingman_tip || '',
      hue:    p.hue || 220,
    };
  });
  profiles = reset ? items : profiles.concat(items);
  if (items.length < 10) galleryDone = true;
  galleryPage++;
  _go('gallery');
}

async function apiToggleFav(id) {
  var action = favs.has(id) ? 'unlike' : 'save_favorite';
  if (favs.has(id)) favs.delete(id); else favs.add(id);
  await apiFetch('/gallery/action', { method: 'POST', body: JSON.stringify({ target_user_id: id, action: action }) });
  _go(currentPage);
}

/* ══════════════
   CHAT
══════════════ */
var conversations = [], wsConn = null;

async function apiLoadConversations() {
  var res = await apiFetch('/chat/conversations');
  if (!res || !res.ok) return;
  var d = await res.json();
  conversations = (d && (d.conversations || d.items)) || [];
  unreadN = conversations.reduce(function(s, c) { return s + (c.unread_count || 0); }, 0);
}

async function apiLoadMessages(convId) {
  var res = await apiFetch('/chat/conversations/' + convId + '/messages');
  if (!res || !res.ok) return [];
  var d = await res.json();
  return (d.messages || d.items || []).map(function(m) {
    return {
      mine:    m.is_mine || m.mine || false,
      text:    m.content || m.text || '',
      time:    m.created_at ? new Date(m.created_at).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : (m.time || ''),
      ice:     m.is_ice_breaker || false,
    };
  });
}

async function apiSendMessage() {
  var inp  = document.getElementById('msg-inp');
  if (!inp || !inp.value.trim()) return;
  var text = inp.value.trim();
  var conv = conversations[activeChatIdx];
  if (!conv) return;
  inp.value = '';
  msgs.push({ mine: true, text: text, time: new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) });
  _go('chat');
  var res = await apiFetch('/chat/conversations/' + conv.id + '/messages', {
    method: 'POST', body: JSON.stringify({ content: text, is_ice_breaker: false })
  });
  if (res && !res.ok) {
    var d = await res.json();
    if (d && d.blocked) { msgs.pop(); _go('chat'); showToast(d.reason_ms || 'Mesej disekat.', 'warn'); }
  }
}

function setupWS() {
  var token = Auth.getToken();
  if (!token || wsConn) return;
  var wsBase = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://').replace('/api/v1', '');
  wsConn = new WebSocket(wsBase + '/api/v1/chat/ws/' + token);
  wsConn.onmessage = function(e) {
    var d = JSON.parse(e.data);
    if (d.type === 'message:new') {
      if (currentPage === 'chat') {
        msgs.push({ mine: false, text: d.content, time: new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) });
        _go('chat');
      } else {
        showToast('Mesej baharu diterima', 'info');
      }
    }
  };
  wsConn.onclose = function() { wsConn = null; if (Auth.isLoggedIn()) setTimeout(setupWS, 3000); };
}

/* ══════════════
   NOTIFICATIONS
══════════════ */
async function apiLoadNotifs() {
  var res = await apiFetch('/notifications/');
  if (!res || !res.ok) return;
  var d = await res.json();
  notifs = ((d && (d.notifications || d.items)) || []).map(function(n) {
    return {
      id:    n.id,
      type:  n.type,
      title: n.title || n.title_ms || '',
      body:  n.body || n.body_ms || n.message || '',
      time:  n.created_at ? new Date(n.created_at).toLocaleString('ms-MY') : '',
      read:  n.is_read || false,
    };
  });
}

async function apiMarkRead(idx) {
  var n = notifs[idx];
  if (!n || n.read) return;
  notifs[idx].read = true;
  await apiFetch('/notifications/' + n.id + '/read', { method: 'POST' });
  _go('notif');
}

async function apiMarkAllRead() {
  notifs.forEach(function(n) { n.read = true; });
  await apiFetch('/notifications/read-all', { method: 'POST' });
  _go('notif');
}

/* ══════════════
   PROFILE
══════════════ */
async function apiLoadProfile() {
  var res = await apiFetch('/profile/me');
  if (!res || !res.ok) return;
  currentUser = await res.json();
  Auth.setUser(currentUser);
}

/* ══════════════
   PAYMENT
══════════════ */
async function apiLoadPlans() {
  var res = await apiFetch('/payment/plans');
  if (!res || !res.ok) return [];
  var d = await res.json();
  return d.plans || [];
}

async function apiCreateBill(tier) {
  var res = await apiFetch('/payment/create-bill', {
    method: 'POST', body: JSON.stringify({ tier: tier })
  });
  if (!res) return null;
  var d = await res.json();
  if (res.ok && d.payment_url) {
    window.location.href = d.payment_url;
  } else if (res.ok && d.message) {
    showToast(d.message, 'success');
  } else {
    showToast(d.error || 'Gagal membuat pembayaran.', 'error');
  }
  return d;
}

async function apiLoadSubscription() {
  var res = await apiFetch('/payment/subscription');
  if (!res || !res.ok) return null;
  return await res.json();
}
