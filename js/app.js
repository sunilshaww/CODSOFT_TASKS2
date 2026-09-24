/**
 * app.js — Main Application
 * Wires Player, Playlist, and UI together. Handles all user interactions.
 */

(function () {
  'use strict';

  // --- Init ---
  Player.init();
  Playlist.init();
  UI.init();

  const els = UI.getElements();

  // --- Load initial track ---
  function loadTrack(track, autoPlay = false) {
    Player.loadTrack(track.src);
    UI.updateTrackDisplay(track);
    UI.resetProgress();
    UI.updateFavorite(track.favorite);
    refreshPlaylist();

    if (autoPlay) {
      // Small delay to let audio load
      setTimeout(() => {
        Player.play();
        UI.setPlayingState(true);
      }, 100);
    }
  }

  function refreshPlaylist() {
    const visibleTracks = Playlist.getVisibleTracks();
    const allTracks = Playlist.getTracks();
    const currentIndex = Playlist.getCurrentIndex();
    const state = Player.getState();
    const query = Playlist.getSearchQuery();
    UI.renderTrackList(visibleTracks, allTracks, currentIndex, state.isPlaying, query);
    bindTrackListEvents();
  }

  // --- Player Callbacks ---
  Player.on('timeupdate', (current, duration) => {
    UI.updateProgress(current, duration);
  });

  Player.on('metadata', (duration) => {
    UI.updateDuration(duration);
  });

  Player.on('buffer', (percent) => {
    UI.updateBuffered(percent);
  });

  Player.on('trackend', () => {
    UI.setPlayingState(false);

    if (Playlist.isAutoplayOn()) {
      const next = Playlist.goToNext();
      if (next) {
        loadTrack(next, true);
      } else {
        // Playlist ended
        UI.showToast('Playlist complete');
      }
    }
  });

  // --- Control Events ---

  // Play / Pause
  els.btnPlay.addEventListener('click', () => {
    const isPlaying = Player.togglePlay();
    UI.setPlayingState(isPlaying);
    refreshPlaylist();
  });

  // Previous
  els.btnPrev.addEventListener('click', () => {
    // If more than 3s into song, restart; otherwise go to prev
    const state = Player.getState();
    if (state.currentTime > 3) {
      Player.seek(0);
      return;
    }
    const prev = Playlist.goToPrev();
    if (prev) {
      loadTrack(prev, true);
    }
  });

  // Next
  els.btnNext.addEventListener('click', () => {
    const next = Playlist.goToNext();
    if (next) {
      loadTrack(next, true);
    } else {
      UI.showToast('End of playlist');
    }
  });

  // Shuffle
  els.btnShuffle.addEventListener('click', () => {
    const isOn = Playlist.toggleShuffle();
    UI.updateShuffle(isOn);
    UI.showToast(isOn ? 'Shuffle On' : 'Shuffle Off');
  });

  // Repeat
  els.btnRepeat.addEventListener('click', () => {
    const mode = Playlist.cycleRepeat();
    UI.updateRepeat(mode);
    const labels = { off: 'Repeat Off', all: 'Repeat All', one: 'Repeat One' };
    UI.showToast(labels[mode]);
  });

  // Favorite (current track)
  els.btnFavorite.addEventListener('click', () => {
    const track = Playlist.getCurrentTrack();
    const isFav = Playlist.toggleFavorite(track.id);
    UI.updateFavorite(isFav);
    UI.showToast(isFav ? `Added "${track.title}" to favorites` : `Removed "${track.title}" from favorites`);
    refreshPlaylist();
  });

  // Autoplay
  els.btnAutoplay.addEventListener('click', () => {
    const isOn = Playlist.toggleAutoplay();
    UI.updateAutoplay(isOn);
    UI.showToast(isOn ? 'Autoplay On' : 'Autoplay Off');
  });

  // --- Progress Bar Seek ---
  let isSeeking = false;

  function handleSeek(e) {
    const rect = els.progressWrapper.getBoundingClientRect();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const percent = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
    Player.seek(percent);
    UI.updateProgress(Player.getState().currentTime, Player.getState().duration);
  }

  els.progressWrapper.addEventListener('mousedown', (e) => {
    isSeeking = true;
    handleSeek(e);
  });

  els.progressWrapper.addEventListener('touchstart', (e) => {
    isSeeking = true;
    handleSeek(e);
  }, { passive: true });

  document.addEventListener('mousemove', (e) => {
    if (isSeeking) handleSeek(e);
  });

  document.addEventListener('touchmove', (e) => {
    if (isSeeking) handleSeek(e);
  }, { passive: true });

  document.addEventListener('mouseup', () => { isSeeking = false; });
  document.addEventListener('touchend', () => { isSeeking = false; });

  // --- Volume ---
  els.volumeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    Player.setVolume(val / 100);
    UI.updateVolumeFill(val);
    UI.updateMuteIcon(false, val / 100);
  });

  // Click on volume wrapper for instant set
  els.volumeWrapper.addEventListener('click', (e) => {
    const rect = els.volumeWrapper.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    Player.setVolume(percent / 100);
    UI.updateVolumeFill(percent);
    UI.updateMuteIcon(false, percent / 100);
  });

  // Mute
  els.btnMute.addEventListener('click', () => {
    const result = Player.toggleMute();
    UI.updateMuteIcon(result.isMuted, result.isMuted ? 0 : result.volume);
    UI.updateVolumeFill(result.isMuted ? 0 : result.displayVolume * 100);
  });

  // --- Playlist Tabs ---
  els.tabAll.addEventListener('click', () => {
    Playlist.setTab('all');
    UI.updateTabs('all');
    refreshPlaylist();
  });

  els.tabFavorites.addEventListener('click', () => {
    Playlist.setTab('favorites');
    UI.updateTabs('favorites');
    refreshPlaylist();
  });

  els.btnFavoritesFilter.addEventListener('click', () => {
    const currentTab = Playlist.getTab();
    const newTab = currentTab === 'favorites' ? 'all' : 'favorites';
    Playlist.setTab(newTab);
    UI.updateTabs(newTab);
    refreshPlaylist();
  });

  // --- Track List Item Events ---
  function bindTrackListEvents() {
    // Click track to play
    const items = els.trackList.querySelectorAll('.track-item');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking the fav button
        if (e.target.closest('.track-item-fav')) return;

        const index = parseInt(item.dataset.index);
        const track = Playlist.goToTrack(index);
        if (track) {
          loadTrack(track, true);
        }
      });
    });

    // Favorite buttons in track list
    const favBtns = els.trackList.querySelectorAll('.track-item-fav');
    favBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trackId = parseInt(btn.dataset.trackId);
        const isFav = Playlist.toggleFavorite(trackId);

        // Update the main favorite button if this is the current track
        const currentTrack = Playlist.getCurrentTrack();
        if (currentTrack.id === trackId) {
          UI.updateFavorite(isFav);
        }

        refreshPlaylist();
        UI.showToast(isFav ? 'Added to favorites' : 'Removed from favorites');
      });
    });
  }

  // --- Speed Control ---
  if (els.btnSpeed) {
    els.btnSpeed.addEventListener('click', () => {
      const speed = Player.cycleSpeed();
      UI.updateSpeed(speed);
      UI.showToast(`Speed: ${speed}x`);
    });
  }

  // --- Search Input ---
  if (els.playlistSearch) {
    els.playlistSearch.addEventListener('input', (e) => {
      Playlist.setSearchQuery(e.target.value);
      UI.updateSearchClear(!!e.target.value);
      refreshPlaylist();
    });
  }

  if (els.btnClearSearch) {
    els.btnClearSearch.addEventListener('click', () => {
      els.playlistSearch.value = '';
      Playlist.setSearchQuery('');
      UI.updateSearchClear(false);
      refreshPlaylist();
      els.playlistSearch.focus();
    });
  }

  // --- Shortcuts Modal ---
  if (els.btnShortcuts) {
    els.btnShortcuts.addEventListener('click', () => UI.openModal());
  }

  if (els.btnCloseModal) {
    els.btnCloseModal.addEventListener('click', () => UI.closeModal());
  }

  if (els.shortcutsModal) {
    els.shortcutsModal.addEventListener('click', (e) => {
      if (e.target === els.shortcutsModal) UI.closeModal();
    });
  }

  // --- Keyboard Shortcuts ---
  document.addEventListener('keydown', (e) => {
    // Escape always closes modal
    if (e.key === 'Escape') {
      UI.closeModal();
      return;
    }

    // Don't fire audio shortcuts if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        const isPlaying = Player.togglePlay();
        UI.setPlayingState(isPlaying);
        refreshPlaylist();
        break;
      case 'ArrowRight':
        e.preventDefault();
        Player.seek(((Player.getState().currentTime + 5) / Player.getState().duration) * 100);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        Player.seek(Math.max(0, ((Player.getState().currentTime - 5) / Player.getState().duration) * 100));
        break;
      case 'ArrowUp':
        e.preventDefault();
        const volUp = Math.min(1, Player.getState().volume + 0.05);
        Player.setVolume(volUp);
        UI.updateVolumeFill(volUp * 100);
        UI.updateMuteIcon(false, volUp);
        break;
      case 'ArrowDown':
        e.preventDefault();
        const volDown = Math.max(0, Player.getState().volume - 0.05);
        Player.setVolume(volDown);
        UI.updateVolumeFill(volDown * 100);
        UI.updateMuteIcon(false, volDown);
        break;
      case 'm':
      case 'M':
        const result = Player.toggleMute();
        UI.updateMuteIcon(result.isMuted, result.isMuted ? 0 : result.volume);
        UI.updateVolumeFill(result.isMuted ? 0 : result.displayVolume * 100);
        break;
      case 'n':
      case 'N':
        els.btnNext.click();
        break;
      case 'p':
      case 'P':
        els.btnPrev.click();
        break;
      case 's':
      case 'S':
        els.btnShuffle.click();
        break;
      case 'r':
      case 'R':
        els.btnRepeat.click();
        break;
      case '?':
        UI.openModal();
        break;
    }
  });

  // --- Initialize UI State ---
  UI.updateAutoplay(Playlist.isAutoplayOn());
  UI.updateShuffle(Playlist.isShuffleOn());
  UI.updateRepeat(Playlist.getRepeatMode());
  UI.updateSpeed(Player.getSpeed());
  UI.updateMuteIcon(false, 0.8);

  // Load the first track
  const firstTrack = Playlist.getCurrentTrack();
  loadTrack(firstTrack, false);

  // Scroll to active after render
  setTimeout(() => UI.scrollToActive(), 300);

  console.log('%c🎵 Aurora Player loaded!', 'color: #a855f7; font-size: 14px; font-weight: bold;');
  console.log('%cKeyboard: Space=Play/Pause, ←→=Seek, ↑↓=Volume, M=Mute, N=Next, P=Prev, S=Shuffle, R=Repeat, ?=Shortcuts', 'color: #06b6d4; font-size: 11px;');

})();
