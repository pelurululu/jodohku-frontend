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

  var chips = [];
  if (user.state_of_residence) chips.push(user.state_of_residence);
  if (user.education_level)    chips.push(user.education_level);
  if (user.occupation)         chips.push(user.occupation);
  if (user.marital_status)     chips.push(user.marital_status);
  if (user.age)                chips.push(user.age + ' tahun');

  var hobbies = user.hobbies || [];

  return '<div style="max-width:620px;margin:0 auto">'
    + '<div style="background:#fff;border-radius:var(--r);overflow:hidden;box-shadow:var(--sh)">'
    + '<div style="height:140px;background:linear-gradient(135deg,var(--n5),var(--n9));position:relative">'
    + '<div style="position:absolute;bottom:-36px;left:20px"><div style="width:80px;height:80px;border-radius:50%;border:4px solid #fff;background:#E8ECF4;display:flex;align-items:center;justify-content:center;box-shadow:var(--sh2)">'
    + '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--n5)" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    + '</div></div></div>'
    + '<div style="padding:48px 20px 20px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">'
    + '<span style="font-family:var(--fm);font-weight:700;font-size:22px;color:var(--n5)">' + code + '</span>'
    + '<span class="badge ' + badgeClass + '">' + tier + '</span></div>'
    + (chips.length ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">' + chips.map(function(c) { return '<span class="chip">' + c + '</span>'; }).join('') + '</div>' : '')
    + (user.bio_text ? '<p style="font-size:14px;color:var(--is);line-height:1.6;margin-top:14px">' + user.bio_text + '</p>' : '')
    + '</div></div>'
    + '<div class="card" style="margin-top:16px;background:rgba(255,249,230,.5);border:1px solid rgba(200,162,60,.2)">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' + ICONS.sparkle
    + '<span style="font-weight:600;font-size:14px;color:var(--g7)">Profil ' + completion + '% lengkap</span></div>'
    + '<div class="progress"><div class="progress-fill" style="width:' + completion + '%"></div></div>'
    + '<p style="font-size:13px;color:var(--g7);margin-top:8px">Lengkapkan profil untuk meningkatkan ketepatan padanan.</p></div>'
    + (hobbies.length ? '<div class="card" style="margin-top:16px"><h3 style="font-family:var(--fd);font-weight:600;font-size:17px;margin-bottom:12px">Hobi &amp; Minat</h3>'
    + '<div style="display:flex;flex-wrap:wrap;gap:8px">' + hobbies.map(function(h) { return '<span style="background:#E6F5ED;color:var(--e7);padding:5px 12px;border-radius:20px;font-size:13px;font-weight:500">' + h + '</span>'; }).join('') + '</div></div>' : '')
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
  var sections = [
    { t: 'Akaun & Keselamatan', items: [
      { ic: ICONS.lock,    l: 'Tukar Kata Laluan' },
      { ic: ICONS.shield,  l: 'e-KYC',       d: '&#10003; Disahkan' },
      { ic: ICONS.shield,  l: 'Verified T20', d: 'Mohon pengesahan' },
    ]},
    { t: 'Keutamaan', items: [
      { ic: ICONS.globe,   l: 'Bahasa',         d: 'Bahasa Melayu' },
      { ic: ICONS.notif,   l: 'Notifikasi' },
      { ic: ICONS.eye,     l: 'Privasi Profil' },
    ]},
    { t: 'Mod Wali/Mahram', items: [
      { ic: ICONS.users, l: 'Urus Mod Wali', d: 'Tidak aktif' },
    ]},
  ];

  var h = '<div style="max-width:620px;margin:0 auto">'
    + '<h1 style="font-family:var(--fd);font-weight:700;font-size:24px;margin-bottom:20px">Tetapan</h1>'
    + sections.map(function(s) {
        return '<div class="card" style="margin-bottom:14px">'
          + '<div style="font-size:11px;font-weight:600;color:var(--im);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px">' + s.t + '</div>'
          + s.items.map(function(it) {
              return '<div style="display:flex;align-items:center;gap:14px;padding:10px 8px;border-radius:var(--rb);cursor:pointer">'
                + '<span style="color:var(--is)">' + it.ic + '</span>'
                + '<div style="flex:1"><div style="font-size:14px;font-weight:500">' + it.l + '</div>'
                + (it.d ? '<div style="font-size:12px;color:var(--im)">' + it.d + '</div>' : '')
                + '</div>' + ICONS.chevron + '</div>';
            }).join('')
          + '</div>';
      }).join('')
    + '<div class="card" style="border:1px solid #FECACA;margin-bottom:14px">'
    + '<div style="font-size:11px;font-weight:600;color:#EF4444;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Zon Bahaya</div>'
    + '<div style="display:flex;align-items:center;gap:14px;padding:10px 8px;cursor:pointer">'
    + ICONS.trash
    + '<div><div style="font-size:14px;font-weight:500;color:#EF4444">Padam Akaun</div>'
    + '<div style="font-size:12px;color:#F87171">Hak Untuk Dilupakan (PDPA)</div></div></div></div>'
    + '<button class="btn bg" style="width:100%;color:#EF4444;justify-content:center;gap:8px" onclick="apiLogout()">'
    + ICONS.logout + ' Log Keluar</button></div>';

  return h;
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
