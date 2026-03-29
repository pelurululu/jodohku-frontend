/* ══════════════════════════════════════
   JODOHKU.MY — App Core
   Navigation, sidebar, page rendering
   ══════════════════════════════════════ */

/* ── State ── */
var currentPage   = 'landing';
var regStepN      = 1;
var activeChatIdx = 0;
var unreadN       = 0;
var favs          = new Set();
var msgs          = [];
var profiles      = [];
var convos        = [];
var notifs        = [];
var currentUser   = Auth.getUser();

// Track dismissed (proposed/rejected) profile IDs so they don't reappear on tab switch
var dismissedProfileIds = new Set();

/* ══════════════════════════════════════
   MOBILE NAV
══════════════════════════════════════ */
function toggleMobileMenu() {
  var m  = document.getElementById('mobile-menu');
  var mi = document.getElementById('nav-icon-menu');
  var ci = document.getElementById('nav-icon-close');
  var open = m.classList.toggle('open');
  mi.style.display = open ? 'none' : 'block';
  ci.style.display = open ? 'block' : 'none';
}

function smoothScrollTo(id) {
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function openSidebar() {
  var s = document.getElementById('app-sidebar');
  var o = document.getElementById('side-overlay');
  if (s) s.classList.add('open');
  if (o) o.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  var s = document.getElementById('app-sidebar');
  var o = document.getElementById('side-overlay');
  if (s) s.classList.remove('open');
  if (o) o.classList.remove('open');
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════
   NAVIGATION
══════════════════════════════════════ */
function go(pg) {
  currentPage = pg;

  var appPages = ['gallery','chat','profile','payment','notif','settings','quiz','success'];
  var isAppPage = appPages.indexOf(pg) > -1;

  if (isAppPage) {
    // Show persistent app shell, hide all other pages
    document.querySelectorAll('.pg').forEach(function(p) { p.classList.remove('on'); });
    var appShell = document.getElementById('app-shell');
    if (appShell) appShell.style.display = 'flex';
    // Scroll to top
    var pc = document.getElementById('page-content');
    if (pc) pc.scrollTop = 0;
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) { window.scrollTo(0, 0); }
    buildAppPage(pg);
  } else {
    // Non-app pages (login, register, landing) — hide shell, show pg div
    var appShell = document.getElementById('app-shell');
    if (appShell) appShell.style.display = 'none';
    document.querySelectorAll('.pg').forEach(function(p) { p.classList.remove('on'); });
    var el = document.getElementById('pg-' + pg);
    if (el) el.classList.add('on');
  }

  closeSidebar();
}

// Override go() with auth guard + data loading
var _go = go;
go = async function(pg) {
  var protected_ = ['gallery','chat','profile','payment','notif','settings','quiz'];
  if (protected_.indexOf(pg) > -1 && !Auth.isLoggedIn()) {
    showToast('Sila log masuk dahulu.', 'warn');
    return _go('login');
  }
  if (pg === 'gallery' && Auth.isLoggedIn() && profiles.length === 0) { await apiLoadGallery(); }
  else if (pg === 'gallery' && Auth.isLoggedIn()) { profiles = profiles.filter(function(p){ return !dismissedProfileIds.has(p.id); }); }
  if (pg === 'chat'    && Auth.isLoggedIn()) { await apiLoadConversations(); setupWS(); }
  if (pg === 'notif'   && Auth.isLoggedIn()) await apiLoadNotifs();
  if (pg === 'profile' && Auth.isLoggedIn()) await apiLoadProfile();
  if (pg === 'quiz'    && Auth.isLoggedIn()) await apiLoadQuiz();
  _go(pg);
};

// Wire API handlers
function sendMsg()     { apiSendMessage(); }
function markRead(i)   { apiMarkRead(i); }
function markAllRead() { apiMarkAllRead(); }
function toggleFav(id) { apiToggleFav(id); }

/* ══════════════════════════════════════
   REGISTER STEPS
══════════════════════════════════════ */
function regStep(n) {
  regStepN = n;
  for (var i = 1; i <= 3; i++) {
    var s = document.getElementById('reg-s' + i);
    if (s) s.classList.toggle('on', i === n);
  }
  renderRegSteps();
}

function renderRegSteps() {
  var c = document.getElementById('reg-steps');
  if (!c) return;
  var h = '';
  for (var i = 1; i <= 3; i++) {
    var cls = i < regStepN ? 'done' : i === regStepN ? 'on' : 'wait';
    h += '<div class="step-dot ' + cls + '">' + (i < regStepN ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' : i) + '</div>';
    if (i < 3) h += '<div class="step-line' + (i < regStepN ? ' done' : '') + '"></div>';
  }
  c.innerHTML = h;
}

/* ══════════════════════════════════════
   SIDEBAR BUILDER
══════════════════════════════════════ */
function sidebar(active) {
  var user = currentUser || Auth.getUser();
  var codeName = user && user.code_name ? user.code_name : '---';
  var displayName = (user && user.display_name) ? user.display_name : codeName;
  var photoUrl = user && user.photo_url || (user && user.photos && user.photos[0] && user.photos[0].url) || null;
  var tier = user && user.current_tier ? user.current_tier.toUpperCase() : 'RAHMAH';
  var completion = user && user.profile_completion ? user.profile_completion : 0;
  var unreadNotifs = notifs.filter(function(n) { return !n.read; }).length;
  var badgeClass = tier === 'GOLD' ? 'b-gld' : tier === 'PLATINUM' ? 'b-plt' : tier === 'PREMIUM' ? 'b-prm' : tier === 'SOVEREIGN' ? 'b-sov' : 'b-rah';

  var items = [
    { id: 'gallery', label: 'Bilik Pameran', icon: 'gallery' },
    { id: 'chat',    label: 'Sembang',       icon: 'chat',  badge: unreadN },
    { id: 'profile', label: 'Profil Saya',   icon: 'profile' },
    { id: 'payment', label: 'Langganan',     icon: 'payment' },
    { id: 'notif',   label: 'Notifikasi',    icon: 'notif', badge: unreadNotifs },
    { id: 'settings',label: 'Tetapan',       icon: 'settings' },
  ];

  // Update persistent sidebar user section
  var userSection = document.getElementById('sidebar-user-section');
  if (userSection) {
    var avatarHtml = photoUrl
      ? '<div class="side-av" style="background:none;overflow:hidden"><img src="' + photoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"></div>'
      : '<div class="side-av">' + displayName.slice(0, 2).toUpperCase() + '</div>';
    userSection.innerHTML = '<div style="display:flex;align-items:center;gap:10px">'
      + avatarHtml
      + '<div><div id="sidebar-display-name" style="font-family:var(--fm);font-size:13px;font-weight:600">' + displayName + '</div>'
      + '<div class="badge ' + badgeClass + '" style="font-size:8px;padding:2px 8px;margin-top:3px">' + tier + '</div></div></div>'
      + '<div style="margin-top:10px"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--im)"><span>Profil</span><span>' + completion + '%</span></div>'
      + '<div class="progress" style="margin-top:4px"><div class="progress-fill" style="width:' + completion + '%"></div></div></div>';
  }

  // Update persistent sidebar nav
  var sideNav = document.getElementById('sidebar-nav');
  if (sideNav) {
    sideNav.innerHTML = items.map(function(i) {
      return '<button class="nav-i' + (active === i.id ? ' on' : '') + '" onclick="closeSidebar();go(\'' + i.id + '\')">'
        + ICONS[i.icon] + '<span style="flex:1">' + i.label + '</span>'
        + (i.badge ? '<span class="nb">' + i.badge + '</span>' : '')
        + '</button>';
    }).join('');
  }

  // Show app shell
  var appShell = document.getElementById('app-shell');
  if (appShell) appShell.style.display = 'flex';

  // Update topbar title
  var titles = { gallery:'Bilik Pameran', quiz:'Kuiz Serasi', chat:'Sembang', profile:'Profil Saya', payment:'Langganan', notif:'Notifikasi', settings:'Tetapan' };
  var titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = titles[active] || 'Jodohku.my';

  // Update page content chat padding
  var pc = document.getElementById('page-content');
  if (pc) {
    pc.className = active === 'chat' ? 'pgc no-pad' : 'pgc';
  }
}

var sideEnd = '';

function buildBottomNav(active) {
  var unreadNotifs = notifs.filter(function(n) { return !n.read; }).length;
  var items = [
    { id: 'gallery', label: 'Galeri',  icon: 'gallery' },
    { id: 'chat',    label: 'Sembang', icon: 'chat',  badge: unreadN },
    { id: 'profile', label: 'Profil',  icon: 'profile' },
    { id: 'notif',   label: 'Notif',   icon: 'notif', badge: unreadNotifs },
    { id: 'settings',label: 'Lagi',    icon: 'settings' },
  ];
  var el = document.getElementById('bottom-nav-inner');
  if (!el) return;
  el.innerHTML = items.map(function(i) {
    return '<button class="bn-item' + (active === i.id ? ' on' : '') + '" onclick="go(\'' + i.id + '\')">'
      + (i.badge ? '<span class="bn-badge">' + i.badge + '</span>' : '')
      + ICONS[i.icon] + '<span>' + i.label + '</span></button>';
  }).join('');
}

/* ══════════════════════════════════════
   BUILD APP PAGES
══════════════════════════════════════ */
function buildAppPage(pg) {
  sidebar(pg);
  buildBottomNav(pg);

  var pageContent = document.getElementById('page-content');
  if (!pageContent) return;

  var h = '';
  if (pg === 'gallery') h = buildGalleryPage();
  else if (pg === 'chat') h = buildChatPage();
  else if (pg === 'profile') h = buildProfilePage();
  else if (pg === 'payment') h = buildPaymentPage();
  else if (pg === 'notif') h = buildNotifPage();
  else if (pg === 'settings') h = buildSettingsPage();
  else if (pg === 'quiz') h = buildQuizPage();
  else if (pg === 'success') h = buildSuccessPage();

  pageContent.innerHTML = h;

  if (pg === 'chat') {
    var cm = document.getElementById('chat-msgs');
    if (cm) cm.scrollTop = cm.scrollHeight;
  }
}

/* ── Gallery Page ── */
function buildGalleryPage() {
  var h = '<div style="max-width:680px;margin:0 auto">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'
    + '<div><h1 style="font-family:var(--fd);font-weight:700;font-size:24px">Bilik Pameran</h1>'
    + '<p style="color:var(--is);font-size:13px;margin-top:4px">Cadangan calon sekufu anda</p></div>'
    + '<button class="btn bg" style="border:1px solid var(--s2);gap:6px" onclick="toggleGalleryFilter()">' + ICONS.filter + ' Tapis</button>'
    + '</div>'
    + '<div id="gallery-filter-panel" style="display:none">' + buildGalleryFilterPanel() + '</div>';

  if (profiles.length === 0) {
    h += '<div class="card" style="text-align:center;padding:48px 24px">'
      + '<div style="width:56px;height:56px;border-radius:50%;background:var(--g50);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">' + ICONS.heart + '</div>'
      + '<h3 style="font-family:var(--fd);font-size:20px;margin-bottom:8px">Tiada Padanan Lagi</h3>'
      + '<p style="color:var(--is);font-size:14px;margin-bottom:20px">Lengkapkan profil dan jawab kuiz untuk mendapat cadangan calon sekufu.</p>'
      + '<button class="btn bp" onclick="go(\'profile\')">Lengkapkan Profil</button></div>';
  }

  profiles.forEach(function(p, i) {
    var isFav = favs.has(p.id);
    var tierClass = p.tier === 'gold' ? 'b-gld' : p.tier === 'platinum' ? 'b-plt' : p.tier === 'premium' ? 'b-prm' : 'b-rah';
    var photoHtml = p.photo_url
      ? '<img src="' + p.photo_url + '" style="width:100%;height:100%;object-fit:cover">'
      : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,hsl(' + (p.hue||220) + ',35%,20%),hsl(' + ((p.hue||220)+40) + ',25%,13%))"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';

    h += '<div class="pcard afu d' + (Math.min(i+1,5)) + '" data-pid="' + p.id + '" style="cursor:pointer" onclick="handleCardClick(this)">'
      + '<div class="pcard-ph" style="position:relative;overflow:hidden">'
      + photoHtml
      + '<div class="wm"></div>'
      + '<div class="pcard-badges"><span class="badge ' + tierClass + '">' + p.tier.toUpperCase() + '</span>'
      + (p.t20 ? '<span class="badge b-ver">' + ICONS.shield + ' T20</span>' : '') + '</div>'
      + '<div class="pcard-score">' + ICONS.heart + ' <b>' + p.score + '%</b></div>'
      + (p.online ? '<div class="pcard-online"><span class="online-dot"></span>Dalam Talian</div>' : '')
      + '</div>'
      + '<div class="pcard-info">'
      + '<div style="display:flex;justify-content:space-between;align-items:center">'
      + '<div><div style="font-family:var(--fm);font-weight:700;font-size:18px;color:var(--n5)">' + (p.name || 'Ahli Jodohku') + '</div>'
      + '<div style="color:var(--im);font-size:13px">' + p.age + ' tahun' + (p.state ? ' &bull; ' + p.state.replace(/_/g,' ') : '') + '</div></div>'
      + '<div style="font-family:var(--fd);font-weight:600;font-size:26px;color:var(--im)">' + p.age + '</div>'
      + '</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0">'
      + (p.state ? '<span class="chip">' + ICONS.pin + p.state.replace(/_/g,' ') + '</span>' : '')
      + (p.edu   ? '<span class="chip">' + ICONS.edu + p.edu.replace(/_/g,' ')   + '</span>' : '')
      + (p.job   ? '<span class="chip">' + ICONS.work + p.job + '</span>' : '')
      + '</div>'
      + (p.bio ? '<p style="font-size:14px;color:var(--is);line-height:1.55;margin-bottom:12px">' + p.bio.slice(0,120) + (p.bio.length>120?'...':'') + '</p>' : '')
      + (p.tip ? '<div class="wtip">' + ICONS.sparkle + '<span>' + p.tip + '</span></div>' : '')
      + '<div class="pcard-acts" onclick="event.stopPropagation()">'
      + '<button class="btn bg" style="border:1px solid var(--s2);flex:1;justify-content:center" data-pid="' + p.id + '" onclick="handleReject(this)">' + ICONS.x + ' Tolak</button>'
      + '<button class="btn bp lam" style="flex:2;justify-content:center" data-pid="' + p.id + '" data-name="' + (p.name||p.code) + '" onclick="handleLamar(this)">' + ICONS.heart + ' Lamar</button>'
      + '</div></div></div>';
  });

  if (profiles.length > 0) {
    h += '<button class="btn bs" style="width:100%;padding:13px 0;margin-bottom:20px" onclick="apiLoadGallery(false)">'
      + ICONS.down + ' Lihat Lebih</button>';
  }
  h += '</div>';
  return h;
}

// ── Card click handlers using data attributes (no inline JS with dynamic IDs) ──
function handleCardClick(el) { viewProfile(el.dataset.pid); }
function handleReject(btn) { event.stopPropagation(); rejectProfile(btn.dataset.pid); }
function handleFav(btn) { event.stopPropagation(); toggleFav(btn.dataset.pid); }
function handleLamar(btn) { event.stopPropagation(); sendLamarRequest(btn.dataset.pid, btn.dataset.name); }

function buildGalleryFilterPanel() {
  var states = ['johor','kedah','kelantan','melaka','negeri_sembilan','pahang','perak','perlis','pulau_pinang','sabah','sarawak','selangor','terengganu','wp_kuala_lumpur'];
  return '<div class="card" style="margin-bottom:20px">'
    + '<h3 style="font-family:var(--fd);font-weight:600;font-size:16px;margin-bottom:16px">Tapis Carian</h3>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'
    + '<div><label class="lbl">Umur Min</label><input id="f-age-min" class="inp" type="number" placeholder="22" min="18" max="60"></div>'
    + '<div><label class="lbl">Umur Max</label><input id="f-age-max" class="inp" type="number" placeholder="35" min="18" max="60"></div>'
    + '<div><label class="lbl">Negeri</label><select id="f-state" class="inp" style="cursor:pointer"><option value="">Semua Negeri</option>'
    + states.map(function(s){return '<option value="'+s+'">'+s.replace(/_/g,' ').replace(/\w/g,function(c){return c.toUpperCase()})+'</option>';}).join('')
    + '</select></div>'
    + '<div><label class="lbl">Status</label><select id="f-marital" class="inp" style="cursor:pointer"><option value="">Semua</option><option value="bujang">Bujang</option><option value="duda">Duda</option><option value="janda">Janda</option></select></div>'
    + '<div><label class="lbl">Pendidikan Min</label><select id="f-edu" class="inp" style="cursor:pointer"><option value="">Semua</option><option value="spm">SPM</option><option value="diploma">Diploma</option><option value="ijazah">Ijazah</option><option value="master">Master</option><option value="phd">PhD</option></select></div>'
    + '<div><label class="lbl">Pendapatan Min</label><select id="f-income" class="inp" style="cursor:pointer"><option value="">Semua</option><option value="below_2k">Bawah 2K</option><option value="2k_5k">2K-5K</option><option value="5k_10k">5K-10K</option><option value="10k_20k">10K-20K</option><option value="above_20k">Atas 20K</option></select></div>'
    + '</div>'
    + '<div style="display:flex;gap:10px">'
    + '<button class="btn bp" style="flex:1" onclick="applyGalleryFilter()">Guna Tapis</button>'
    + '<button class="btn bg" style="border:1px solid var(--s2)" onclick="clearGalleryFilter()">Kosongkan</button>'
    + '</div></div>';
}

function toggleGalleryFilter() {
  var panel = document.getElementById('gallery-filter-panel');
  if (panel) panel.style.display = panel.style.display === 'none' ? '' : 'none';
}

async function applyGalleryFilter() {
  var ageMin  = (document.getElementById('f-age-min')||{}).value || '';
  var ageMax  = (document.getElementById('f-age-max')||{}).value || '';
  var state   = (document.getElementById('f-state')||{}).value || '';
  var marital = (document.getElementById('f-marital')||{}).value || '';
  var edu     = (document.getElementById('f-edu')||{}).value || '';
  var income  = (document.getElementById('f-income')||{}).value || '';
  var params  = [];
  if (ageMin)  params.push('age_min='+ageMin);
  if (ageMax)  params.push('age_max='+ageMax);
  if (state)   params.push('states='+state);
  if (marital) params.push('marital_status='+marital);
  if (edu)     params.push('education_min='+edu);
  if (income)  params.push('income_min='+income);
  await apiLoadGalleryFiltered(params.length ? '&' + params.join('&') : '');
}

function clearGalleryFilter() {
  ['f-age-min','f-age-max','f-state','f-marital','f-edu','f-income'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
  apiLoadGallery(true);
}

async function apiLoadGalleryFiltered(query) {
  profiles = [];
  var res = await apiFetch('/gallery/?page=1&page_size=10' + (query||''));
  if (!res || !res.ok) return showToast('Gagal memuatkan.', 'error');
  var d = await res.json();
  profiles = mapProfiles(d.profiles || d.items || []);
  buildAppPage('gallery');
}

function mapProfiles(arr) {
  return arr.map(function(p) {
    return {
      id:        p.user_id || p.id,
      code:      p.code_name || p.code || '???',
      name:      p.display_name || p.name || '',
      age:       p.age || '?',
      state:     p.state_of_residence || p.state || '',
      edu:       p.education_level || p.edu || '',
      job:       p.occupation || p.job || '',
      status:    p.marital_status || '',
      tier:      (p.current_tier || p.tier || 'rahmah').toLowerCase(),
      t20:       p.is_verified_t20 || false,
      score:     p.compatibility_score ? Math.round(p.compatibility_score * 100) : '?',
      online:    p.is_online || false,
      bio:       p.bio_text || p.bio || '',
      tip:       p.wingman_tip || '',
      hue:       220,
      photo_url: (p.photos && p.photos[0] && p.photos[0].url) || p.photo_url || null,
      photos:    p.photos || [],
    };
  });
}

function rejectProfile(userId) {
  apiFetch('/gallery/action', { method:'POST', body:JSON.stringify({ target_user_id:userId, action:'reject' }) });
  dismissedProfileIds.add(userId);
  profiles = profiles.filter(function(p){ return p.id !== userId; });
  buildAppPage('gallery');
}

// ── Send Lamar Request ──
function sendLamarRequest(userId, name) {
  // Build inline lamar modal instead of browser prompt
  var existing = document.getElementById('lamar-modal');
  if (existing) existing.remove();
  var defaultMsg = 'Assalamualaikum, saya berminat untuk berkenalan. Semoga kita boleh berkomunikasi lebih lanjut.';
  var modal = document.createElement('div');
  modal.id = 'lamar-modal';
  modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:420px;padding:24px;box-shadow:0 24px 64px rgba(0,0,0,.35)">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    + '<div style="font-family:var(--fm);font-weight:700;font-size:18px;color:var(--n5)">Hantar Lamaran</div>'
    + '<button onclick="document.getElementById(\'lamar-modal\').remove()" style="width:28px;height:28px;border-radius:50%;background:var(--s1);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">' + ICONS.x + '</button>'
    + '</div>'
    + '<p style="font-size:13px;color:var(--im);margin-bottom:12px">Kepada: <strong>' + (name || 'Ahli Jodohku') + '</strong></p>'
    + '<textarea id="lamar-msg" rows="4" class="inp" style="resize:none;font-size:14px;line-height:1.6" placeholder="Tulis mesej lamaran anda...">' + defaultMsg + '</textarea>'
    + '<div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-top:14px">'
    + '<button class="btn bg" style="border:1px solid var(--s2);justify-content:center;padding:12px" onclick="document.getElementById(\'lamar-modal\').remove()">Batal</button>'
    + '<button id="lamar-send-btn" class="btn bp" style="justify-content:center;padding:12px" onclick="submitLamar(\'' + userId + '\',\'' + (name||'') + '\')">' + ICONS.send + ' Hantar</button>'
    + '</div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
}

async function submitLamar(userId, name) {
  var msgEl = document.getElementById('lamar-msg');
  var btn   = document.getElementById('lamar-send-btn');
  var msg   = msgEl ? msgEl.value.trim() : '';
  if (!msg) msg = 'Assalamualaikum, saya berminat untuk berkenalan.';
  if (btn) { btn.disabled = true; btn.textContent = 'Menghantar...'; }

  // Create pending conversation
  var res = await apiFetch('/chat/initiate', {
    method: 'POST',
    body: JSON.stringify({ target_user_id: userId, message: { content: msg, is_ice_breaker: false } })
  });

  var modal = document.getElementById('lamar-modal');
  if (modal) modal.remove();

  if (!res || !res.ok) {
    showToast('Gagal menghantar lamar. Cuba semula.', 'error');
    return;
  }

  var data = await res.json();
  var convId = data.conversation_id || '';

  // Notify recipient — they must accept before chat unlocks
  var senderName = currentUser && currentUser.code_name ? currentUser.code_name : 'Seseorang';
  var notifRes = await apiFetch('/notifications/send', {
    method: 'POST',
    body: JSON.stringify({
      recipient_user_id: userId,
      type: 'lamar_received',
      title: 'Anda menerima lamaran baharu',
      body: senderName + ' telah menghantar lamaran kepada anda.',
      conversation_id: convId,
      sender_name: senderName,
    })
  });

  if (!notifRes || !notifRes.ok) {
    console.warn('[Lamar] Notification send failed, but lamar was created.');
  }

  showToast('Lamaran dihantar! Menunggu penerimaan.', 'success');
  dismissedProfileIds.add(userId);
  profiles = profiles.filter(function(p){ return p.id !== userId; });
  buildAppPage('gallery');
}

async function acceptLamar(convId, notifIdx) {
  var btn = document.getElementById('accept-btn-' + notifIdx);
  if (btn) { btn.disabled = true; btn.textContent = 'Menerima...'; }
  var res = await apiFetch('/chat/conversations/' + convId + '/accept', { method: 'POST' });
  if (res && res.ok) {
    showToast('Lamaran diterima! Anda kini boleh berbual.', 'success');
    if (notifs[notifIdx]) {
      notifs[notifIdx].read = true;
      notifs[notifIdx].actioned = true;
      notifs[notifIdx].accepted = true;
    }
    await apiLoadConversations();
    _go('chat');
  } else {
    showToast('Gagal menerima lamaran.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Terima'; }
  }
}

async function rejectLamar(convId, notifIdx) {
  var btn = document.getElementById('reject-btn-' + notifIdx);
  if (btn) { btn.disabled = true; btn.textContent = 'Menolak...'; }
  var res = await apiFetch('/chat/conversations/' + convId + '/reject', { method: 'POST' });
  if (res && res.ok) {
    showToast('Lamaran ditolak.', 'info');
    if (notifs[notifIdx]) {
      notifs[notifIdx].accepted = false;
      notifs[notifIdx].read = true;
      notifs[notifIdx].actioned = true;
    }
    _go('notif');
  } else {
    showToast('Gagal menolak lamaran.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Tolak'; }
  }
}

// ── Shared profile modal builder ──
var _pmPhotos = [], _pmIdx = 0;

function _buildProfileModal(p, showActions) {
  var photos = (p.photos && p.photos.length) ? p.photos
             : (p.photo_url ? [{url: p.photo_url}] : []);
  _pmPhotos = photos;
  _pmIdx = 0;

  var tierClass = p.tier === 'gold' ? 'b-gld' : p.tier === 'platinum' ? 'b-plt'
                : p.tier === 'premium' ? 'b-prm' : 'b-rah';

  function photoPart(idx) {
    if (!photos.length) {
      return '<div style="width:100%;height:300px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,hsl(220,35%,20%),hsl(260,25%,13%))">'
        + '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
    }
    // Photo is clickable to open fullscreen
    return '<img id="pm-img" src="' + photos[idx].url + '" style="width:100%;height:300px;object-fit:cover;cursor:zoom-in" onclick="viewOwnPhoto(\'' + photos[idx].url + '\')" title="Lihat penuh">';
  }

  var dotsHtml = photos.length > 1
    ? '<div style="position:absolute;top:12px;left:0;right:0;display:flex;justify-content:center;gap:4px;padding:0 12px">'
      + photos.map(function(_,i){ return '<div id="pmd'+i+'" style="height:3px;border-radius:2px;flex:1;max-width:40px;background:'+(i===0?'#fff':'rgba(255,255,255,.4)')+';transition:background .2s"></div>'; }).join('')
      + '</div>' : '';

  var actionsHtml = '';
  if (showActions === 'gallery') {
    actionsHtml = '<div style="display:grid;grid-template-columns:1fr 2fr;gap:10px">'
      + '<button class="btn bg" style="border:1px solid var(--s2);justify-content:center;padding:13px" onclick="closeProfileModal();rejectProfile(\'' + p.id + '\')">' + ICONS.x + ' Tolak</button>'
      + '<button class="btn bp" style="justify-content:center;padding:13px" data-pid="' + p.id + '" data-name="' + (p.name||p.code||'') + '" onclick="closeProfileModal();handleLamar(this)">' + ICONS.heart + ' Lamar</button>'
      + '</div>';
  } else if (showActions === 'chat') {
    actionsHtml = '<button class="btn bg" style="width:100%;justify-content:center;padding:13px;border:1px solid var(--s2)" onclick="closeProfileModal()">' + ICONS.chat + ' Kembali ke Sembang</button>';
  }

  return '<div id="profile-view-modal" style="display:flex;position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:16px">'
    + '<div style="background:#fff;border-radius:20px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.35)">'
    + '<div style="position:relative;background:#111;overflow:hidden;border-radius:20px 20px 0 0">'
    + '<div id="pm-photo-wrap">' + photoPart(0) + '</div>'
    + dotsHtml
    + (photos.length > 1 ? '<div style="position:absolute;inset:0;display:flex;cursor:pointer;pointer-events:none"><div style="flex:1;pointer-events:auto" onclick="pmPrev()"></div><div style="flex:1;pointer-events:auto" onclick="pmNext()"></div></div>' : '')
    + '<button onclick="closeProfileModal()" style="position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.5);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10">' + ICONS.x + '</button>'
    + (p.score ? '<div style="position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,.5);color:#fff;padding:6px 12px;border-radius:20px;font-size:13px;font-weight:700;backdrop-filter:blur(4px)">' + ICONS.heart + ' ' + p.score + '%</div>' : '')
    + '</div>'
    + '<div style="padding:20px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    + '<div><div style="font-family:var(--fm);font-weight:700;font-size:22px">' + (p.name || 'Ahli Jodohku') + '</div>'
    + '<div style="color:var(--im);font-size:13px">' + (p.age ? p.age + ' tahun' : '') + (p.state ? ' &bull; ' + p.state.replace(/_/g,' ') : '') + '</div></div>'
    + '<div style="display:flex;gap:6px"><span class="badge ' + tierClass + '">' + (p.tier||'rahmah').toUpperCase() + '</span>'
    + (p.t20 ? '<span class="badge b-ver">T20</span>' : '') + '</div>'
    + '</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">'
    + (p.edu    ? '<span class="chip">' + ICONS.edu  + p.edu.replace(/_/g,' ')  + '</span>' : '')
    + (p.job    ? '<span class="chip">' + ICONS.work + p.job                    + '</span>' : '')
    + (p.status ? '<span class="chip">' + p.status + '</span>' : '')
    + (p.online ? '<span class="chip" style="color:var(--e7)"><span class="online-dot" style="display:inline-block;margin-right:4px"></span>Dalam Talian</span>' : '')
    + '</div>'
    + (p.bio ? '<p style="font-size:14px;color:var(--is);line-height:1.6;margin-bottom:16px">' + p.bio + '</p>' : '')
    + (p.tip ? '<div class="wtip" style="margin-bottom:16px">' + ICONS.sparkle + '<span>' + p.tip + '</span></div>' : '')
    + actionsHtml
    + '</div></div></div>';
}

function viewProfile(userId) {
  var p = profiles.find(function(x){ return x.id === userId; });
  if (!p) return;
  var existing = document.getElementById('profile-view-modal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', _buildProfileModal(p, 'gallery'));
  document.getElementById('profile-view-modal').addEventListener('click', function(e) {
    if (e.target === this) closeProfileModal();
  });
}

async function viewPartnerProfile(userId) {
  // First check if we already have it in profiles array
  var p = profiles.find(function(x){ return x.id === userId; });

  if (!p) {
    // Try fetching from gallery compatibility endpoint
    var res = await apiFetch('/gallery/compatibility/' + userId);
    if (res && res.ok) {
      var d = await res.json();
      p = {
        id:        userId,
        name:      d.display_name || d.name || '',
        age:       d.age || '',
        state:     d.state_of_residence || d.state || '',
        edu:       d.education_level || '',
        job:       d.occupation || '',
        status:    d.marital_status || '',
        tier:      (d.current_tier || 'rahmah').toLowerCase(),
        t20:       d.is_verified_t20 || false,
        score:     d.compatibility_score ? Math.round(d.compatibility_score * 100) : null,
        online:    d.is_online || false,
        bio:       d.bio_text || d.bio || '',
        tip:       d.wingman_tip || '',
        photo_url: (d.photos && d.photos[0] && d.photos[0].url) || d.photo_url || null,
        photos:    d.photos || [],
      };
    }
  }

  if (!p) {
    // Fallback: build minimal profile from convos data
    var c = convos.find(function(x){ return x.partner_user_id === userId; });
    if (c) {
      p = {
        id:        userId,
        name:      c.partner_code_name || '',
        age:       '',
        state:     '',
        edu:       '',
        job:       '',
        status:    '',
        tier:      c.partner_tier || 'rahmah',
        t20:       false,
        score:     null,
        online:    c.is_online || false,
        bio:       '',
        tip:       '',
        photo_url: c.partner_photo_url || null,
        photos:    c.partner_photo_url ? [{url: c.partner_photo_url}] : [],
      };
    }
  }

  if (!p) { showToast('Profil tidak dijumpai.', 'warn'); return; }

  var existing = document.getElementById('profile-view-modal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', _buildProfileModal(p, 'chat'));
  document.getElementById('profile-view-modal').addEventListener('click', function(e) {
    if (e.target === this) closeProfileModal();
  });
}

function pmPrev() {
  if (!_pmPhotos.length) return;
  _pmIdx = (_pmIdx - 1 + _pmPhotos.length) % _pmPhotos.length;
  var w = document.getElementById('pm-photo-wrap');
  if (w) w.innerHTML = '<img id="pm-img" src="' + _pmPhotos[_pmIdx].url + '" style="width:100%;height:300px;object-fit:cover;cursor:zoom-in" onclick="viewOwnPhoto(\'' + _pmPhotos[_pmIdx].url + '\')" title="Lihat penuh">';
  _pmPhotos.forEach(function(_,i){ var d=document.getElementById('pmd'+i); if(d) d.style.background=i===_pmIdx?'#fff':'rgba(255,255,255,.4)'; });
}

function pmNext() {
  if (!_pmPhotos.length) return;
  _pmIdx = (_pmIdx + 1) % _pmPhotos.length;
  var w = document.getElementById('pm-photo-wrap');
  if (w) w.innerHTML = '<img id="pm-img" src="' + _pmPhotos[_pmIdx].url + '" style="width:100%;height:300px;object-fit:cover;cursor:zoom-in" onclick="viewOwnPhoto(\'' + _pmPhotos[_pmIdx].url + '\')" title="Lihat penuh">';
  _pmPhotos.forEach(function(_,i){ var d=document.getElementById('pmd'+i); if(d) d.style.background=i===_pmIdx?'#fff':'rgba(255,255,255,.4)'; });
}

function closeProfileModal() {
  var m = document.getElementById('profile-view-modal');
  if (m) m.remove();
}

function viewOwnPhoto(url) {
  var existing = document.getElementById('photo-lightbox');
  if (existing) existing.remove();
  var lb = document.createElement('div');
  lb.id = 'photo-lightbox';
  lb.style.cssText = 'display:flex;position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.92);align-items:center;justify-content:center;cursor:zoom-out';
  lb.innerHTML = '<img src="' + url + '" style="max-width:92vw;max-height:92vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.6)">'
    + '<button onclick="document.getElementById(\'photo-lightbox\').remove()" style="position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.15);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center">' + ICONS.x + '</button>';
  lb.addEventListener('click', function(e) { if (e.target === lb) lb.remove(); });
  document.body.appendChild(lb);
}


function buildChatPage() {
  if (activeChatIdx >= convos.length) activeChatIdx = 0;
  var ac = convos.length > 0 ? convos[activeChatIdx] : null;

  var h = '<div class="chat-wrap">'
    + '<div class="chat-list active">'
    + '<div class="chat-list-hd"><h2>Sembang</h2></div>'
    + '<div class="chat-items">';

  if (convos.length === 0) {
    h += '<div style="padding:48px 24px;text-align:center">'
      + '<div style="width:56px;height:56px;border-radius:50%;background:var(--s1);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">' + ICONS.chat + '</div>'
      + '<h3 style="font-family:var(--fd);font-size:18px;margin-bottom:8px">Tiada Perbualan Lagi</h3>'
      + '<p style="color:var(--is);font-size:14px">Lamar calon dari Bilik Pameran untuk mula berbual.</p></div>';
  }

  convos.forEach(function(c, i) {
    var code = c.partner_display_name || c.partner_code_name || '??';
    var online = c.is_online || false;
    var lastMsg = c.last_message || '';
    var time = c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : '';
    var unread = c.unread_count || 0;
    var photoUrl = c.partner_photo_url || null;
    var partnerId = c.partner_user_id || '';

    var avatarHtml = photoUrl
      ? '<div class="ch-av" style="background:none;padding:0;overflow:hidden;cursor:pointer" onclick="event.stopPropagation();viewOwnPhoto(\'' + photoUrl + '\')"><img src="' + photoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
        + (online ? '<span class="online-dot" style="position:absolute;bottom:0;right:0;width:8px;height:8px;border:2px solid #fff"></span>' : '') + '</div>'
      : '<div class="ch-av">' + code.slice(0, 2)
        + (online ? '<span class="online-dot" style="position:absolute;bottom:0;right:0;width:8px;height:8px;border:2px solid #fff"></span>' : '') + '</div>';

    h += '<div class="ch-i' + (i === activeChatIdx ? ' on' : '') + '" onclick="activeChatIdx=' + i + ';loadAndShowChat()">'
      + avatarHtml
      + '<div class="ch-info"><div class="ch-name">' + code + '</div><div class="ch-last">' + lastMsg + '</div></div>'
      + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">'
      + '<span class="ch-time">' + time + '</span>'
      + (unread ? '<span class="ch-unread">' + unread + '</span>' : '') + '</div></div>';
  });

  h += '</div></div>';

  // Chat area
  h += '<div class="chat-area' + (ac ? ' active' : '') + '">';

  if (!ac) {
    h += '<div style="display:flex;align-items:center;justify-content:center;flex:1;flex-direction:column;gap:12px;color:var(--im)">'
      + ICONS.chat + '<p style="font-size:14px">Pilih perbualan</p></div>';
  } else {
    var code      = ac.partner_display_name || ac.partner_code_name || '??';
    var online    = ac.is_online || false;
    var score     = ac.compatibility_score ? Math.round(ac.compatibility_score * 100) : null;
    var photoUrl  = ac.partner_photo_url || null;
    var partnerId = ac.partner_user_id || '';

    var hdAvatarHtml = photoUrl
      ? '<div class="ch-av" style="width:38px;height:38px;background:none;padding:0;overflow:hidden;cursor:pointer" onclick="viewPartnerProfile(\'' + partnerId + '\')" title="Lihat profil"><img src="' + photoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"></div>'
      : '<div class="ch-av" style="width:38px;height:38px;font-size:10px;cursor:pointer" onclick="viewPartnerProfile(\'' + partnerId + '\')" title="Lihat profil">' + code.slice(0, 2) + '</div>';

    h += '<div class="chat-hd">'
      + '<button class="btn bg mob-back-btn" onclick="showChatList()" style="display:none;padding:6px 8px">' + ICONS.back + '</button>'
      + hdAvatarHtml
      + '<div style="flex:1;cursor:pointer" onclick="viewPartnerProfile(\'' + partnerId + '\')">'
      + '<div style="font-family:var(--fm);font-size:13px;font-weight:600">' + code + '</div>'
      + '<div style="font-size:12px;color:' + (online ? 'var(--e5)' : 'var(--im)') + '">' + (online ? 'Dalam Talian' : 'Luar Talian') + '</div></div>'
      + (score ? '<span class="badge b-gld">' + ICONS.heart + ' ' + score + '%</span>' : '')
      + '</div>';

    h += '<div class="chat-msgs" id="chat-msgs">';
    if (msgs.length === 0) {
      h += '<div style="text-align:center;padding:40px;color:var(--im);font-size:14px">Tiada mesej lagi. Mulakan perbualan!</div>';
    }
    msgs.forEach(function(m) {
      h += '<div class="msg ' + (m.mine ? 'mine' : 'them') + '">'
        + (m.ice ? '<div class="msg-ice">&#10052; Ice Breaker</div>' : '')
        + '<div class="msg-b">' + (m.content || m.text || '') + '</div>'
        + '<div class="msg-t">' + (m.time || '') + (m.mine ? ' <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</div>'
        + '</div>';
    });
    h += '</div>';
    h += '<div class="chat-inp"><input class="inp" id="msg-inp" placeholder="Taip mesej..." onkeydown="if(event.key===\'Enter\')sendMsg()"><button class="btn bp send-btn" onclick="sendMsg()">' + ICONS.send + '</button></div>';
    h += '<div class="chat-notice">Hanya teks dan emoji. Pautan dan nombor telefon disekat.</div>';
  }

  h += '</div></div>';
  return h;
}

/* ── Profile Page ── */
function buildProfilePage() {
  var user = currentUser || Auth.getUser() || {};
  var code  = user.code_name || '---';
  var tier  = user.current_tier ? user.current_tier.toUpperCase() : 'RAHMAH';
  var completion = user.profile_completion || 0;
  var badgeClass = tier === 'GOLD' ? 'b-gld' : tier === 'PLATINUM' ? 'b-plt' : tier === 'PREMIUM' ? 'b-prm' : 'b-rah';

  var states = ['johor','kedah','kelantan','melaka','negeri_sembilan','pahang','perak','perlis','pulau_pinang','sabah','sarawak','selangor','terengganu','wp_kuala_lumpur','wp_putrajaya','wp_labuan'];
  var eduLevels = ['spm','diploma','ijazah','master','phd','lain'];
  var incomeRanges = ['below_2k','2k_5k','5k_10k','10k_20k','above_20k'];
  var maritalOpts = ['bujang','duda','janda'];
  var hobbyOpts = ['Mendaki','Fotografi','Membaca','Melancong','Gym','Memasak','Muzik','Sukan','Berkebun','Melukis','Mengembara','Masak'];

  // Permanent = set once, cannot change. Editable = can always change.
  var isPermanent = {
    gender: !!(user.gender),
    date_of_birth: !!(user.date_of_birth),
    marital_status: !!(user.marital_status),
  };

  function sel(id, opts, val, label, locked) {
    if (locked && val) {
      return '<div style="margin-bottom:14px"><label class="lbl">' + label + ' <span style="font-size:10px;color:var(--g5);font-weight:600"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Tetap</span></label>'
        + '<div class="inp" style="background:var(--s1);color:var(--is);cursor:not-allowed">'
        + val.replace(/_/g,' ').replace(/\b\w/g, function(c){return c.toUpperCase()}) + '</div></div>';
    }
    return '<div style="margin-bottom:14px"><label class="lbl">' + label + '</label>'
      + '<select id="' + id + '" class="inp" style="cursor:pointer">'
      + '<option value="">-- Pilih --</option>'
      + opts.map(function(o) { return '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o.replace(/_/g,' ').replace(/\b\w/g, function(c){return c.toUpperCase()}) + '</option>'; }).join('')
      + '</select></div>';
  }

  function inp(id, val, label, type, placeholder, locked) {
    if (locked && val) {
      return '<div style="margin-bottom:14px"><label class="lbl">' + label + ' <span style="font-size:10px;color:var(--g5);font-weight:600"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Tetap</span></label>'
        + '<div class="inp" style="background:var(--s1);color:var(--is);cursor:not-allowed">' + val + '</div></div>';
    }
    return '<div style="margin-bottom:14px"><label class="lbl">' + label + '</label>'
      + '<input id="' + id + '" class="inp" type="' + (type||'text') + '" value="' + (val||'') + '" placeholder="' + (placeholder||'') + '"></div>';
  }

  var selectedHobbies = user.hobbies || [];
  var displayName = user.display_name || code;
  var photoUrl = user.photo_url || (user.photos && user.photos[0] && user.photos[0].url) || null;
  var answered = quizProgress.answered || 0;
  var quizPct = quizProgress.percentage || 0;
  var quizUnlocked = quizProgress.gallery_unlocked || false;

  return '<div style="max-width:620px;margin:0 auto">'
    // ── Header card ──
    + '<div style="background:#fff;border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);margin-bottom:20px">'
    + '<div style="height:120px;background:linear-gradient(135deg,var(--n5),var(--n9));position:relative">'
    + '<div style="position:absolute;bottom:-36px;left:20px">'
    + '<div style="position:relative;width:80px;height:80px">'
    + '<div id="pf-avatar" style="width:80px;height:80px;border-radius:50%;border:4px solid #fff;background:#E8ECF4;display:flex;align-items:center;justify-content:center;box-shadow:var(--sh2);overflow:hidden;cursor:' + (photoUrl ? 'pointer' : 'default') + '"' + (photoUrl ? ' onclick="viewOwnPhoto(\'' + photoUrl + '\')" title="Lihat gambar penuh"' : '') + '>'
    + (photoUrl ? '<img src="' + photoUrl + '" style="width:100%;height:100%;object-fit:cover">'
        : '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--n5)" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>')
    + '</div>'
    + '<label title="Tukar gambar" style="position:absolute;bottom:0;right:0;width:24px;height:24px;border-radius:50%;background:var(--g5);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.2)">'
    + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'
    + '<input type="file" accept="image/*" style="display:none" onchange="uploadProfilePhoto(this)">'
    + '</label></div></div></div>'
    + '<div style="padding:44px 20px 20px;display:flex;align-items:center;justify-content:space-between">'
    + '<div><div style="display:flex;align-items:center;gap:10px">'
    + '<span id="pf-header-name" style="font-family:var(--fm);font-weight:700;font-size:22px;color:var(--n5)">' + displayName + '</span>'
    + '<span class="badge ' + badgeClass + '">' + tier + '</span></div>'
    + '<div style="font-size:13px;color:var(--im);margin-top:4px">' + (user.email || '') + '</div></div></div></div>'

    // ── Completion banner ──
    + '<div class="card" style="margin-bottom:20px;background:rgba(255,249,230,.5);border:1px solid rgba(200,162,60,.2)">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    + '<div style="display:flex;align-items:center;gap:8px">' + ICONS.sparkle
    + '<span style="font-weight:600;font-size:14px;color:var(--g7)">Profil ' + completion + '% lengkap</span></div></div>'
    + '<div class="progress"><div class="progress-fill" style="width:' + completion + '%"></div></div>'
    + '<p style="font-size:12px;color:var(--g7);margin-top:6px">Lengkapkan profil untuk mendapat padanan yang lebih baik.</p></div>'

    // ── SECTION 1: Maklumat Tetap (permanent) ──
    + '<div class="card" style="margin-bottom:20px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    + '<h3 style="font-family:var(--fd);font-weight:600;font-size:18px;margin:0">Maklumat Asas</h3>'
    + '<span style="font-size:11px;color:var(--im);background:var(--s1);padding:4px 10px;border-radius:20px"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Tetap selepas disimpan</span>'
    + '</div>'
    + '<p style="font-size:12px;color:var(--im);margin-bottom:16px;padding:10px;background:#FFF9E6;border-radius:var(--rs);border-left:3px solid var(--g5)">Maklumat ini penting untuk padanan yang tepat dan <strong>tidak boleh diubah</strong> selepas disimpan buat kali pertama.</p>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + sel('pf-gender', ['lelaki','perempuan'], user.gender, 'Jantina', isPermanent.gender)
    + inp('pf-dob', user.date_of_birth, 'Tarikh Lahir', 'date', '', isPermanent.date_of_birth)
    + sel('pf-marital', maritalOpts, user.marital_status, 'Status Perkahwinan', isPermanent.marital_status)
    + inp('pf-height', user.height_cm, 'Tinggi (cm)', 'number', '170', false)
    + '</div>'
    + '<button class="btn bp" style="width:100%;padding:13px 0" onclick="savePermanentFields()">Simpan Maklumat Asas</button>'
    + '</div>'

    // ── SECTION 2: Maklumat Boleh Ubah ──
    + '<div class="card" style="margin-bottom:20px">'
    + '<h3 style="font-family:var(--fd);font-weight:600;font-size:18px;margin-bottom:20px">Maklumat Peribadi</h3>'
    + inp('pf-display-name', user.display_name, 'Nama Paparan (max 16 aksara)', 'text', 'Contoh: Ahmad', false)
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + sel('pf-state', states, user.state_of_residence, 'Negeri Kediaman', false)
    + sel('pf-edu', eduLevels, user.education_level, 'Tahap Pendidikan', false)
    + inp('pf-job', user.occupation, 'Pekerjaan', 'text', 'Contoh: Jurutera', false)
    + sel('pf-income', incomeRanges, user.income_range, 'Julat Pendapatan', false)
    + '</div>'
    + '<div style="margin-bottom:14px"><label class="lbl">Bio (max 500 aksara)</label>'
    + '<textarea id="pf-bio" class="inp" rows="3" style="resize:vertical" placeholder="Ceritakan sedikit tentang diri anda...">' + (user.bio_text || '') + '</textarea></div>'
    + '<button class="btn bp" style="width:100%;padding:13px 0" onclick="saveProfile()">Simpan Maklumat</button>'
    + '</div>'

    // ── SECTION 3: Hobbies ──
    + '<div class="card" style="margin-bottom:20px">'
    + '<h3 style="font-family:var(--fd);font-weight:600;font-size:18px;margin-bottom:16px">Hobi &amp; Minat</h3>'
    + '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">'
    + hobbyOpts.map(function(h) {
        var active = selectedHobbies.indexOf(h) > -1;
        return '<button data-active="' + (active ? '1' : '0') + '" onclick="toggleHobby(this,\'' + h + '\')" style="padding:7px 14px;border-radius:20px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid ' + (active ? 'var(--g5)' : 'var(--s2)') + ';background:' + (active ? 'var(--g50)' : '#fff') + ';color:' + (active ? 'var(--g7)' : 'var(--is)') + '">' + h + '</button>';
      }).join('')
    + '</div>'
    + '<button class="btn bp" style="width:100%;padding:13px 0" onclick="saveHobbies()">Simpan Hobi</button>'
    + '</div>'

    // ── SECTION 4: Kuiz Psikometrik ──
    + '<div class="card" style="margin-bottom:20px;border:1px solid ' + (quizUnlocked ? 'rgba(52,168,83,.2)' : 'rgba(200,162,60,.2)') + ';background:' + (quizUnlocked ? 'rgba(230,245,237,.3)' : 'rgba(255,249,230,.3)') + '">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
    + '<div style="display:flex;align-items:center;gap:10px">' + ICONS.sparkle
    + '<div><div style="font-weight:600;font-size:15px">Kuiz Serasi</div>'
    + '<div style="font-size:12px;color:var(--im)">' + answered + '/10 soalan dijawab</div></div></div>'
    + '<button class="btn bp" style="padding:8px 16px;font-size:13px" onclick="openQuizModal()">'    + (answered === 0 ? 'Mula Kuiz' : answered >= 10 ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Selesai' : 'Teruskan') + '</button>'
    + '</div>'
    + '<div class="progress"><div class="progress-fill" style="width:' + quizPct + '%;background:' + (quizUnlocked ? 'var(--e4)' : 'var(--g5)') + '"></div></div>'
    + (quizUnlocked
        ? '<p style="font-size:12px;color:var(--e7);margin-top:8px;font-weight:500"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Bilik Pameran telah dibuka!</p>'
        : '<p style="font-size:12px;color:var(--g7);margin-top:8px">Jawab ' + Math.max(0, 10 - (quizProgress.answered||0)) + ' lagi soalan untuk membuka Bilik Pameran.</p>')
    + '</div>'

    // ── Quiz Modal ──
    + modal('modal-quiz', 'Kuiz Serasi', buildQuizModalContent())

    + '</div>';
}
/* ── Payment Page ── */
function buildPaymentPage() {
  var user = currentUser || Auth.getUser() || {};
  var tier = user.current_tier ? user.current_tier.toLowerCase() : 'rahmah';

  var plans = [
    { n: 'Gold',     p: 'RM39.99',    d: '30 Hari', key: 'gold',     f: ['30 paparan/hari','10 sembang','WhatsApp','Tanpa iklan'] },
    { n: 'Platinum', p: 'RM69.99',    d: '60 Hari', key: 'platinum', s: '12%', f: ['Tanpa had','Keutamaan carian','Video ta\'aruf'] },
    { n: 'Premium',  p: 'RM101.99',   d: '90 Hari', key: 'premium',  s: '15%', f: ['Semua Platinum','Laporan PDF','3 Golden Ticket'] },
    { n: 'Sovereign',p: 'RM1,299.99', d: '30 Hari', key: 'sovereign',f: ['Human Matchmaker','CTOS','Mod Halimunan'] },
  ];

  var h = '<div style="max-width:760px;margin:0 auto">'
    + '<h1 style="font-family:var(--fd);font-weight:700;font-size:24px;margin-bottom:20px">Langganan</h1>'
    + '<div class="card" style="background:rgba(255,249,230,.5);border:1px solid rgba(200,162,60,.2);margin-bottom:12px;display:flex;align-items:center;gap:14px">'
    + '<div style="width:44px;height:44px;border-radius:50%;background:rgba(200,162,60,.1);display:flex;align-items:center;justify-content:center">' + ICONS.payment + '</div>'
    + '<div><div style="font-weight:600">Pelan Semasa: ' + tier.toUpperCase() + '</div>'
    + '<div style="font-size:13px;color:var(--is)">Klik Langgan untuk naik taraf</div></div></div>'
    + '<div class="card" style="background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.25);margin-bottom:20px;display:flex;align-items:center;gap:12px;padding:12px 16px">'
    + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    + '<div style="font-size:13px;color:#1d4ed8"><strong>Mod Sandbox ToyyibPay</strong> — Pembayaran ujian sahaja. Tiada wang sebenar dikenakan.</div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">';

  plans.forEach(function(t) {
    var isCur = t.key === tier;
    h += '<div class="card" style="border:' + (isCur ? '2px solid var(--g5)' : '1px solid var(--s2)') + '">'
      + '<div style="font-family:var(--fd);font-weight:700;font-size:17px;margin-bottom:4px">' + t.n + '</div>'
      + (t.s ? '<span style="background:#E6F5ED;color:var(--e7);font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px">Jimat ' + t.s + '</span>' : '')
      + '<div style="font-family:var(--fd);font-weight:700;font-size:22px;color:var(--n5);margin-top:6px">' + t.p + '</div>'
      + '<div style="font-size:12px;color:var(--im);margin-bottom:10px">' + t.d + '</div>'
      + '<ul style="list-style:none;padding:0;margin-bottom:14px">' + t.f.map(function(f) { return '<li style="font-size:13px;color:var(--is);padding:3px 0;display:flex;gap:6px">' + ICONS.check + f + '</li>'; }).join('') + '</ul>'
      + '<button class="btn ' + (isCur ? 'bg' : 'bp') + '" style="width:100%;' + (isCur ? 'border:1px solid var(--s2);opacity:.6;' : '') + 'justify-content:center;padding:12px"'
      + (isCur ? '' : ' onclick="showPaymentModal(\'' + t.key + '\',\'' + t.n + '\',\'' + t.p + '\')"')
      + '>' + (isCur ? 'Pelan Semasa' : 'Langgan') + '</button>'
      + '</div>';
  });

  h += '</div></div>';
  return h;
}

function showPaymentModal(tierKey, tierName, tierPrice) {
  var existing = document.getElementById('payment-sandbox-modal');
  if (existing) existing.remove();
  var modal = document.createElement('div');
  modal.id = 'payment-sandbox-modal';
  modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:16px';
  modal.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:440px;padding:24px;box-shadow:0 24px 64px rgba(0,0,0,.35);max-height:90vh;overflow-y:auto">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    + '<div style="font-family:var(--fm);font-weight:700;font-size:18px;color:var(--n5)">Pembayaran</div>'
    + '<button onclick="document.getElementById(\'payment-sandbox-modal\').remove()" style="width:28px;height:28px;border-radius:50%;background:var(--s1);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">' + ICONS.x + '</button>'
    + '</div>'
    + '<div style="background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.2);border-radius:10px;padding:12px;margin-bottom:16px;font-size:13px;color:#1d4ed8">'
    + '<strong>&#9888; Mod Sandbox ToyyibPay</strong> &mdash; Persekitaran ujian. Tiada wang sebenar dikenakan.'
    + '</div>'
    + '<div style="background:var(--s1);border-radius:10px;padding:14px;margin-bottom:16px">'
    + '<div style="font-size:12px;color:var(--im);margin-bottom:4px">Pelan yang dipilih</div>'
    + '<div style="font-weight:700;font-size:16px">' + tierName + ' &mdash; ' + tierPrice + '</div>'
    + '</div>'
    + '<div style="margin-bottom:14px">'
    + '<label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Nama Pemegang Kad</label>'
    + '<input class="inp" id="pay-name" placeholder="Nama anda">'
    + '</div>'
    + '<div style="margin-bottom:14px">'
    + '<label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Nombor Kad (Ujian)</label>'
    + '<input class="inp" id="pay-card" value="4111 1111 1111 1111" style="font-family:monospace;letter-spacing:1px">'
    + '<div style="font-size:11px;color:var(--im);margin-top:4px">Visa Ujian: 4111 1111 1111 1111</div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">'
    + '<div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Tarikh Luput</label>'
    + '<input class="inp" id="pay-exp" value="12/28" placeholder="MM/YY"></div>'
    + '<div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">CVV</label>'
    + '<input class="inp" id="pay-cvv" value="123" placeholder="123"></div>'
    + '</div>'
    + '<div style="background:rgba(52,168,83,.06);border:1px solid rgba(52,168,83,.2);border-radius:8px;padding:10px;margin-bottom:16px;font-size:12px;color:#166534">'
    + '&#128274; Diproses melalui <strong>ToyyibPay Sandbox</strong>. Data ujian sahaja &mdash; tiada transaksi sebenar.'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 2fr;gap:10px">'
    + '<button class="btn bg" style="border:1px solid var(--s2);justify-content:center;padding:12px" onclick="document.getElementById(\'payment-sandbox-modal\').remove()">Batal</button>'
    + '<button id="pay-submit-btn" class="btn bp" style="justify-content:center;padding:12px" onclick="processSandboxPayment(\'' + tierKey + '\')">' + ICONS.payment + ' Bayar Sekarang</button>'
    + '</div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  var nameEl = document.getElementById('pay-name');
  if (nameEl && currentUser) nameEl.value = currentUser.full_name || currentUser.code_name || '';
}

async function processSandboxPayment(tierKey) {
  var btn  = document.getElementById('pay-submit-btn');
  var card = ((document.getElementById('pay-card')  || {}).value || '').replace(/\s/g,'');
  var exp  = (document.getElementById('pay-exp')   || {}).value || '';
  var cvv  = (document.getElementById('pay-cvv')   || {}).value || '';
  var name = (document.getElementById('pay-name')  || {}).value || '';
  if (card.length < 12) { showToast('Sila masukkan nombor kad yang sah.', 'error'); return; }
  if (!exp)             { showToast('Sila masukkan tarikh luput.', 'error'); return; }
  if (cvv.length < 3)  { showToast('Sila masukkan CVV yang sah.', 'error'); return; }
  if (!name)            { showToast('Sila masukkan nama pemegang kad.', 'error'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }
  var res = await apiFetch('/payment/create-bill', {
    method: 'POST',
    body: JSON.stringify({ tier: tierKey })
  });
  var modal = document.getElementById('payment-sandbox-modal');
  if (res && res.ok) {
    var d = await res.json();
    if (d.payment_url) {
      if (modal) modal.remove();
      showToast('Mengalihkan ke ToyyibPay Sandbox...', 'info');
      setTimeout(function() { window.location.href = d.payment_url; }, 800);
    } else if (d.success) {
      if (modal) modal.remove();
      showToast('Langganan ' + tierKey.toUpperCase() + ' berjaya diaktifkan!', 'success');
      currentUser = null; await apiLoadProfile();
      _go('payment');
    } else {
      showToast(d.error || 'Gagal membuat bil. Cuba semula.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Bayar Sekarang'; }
    }
  } else {
    var errData = {};
    try { if (res) errData = await res.json(); } catch(e2) {}
    showToast(errData.detail || errData.error || 'Ralat sambungan. Cuba semula.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Bayar Sekarang'; }
  }
}

/* ── Notifications Page ── */
function buildNotifPage() {
  var unread = notifs.filter(function(n) { return !n.read; }).length;
  var h = '<div style="max-width:620px;margin:0 auto">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'
    + '<h1 style="font-family:var(--fd);font-weight:700;font-size:24px">Notifikasi</h1>'
    + (unread ? '<button class="btn bg" style="font-size:13px" onclick="markAllRead()">' + ICONS.check + ' Tandai Semua</button>' : '')
    + '</div>';

  if (notifs.length === 0) {
    h += '<div class="card" style="text-align:center;padding:40px">' + ICONS.notif
      + '<p style="color:var(--im);font-size:14px;margin-top:12px">Tiada notifikasi lagi.</p></div>';
  }

  notifs.forEach(function(n, i) {
    var isLamar = n.type === 'lamar_received';
    var isAccepted = n.type === 'lamar_accepted';
    var isRejected = n.type === 'lamar_rejected';

    var ic = isLamar    ? ICONS.heart
           : isAccepted ? ICONS.check
           : n.type === 'new_message' ? ICONS.chat
           : n.type === 'profile_viewed' ? ICONS.eye
           : ICONS.notif;

    var iconBg = isLamar    ? 'rgba(200,162,60,.15)'
               : isAccepted ? 'rgba(52,168,83,.12)'
               : isRejected ? 'rgba(239,68,68,.1)'
               : (n.read ? 'var(--s1)' : 'var(--g50)');

    h += '<div class="card" style="margin-bottom:8px;'
      + 'background:' + (n.read ? '#fff' : (isLamar ? 'rgba(255,249,230,.4)' : 'rgba(255,249,230,.3)')) + ';'
      + 'border:' + (n.read ? 'none' : '1px solid rgba(200,162,60,.15)') + '">';

    h += '<div style="display:flex;align-items:flex-start;gap:14px" onclick="markRead(' + i + ')" style="cursor:pointer">'
      + '<div style="width:38px;height:38px;border-radius:50%;background:' + iconBg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">' + ic + '</div>'
      + '<div style="flex:1"><div style="font-weight:600;font-size:14px">' + (n.title || '') + '</div>'
      + '<div style="font-size:13px;color:var(--is);margin-top:2px">' + (n.body || '') + '</div>'
      + '<div style="font-size:11px;color:var(--im);margin-top:4px">' + (n.time || '') + '</div>'
      + '</div>'
      + (!n.read ? '<div style="width:8px;height:8px;background:var(--g5);border-radius:50%;margin-top:8px;flex-shrink:0"></div>' : '')
      + '</div>';

    // Accept / Reject buttons for pending lamar
    if (isLamar && n.conversation_id && !n.actioned) {
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">'
        + '<button id="reject-btn-' + i + '" class="btn bg" style="border:1px solid var(--s2);justify-content:center;padding:10px;font-size:13px" onclick="rejectLamar(\'' + n.conversation_id + '\',' + i + ')">' + ICONS.x + ' Tolak</button>'
        + '<button id="accept-btn-' + i + '" class="btn bp" style="justify-content:center;padding:10px;font-size:13px" onclick="acceptLamar(\'' + n.conversation_id + '\',' + i + ')">' + ICONS.heart + ' Terima</button>'
        + '</div>';
    }

    if (isLamar && n.actioned) {
      h += '<div style="font-size:12px;color:var(--im);margin-top:8px;text-align:center">'
        + (n.accepted ? 'Diterima — anda kini boleh berbual.' : 'Ditolak.') + '</div>';
    }

    h += '</div>';
  });

  return h + '</div>';
}

/* ── Settings Page ── */
function buildSettingsPage() {
  var user = currentUser || Auth.getUser() || {};
  var tier = (user.current_tier || 'rahmah').toUpperCase();
  var isVerified = user.is_verified_t20 || false;
  var icVerified = user.ic_number ? true : false;

  function row(ic, label, desc, action, badge) {
    return '<div style="display:flex;align-items:center;gap:14px;padding:13px 10px;border-radius:var(--rb);cursor:' + (action ? 'pointer' : 'default') + ';transition:background .15s" '
      + (action ? 'onclick="' + action + '" onmouseover="this.style.background=\'var(--s1)\'" onmouseout="this.style.background=\'\'"' : '') + '>'
      + '<span style="color:var(--is);flex-shrink:0">' + ic + '</span>'
      + '<div style="flex:1"><div style="font-size:14px;font-weight:500">' + label + '</div>'
      + (desc ? '<div style="font-size:12px;color:var(--im);margin-top:2px">' + desc + '</div>' : '')
      + '</div>'
      + (badge ? badge : '')
      + (action ? ICONS.chevron : '')
      + '</div>';
  }

  function section(title, content) {
    return '<div class="card" style="margin-bottom:14px">'
      + '<div style="font-size:11px;font-weight:600;color:var(--im);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">' + title + '</div>'
      + content + '</div>';
  }

  return '<div style="max-width:620px;margin:0 auto">'
    + '<h1 style="font-family:var(--fd);font-weight:700;font-size:24px;margin-bottom:20px">Tetapan</h1>'

    // ── Akaun & Keselamatan ──
    + section('Akaun &amp; Keselamatan',
        row(ICONS.lock,
          'Tukar Kata Laluan',
          'Tukar kata laluan akaun anda',
          'openModal(\'modal-password\')')
      + row(ICONS.shield,
          'Pengesahan No. IC',
          icVerified ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> IC disahkan' : 'Masukkan No. Kad Pengenalan',
          'openModal(\'modal-ic\')',
          icVerified
            ? '<span class="badge b-ver" style="margin-right:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Disahkan</span>'
            : '<span class="badge b-rah" style="margin-right:4px">Belum</span>')
      + row(ICONS.shield,
          'Verified T20',
          isVerified ? 'Anda telah disahkan sebagai T20' : 'Mohon pengesahan T20',
          isVerified ? null : 'openModal(\'modal-t20\')',
          isVerified
            ? '<span class="badge b-ver" style="margin-right:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Disahkan</span>'
            : '<span class="badge b-rah" style="margin-right:4px">Belum</span>')
    )

    // ── Profil ──
    + section('Profil',
        row(ICONS.profile, 'Edit Profil', 'Kemaskini maklumat peribadi anda', 'go(\'profile\')')
      + row(ICONS.eye,
          'Privasi Profil',
          'Siapa boleh melihat profil anda',
          'openModal(\'modal-privacy\')')
      + row(ICONS.globe,
          'Bahasa',
          'Bahasa Melayu',
          'openModal(\'modal-language\')')
    )

    // ── Langganan ──
    + section('Langganan',
        row(ICONS.payment,
          'Urus Langganan',
          'Pelan semasa: ' + tier,
          'go(\'payment\')',
          '<span class="badge ' + (tier === 'GOLD' ? 'b-gld' : tier === 'PLATINUM' ? 'b-plt' : tier === 'PREMIUM' ? 'b-prm' : 'b-rah') + '" style="margin-right:4px">' + tier + '</span>')
    )

    // ── Mod Wali ──
    + section('Mod Wali/Mahram',
        row(ICONS.users,
          'Urus Mod Wali',
          user.wali_mode_enabled ? 'Mod wali aktif' : 'Tidak aktif — wali tidak terlibat',
          'openModal(\'modal-wali\')',
          '<span style="width:36px;height:20px;border-radius:10px;background:' + (user.wali_mode_enabled ? 'var(--e4)' : 'var(--s2)') + ';display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:4px"><span style="width:14px;height:14px;border-radius:50%;background:#fff;transform:translateX(' + (user.wali_mode_enabled ? '8px' : '-8px') + ');transition:transform .2s"></span></span>')
    )

    // ── Zon Bahaya ──
    + '<div class="card" style="border:1px solid #FECACA;margin-bottom:20px">'
    + '<div style="font-size:11px;font-weight:600;color:#EF4444;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Zon Bahaya</div>'
    + '<div style="display:flex;align-items:center;gap:14px;padding:13px 10px;border-radius:var(--rb);cursor:pointer;transition:background .15s" onclick="openModal(\'modal-pause\')" onmouseover="this.style.background=\'#FEF2F2\'" onmouseout="this.style.background=\'\'">'
    + '<span style="color:#F97316;flex-shrink:0">' + ICONS.notif + '</span>'
    + '<div style="flex:1"><div style="font-size:14px;font-weight:500;color:#F97316">Jeda Akaun</div><div style="font-size:12px;color:#F87171">Profil disembunyikan sementara, boleh diaktif semula</div></div>' + ICONS.chevron + '</div>'
    + '<div style="display:flex;align-items:center;gap:14px;padding:13px 10px;border-radius:var(--rb);cursor:pointer;transition:background .15s" onclick="openModal(\'modal-delete\')" onmouseover="this.style.background=\'#FEF2F2\'" onmouseout="this.style.background=\'\'">'
    + '<span style="color:#EF4444;flex-shrink:0">' + ICONS.trash + '</span>'
    + '<div style="flex:1"><div style="font-size:14px;font-weight:500;color:#EF4444">Padam Akaun</div><div style="font-size:12px;color:#F87171">Hak Untuk Dilupakan (PDPA) — tidak boleh diundur</div></div>' + ICONS.chevron + '</div>'
    + '</div>'

    + '<button class="btn bg" style="width:100%;color:#EF4444;justify-content:center;gap:8px;margin-bottom:40px" onclick="apiLogout()">'
    + ICONS.logout + ' Log Keluar</button>'

    // ══ MODALS ══
    + modal('modal-password', 'Tukar Kata Laluan',
        '<div style="margin-bottom:14px"><label class="lbl">Kata Laluan Semasa</label><input id="s-pw-curr" class="inp" type="password" placeholder="Kata laluan semasa"></div>'
      + '<div style="margin-bottom:14px"><label class="lbl">Kata Laluan Baharu</label><input id="s-pw-new" class="inp" type="password" placeholder="Min 8 aksara, huruf besar &amp; nombor"></div>'
      + '<div style="margin-bottom:20px"><label class="lbl">Sahkan Kata Laluan Baharu</label><input id="s-pw-conf" class="inp" type="password" placeholder="Ulang kata laluan baharu"></div>'
      + '<button class="btn bp" style="width:100%;padding:13px 0" onclick="submitChangePassword()">Tukar Kata Laluan</button>')

    + modal('modal-ic', 'Pengesahan No. Kad Pengenalan',
        '<p style="color:var(--is);font-size:14px;margin-bottom:16px">Masukkan nombor IC anda untuk mengesahkan identiti. Maklumat ini tidak dipaparkan kepada pengguna lain.</p>'
      + '<div style="margin-bottom:14px"><label class="lbl">No. Kad Pengenalan (tanpa sempang)</label><input id="ic-number" class="inp" type="text" placeholder="Contoh: 900101141234" maxlength="12" inputmode="numeric"></div>'
      + '<p style="font-size:12px;color:var(--im);margin-bottom:20px">&#9432; IC anda disimpan secara selamat dan dienkripsi. Hanya digunakan untuk pengesahan identiti.</p>'
      + '<button class="btn bp" style="width:100%;padding:13px 0" onclick="submitICVerification()">Sahkan IC</button>')

    + modal('modal-t20', 'Mohon Pengesahan T20',
        '<p style="color:var(--is);font-size:14px;margin-bottom:16px">T20 bermaksud pendapatan isi rumah melebihi RM10,000/bulan. Pengesahan ini memperkukuh kredibiliti profil anda.</p>'
      + '<div style="margin-bottom:14px"><label class="lbl">Nama Majikan / Syarikat</label><input id="t20-employer" class="inp" type="text" placeholder="Contoh: Petronas, Bank Negara"></div>'
      + '<div style="margin-bottom:14px"><label class="lbl">Jawatan</label><input id="t20-position" class="inp" type="text" placeholder="Contoh: Pengurus Kanan"></div>'
      + '<div style="margin-bottom:20px"><label class="lbl">Dokumen Sokongan</label><p style="font-size:12px;color:var(--im);margin-top:4px">Slip gaji / surat tawaran. Hantar kepada admin@jodohku.my untuk semakan.</p></div>'
      + '<button class="btn bp" style="width:100%;padding:13px 0" onclick="submitT20Request()">Hantar Permohonan</button>')

    + modal('modal-privacy', 'Tetapan Privasi Profil',
        '<p style="color:var(--is);font-size:14px;margin-bottom:20px">Pilih siapa yang boleh melihat profil anda.</p>'
      + ['Semua pengguna berdaftar','Hanya padanan 85%+ sahaja','Pengguna Gold dan ke atas sahaja'].map(function(opt, i) {
          return '<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:var(--rs);border:1px solid var(--s2);margin-bottom:8px;cursor:pointer" onclick="selectPrivacy(this,' + i + ')">'
            + '<div style="width:20px;height:20px;border-radius:50%;border:2px solid ' + (i===0?'var(--g5)':'var(--s2)') + ';display:flex;align-items:center;justify-content:center" id="priv-radio-' + i + '">'
            + (i===0?'<div style="width:10px;height:10px;border-radius:50%;background:var(--g5)"></div>':'')
            + '</div><span style="font-size:14px">' + opt + '</span></div>';
        }).join('')
      + '<button class="btn bp" style="width:100%;padding:13px 0;margin-top:8px" onclick="closeModal(\'modal-privacy\');showToast(\'Tetapan privasi disimpan.\',\'success\')">Simpan</button>')

    + modal('modal-language', 'Tetapan Bahasa',
        '<p style="color:var(--is);font-size:14px;margin-bottom:20px">Pilih bahasa paparan.</p>'
      + ['Bahasa Melayu','English'].map(function(lang, i) {
          return '<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:var(--rs);border:1px solid ' + (i===0?'var(--g5)':'var(--s2)') + ';margin-bottom:8px;cursor:pointer;background:' + (i===0?'var(--g50)':'#fff') + '">'
            + '<div style="width:20px;height:20px;border-radius:50%;border:2px solid ' + (i===0?'var(--g5)':'var(--s2)') + ';display:flex;align-items:center;justify-content:center">'
            + (i===0?'<div style="width:10px;height:10px;border-radius:50%;background:var(--g5)"></div>':'')
            + '</div><span style="font-size:14px;font-weight:' + (i===0?'600':'400') + '">' + lang + (i===0?' (Semasa)':'') + '</span></div>';
        }).join('')
      + '<button class="btn bp" style="width:100%;padding:13px 0;margin-top:8px" onclick="closeModal(\'modal-language\');showToast(\'Bahasa dikemaskini.\',\'success\')">Simpan</button>')

    + modal('modal-wali', 'Mod Wali/Mahram',
        '<p style="color:var(--is);font-size:14px;margin-bottom:16px">Apabila diaktifkan, wali anda akan menerima pemberitahuan dan boleh memantau perbualan anda.</p>'
      + '<div class="card" style="background:rgba(255,249,230,.5);border:1px solid rgba(200,162,60,.2);margin-bottom:20px">'
      + '<p style="font-size:13px;color:var(--g7);line-height:1.7"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Wali terima notifikasi setiap mesej<br><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Wali boleh menamatkan perbualan<br><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Lebih amanah dan terkawal</p></div>'
      + '<div style="margin-bottom:14px"><label class="lbl">Emel Wali/Mahram</label><input id="wali-email" class="inp" type="email" placeholder="wali@contoh.com"></div>'
      + '<div style="margin-bottom:14px"><label class="lbl">Nama Wali</label><input id="wali-name" class="inp" type="text" placeholder="Contoh: Ahmad bin Ibrahim"></div>'
      + '<div style="margin-bottom:20px"><label class="lbl">Hubungan</label>'
      + '<select id="wali-relation" class="inp" style="cursor:pointer"><option value="">-- Pilih --</option><option value="father">Bapa</option><option value="brother">Abang/Adik Lelaki</option><option value="uncle">Pak Cik</option><option value="grandfather">Datuk</option><option value="guardian">Penjaga</option></select></div>'
      + '<button class="btn bp" style="width:100%;padding:13px 0" onclick="submitWaliInvite()">Jemput Wali</button>')

    + modal('modal-pause', 'Jeda Akaun',
        '<p style="color:var(--is);font-size:14px;margin-bottom:16px">Profil anda akan disembunyikan dari galeri sehingga anda aktifkan semula. Data dan padanan anda akan dikekalkan.</p>'
      + '<div class="card" style="background:#FEF2F2;border:1px solid #FECACA;margin-bottom:20px">'
      + '<p style="font-size:13px;color:#B91C1C;line-height:1.7">&#9888; Langganan aktif anda akan terus berjalan semasa jeda.<br>&#9888; Anda masih akan dicaj sehingga tarikh tamat.</p></div>'
      + '<button class="btn" style="width:100%;padding:13px 0;background:#F97316;color:#fff;margin-bottom:10px" onclick="confirmPause()">Ya, Jeda Akaun Saya</button>'
      + '<button class="btn bg" style="width:100%;padding:13px 0" onclick="closeModal(\'modal-pause\')">Batal</button>')

    + modal('modal-delete', 'Padam Akaun',
        '<p style="color:var(--is);font-size:14px;margin-bottom:16px">Tindakan ini <strong>tidak boleh diundur</strong>. Semua data anda akan dipadamkan dalam masa 30 hari mengikut PDPA.</p>'
      + '<div class="card" style="background:#FEF2F2;border:1px solid #FECACA;margin-bottom:20px">'
      + '<p style="font-size:13px;color:#B91C1C;line-height:1.7">&#10005; Semua padanan dan perbualan dipadamkan<br>&#10005; Langganan aktif tidak boleh direfund<br>&#10005; Akaun tidak boleh dipulihkan</p></div>'
      + '<div style="margin-bottom:20px"><label class="lbl">Taip <strong>PADAM</strong> untuk mengesahkan</label><input id="delete-confirm" class="inp" placeholder="PADAM"></div>'
      + '<button class="btn" style="width:100%;padding:13px 0;background:#EF4444;color:#fff;margin-bottom:10px" onclick="confirmDelete()">Padam Akaun Saya</button>'
      + '<button class="btn bg" style="width:100%;padding:13px 0" onclick="closeModal(\'modal-delete\')">Batal</button>')

    + '</div>';
}

/* ── Modal Helper ── */
function modal(id, title, content) {
  return '<div id="' + id + '" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);padding:20px;overflow-y:auto">'
    + '<div style="background:#fff;border-radius:var(--r);max-width:480px;margin:40px auto;padding:28px;box-shadow:var(--sh2);position:relative">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'
    + '<h2 style="font-family:var(--fd);font-weight:600;font-size:20px">' + title + '</h2>'
    + '<button onclick="closeModal(\'' + id + '\')" style="background:none;border:none;cursor:pointer;padding:4px;border-radius:8px;color:var(--im)">'
    + ICONS.x + '</button></div>'
    + '<div id="' + id + '-content">' + content + '</div>'
    + '</div></div>';
}

function openModal(id) {
  var el = document.getElementById(id);
  if (el) { el.style.display = 'block'; document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) { el.style.display = 'none'; document.body.style.overflow = ''; }
}

function selectPrivacy(el, idx) {
  for (var i = 0; i < 3; i++) {
    var r = document.getElementById('priv-radio-' + i);
    if (r) r.innerHTML = '';
    if (r) r.style.borderColor = 'var(--s2)';
  }
  var r = document.getElementById('priv-radio-' + idx);
  if (r) { r.innerHTML = '<div style="width:10px;height:10px;border-radius:50%;background:var(--g5)"></div>'; r.style.borderColor = 'var(--g5)'; }
}

async function submitChangePassword() {
  var curr = (document.getElementById('s-pw-curr') || {}).value || '';
  var newPw = (document.getElementById('s-pw-new') || {}).value || '';
  var conf = (document.getElementById('s-pw-conf') || {}).value || '';
  if (!curr || !newPw) return showToast('Sila isi semua medan.', 'warn');
  if (newPw !== conf) return showToast('Kata laluan baharu tidak sepadan.', 'warn');
  if (newPw.length < 8 || !/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) return showToast('Kata laluan baharu tidak memenuhi syarat.', 'warn');
  var btn = document.querySelector('#modal-password .btn.bp');
  if (btn) { btn.disabled = true; btn.textContent = 'Menukar...'; }
  var res = await apiFetch('/settings/password', { method: 'PUT', body: JSON.stringify({ current_password: curr, new_password: newPw }) });
  if (btn) { btn.disabled = false; btn.textContent = 'Tukar Kata Laluan'; }
  if (res && res.ok) { closeModal('modal-password'); showToast('Kata laluan berjaya ditukar!', 'success'); }
  else { var d = res ? await res.json() : {}; showToast(d.detail || 'Gagal menukar kata laluan.', 'error'); }
}

async function submitICVerification() {
  var ic = (document.getElementById('ic-number') || {}).value || '';
  ic = ic.replace(/[-\s]/g, '');
  if (ic.length !== 12 || !/^\d{12}$/.test(ic)) {
    return showToast('Sila masukkan nombor IC yang sah (12 digit).', 'warn');
  }
  var res = await apiFetch('/profile/me', { method: 'PUT', body: JSON.stringify({ ic_number: ic }) });
  if (res && res.ok) {
    showToast('IC berjaya disahkan!', 'success');
    closeModal('modal-ic');
    if (currentUser) currentUser.ic_number = ic;
    await apiLoadProfile();
    _go('settings');
  } else {
    showToast('Gagal menyimpan IC. Cuba semula.', 'error');
  }
}

async function submitT20Request() {
  var employer = (document.getElementById('t20-employer') || {}).value || '';
  var position = (document.getElementById('t20-position') || {}).value || '';
  if (!employer || !position) return showToast('Sila isi semua medan.', 'warn');
  closeModal('modal-t20');
  showToast('Permohonan T20 dihantar. Admin akan menghubungi anda dalam 2-3 hari bekerja.', 'success');
}

async function submitWaliInvite() {
  var email    = (document.getElementById('wali-email') || {}).value || '';
  var name     = (document.getElementById('wali-name') || {}).value || '';
  var relation = (document.getElementById('wali-relation') || {}).value || '';
  if (!email || !name || !relation) return showToast('Sila isi semua medan.', 'warn');
  var btn = document.querySelector('#modal-wali .btn.bp');
  if (btn) { btn.disabled = true; btn.textContent = 'Menghantar...'; }
  var res = await apiFetch('/wali/invite', { method: 'POST', body: JSON.stringify({ wali_email: email, wali_name: name, relation: relation }) });
  if (btn) { btn.disabled = false; btn.textContent = 'Jemput Wali'; }
  if (res && res.ok) { closeModal('modal-wali'); showToast('Jemputan wali dihantar ke ' + email, 'success'); }
  else { var d = res ? await res.json() : {}; showToast(d.detail || 'Gagal menghantar jemputan.', 'error'); }
}

async function confirmPause() {
  var res = await apiFetch('/settings/pause', { method: 'POST' });
  if (res && res.ok) { closeModal('modal-pause'); showToast('Akaun dijeda. Log masuk semula untuk mengaktifkan.', 'info'); setTimeout(apiLogout, 1500); }
  else showToast('Gagal menjeda akaun.', 'error');
}

async function confirmDelete() {
  var input = (document.getElementById('delete-confirm') || {}).value || '';
  if (input !== 'PADAM') return showToast('Sila taip PADAM untuk mengesahkan.', 'warn');
  var res = await apiFetch('/settings/delete', { method: 'DELETE' });
  if (res && res.ok) { closeModal('modal-delete'); showToast('Akaun dipadamkan. Selamat tinggal.', 'info'); setTimeout(apiLogout, 2000); }
  else showToast('Gagal memadam akaun.', 'error');
}

/* ── Success Wall Page ── */
function buildSuccessPage() {
  var stories = [
    { c: 'A & Z', loc: 'Selangor', date: 'Dis 2025', sc: 92, s: 'Kami bertemu di Jodohku.my dan menemui keserasian yang luar biasa. Algoritma psikometrik benar-benar memahami apa yang kami cari. Alhamdulillah!' },
    { c: 'M & S', loc: 'WP KL',    date: 'Jan 2026', sc: 88, s: "Mod Wali memberikan keluarga saya keyakinan untuk menyokong proses ta'aruf ini. Semuanya telus dan terkawal." },
    { c: 'F & N', loc: 'Johor',    date: 'Feb 2026', sc: 95, s: 'Saya skeptikal pada mulanya, tetapi e-KYC dan Liveness Detection memberi keyakinan. Kini saya menemui pasangan hidup.' },
  ];

  return '<div style="max-width:620px;margin:0 auto;text-align:center">'
    + '<div style="width:56px;height:56px;border-radius:50%;background:var(--g50);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">' + ICONS.heart + '</div>'
    + '<h1 style="font-family:var(--fd);font-weight:700;font-size:24px;margin-bottom:8px">Dinding Kejayaan</h1>'
    + '<p style="color:var(--is);font-size:15px;margin-bottom:36px">Kisah cinta bermula di Jodohku.my</p>'
    + stories.map(function(st) {
        return '<div class="card" style="text-align:left;margin-bottom:16px;display:flex;gap:14px">'
          + '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--g5),var(--g400));display:flex;align-items:center;justify-content:center;flex-shrink:0">' + ICONS.heart + '</div>'
          + '<div><div style="display:flex;justify-content:space-between;align-items:flex-start">'
          + '<div><div style="font-family:var(--fd);font-weight:600;font-size:17px">' + st.c + '</div>'
          + '<div style="font-size:12px;color:var(--im)">' + st.loc + ' &bull; ' + st.date + '</div></div>'
          + '<span class="badge b-gld">' + st.sc + '%</span></div>'
          + '<p style="font-size:14px;color:var(--is);line-height:1.6;margin-top:10px;font-style:italic">&ldquo;' + st.s + '&rdquo;</p>'
          + '<span class="badge b-ver" style="margin-top:8px">' + ICONS.check + ' Alumni Jodohku</span></div></div>';
      }).join('')
    + '</div>';
}

function buildQuizModalContent() {
  var unanswered = Array.isArray(quizQuestions) ? quizQuestions.filter(function(q) { return !q.already_answered; }) : [];
  var current = unanswered[0] || null;
  var answered = quizProgress.answered || 0;
  var total = 10; // Core questions only

  if (!current && answered >= total) {
    return '<div style="text-align:center;padding:20px">' + ICONS.sparkle
      + '<h3 style="margin:12px 0 8px">Tahniah! Semua soalan selesai.</h3>'
      + '<p style="color:var(--is);font-size:14px">Profil psikometrik anda lengkap.</p></div>';
  }
  if (!current) {
    return '<p style="color:var(--is)">Tiada soalan tersedia. Cuba muat semula.</p>';
  }

  var domainLabels = { communication:'Komunikasi', empathy:'Empati', stress_management:'Pengurusan Tekanan', future_planning:'Perancangan Masa Depan', accepting_criticism:'Menerima Kritikan', discipline:'Disiplin', financial_management:'Kewangan', spirituality:'Kerohanian', cooperation:'Kerjasama', forgiveness:'Kemaafan', resilience:'Ketabahan', leadership:'Kepimpinan' };

  return '<div>'
    + '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--im);margin-bottom:16px">'
    + '<span>' + domainLabels[current.domain] + '</span><span>' + (answered + 1) + ' / ' + total + '</span></div>'
    + '<div class="progress" style="margin-bottom:20px"><div class="progress-fill" style="width:' + Math.round((answered/total)*100) + '%"></div></div>'
    + '<p style="font-size:16px;font-weight:500;color:var(--n5);line-height:1.6;margin-bottom:20px">' + current.text_ms + '</p>'
    + '<p style="font-size:11px;color:var(--im);margin-bottom:12px;text-align:center">1 = Sangat Tidak Setuju &nbsp;•&nbsp; 5 = Sangat Setuju</p>'
    + '<div style="display:flex;gap:8px" id="quiz-modal-answers">'
    + [1,2,3,4,5].map(function(s) {
        return '<button onclick="submitQuizAnswerModal(\'' + current.id + '\',' + s + ',this)" '
          + 'style="flex:1;padding:16px 4px;border-radius:10px;border:2px solid var(--s2);background:#fff;cursor:pointer;font-weight:700;font-size:20px;color:var(--n5);transition:all .15s">'
          + s + '</button>';
      }).join('')
    + '</div></div>';
}

async function openQuizModal() {
  // Load quiz data first if not loaded
  if (!Array.isArray(quizQuestions) || quizQuestions.length === 0) {
    var rp = await apiFetch('/quiz/progress');
    if (rp && rp.ok) quizProgress = await rp.json();
    var rq = await apiFetch('/quiz/questions?batch=core');
    if (rq && rq.ok) {
      var d = await rq.json();
      var raw = d.questions || d || [];
      quizQuestions = Array.isArray(raw) ? raw : [];
    }
    // Also get extended if core done
    if ((quizProgress.answered || 0) >= 10) {
      // Quiz complete — no extended questions
    }
  }
  // Update modal content and open
  var mc = document.getElementById('modal-quiz-content');
  if (mc) mc.innerHTML = buildQuizModalContent();
  openModal('modal-quiz');
}

async function submitQuizAnswerModal(questionId, score, btn) {
  var btns = document.querySelectorAll('#quiz-modal-answers button');
  btns.forEach(function(b) { b.style.border = '2px solid var(--s2)'; b.style.background = '#fff'; b.disabled = true; });
  btn.style.border = '2px solid var(--g5)';
  btn.style.background = 'var(--g50)';

  var res = await apiFetch('/quiz/answer', { method: 'POST', body: JSON.stringify({ question_id: questionId, score: score }) });
  if (res && res.ok) {
    var d = await res.json();
    quizProgress = d.progress || quizProgress;
    quizQuestions = quizQuestions.map(function(q) { if (q.id === questionId) q.already_answered = true; return q; });

    setTimeout(function() {
      var mc = document.getElementById('modal-quiz-content');
      if (mc) mc.innerHTML = buildQuizModalContent();
      if (quizProgress.gallery_unlocked && quizProgress.answered === 10) {
        showToast('Bilik Pameran dibuka! 🎉', 'success');
      }
      // Refresh profile page quiz section
      var pfPage = document.getElementById('page-content');
      if (pfPage && currentPage === 'profile') buildAppPage('profile');
    }, 350);
  } else {
    btns.forEach(function(b) { b.disabled = false; });
    showToast('Gagal simpan. Cuba semula.', 'error');
  }
}

async function savePermanentFields() {
  var user = currentUser || Auth.getUser() || {};
  var data = {};

  // Only include if not already locked
  if (!user.gender) { var g = (document.getElementById('pf-gender') || {}).value; if (g) data.gender = g; }
  if (!user.date_of_birth) { var d = (document.getElementById('pf-dob') || {}).value; if (d) data.date_of_birth = d; }
  if (!user.marital_status) { var m = (document.getElementById('pf-marital') || {}).value; if (m) data.marital_status = m; }
  // Height is always editable
  var h = (document.getElementById('pf-height') || {}).value;
  if (h) data.height_cm = parseInt(h);

  if (Object.keys(data).length === 0) return showToast('Tiada perubahan untuk disimpan.', 'info');

  var res = await apiFetch('/profile/me', { method: 'PUT', body: JSON.stringify(data) });
  if (res && res.ok) {
    showToast('Maklumat asas disimpan! Sesetengah medan kini berkunci.', 'success');
    await apiLoadProfile();
    buildAppPage('profile');
  } else {
    showToast('Gagal menyimpan. Cuba semula.', 'error');
  }
}

/* ══════════════════════════════════════
   PROFILE SAVE
══════════════════════════════════════ */
function toggleHobby(btn, hobby) {
  var active = btn.dataset.active === '1';
  if (active) {
    btn.dataset.active = '0';
    btn.style.border = '1px solid var(--s2)';
    btn.style.background = '#fff';
    btn.style.color = 'var(--is)';
  } else {
    btn.dataset.active = '1';
    btn.style.border = '1px solid var(--g5)';
    btn.style.background = 'var(--g50)';
    btn.style.color = 'var(--g7)';
  }
}

async function saveProfile() {
  var btn = document.querySelector('[onclick="saveProfile()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

  // Only editable fields — permanent fields (gender, dob, marital) handled by savePermanentFields
  var data = {
    display_name:      (document.getElementById('pf-display-name') || {}).value || null,
    state_of_residence:(document.getElementById('pf-state') || {}).value || null,
    education_level:   (document.getElementById('pf-edu') || {}).value || null,
    occupation:        (document.getElementById('pf-job') || {}).value || null,
    income_range:      (document.getElementById('pf-income') || {}).value || null,
    bio_text:          (document.getElementById('pf-bio') || {}).value || null,
  };

  Object.keys(data).forEach(function(k) { if (!data[k]) delete data[k]; });

  var res = await apiFetch('/profile/me', { method: 'PUT', body: JSON.stringify(data) });
  if (btn) { btn.disabled = false; btn.textContent = 'Simpan Maklumat'; }

  if (res && res.ok) {
    showToast('Profil berjaya disimpan!', 'success');
    if (data.display_name) {
      var headerName = document.getElementById('pf-header-name');
      if (headerName) headerName.textContent = data.display_name;
      var sidebarName = document.getElementById('sidebar-display-name');
      if (sidebarName) sidebarName.textContent = data.display_name;
      if (currentUser) { currentUser.display_name = data.display_name; Auth.setUser(currentUser); }
    }
    await apiLoadProfile();
  } else {
    showToast('Gagal menyimpan profil. Cuba semula.', 'error');
  }
}

async function saveHobbies() {
  var btn = document.querySelector('[onclick="saveHobbies()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

  var hobbyBtns = document.querySelectorAll('[onclick^="toggleHobby"]');
  var hobbies = [];
  hobbyBtns.forEach(function(b) {
    if (b.dataset.active === '1') hobbies.push(b.textContent.trim());
  });

  var res = await apiFetch('/profile/me', { method: 'PUT', body: JSON.stringify({ hobbies: hobbies }) });
  if (btn) { btn.disabled = false; btn.textContent = 'Simpan Hobi'; }

  if (res && res.ok) {
    showToast('Hobi berjaya disimpan!', 'success');
    await apiLoadProfile();
  } else {
    showToast('Gagal menyimpan hobi.', 'error');
  }
}

/* ══════════════════════════════════════
   SETTINGS ACTIONS
══════════════════════════════════════ */
async function changePassword() {
  var curr = prompt('Kata laluan semasa:');
  if (!curr) return;
  var newPw = prompt('Kata laluan baharu (min 8 aksara, huruf besar & nombor):');
  if (!newPw) return;
  if (newPw.length < 8 || !/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) {
    return showToast('Kata laluan baharu tidak memenuhi syarat.', 'warn');
  }
  var res = await apiFetch('/settings/password', {
    method: 'PUT',
    body: JSON.stringify({ current_password: curr, new_password: newPw })
  });
  if (res && res.ok) showToast('Kata laluan berjaya ditukar!', 'success');
  else showToast('Gagal menukar kata laluan. Semak kata laluan semasa.', 'error');
}

async function pauseAccount() {
  if (!confirm('Jeda akaun? Profil anda tidak akan dipaparkan sehingga anda aktifkan semula.')) return;
  var res = await apiFetch('/settings/pause', { method: 'POST' });
  if (res && res.ok) { showToast('Akaun dijeda.', 'info'); apiLogout(); }
  else showToast('Gagal menjeda akaun.', 'error');
}

async function deleteAccount() {
  if (!confirm('Padam akaun? Tindakan ini tidak boleh diundur.')) return;
  var reason = prompt('Sebab pemadaman (pilihan):') || '';
  var res = await apiFetch('/settings/delete', { method: 'DELETE', body: JSON.stringify({ reason: reason }) });
  if (res && res.ok) { showToast('Akaun dipadamkan.', 'info'); apiLogout(); }
  else showToast('Gagal memadam akaun.', 'error');
}

// ── Photo Crop Modal (Twitter-style) ──
var _cropImg = null, _cropX = 0, _cropY = 0, _cropSize = 0, _cropScale = 1;
var _dragStart = null, _cropOffX = 0, _cropOffY = 0;

function uploadProfilePhoto(input) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) return showToast('Saiz gambar maksimum 10MB.', 'warn');
  var reader = new FileReader();
  reader.onload = function(e) { openCropModal(e.target.result); };
  reader.readAsDataURL(file);
  input.value = '';
}

function openCropModal(src) {
  var existing = document.getElementById('crop-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'crop-modal';
  modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.88);flex-direction:column;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = ''
    + '<div style="width:100%;max-width:480px;background:#1a1a1a;border-radius:16px;overflow:hidden">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.1)">'
    + '<button onclick="closeCropModal()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:14px;padding:4px 8px;border-radius:20px;border:1px solid rgba(255,255,255,.3)">Batal</button>'
    + '<span style="color:#fff;font-weight:600;font-size:15px">Edit Gambar Profil</span>'
    + '<button onclick="applyCrop()" style="background:#fff;border:none;color:#000;cursor:pointer;font-size:14px;font-weight:700;padding:4px 14px;border-radius:20px">Guna</button>'
    + '</div>'
    // Canvas area
    + '<div style="position:relative;width:100%;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden" id="crop-stage" style="height:340px">'
    + '<canvas id="crop-canvas" style="display:block;touch-action:none;cursor:grab;max-width:100%"></canvas>'
    // Circle overlay
    + '<div id="crop-overlay" style="position:absolute;inset:0;pointer-events:none">'
    + '<svg id="crop-svg" style="position:absolute;inset:0;width:100%;height:100%"></svg>'
    + '</div>'
    + '</div>'
    // Controls
    + '<div style="padding:16px 20px;border-top:1px solid rgba(255,255,255,.1)">'
    + '<div style="display:flex;align-items:center;gap:12px">'
    + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    + '<input id="crop-zoom" type="range" min="100" max="300" value="100" style="flex:1;accent-color:#fff" oninput="setCropZoom(this.value)">'
    + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>'
    + '</div>'
    + '<p style="color:rgba(255,255,255,.4);font-size:12px;text-align:center;margin-top:10px">Seret untuk laraskan. Zum untuk membesar.</p>'
    + '</div>'
    + '</div>';

  document.body.appendChild(modal);

  var canvas = document.getElementById('crop-canvas');
  var img = new Image();
  img.onload = function() {
    _cropImg = img;
    _cropScale = 1;

    // Size canvas to fit viewport nicely
    var maxW = Math.min(480, window.innerWidth - 32);
    var maxH = 320;
    var ratio = Math.min(maxW / img.width, maxH / img.height);
    canvas.width  = Math.round(img.width  * ratio);
    canvas.height = Math.round(img.height * ratio);

    // Circle is 70% of smaller canvas dimension
    _cropSize = Math.round(Math.min(canvas.width, canvas.height) * 0.7);
    _cropX = (canvas.width  - _cropSize) / 2;
    _cropY = (canvas.height - _cropSize) / 2;

    drawCrop();
    drawOverlay();
    bindCropEvents(canvas);
  };
  img.src = src;
}

function drawCrop() {
  var canvas = document.getElementById('crop-canvas');
  if (!canvas || !_cropImg) return;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  var s = _cropScale;
  var iw = _cropImg.width  * (canvas.width  / _cropImg.width)  * s;
  var ih = _cropImg.height * (canvas.height / _cropImg.height) * s;
  var ox = _cropOffX + (canvas.width  - iw) / 2;
  var oy = _cropOffY + (canvas.height - ih) / 2;

  ctx.drawImage(_cropImg, ox, oy, iw, ih);
}

function drawOverlay() {
  var svg = document.getElementById('crop-svg');
  var canvas = document.getElementById('crop-canvas');
  if (!svg || !canvas) return;
  var W = canvas.width, H = canvas.height;
  var cx = _cropX + _cropSize/2, cy = _cropY + _cropSize/2, r = _cropSize/2;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML = '<defs><mask id="cm"><rect width="' + W + '" height="' + H + '" fill="white"/>'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="black"/></mask></defs>'
    + '<rect width="' + W + '" height="' + H + '" fill="rgba(0,0,0,.55)" mask="url(#cm)"/>'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"/>';
}

function setCropZoom(val) {
  _cropScale = val / 100;
  drawCrop();
}

function bindCropEvents(canvas) {
  var dragging = false, startX, startY, startOX, startOY;

  canvas.addEventListener('mousedown', function(e) {
    dragging = true; startX = e.clientX; startY = e.clientY;
    startOX = _cropOffX; startOY = _cropOffY;
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    _cropOffX = startOX + (e.clientX - startX);
    _cropOffY = startOY + (e.clientY - startY);
    drawCrop();
  });
  window.addEventListener('mouseup', function() { dragging = false; canvas.style.cursor = 'grab'; });

  // Touch
  canvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      dragging = true; startX = e.touches[0].clientX; startY = e.touches[0].clientY;
      startOX = _cropOffX; startOY = _cropOffY;
    }
  }, {passive:true});
  canvas.addEventListener('touchmove', function(e) {
    if (!dragging || e.touches.length !== 1) return;
    _cropOffX = startOX + (e.touches[0].clientX - startX);
    _cropOffY = startOY + (e.touches[0].clientY - startY);
    drawCrop();
  }, {passive:true});
  canvas.addEventListener('touchend', function() { dragging = false; });

  // Pinch zoom
  var initDist = 0, initScale = 1;
  canvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      initDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      initScale = _cropScale;
    }
  }, {passive:true});
  canvas.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2) {
      var dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      _cropScale = Math.min(3, Math.max(1, initScale * (dist / initDist)));
      var slider = document.getElementById('crop-zoom');
      if (slider) slider.value = Math.round(_cropScale * 100);
      drawCrop();
    }
  }, {passive:true});
}

async function applyCrop() {
  var canvas = document.getElementById('crop-canvas');
  if (!canvas || !_cropImg) return;

  // Render the cropped circle region to a 400x400 output canvas
  var out = document.createElement('canvas');
  out.width = 400; out.height = 400;
  var ctx = out.getContext('2d');

  // Clip to circle
  ctx.beginPath();
  ctx.arc(200, 200, 200, 0, Math.PI * 2);
  ctx.clip();

  // Work out what portion of the source image maps to the crop circle
  var s = _cropScale;
  var displayW = canvas.width, displayH = canvas.height;
  var rendW = _cropImg.width  * (displayW / _cropImg.width)  * s;
  var rendH = _cropImg.height * (displayH / _cropImg.height) * s;
  var ox = _cropOffX + (displayW - rendW) / 2;
  var oy = _cropOffY + (displayH - rendH) / 2;

  // Map crop circle coords back to source image pixels
  var scaleToSrc = _cropImg.width / rendW;
  var srcX = (_cropX - ox) * scaleToSrc;
  var srcY = (_cropY - oy) * scaleToSrc;
  var srcS = _cropSize * scaleToSrc;

  ctx.drawImage(_cropImg, srcX, srcY, srcS, srcS, 0, 0, 400, 400);

  var base64 = out.toDataURL('image/jpeg', 0.88);
  closeCropModal();

  // Update avatar preview immediately
  var avatar = document.getElementById('pf-avatar');
  if (avatar) avatar.innerHTML = '<img src="' + base64 + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';

  showToast('Menyimpan gambar...', 'info');
  var res = await apiFetch('/profile/photo', {
    method: 'POST',
    body: JSON.stringify({ photo_data: base64, photo_type: 'headshot' })
  });

  if (res && res.ok) {
    showToast('Gambar profil berjaya disimpan!', 'success');
    if (!currentUser) currentUser = Auth.getUser() || {};
    currentUser.photo_url = base64;
    Auth.setUser(currentUser);
    sidebar(currentPage);
  } else {
    // Fallback: save via profile PUT
    var res2 = await apiFetch('/profile/me', {
      method: 'PUT',
      body: JSON.stringify({ photo_url: base64 })
    });
    if (res2 && res2.ok) {
      showToast('Gambar profil berjaya disimpan!', 'success');
      if (!currentUser) currentUser = Auth.getUser() || {};
      currentUser.photo_url = base64;
      Auth.setUser(currentUser);
      sidebar(currentPage);
    } else {
      showToast('Gagal menyimpan gambar. Cuba semula.', 'error');
    }
  }
}

function closeCropModal() {
  var m = document.getElementById('crop-modal');
  if (m) m.remove();
  _cropImg = null; _cropOffX = 0; _cropOffY = 0; _cropScale = 1;
}

/* ══════════════════════════════════════
   QUIZ PAGE
══════════════════════════════════════ */
var quizQuestions = [];
var quizProgress = { answered: 0, total: 10, percentage: 0, gallery_unlocked: false };
var quizCurrentIdx = 0;

async function apiLoadQuiz() {
  // Load progress first
  var rp = await apiFetch('/quiz/progress');
  if (rp && rp.ok) quizProgress = await rp.json();

  // Load core questions
  var rq = await apiFetch('/quiz/questions?batch=core');
  if (rq && rq.ok) {
    var d = await rq.json();
    // FIX: ensure quizQuestions is always an array
    var raw = d.questions || d || [];
    quizQuestions = Array.isArray(raw) ? raw : (raw.questions || []);
  }
  buildAppPage('quiz');
}

function buildQuizPage() {
  var answered = Math.min(quizProgress.answered || 0, 10);
  var total = 10;
  var pct = Math.min(Math.round(((quizProgress.answered||0)/10)*100), 100);
  var unlocked = quizProgress.gallery_unlocked || false;

  // Find first unanswered question
  var unanswered = quizQuestions.filter(function(q) { return !q.already_answered; });
  var current = unanswered[0] || null;

  var h = '<div style="max-width:600px;margin:0 auto">';

  // Header
  h += '<div style="margin-bottom:20px">'
    + '<h1 style="font-family:var(--fd);font-weight:700;font-size:24px;margin-bottom:6px">Kuiz Serasi</h1>'
    + '<p style="font-size:14px;color:var(--is)">Jawab soalan untuk mendapat padanan terbaik anda.</p>'
    + '</div>';

  // Progress card
  h += '<div class="card" style="margin-bottom:20px;background:' + (unlocked ? 'rgba(230,245,237,.5)' : 'rgba(255,249,230,.5)') + ';border:1px solid ' + (unlocked ? 'rgba(52,168,83,.2)' : 'rgba(200,162,60,.2)') + '">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
    + '<div style="display:flex;align-items:center;gap:8px">' + ICONS.sparkle
    + '<span style="font-weight:600;font-size:14px;color:' + (unlocked ? 'var(--e7)' : 'var(--g7)') + '">'
    + answered + ' / ' + total + ' soalan dijawab</span></div>'
    + '<span style="font-size:13px;font-weight:700;color:' + (unlocked ? 'var(--e7)' : 'var(--g7)') + '">' + pct + '%</span>'
    + '</div>'
    + '<div class="progress"><div class="progress-fill" style="width:' + pct + '%;background:' + (unlocked ? 'var(--e4)' : 'var(--g5)') + '"></div></div>'
    + (unlocked
        ? '<p style="font-size:12px;color:var(--e7);margin-top:8px;font-weight:500">✓ Bilik Pameran telah dibuka! Teruskan untuk padanan lebih tepat.</p>'
        : '<p style="font-size:12px;color:var(--g7);margin-top:8px">Jawab <strong>' + (10 - answered) + ' lagi</strong> soalan untuk membuka Bilik Pameran.</p>')
    + '</div>';

  // Question card
  if (current) {
    var domainLabels = {
      communication: 'Komunikasi', empathy: 'Empati', stress_management: 'Pengurusan Tekanan',
      future_planning: 'Perancangan Masa Depan', accepting_criticism: 'Menerima Kritikan',
      discipline: 'Disiplin', financial_management: 'Kewangan', spirituality: 'Kerohanian',
      cooperation: 'Kerjasama', forgiveness: 'Kemaafan', resilience: 'Ketabahan', leadership: 'Kepimpinan',
    };
    var domainLabel = domainLabels[current.domain] || current.domain;

    h += '<div class="card" id="quiz-card" style="margin-bottom:20px">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">'
      + '<span style="font-size:11px;font-weight:600;color:var(--im);text-transform:uppercase;letter-spacing:.06em;background:var(--s1);padding:4px 10px;border-radius:20px">' + domainLabel + '</span>'
      + '<span style="font-size:11px;color:var(--im)">Soalan ' + (answered + 1) + '</span>'
      + '</div>'
      + '<p style="font-size:17px;font-weight:500;color:var(--n5);line-height:1.6;margin-bottom:24px">' + current.text_ms + '</p>'
      + '<p style="font-size:12px;color:var(--im);margin-bottom:16px;text-align:center">1 = Sangat Tidak Setuju &nbsp;|&nbsp; 5 = Sangat Setuju</p>'
      + '<div style="display:flex;gap:10px;justify-content:center" id="quiz-answers">'
      + [1,2,3,4,5].map(function(s) {
          var labels = ['','Sangat\nTidak Setuju','Tidak\nSetuju','Neutral','Setuju','Sangat\nSetuju'];
          return '<button onclick="submitQuizAnswer(\'' + current.id + '\',' + s + ',this)" '
            + 'style="flex:1;padding:14px 6px;border-radius:10px;border:2px solid var(--s2);background:#fff;cursor:pointer;font-weight:700;font-size:18px;color:var(--n5);transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:4px">'
            + s
            + '<span style="font-size:9px;font-weight:400;color:var(--im);white-space:pre-line;text-align:center;line-height:1.2">' + labels[s] + '</span>'
            + '</button>';
        }).join('')
      + '</div></div>';
  } else if (answered >= total) {
    h += '<div class="card" style="text-align:center;padding:40px;margin-bottom:20px">'
      + ICONS.sparkle
      + '<h3 style="font-family:var(--fd);font-weight:700;font-size:20px;margin:16px 0 8px;color:var(--n5)">Tahniah! Semua soalan dijawab.</h3>'
      + '<p style="color:var(--is);font-size:14px;margin-bottom:20px">Profil psikometrik anda telah lengkap. Padanan anda kini lebih tepat.</p>'
      + '<button class="btn bp" onclick="go(\'gallery\')">Lihat Padanan Saya</button>'
      + '</div>';
  } else {
    h += '<div class="card" style="text-align:center;padding:32px">'
      + '<p style="color:var(--is)">Tiada soalan lagi untuk batch ini.</p>'
      + '</div>';
  }

  // Score breakdown (if any answers)
  if (answered > 0) {
    h += '<div class="card" style="margin-bottom:20px">'
      + '<h3 style="font-family:var(--fd);font-weight:600;font-size:16px;margin-bottom:16px">Profil Psikometrik Anda</h3>'
      + '<div id="quiz-scores"><p style="color:var(--im);font-size:13px">Memuatkan...</p></div>'
      + '</div>';
    // Load scores async
    setTimeout(loadQuizScores, 100);
  }

  h += '</div>';
  return h;
}

async function loadQuizScores() {
  var el = document.getElementById('quiz-scores');
  if (!el) return;
  var res = await apiFetch('/quiz/score');
  if (!res || !res.ok) return;
  var d = await res.json();
  var domains = d.domains || {};
  if (Object.keys(domains).length === 0) return;

  var labels = {
    communication: 'Komunikasi', empathy: 'Empati', stress_management: 'Pengurusan Tekanan',
    future_planning: 'Perancangan Masa Depan', accepting_criticism: 'Menerima Kritikan',
    discipline: 'Disiplin', financial_management: 'Kewangan', spirituality: 'Kerohanian',
    cooperation: 'Kerjasama', forgiveness: 'Kemaafan', resilience: 'Ketabahan', leadership: 'Kepimpinan',
  };

  el.innerHTML = Object.keys(domains).map(function(domain) {
    var score = domains[domain] || 0;
    var pct = Math.round(score * 100);
    var color = pct >= 70 ? 'var(--e4)' : pct >= 40 ? 'var(--g5)' : 'var(--s3)';
    return '<div style="margin-bottom:12px">'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'
      + '<span style="font-size:13px;color:var(--is)">' + (labels[domain] || domain) + '</span>'
      + '<span style="font-size:13px;font-weight:600;color:var(--n5)">' + pct + '%</span>'
      + '</div>'
      + '<div class="progress"><div class="progress-fill" style="width:' + pct + '%;background:' + color + '"></div></div>'
      + '</div>';
  }).join('');
}

async function submitQuizAnswer(questionId, score, btn) {
  // Visual feedback — highlight selected
  var btns = document.querySelectorAll('#quiz-answers button');
  btns.forEach(function(b) {
    b.style.border = '2px solid var(--s2)';
    b.style.background = '#fff';
    b.style.color = 'var(--n5)';
    b.disabled = true;
  });
  btn.style.border = '2px solid var(--g5)';
  btn.style.background = 'var(--g50)';
  btn.style.color = 'var(--g7)';

  var res = await apiFetch('/quiz/answer', {
    method: 'POST',
    body: JSON.stringify({ question_id: questionId, score: score }),
  });

  if (res && res.ok) {
    var d = await res.json();
    quizProgress = d.progress || quizProgress;

    // Mark question as answered
    quizQuestions = quizQuestions.map(function(q) {
      if (q.id === questionId) q.already_answered = true;
      return q;
    });

    // Short delay then rebuild page
    setTimeout(function() {
      buildAppPage('quiz');
      if (quizProgress.gallery_unlocked && quizProgress.answered === 10) {
        showToast('Bilik Pameran telah dibuka! 🎉', 'success');
      }
    }, 400);
  } else {
    showToast('Gagal menyimpan jawapan. Cuba semula.', 'error');
    btns.forEach(function(b) { b.disabled = false; });
  }
}

/* ══════════════════════════════════════
   CHAT MOBILE HELPERS
══════════════════════════════════════ */
async function loadAndShowChat() {
  var ac = convos[activeChatIdx];
  if (ac && ac.id) {
    msgs = await apiLoadMessages(ac.id);
  }
  _go('chat');
  var list = document.querySelector('.chat-list');
  var area = document.querySelector('.chat-area');
  var backBtn = document.querySelector('.mob-back-btn');
  if (list) list.classList.remove('active');
  if (area) area.classList.add('active');
  if (backBtn) backBtn.style.display = 'flex';
}

function showChatList() {
  var list = document.querySelector('.chat-list');
  var area = document.querySelector('.chat-area');
  if (list) list.classList.add('active');
  if (area) area.classList.remove('active');
}

/* ══════════════════════════════════════
   TIER GRID (Landing Page)
══════════════════════════════════════ */
function buildTierGrid() {
  var g = document.getElementById('tier-grid');
  if (!g) return;
  var tiers = [
    { n: 'Rahmah',  icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', p: 'Percuma',   d: '7 Hari',  bg: 'var(--s0)',              bd: 'var(--s2)',   f: ['10 paparan/hari','3 sembang','Gambar kabur'] },
    { n: 'Gold',    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--g6)" stroke-width="1.5" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', p: 'RM39.99',  d: '30 Hari', bg: 'rgba(255,249,230,.3)',   bd: 'var(--g400)', pop: true, f: ['30 paparan/hari','10 sembang','Gambar jelas','WhatsApp','Tanpa iklan'] },
    { n: 'Platinum',icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="1.5" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', p: 'RM69.99',  d: '60 Hari', bg: 'rgba(243,232,255,.15)',  bd: '#C4B5FD',    s: '12%', f: ['Tanpa had','Keutamaan carian','Video ta\'aruf','Ciri beta'] },
    { n: 'Premium', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" stroke-width="1.5" stroke-linecap="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/></svg>', p: 'RM101.99', d: '90 Hari', bg: 'rgba(237,233,254,.2)',   bd: '#A78BFA',    s: '15%', f: ['Semua Platinum','Keutamaan tertinggi','Laporan PDF','3 Golden Ticket'] },
  ];
  g.innerHTML = tiers.map(function(t) {
    return '<div style="border-radius:var(--r);border:2px solid ' + t.bd + ';padding:20px;background:' + t.bg + ';position:relative;' + (t.pop ? 'box-shadow:0 0 20px rgba(200,162,60,.2)' : '') + '">'
      + (t.pop ? '<span style="position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:var(--g50);color:var(--g7);font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap">Paling Popular</span>' : '')
      + (t.s ? '<span style="display:inline-block;background:#E6F5ED;color:var(--e7);font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;margin-bottom:8px">Jimat ' + t.s + '</span>' : '')
      + '<div style="margin-bottom:8px">' + t.icon + '</div>'
      + '<div style="font-family:var(--fd);font-weight:700;font-size:18px">' + t.n + '</div>'
      + '<div style="font-family:var(--fd);font-weight:700;font-size:24px;color:var(--n5);margin-top:4px">' + t.p + '</div>'
      + '<div style="font-size:12px;color:var(--im);margin-bottom:14px">' + t.d + '</div>'
      + '<ul style="list-style:none;padding:0;margin-bottom:18px">' + t.f.map(function(f) { return '<li style="font-size:13px;color:var(--is);padding:4px 0;display:flex;gap:6px">' + ICONS.check + f + '</li>'; }).join('') + '</ul>'
      + '<button class="btn ' + (t.pop ? 'bp' : 'bs') + '" style="width:100%;padding:11px 0" onclick="go(\'register\')">' + (t.p === 'Percuma' ? 'Cuba Percuma' : 'Pilih Pelan') + '</button>'
      + '</div>';
  }).join('');
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
  // Wire login form
  var loginContent = document.getElementById('login-form-content');
  if (loginContent) {
    loginContent.innerHTML = '<div style="text-align:center;margin-bottom:28px"><h2 style="font-family:var(--fd);font-weight:600;font-size:22px">Selamat Kembali</h2><p style="color:var(--is);font-size:14px;margin-top:4px">Log masuk ke akaun anda</p></div><div class="card"><div style="margin-bottom:14px"><label class="lbl">Alamat Emel</label><input id="login-email" class="inp" type="email" placeholder="anda@contoh.com" autocomplete="email"></div><div style="margin-bottom:18px"><label class="lbl">Kata Laluan</label><input id="login-password" class="inp" type="password" placeholder="Kata laluan anda" autocomplete="current-password"></div><button id="login-btn" class="btn bp" style="width:100%;padding:13px 0" onclick="apiLogin()">Log Masuk</button></div><p style="text-align:center;color:var(--im);font-size:14px;margin-top:18px">Belum ada akaun? <span style="color:var(--g5);font-weight:600;cursor:pointer" onclick="go(\'register\')">Daftar Sekarang</span></p>';
  }

  // Wire register forms
  var regS1 = document.getElementById('reg-s1');
  if (regS1) {
    regS1.innerHTML = '<h2 style="font-family:var(--fd);font-weight:700;font-size:26px;margin-bottom:8px">Daftar Akaun</h2><p style="color:var(--is);margin-bottom:24px">Langkah pertama menuju jodoh yang sekufu.</p><div style="margin-bottom:14px"><label class="lbl">Alamat Emel</label><input id="reg-email" class="inp" type="email" placeholder="anda@contoh.com" autocomplete="email"></div><div style="margin-bottom:14px"><label class="lbl">Kata Laluan</label><input id="reg-password" class="inp" type="password" placeholder="Min 8 aksara, huruf besar &amp; nombor" autocomplete="new-password"><p style="font-size:12px;color:var(--im);margin-top:5px">Contoh: Jodoh123</p></div><div style="margin-bottom:18px"><label class="lbl">Sahkan Kata Laluan</label><input id="reg-confirm" class="inp" type="password" placeholder="Ulang kata laluan" autocomplete="new-password"></div><button id="reg-btn" class="btn bp" style="width:100%;padding:13px 0" onclick="apiRegister()">Teruskan</button><p style="text-align:center;color:var(--im);font-size:14px;margin-top:18px">Sudah ada akaun? <span style="color:var(--g5);font-weight:600;cursor:pointer" onclick="go(\'login\')">Log Masuk</span></p>';
  }

  var regS2 = document.getElementById('reg-s2');
  if (regS2) {
    regS2.innerHTML = '<button class="btn bg" style="margin-bottom:14px;margin-left:-8px;gap:6px" onclick="regStep(1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>Kembali</button><h2 style="font-family:var(--fd);font-weight:700;font-size:26px;margin-bottom:8px">Pengesahan OTP</h2><p style="color:var(--is);margin-bottom:24px">Kod 6 digit dihantar ke emel anda. Sah 10 minit.</p><div style="margin-bottom:18px"><label class="lbl">Kod OTP</label><input id="reg-otp" class="inp" placeholder="000000" maxlength="6" inputmode="numeric" style="text-align:center;font-family:var(--fm);font-size:28px;letter-spacing:.5em"></div><button id="otp-btn" class="btn bp" style="width:100%;padding:13px 0" onclick="apiVerifyOTP()">Sahkan OTP</button><p style="text-align:center;color:var(--im);font-size:14px;margin-top:16px">Tidak terima? <span style="color:var(--g5);font-weight:600;cursor:pointer" onclick="apiRegister()">Hantar Semula</span></p>';
  }

  renderRegSteps();
  buildTierGrid();

  // Handle return from ToyyibPay payment gateway
  var urlParams = new URLSearchParams(window.location.search);
  var paymentStatus = urlParams.get('payment');
  if (paymentStatus) {
    window.history.replaceState({}, document.title, window.location.pathname);
    if (Auth.isLoggedIn()) {
      currentUser = Auth.getUser();
      apiLoadNotifs();
      if (paymentStatus === 'success') {
        showToast('Pembayaran berjaya! Langganan anda telah diaktifkan.', 'success');
        apiLoadProfile().then(function() { go('payment'); });
      } else {
        showToast('Pembayaran sedang diproses atau dibatalkan.', 'warn');
        go('payment');
      }
      return;
    }
  }

  // Handle payment return redirect from ToyyibPay
  var urlParams = new URLSearchParams(window.location.search);
  var paymentStatus = urlParams.get('payment');
  if (paymentStatus === 'success') {
    history.replaceState(null, '', window.location.pathname);
    if (Auth.isLoggedIn()) {
      currentUser = Auth.getUser();
      apiLoadNotifs();
      go('payment').then(function() {
        showToast('Pembayaran berjaya! Langganan anda telah diaktifkan.', 'success');
      });
    } else {
      go('login');
    }
  } else if (paymentStatus === 'pending') {
    history.replaceState(null, '', window.location.pathname);
    if (Auth.isLoggedIn()) {
      currentUser = Auth.getUser();
      apiLoadNotifs();
      go('payment').then(function() {
        showToast('Pembayaran sedang diproses. Sila semak semula.', 'warn');
      });
    }
  } else if (Auth.isLoggedIn()) {
    currentUser = Auth.getUser();
    apiLoadNotifs();
    go('gallery');
  }
});
