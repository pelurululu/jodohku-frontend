/* ══════════════════════════════════════
   GALLERY PAGE
   ══════════════════════════════════════ */

const GalleryPage = {
  /**
   * Load profiles from backend
   */
  async loadProfiles(reset = true) {
    if (State.gallery.loading) return;
    if (!reset && !State.gallery.hasMore) return;
    
    if (reset) {
      State.gallery.page = 1;
      State.gallery.profiles = [];
      State.gallery.hasMore = true;
    }
    
    State.gallery.loading = true;
    
    try {
      const data = await API.Gallery.fetchProfiles(
        State.gallery.page,
        CONFIG.GALLERY_PAGE_SIZE
      );
      
      const profiles = (data.profiles || data.items || []).map(this.transformProfile);
      
      if (reset) {
        State.gallery.profiles = profiles;
      } else {
        State.gallery.profiles.push(...profiles);
      }
      
      // Check if there are more profiles
      if (profiles.length < CONFIG.GALLERY_PAGE_SIZE) {
        State.gallery.hasMore = false;
      }
      
      State.gallery.page++;
      
      this.render();
    } catch (error) {
      console.error('Failed to load gallery:', error);
      Utils.showToast('Gagal memuatkan galeri. Sila cuba lagi.', 'error');
    } finally {
      State.gallery.loading = false;
    }
  },
  
  /**
   * Transform backend profile to UI format
   */
  transformProfile(p) {
    return {
      id: p.id || p.user_id,
      code: p.code_name || p.code || '???',
      name: p.display_name || p.name || '',
      age: p.age || '?',
      state: p.state_of_residence || p.state || '',
      edu: p.education_level || p.edu || '',
      job: p.occupation || p.job || '',
      status: p.marital_status || p.status || '',
      tier: (p.tier || 'rahmah').toLowerCase(),
      t20: p.is_verified_t20 || false,
      score: Math.round((p.compatibility_score || 0) * 100) || '?',
      online: p.is_online || false,
      bio: p.bio_text || p.bio || '',
      tip: p.wingman_tip || '',
      hue: p.hue || 220
    };
  },
  
  /**
   * Toggle favorite status
   */
  async toggleFavorite(profileId) {
    const isFavorite = State.gallery.favorites.has(profileId);
    
    try {
      if (isFavorite) {
        await API.Gallery.unlike(profileId);
        State.gallery.favorites.delete(profileId);
      } else {
        await API.Gallery.saveFavorite(profileId);
        State.gallery.favorites.add(profileId);
      }
      
      this.render();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      Utils.showToast('Tindakan gagal. Sila cuba lagi.', 'error');
    }
  },
  
  /**
   * Skip profile
   */
  async skipProfile(profileId) {
    try {
      await API.Gallery.skip(profileId);
      
      // Remove from local state
      State.gallery.profiles = State.gallery.profiles.filter(p => p.id !== profileId);
      
      this.render();
    } catch (error) {
      console.error('Failed to skip profile:', error);
      Utils.showToast('Tindakan gagal. Sila cuba lagi.', 'error');
    }
  },
  
  /**
   * Render profile card
   */
  renderProfileCard(profile, index) {
    const isFav = State.gallery.favorites.has(profile.id);
    
    return `
      <div class="pcard afu d${Math.min(index + 1, 5)}">
        <div class="pcard-ph" style="background:linear-gradient(135deg,hsl(${profile.hue},35%,20%),hsl(${profile.hue + 40},25%,13%))">
          <div class="pcard-ph-inner">
            <div style="width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.5" stroke-linecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          </div>
          <div class="wm"></div>
          <div class="pcard-badges">
            <span class="badge b-${profile.tier === 'gold' ? 'gld' : profile.tier === 'platinum' ? 'plt' : profile.tier === 'premium' ? 'prm' : 'rah'}">
              ${profile.tier.toUpperCase()}
            </span>
            ${profile.t20 ? `<span class="badge b-ver">${ICONS.shield} T20</span>` : ''}
          </div>
          <div class="pcard-score">${ICONS.heart} <b>${profile.score}%</b></div>
          ${profile.online ? '<div class="pcard-online"><span class="online-dot"></span>Dalam Talian</div>' : ''}
        </div>
        <div class="pcard-info">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-family:var(--fm);font-weight:700;font-size:18px;color:var(--n5)">${Utils.escapeHtml(profile.code)}</div>
              <div style="color:var(--is);font-size:14px">${Utils.escapeHtml(profile.name)}</div>
            </div>
            <div style="font-family:var(--fd);font-weight:600;font-size:26px;color:var(--im)">${profile.age}</div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0">
            <span class="chip">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              ${Utils.escapeHtml(profile.state)}
            </span>
            <span class="chip">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
              ${Utils.escapeHtml(profile.edu)}
            </span>
            <span class="chip">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              ${Utils.escapeHtml(profile.job)}
            </span>
            <span class="chip">${Utils.escapeHtml(profile.status)}</span>
          </div>
          <p style="font-size:14px;color:var(--is);line-height:1.55">${Utils.escapeHtml(profile.bio)}</p>
          ${profile.tip ? `<div class="wtip">${ICONS.sparkle}<span>${Utils.escapeHtml(profile.tip)}</span></div>` : ''}
          <div class="pcard-acts">
            <button class="btn bg" style="border:1px solid var(--s2)" title="Abaikan" onclick="GalleryPage.skipProfile('${profile.id}')">
              ${ICONS.x}<span class="hide-sm">Abaikan</span>
            </button>
            <button class="btn bg" style="border:1px solid var(--s2);color:${isFav ? 'var(--g5)' : 'var(--im)'}" onclick="GalleryPage.toggleFavorite('${profile.id}')" title="Simpan">
              ${ICONS.bookmark}<span class="hide-sm">Simpan</span>
            </button>
            <button class="btn bp lam" onclick="Navigation.startChat('${profile.id}')">
              ${ICONS.chat}<span> Lamar</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },
  
  /**
   * Render gallery page
   */
  render() {
    const shell = document.getElementById('shell-gallery');
    if (!shell) return;
    
    let html = Components.Sidebar.render('gallery');
    
    html += `
      <div style="max-width:640px;margin:0 auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div>
            <h1 style="font-family:var(--fd);font-weight:700;font-size:24px">Bilik Pameran</h1>
            <p style="color:var(--is);font-size:13px;margin-top:4px">Calon sekufu ≥85% keserasian</p>
          </div>
          <button class="btn bg" style="border:1px solid var(--s2);gap:6px">
            ${ICONS.filter} Tapis
          </button>
        </div>
    `;
    
    if (State.gallery.profiles.length === 0 && !State.gallery.loading) {
      html += `
        <div class="card" style="text-align:center;padding:48px 24px">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--g50);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
            ${ICONS.heart}
          </div>
          <h3 style="font-family:var(--fd);font-size:20px;margin-bottom:8px">Tiada Padanan Lagi</h3>
          <p style="color:var(--is);font-size:14px;margin-bottom:20px">Lengkapkan profil anda untuk mendapat cadangan calon sekufu.</p>
          <button class="btn bp" onclick="Navigation.go('profile')">Lengkapkan Profil</button>
        </div>
      `;
    }
    
    State.gallery.profiles.forEach((profile, index) => {
      html += this.renderProfileCard(profile, index);
    });
    
    if (State.gallery.hasMore) {
      html += `
        <button class="btn bs" style="width:100%;padding:13px 0;margin-bottom:20px" 
                onclick="GalleryPage.loadProfiles(false)" 
                ${State.gallery.loading ? 'disabled' : ''}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          ${State.gallery.loading ? 'Memuatkan...' : 'Lihat Lebih'}
        </button>
      `;
    }
    
    html += '</div>';
    html += Components.Sidebar.renderEnd();
    
    shell.innerHTML = html;
    Components.BottomNav.update('gallery');
  }
};
