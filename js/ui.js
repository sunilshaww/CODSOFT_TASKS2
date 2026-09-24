/**
 * ui.js — UI Controller
 * Handles all DOM updates, animations, progress bar, and rendering.
 */

const UI = (() => {

  // --- DOM References ---
  const els = {};

  function init() {
    els.albumArtContainer = document.getElementById('album-art-container');
    els.albumArtImg = document.getElementById('album-art-img');
    els.albumArtGlow = document.getElementById('album-art-glow');
    els.vinylDisc = document.getElementById('vinyl-disc');
    els.trackTitle = document.getElementById('track-title');
    els.trackArtist = document.getElementById('track-artist');
    els.trackAlbum = document.getElementById('track-album');
    els.progressWrapper = document.getElementById('progress-wrapper');
    els.progressBar = document.getElementById('progress-bar');
    els.progressBuffered = document.getElementById('progress-buffered');
    els.timeCurrent = document.getElementById('time-current');
    els.timeDuration = document.getElementById('time-duration');
    els.btnPlay = document.getElementById('btn-play');
    els.btnPrev = document.getElementById('btn-prev');
    els.btnNext = document.getElementById('btn-next');
    els.btnShuffle = document.getElementById('btn-shuffle');
    els.btnRepeat = document.getElementById('btn-repeat');
    els.btnFavorite = document.getElementById('btn-favorite');
    els.btnMute = document.getElementById('btn-mute');
    els.volumeSlider = document.getElementById('volume-slider');
    els.volumeFill = document.getElementById('volume-fill');
    els.volumeWrapper = document.getElementById('volume-wrapper');
    els.btnAutoplay = document.getElementById('btn-autoplay');
    els.btnFavoritesFilter = document.getElementById('btn-favorites-filter');
    els.trackList = document.getElementById('track-list');
    els.tabAll = document.getElementById('tab-all');
    els.tabFavorites = document.getElementById('tab-favorites');
    els.toast = document.getElementById('toast');
    els.particles = document.getElementById('particles');

    // New controls
    els.visualizer = document.getElementById('visualizer');
    els.btnSpeed = document.getElementById('btn-speed');
    els.playlistSearch = document.getElementById('playlist-search');
    els.btnClearSearch = document.getElementById('btn-clear-search');
    els.btnShortcuts = document.getElementById('btn-shortcuts');
    els.shortcutsModal = document.getElementById('shortcuts-modal');
    els.btnCloseModal = document.getElementById('btn-close-modal');

    createParticles();
    updateVolumeFill(80);
  }

  // --- Format Time ---
  function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // --- Update Track Display ---
  function updateTrackDisplay(track) {
    els.trackTitle.textContent = track.title;
    els.trackArtist.textContent = track.artist;
    els.trackAlbum.textContent = track.album;

    // Album art transition
    els.albumArtImg.style.opacity = '0';
    els.albumArtImg.style.transform = 'scale(0.95)';

    setTimeout(() => {
      els.albumArtImg.src = track.artwork;
      els.albumArtImg.alt = `${track.title} — ${track.artist}`;
      els.albumArtGlow.style.backgroundImage = `url(${track.artwork})`;
      els.albumArtImg.style.opacity = '1';
      els.albumArtImg.style.transform = 'scale(1)';
    }, 200);

    // Update page title
    document.title = `${track.title} — ${track.artist} | Aurora Player`;
  }

  // --- Playing State ---
  function setPlayingState(isPlaying) {
    if (isPlaying) {
      els.btnPlay.innerHTML = '⏸';
      els.btnPlay.title = 'Pause (Space)';
      els.btnPlay.setAttribute('aria-label', 'Pause');
      els.albumArtContainer.classList.add('playing');
      if (els.visualizer) els.visualizer.classList.add('active');
    } else {
      els.btnPlay.innerHTML = '▶';
      els.btnPlay.title = 'Play (Space)';
      els.btnPlay.setAttribute('aria-label', 'Play');
      els.albumArtContainer.classList.remove('playing');
      if (els.visualizer) els.visualizer.classList.remove('active');
    }
  }

  // --- Progress ---
  function updateProgress(current, duration) {
    if (!duration || isNaN(duration)) return;
    const percent = (current / duration) * 100;
    els.progressBar.style.width = `${percent}%`;
    els.timeCurrent.textContent = formatTime(current);
    els.progressWrapper.setAttribute('aria-valuenow', Math.round(percent));
  }

  function updateDuration(duration) {
    els.timeDuration.textContent = formatTime(duration);
  }

  function updateBuffered(percent) {
    els.progressBuffered.style.width = `${percent}%`;
  }

  function resetProgress() {
    els.progressBar.style.width = '0%';
    els.progressBuffered.style.width = '0%';
    els.timeCurrent.textContent = '0:00';
    els.timeDuration.textContent = '0:00';
  }

  // --- Volume ---
  function updateVolumeFill(percent) {
    els.volumeFill.style.width = `${percent}%`;
    els.volumeSlider.value = percent;
  }

  function updateMuteIcon(isMuted, volume) {
    if (isMuted || volume === 0) {
      els.btnMute.innerHTML = '🔇';
    } else if (volume < 0.4) {
      els.btnMute.innerHTML = '🔈';
    } else if (volume < 0.7) {
      els.btnMute.innerHTML = '🔉';
    } else {
      els.btnMute.innerHTML = '🔊';
    }
  }

  // --- Speed ---
  function updateSpeed(rate) {
    if (els.btnSpeed) {
      els.btnSpeed.textContent = `${rate}x`;
    }
  }

  // --- Shuffle ---
  function updateShuffle(isOn) {
    els.btnShuffle.classList.toggle('active', isOn);
  }

  // --- Repeat ---
  function updateRepeat(mode) {
    els.btnRepeat.classList.toggle('active', mode !== 'off');
    switch (mode) {
      case 'off': els.btnRepeat.innerHTML = '🔁'; break;
      case 'all': els.btnRepeat.innerHTML = '🔁'; break;
      case 'one': els.btnRepeat.innerHTML = '🔂'; break;
    }
  }

  // --- Autoplay ---
  function updateAutoplay(isOn) {
    els.btnAutoplay.classList.toggle('active', isOn);
  }

  // --- Favorite ---
  function updateFavorite(isFav) {
    els.btnFavorite.classList.toggle('active', isFav);
    els.btnFavorite.innerHTML = isFav ? '♥' : '♡';
    if (isFav) {
      els.btnFavorite.style.animation = 'none';
      els.btnFavorite.offsetHeight; // trigger reflow
      els.btnFavorite.style.animation = '';
    }
  }

  // --- Playlist Tabs ---
  function updateTabs(activeTab) {
    els.tabAll.classList.toggle('active', activeTab === 'all');
    els.tabFavorites.classList.toggle('active', activeTab === 'favorites');
    els.btnFavoritesFilter.classList.toggle('active', activeTab === 'favorites');
  }

  // --- Search Clear Button ---
  function updateSearchClear(hasText) {
    if (els.btnClearSearch) {
      els.btnClearSearch.style.display = hasText ? 'block' : 'none';
    }
  }

  // --- Shortcuts Modal ---
  function openModal() {
    if (els.shortcutsModal) {
      els.shortcutsModal.classList.add('open');
      els.shortcutsModal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeModal() {
    if (els.shortcutsModal) {
      els.shortcutsModal.classList.remove('open');
      els.shortcutsModal.setAttribute('aria-hidden', 'true');
    }
  }

  // --- Render Track List ---
  function renderTrackList(tracks, allTracks, currentIndex, isPlaying, searchQuery = '') {
    els.trackList.innerHTML = '';

    if (tracks.length === 0) {
      if (searchQuery) {
        els.trackList.innerHTML = `
          <div style="text-align:center;padding:40px 20px;color:var(--text-tertiary);">
            <div style="font-size:2rem;margin-bottom:12px;">🔍</div>
            <p>No tracks matching "${searchQuery}"</p>
            <p style="font-size:0.8rem;margin-top:4px;">Try searching for another artist or title</p>
          </div>
        `;
      } else {
        els.trackList.innerHTML = `
          <div style="text-align:center;padding:40px 20px;color:var(--text-tertiary);">
            <div style="font-size:2rem;margin-bottom:12px;">♡</div>
            <p>No favorite tracks yet</p>
            <p style="font-size:0.8rem;margin-top:4px;">Click the heart icon on any song to add it here</p>
          </div>
        `;
      }
      return;
    }

    tracks.forEach((track) => {
      // Find the actual index in the full tracks array
      const actualIndex = allTracks.indexOf(track);
      const isActive = actualIndex === currentIndex;

      const item = document.createElement('div');
      item.className = `track-item${isActive ? ' active' : ''}${isActive && !isPlaying ? ' paused' : ''}`;
      item.dataset.index = actualIndex;

      const numberContent = isActive
        ? `<div class="eq-bars"><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span></div>`
        : `${actualIndex + 1}`;

      item.innerHTML = `
        <div class="track-item-number">${numberContent}</div>
        <div class="track-item-art">
          <img src="${track.artwork}" alt="${track.title}" loading="lazy">
        </div>
        <div class="track-item-info">
          <div class="track-item-title">${track.title}</div>
          <div class="track-item-artist">${track.artist}</div>
        </div>
        <div class="track-item-actions">
          <button class="track-item-fav${track.favorite ? ' active' : ''}" data-track-id="${track.id}" title="${track.favorite ? 'Remove from favorites' : 'Add to favorites'}" aria-label="Toggle Favorite">
            ${track.favorite ? '♥' : '♡'}
          </button>
        </div>
        <div class="track-item-duration">${track.duration}</div>
      `;

      els.trackList.appendChild(item);
    });
  }

  // --- Scroll Active Track Into View ---
  function scrollToActive() {
    const active = els.trackList.querySelector('.track-item.active');
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // --- Toast ---
  let toastTimeout = null;
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      els.toast.classList.remove('show');
    }, 2000);
  }

  // --- Floating Particles ---
  function createParticles() {
    const count = 30;
    const colors = [
      'rgba(168, 85, 247, 0.3)',
      'rgba(6, 182, 212, 0.3)',
      'rgba(236, 72, 153, 0.2)',
      'rgba(99, 102, 241, 0.3)',
    ];

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDuration = `${8 + Math.random() * 20}s`;
      particle.style.animationDelay = `${Math.random() * 15}s`;
      particle.style.width = `${2 + Math.random() * 4}px`;
      particle.style.height = particle.style.width;
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      els.particles.appendChild(particle);
    }
  }

  // --- Get Elements (for event binding in app.js) ---
  function getElements() {
    return els;
  }

  return {
    init, updateTrackDisplay, setPlayingState, updateProgress, updateDuration,
    updateBuffered, resetProgress, updateVolumeFill, updateMuteIcon, updateSpeed,
    updateShuffle, updateRepeat, updateAutoplay, updateFavorite,
    updateTabs, updateSearchClear, openModal, closeModal,
    renderTrackList, scrollToActive, showToast, getElements,
    formatTime,
  };
})();
