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
  document.querySelectorAll('.pg').forEach(function(p) { p.classList.remove('on'); });
  currentPage = pg;
  var el = document.getElementById('pg-' + pg);
  if (el) {
    el.classList.add('on');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) { window.scrollTo(0, 0); }
  }
  var appPages = ['gallery','chat','profile','payment','notif','settings','success'];
  if (appPages.indexOf(pg) > -1) buildAppPage(pg);
  closeSidebar();
}

// Override go() with auth guard + data loading
var _go = go;
go = async function(pg) {
  var protected_ = ['gallery','chat','profile','payment','notif','settings'];
  if (protected_.indexOf(pg) > -1 && !Auth.isLoggedIn()) {
    showToast('Sila log masuk dahulu.', 'warn');
    return _go('login');
  }
  if (pg === 'gallery' && Auth.isLoggedIn() && profiles.length === 0) await apiLoadGallery();
  if (pg === 'chat'    && Auth.isLoggedIn()) { await apiLoadConversations(); setupWS(); }
  if (pg === 'notif'   && Auth.isLoggedIn()) await apiLoadNotifs();
  if (pg === 'profile' && Auth.isLoggedIn()) await apiLoadProfile();
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
    h += '<div class="step-dot ' + cls + '">' + (i < regStepN ? '&#10003;' : i) + '</div>';
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
  var tier     = user && user.current_tier ? user.current_tier.toUpperCase() : 'RAHMAH';
  var completion = user && user.profile_completion ? user.profile_completion : 0;
  var unreadNotifs = notifs.filter(function(n) { return !n.read; }).length;

  var items = [
    { id: 'gallery', label: 'Bilik Pameran', icon: 'gallery' },
    { id: 'chat',    label: 'Sembang',       icon: 'chat',    badge: unreadN },
    { id: 'profile', label: 'Profil Saya',   icon: 'profile' },
    { id: 'payment', label: 'Langganan',     icon: 'payment' },
    { id: 'success', label: 'Kisah Kejayaan',icon: 'success' },
    { id: 'notif',   label: 'Notifikasi',    icon: 'notif',   badge: unreadNotifs },
    { id: 'settings',label: 'Tetapan',       icon: 'settings' },
  ];

  var bnItems = [
    { id: 'gallery', label: 'Galeri',  icon: 'gallery' },
    { id: 'chat',    label: 'Sembang', icon: 'chat',  badge: unreadN },
    { id: 'profile', label: 'Profil',  icon: 'profile' },
    { id: 'notif',   label: 'Notif',   icon: 'notif', badge: unreadNotifs },
    { id: 'settings',label: 'Lagi',    icon: 'settings' },
  ];

  var navHtml = items.map(function(i) {
    return '<button class="nav-i' + (active === i.id ? ' on' : '') + '" onclick="go(\'' + i.id + '\')">'
      + ICONS[i.icon] + '<span style="flex:1">' + i.label + '</span>'
      + (i.badge ? '<span class="nb">' + i.badge + '</span>' : '')
      + '</button>';
  }).join('');

  var bnHtml = bnItems.map(function(i) {
    return '<button class="bn-item' + (active === i.id ? ' on' : '') + '" onclick="go(\'' + i.id + '\')">'
      + (i.badge ? '<span class="bn-badge">' + i.badge + '</span>' : '')
      + ICONS[i.icon] + '<span>' + i.label + '</span></button>';
  }).join('');

  var badgeClass = tier === 'GOLD' ? 'b-gld' : tier === 'PLATINUM' ? 'b-plt' : tier === 'PREMIUM' ? 'b-prm' : tier === 'SOVEREIGN' ? 'b-sov' : 'b-rah';

  return '<div class="side" id="app-sidebar">'
    + '<div class="side-hd"><div class="logo" onclick="go(\'landing\')">'
    + '<div class="logo-ic" style="width:32px;height:32px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></div>'
    + '<div class="logo-tx" style="font-size:16px">Jodohku<b>.my</b></div></div></div>'
    + '<div class="side-user"><div style="display:flex;align-items:center;gap:10px">'
    + '<div class="side-av">' + codeName.slice(0, 2) + '</div>'
    + '<div><div style="font-family:var(--fm);font-size:13px;font-weight:600">' + codeName + '</div>'
    + '<div class="badge ' + badgeClass + '" style="font-size:8px;padding:2px 8px;margin-top:3px">' + tier + '</div></div></div>'
    + '<div style="margin-top:10px"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--im)"><span>Profil</span><span>' + completion + '%</span></div>'
    + '<div class="progress" style="margin-top:4px"><div class="progress-fill" style="width:' + completion + '%"></div></div></div></div>'
    + '<nav class="side-nav">' + navHtml + '</nav>'
    + '<div class="side-bt"><button class="nav-i" style="color:#EF4444;width:100%" onclick="apiLogout()">' + ICONS.logout + ' <span>Log Keluar</span></button></div>'
    + '</div>'
    + '<div class="main">'
    + '<div class="topbar">'
    + '<div class="topbar-left"><button class="mob-menu-btn" onclick="openSidebar()">' + ICONS.menu + '</button></div>'
    + '<div class="topbar-right"><button class="icon-btn" onclick="go(\'notif\')" title="Notifikasi">' + ICONS.notif + (unreadNotifs ? '<span class="notif-dot"></span>' : '') + '</button></div>'
    + '</div>'
    + '<div class="pgc' + (active === 'chat' ? ' no-pad' : '') + '">';
}

var sideEnd = '</div></div>'
  + '<nav class="bottom-nav"><div class="bottom-nav-inner" id="bottom-nav-inner"></div></nav>';

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
  var shell = document.getElementById('shell-' + pg);
  if (!shell) return;
  var h = sidebar(pg);

  if (pg === 'gallery') h += buildGalleryPage();
  else if (pg === 'chat') h += buildChatPage();
  else if (pg === 'profile') h += buildProfilePage();
  else if (pg === 'payment') h += buildPaymentPage();
  else if (pg === 'notif') h += buildNotifPage();
  else if (pg === 'settings') h += buildSettingsPage();
  else if (pg === 'success') h += buildSuccessPage();

  h += sideEnd;
  shell.innerHTML = h;
  buildBottomNav(pg);

  if (pg === 'chat') {
    var cm = document.getElementById('chat-msgs');
    if (cm) cm.scrollTop = cm.scrollHeight;
  }
}

/* ── Gallery Page ── */
function buildGalleryPage() {
  var h = '<div style="max-width:640px;margin:0 auto">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'
    + '<div><h1 style="font-family:var(--fd);font-weight:700;font-size:24px">Bilik Pameran</h1>'
    + '<p style="color:var(--is);font-size:13px;margin-top:4px">Calon sekufu &#8805;85% keserasian</p></div>'
    + '<button class="btn bg" style="border:1px solid var(--s2);gap:6px">' + ICONS.filter + ' Tapis</button>'
    + '</div>';

  if (profiles.length === 0) {
    h += '<div class="card" style="text-align:center;padding:48px 24px">'
      + '<div style="width:56px;height:56px;border-radius:50%;background:var(--g50);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">' + ICONS.heart + '</div>'
      + '<h3 style="font-family:var(--fd);font-size:20px;margin-bottom:8px">Tiada Padanan Lagi</h3>'
      + '<p style="color:var(--is);font-size:14px;margin-bottom:20px">Lengkapkan profil anda untuk mendapat cadangan calon sekufu.</p>'
      + '<button class="btn bp" onclick="go(\'profile\')">Lengkapkan Profil</button></div>';
  }

  profiles.forEach(function(p, i) {
    var isFav = favs.has(p.id);
    var tierClass = p.tier === 'gold' ? 'b-gld' : p.tier === 'platinum' ? 'b-plt' : p.tier === 'premium' ? 'b-prm' : 'b-rah';
    h += '<div class="pcard afu d' + (Math.min(i + 1, 5)) + '">'
      + '<div class="pcard-ph" style="background:linear-gradient(135deg,hsl(' + p.hue + ',35%,20%),hsl(' + (p.hue + 40) + ',25%,13%))">'
      + '<div class="pcard-ph-inner"><div style="width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)">'
      + '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
      + '</div></div>'
      + '<div class="wm"></div>'
      + '<div class="pcard-badges"><span class="badge ' + tierClass + '">' + p.tier.toUpperCase() + '</span>'
      + (p.t20 ? '<span class="badge b-ver">' + ICONS.shield + ' T20</span>' : '') + '</div>'
      + '<div class="pcard-score">' + ICONS.heart + ' <b>' + p.score + '%</b></div>'
      + (p.online ? '<div class="pcard-online"><span class="online-dot"></span>Dalam Talian</div>' : '')
      + '</div>'
      + '<div class="pcard-info">'
      + '<div style="display:flex;justify-content:space-between;align-items:center">'
      + '<div><div style="font-family:var(--fm);font-weight:700;font-size:18px;color:var(--n5)">' + p.code + '</div>'
      + (p.name ? '<div style="color:var(--is);font-size:14px">' + p.name + '</div>' : '') + '</div>'
      + '<div style="font-family:var(--fd);font-weight:600;font-size:26px;color:var(--im)">' + p.age + '</div>'
      + '</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0">'
      + (p.state  ? '<span class="chip">' + ICONS.pin  + p.state  + '</span>' : '')
      + (p.edu    ? '<span class="chip">' + ICONS.edu  + p.edu    + '</span>' : '')
      + (p.job    ? '<span class="chip">' + ICONS.work + p.job    + '</span>' : '')
      + (p.status ? '<span class="chip">' + p.status + '</span>' : '')
      + '</div>'
      + (p.bio ? '<p style="font-size:14px;color:var(--is);line-height:1.55">' + p.bio + '</p>' : '')
      + (p.tip ? '<div class="wtip">' + ICONS.sparkle + '<span>' + p.tip + '</span></div>' : '')
      + '<div class="pcard-acts">'
      + '<button class="btn bg" style="border:1px solid var(--s2)" title="Abaikan">' + ICONS.x + '</button>'
      + '<button class="btn bg" style="border:1px solid var(--s2);color:' + (isFav ? 'var(--g5)' : 'var(--im)') + '" onclick="toggleFav(\'' + p.id + '\')">' + ICONS.bookmark + '</button>'
      + '<button class="btn bp lam" onclick="activeChatIdx=0;go(\'chat\')">' + ICONS.chat + ' Lamar</button>'
      + '</div></div></div>';
  });

  if (profiles.length > 0) {
    h += '<button class="btn bs" style="width:100%;padding:13px 0;margin-bottom:20px" onclick="apiLoadGallery(false)">'
      + ICONS.down + ' Lihat Lebih</button>';
  }

  h += '</div>';
  return h;
}

/* ── Chat Page ── */
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
    var partner = c.partner || {};
    var code = partner.code || c.partner_code_name || '??';
    var online = partner.online || c.is_online || false;
    var lastMsg = c.last_message || c.lastMsg || '';
    var time = c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : (c.time || '');
    var unread = c.unread_count || c.unread || 0;

    h += '<div class="ch-i' + (i === activeChatIdx ? ' on' : '') + '" onclick="activeChatIdx=' + i + ';loadAndShowChat()">'
      + '<div class="ch-av">' + code.slice(0, 2)
      + (online ? '<span class="online-dot" style="position:absolute;bottom:0;right:0;width:8px;height:8px;border:2px solid #fff"></span>' : '') + '</div>'
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
    var partner = ac.partner || {};
    var code   = partner.code || ac.partner_code_name || '??';
    var online  = partner.online || ac.is_online || false;
    var score   = partner.score || ac.compatibility_score ? Math.round((ac.compatibility_score || 0) * 100) : null;

    h += '<div class="chat-hd">'
      + '<button class="btn bg mob-back-btn" onclick="showChatList()" style="display:none;padding:6px 8px">' + ICONS.back + '</button>'
      + '<div class="ch-av" style="width:38px;height:38px;font-size:10px">' + code.slice(0, 2)
      + (online ? '<span class="online-dot" style="position:absolute;bottom:0;right:0;width:8px;height:8px;border:2px solid #fff"></span>' : '') + '</div>'
      + '<div style="flex:1"><div style="font-family:var(--fm);font-size:13px;font-weight:600">' + code + '</div>'
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
        + '<div class="msg-t">' + (m.time || '') + (m.mine ? ' &#10003;&#10003;' : '') + '</div>'
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
  var hobbyOpts = ['Mendaki','Fotografi','Membaca','Melancong','Gym','Memasak','Muzik','Sukan','Berkebun','Memasak','Melukis','Mengembara'];

  function sel(id, opts, val, label) {
    return '<div style="margin-bottom:14px"><label class="lbl">' + label + '</label>'
      + '<select id="' + id + '" class="inp" style="cursor:pointer">'
      + '<option value="">-- Pilih --</option>'
      + opts.map(function(o) { return '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o.replace(/_/g,' ').replace(/\b\w/g, function(c){return c.toUpperCase()}) + '</option>'; }).join('')
      + '</select></div>';
  }

  function inp(id, val, label, type, placeholder) {
    return '<div style="margin-bottom:14px"><label class="lbl">' + label + '</label>'
      + '<input id="' + id + '" class="inp" type="' + (type||'text') + '" value="' + (val||'') + '" placeholder="' + (placeholder||'') + '"></div>';
  }

  var selectedHobbies = user.hobbies || [];

  return '<div style="max-width:620px;margin:0 auto">'
    // ── Header card ──
    + '<div style="background:#fff;border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);margin-bottom:20px">'
    + '<div style="height:120px;background:linear-gradient(135deg,var(--n5),var(--n9));position:relative">'
    + '<div style="position:absolute;bottom:-36px;left:20px"><div style="width:80px;height:80px;border-radius:50%;border:4px solid #fff;background:#E8ECF4;display:flex;align-items:center;justify-content:center;box-shadow:var(--sh2)">'
    + '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--n5)" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    + '</div></div></div>'
    + '<div style="padding:44px 20px 20px;display:flex;align-items:center;justify-content:space-between">'
    + '<div><div style="display:flex;align-items:center;gap:10px">'
    + '<span style="font-family:var(--fm);font-weight:700;font-size:22px;color:var(--n5)">' + code + '</span>'
    + '<span class="badge ' + badgeClass + '">' + tier + '</span></div>'
    + '<div style="font-size:13px;color:var(--im);margin-top:4px">' + user.email + '</div></div></div></div>'
    // ── Completion banner ──
    + '<div class="card" style="margin-bottom:20px;background:rgba(255,249,230,.5);border:1px solid rgba(200,162,60,.2)">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    + '<div style="display:flex;align-items:center;gap:8px">' + ICONS.sparkle
    + '<span style="font-weight:600;font-size:14px;color:var(--g7)">Profil ' + completion + '% lengkap</span></div></div>'
    + '<div class="progress"><div class="progress-fill" style="width:' + completion + '%"></div></div>'
    + '<p style="font-size:12px;color:var(--g7);margin-top:6px">Lengkapkan profil untuk mendapat padanan yang lebih baik.</p></div>'
    // ── Edit form ──
    + '<div class="card" style="margin-bottom:20px">'
    + '<h3 style="font-family:var(--fd);font-weight:600;font-size:18px;margin-bottom:20px">Maklumat Peribadi</h3>'
    + inp('pf-display-name', user.display_name, 'Nama Paparan (max 16 aksara)', 'text', 'Contoh: Ahmad')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + sel('pf-gender', ['lelaki','perempuan'], user.gender, 'Jantina')
    + inp('pf-dob', user.date_of_birth, 'Tarikh Lahir', 'date', '')
    + sel('pf-state', states, user.state_of_residence, 'Negeri Kediaman')
    + sel('pf-edu', eduLevels, user.education_level, 'Tahap Pendidikan')
    + inp('pf-job', user.occupation, 'Pekerjaan', 'text', 'Contoh: Jurutera')
    + sel('pf-income', incomeRanges, user.income_range, 'Julat Pendapatan')
    + sel('pf-marital', maritalOpts, user.marital_status, 'Status Perkahwinan')
    + inp('pf-height', user.height_cm, 'Tinggi (cm)', 'number', '170')
    + '</div>'
    + '<div style="margin-bottom:14px"><label class="lbl">Bio (max 500 aksara)</label>'
    + '<textarea id="pf-bio" class="inp" rows="3" style="resize:vertical" placeholder="Ceritakan sedikit tentang diri anda...">' + (user.bio_text || '') + '</textarea></div>'
    + '<button class="btn bp" style="width:100%;padding:13px 0" onclick="saveProfile()">Simpan Maklumat</button>'
    + '</div>'
    // ── Hobbies ──
    + '<div class="card" style="margin-bottom:20px">'
    + '<h3 style="font-family:var(--fd);font-weight:600;font-size:18px;margin-bottom:16px">Hobi &amp; Minat</h3>'
    + '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">'
    + hobbyOpts.map(function(h) {
        var active = selectedHobbies.indexOf(h) > -1;
        return '<button data-active="' + (active ? '1' : '0') + '" onclick="toggleHobby(this,\'' + h + '\')" style="padding:7px 14px;border-radius:20px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid ' + (active ? 'var(--g5)' : 'var(--s2)') + ';background:' + (active ? 'var(--g50)' : '#fff') + ';color:' + (active ? 'var(--g7)' : 'var(--is)') + '">' + h + '</button>';
      }).join('')
    + '</div>'
    + '<button class="btn bp" style="width:100%;padding:13px 0" onclick="saveHobbies()">Simpan Hobi</button>'
    + '</div></div>';
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

  return '<div style="max-width:760px;margin:0 auto">'
    + '<h1 style="font-family:var(--fd);font-weight:700;font-size:24px;margin-bottom:20px">Langganan</h1>'
    + '<div class="card" style="background:rgba(255,249,230,.5);border:1px solid rgba(200,162,60,.2);margin-bottom:20px;display:flex;align-items:center;gap:14px">'
    + '<div style="width:44px;height:44px;border-radius:50%;background:rgba(200,162,60,.1);display:flex;align-items:center;justify-content:center">' + ICONS.payment + '</div>'
    + '<div><div style="font-weight:600">Pelan Semasa: ' + tier.toUpperCase() + '</div>'
    + '<div style="font-size:13px;color:var(--is)">Klik Langgan untuk naik taraf</div></div></div>'
    + '<div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
    + plans.map(function(t) {
        var isCur = t.key === tier;
        return '<div class="card" style="border:' + (isCur ? '2px solid var(--g5)' : '1px solid var(--s2)') + '">'
          + '<div style="font-family:var(--fd);font-weight:700;font-size:17px;margin-bottom:4px">' + t.n + '</div>'
          + (t.s ? '<span style="background:#E6F5ED;color:var(--e7);font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px">Jimat ' + t.s + '</span>' : '')
          + '<div style="font-family:var(--fd);font-weight:700;font-size:22px;color:var(--n5);margin-top:6px">' + t.p + '</div>'
          + '<div style="font-size:12px;color:var(--im);margin-bottom:10px">' + t.d + '</div>'
          + '<ul style="list-style:none;padding:0;margin-bottom:14px">' + t.f.map(function(f) { return '<li style="font-size:13px;color:var(--is);padding:3px 0;display:flex;gap:6px">' + ICONS.check + f + '</li>'; }).join('') + '</ul>'
          + '<button class="btn ' + (isCur ? 'bg' : 'bp') + '" style="width:100%;' + (isCur ? 'border:1px solid var(--s2);opacity:.6' : '') + '" onclick="' + (isCur ? '' : 'apiCreateBill(\'' + t.key + '\')') + '">' + (isCur ? 'Pelan Semasa' : 'Langgan') + '</button>'
          + '</div>';
      }).join('')
    + '</div></div>';
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
    var ic = n.type === 'new_match' ? ICONS.heart
           : n.type === 'new_message' ? ICONS.chat
           : n.type === 'profile_viewed' ? ICONS.eye
           : ICONS.notif;
    h += '<div class="card" onclick="markRead(' + i + ')" style="display:flex;align-items:flex-start;gap:14px;margin-bottom:8px;cursor:pointer;'
      + 'background:' + (n.read ? '#fff' : 'rgba(255,249,230,.3)') + ';'
      + 'border:' + (n.read ? 'none' : '1px solid rgba(200,162,60,.15)') + '">'
      + '<div style="width:38px;height:38px;border-radius:50%;background:' + (n.read ? 'var(--s1)' : 'var(--g50)') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">' + ic + '</div>'
      + '<div style="flex:1"><div style="font-weight:600;font-size:14px">' + (n.title || '') + '</div>'
      + '<div style="font-size:13px;color:var(--is);margin-top:2px">' + (n.body || '') + '</div>'
      + '<div style="font-size:11px;color:var(--im);margin-top:4px">' + (n.time || '') + '</div></div>'
      + (n.read ? '' : '<div style="width:8px;height:8px;background:var(--g5);border-radius:50%;margin-top:8px;flex-shrink:0"></div>')
      + '</div>';
  });

  return h + '</div>';
}

/* ── Settings Page ── */
function buildSettingsPage() {
  var user = currentUser || Auth.getUser() || {};
  var tier = (user.current_tier || 'rahmah').toUpperCase();
  var isVerified = user.is_verified_t20 || false;
  var eKYCStatus = user.status === 'active' ? '&#10003; Disahkan' : 'Belum disahkan';

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
          'e-KYC (Pengesahan Identiti)',
          eKYCStatus,
          user.status === 'active' ? null : 'openModal(\'modal-ekyc\')',
          user.status === 'active'
            ? '<span class="badge b-ver" style="margin-right:4px">&#10003; Aktif</span>'
            : '<span class="badge b-rah" style="margin-right:4px">Belum</span>')
      + row(ICONS.shield,
          'Verified T20',
          isVerified ? 'Anda telah disahkan sebagai T20' : 'Mohon pengesahan T20',
          isVerified ? null : 'openModal(\'modal-t20\')',
          isVerified
            ? '<span class="badge b-ver" style="margin-right:4px">&#10003; Disahkan</span>'
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

    + modal('modal-ekyc', 'e-KYC — Pengesahan Identiti',
        '<p style="color:var(--is);font-size:14px;margin-bottom:20px">Sahkan identiti anda menggunakan MyKad untuk mendapat akses penuh.</p>'
      + '<div class="card" style="background:rgba(255,249,230,.5);border:1px solid rgba(200,162,60,.2);margin-bottom:20px">'
      + '<p style="font-size:13px;color:var(--g7);line-height:1.7">&#10003; Gambar hadapan MyKad<br>&#10003; Swafoto masa nyata (Liveness)<br>&#10003; Proses ~2 minit<br>&#10003; Data dienkripsi AES-256</p></div>'
      + '<button class="btn bp" style="width:100%;padding:13px 0" onclick="closeModal(\'modal-ekyc\');go(\'gallery\')">Mulakan e-KYC Sekarang</button>')

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
      + '<p style="font-size:13px;color:var(--g7);line-height:1.7">&#10003; Wali terima notifikasi setiap mesej<br>&#10003; Wali boleh menamatkan perbualan<br>&#10003; Lebih amanah dan terkawal</p></div>'
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
    + content
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

  var data = {
    display_name:      (document.getElementById('pf-display-name') || {}).value || null,
    gender:            (document.getElementById('pf-gender') || {}).value || null,
    date_of_birth:     (document.getElementById('pf-dob') || {}).value || null,
    state_of_residence:(document.getElementById('pf-state') || {}).value || null,
    education_level:   (document.getElementById('pf-edu') || {}).value || null,
    occupation:        (document.getElementById('pf-job') || {}).value || null,
    income_range:      (document.getElementById('pf-income') || {}).value || null,
    marital_status:    (document.getElementById('pf-marital') || {}).value || null,
    height_cm:         (document.getElementById('pf-height') || {}).value ? parseInt((document.getElementById('pf-height') || {}).value) : null,
    bio_text:          (document.getElementById('pf-bio') || {}).value || null,
  };

  // Remove null values
  Object.keys(data).forEach(function(k) { if (!data[k]) delete data[k]; });

  var res = await apiFetch('/profile/me', { method: 'PUT', body: JSON.stringify(data) });
  if (btn) { btn.disabled = false; btn.textContent = 'Simpan Maklumat'; }

  if (res && res.ok) {
    var d = await res.json();
    showToast('Profil berjaya disimpan!', 'success');
    await apiLoadProfile();
    _go('profile');
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

  if (Auth.isLoggedIn()) {
    currentUser = Auth.getUser();
    apiLoadNotifs();
  }
});
