/**
 * playlist.js — Playlist Engine
 * Manages track data, shuffle, repeat, favorites, and queue logic.
 */

const Playlist = (() => {

  // --- Track Data ---
  const tracks = [
    {
      id: 1,
      title: 'Midnight Drive',
      artist: 'The Neon Outlaws',
      album: 'Synthwave Anthem',
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      artwork: 'assets/album_midnight_drive.jpg',
      duration: '6:13',
      favorite: false,
    },
    {
      id: 2,
      title: 'Ocean Waves',
      artist: 'Serene Drift',
      album: 'Calm Waters',
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      artwork: 'assets/album_ocean_waves.jpg',
      duration: '5:47',
      favorite: false,
    },
    {
      id: 3,
      title: 'Neon Lights',
      artist: 'Pulse Circuit',
      album: 'Digital Frontier',
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      artwork: 'assets/album_neon_lights.jpg',
      duration: '5:32',
      favorite: false,
    },
    {
      id: 4,
      title: 'Sunset Boulevard',
      artist: 'Lofi Dreamer',
      album: 'Golden Hour',
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      artwork: 'assets/album_sunset_boulevard.jpg',
      duration: '7:01',
      favorite: false,
    },
    {
      id: 5,
      title: 'Starlight',
      artist: "Luna's Echo",
      album: 'Cosmic Reverie',
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      artwork: 'assets/album_starlight.jpg',
      duration: '4:48',
      favorite: false,
    },
    {
      id: 6,
      title: 'Electric Dreams',
      artist: 'Retro Synth Co.',
      album: 'Future Past',
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      artwork: 'assets/album_electric_dreams.jpg',
      duration: '6:35',
      favorite: false,
    },
  ];

  let currentIndex = 0;
  let shuffleOn = false;
  let repeatMode = 'off'; // 'off' | 'all' | 'one'
  let autoplayOn = true;
  let shuffleQueue = [];
  let shufflePosition = 0;
  let currentTab = 'all'; // 'all' | 'favorites'
  let searchQuery = '';

  // --- Init: Load favorites from localStorage ---
  function init() {
    const savedFavs = localStorage.getItem('aurora_favorites');
    if (savedFavs) {
      try {
        const favIds = JSON.parse(savedFavs);
        tracks.forEach(t => {
          if (favIds.includes(t.id)) t.favorite = true;
        });
      } catch (e) { /* ignore parse errors */ }
    }
  }

  // --- Save favorites ---
  function saveFavorites() {
    const favIds = tracks.filter(t => t.favorite).map(t => t.id);
    localStorage.setItem('aurora_favorites', JSON.stringify(favIds));
  }

  // --- Search ---
  function setSearchQuery(query) {
    searchQuery = (query || '').trim().toLowerCase();
  }

  function getSearchQuery() {
    return searchQuery;
  }

  // --- Get Tracks ---
  function getTracks() {
    return tracks;
  }

  function getVisibleTracks() {
    let list = tracks;
    if (currentTab === 'favorites') {
      list = list.filter(t => t.favorite);
    }
    if (searchQuery) {
      list = list.filter(t => 
        t.title.toLowerCase().includes(searchQuery) ||
        t.artist.toLowerCase().includes(searchQuery) ||
        t.album.toLowerCase().includes(searchQuery)
      );
    }
    return list;
  }

  function getCurrentTrack() {
    return tracks[currentIndex];
  }

  function getCurrentIndex() {
    return currentIndex;
  }

  function setCurrentIndex(idx) {
    currentIndex = idx;
  }

  // --- Shuffle ---
  function buildShuffleQueue() {
    shuffleQueue = tracks.map((_, i) => i);
    // Fisher-Yates
    for (let i = shuffleQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffleQueue[i], shuffleQueue[j]] = [shuffleQueue[j], shuffleQueue[i]];
    }
    // Put current track at the beginning
    const currentPos = shuffleQueue.indexOf(currentIndex);
    if (currentPos > 0) {
      [shuffleQueue[0], shuffleQueue[currentPos]] = [shuffleQueue[currentPos], shuffleQueue[0]];
    }
    shufflePosition = 0;
  }

  function toggleShuffle() {
    shuffleOn = !shuffleOn;
    if (shuffleOn) buildShuffleQueue();
    return shuffleOn;
  }

  function isShuffleOn() {
    return shuffleOn;
  }

  // --- Repeat ---
  function cycleRepeat() {
    if (repeatMode === 'off') repeatMode = 'all';
    else if (repeatMode === 'all') repeatMode = 'one';
    else repeatMode = 'off';
    return repeatMode;
  }

  function getRepeatMode() {
    return repeatMode;
  }

  // --- Autoplay ---
  function toggleAutoplay() {
    autoplayOn = !autoplayOn;
    return autoplayOn;
  }

  function isAutoplayOn() {
    return autoplayOn;
  }

  // --- Navigation ---
  function getNextIndex() {
    if (repeatMode === 'one') return currentIndex;

    if (shuffleOn) {
      shufflePosition++;
      if (shufflePosition >= shuffleQueue.length) {
        if (repeatMode === 'all') {
          buildShuffleQueue();
          return shuffleQueue[0];
        }
        return -1; // End of queue
      }
      return shuffleQueue[shufflePosition];
    }

    const next = currentIndex + 1;
    if (next >= tracks.length) {
      if (repeatMode === 'all') return 0;
      return -1;
    }
    return next;
  }

  function getPrevIndex() {
    if (shuffleOn) {
      shufflePosition--;
      if (shufflePosition < 0) {
        shufflePosition = 0;
        return shuffleQueue[0];
      }
      return shuffleQueue[shufflePosition];
    }

    const prev = currentIndex - 1;
    if (prev < 0) return tracks.length - 1;
    return prev;
  }

  function goToNext() {
    const next = getNextIndex();
    if (next === -1) return null;
    currentIndex = next;
    if (shuffleOn) {
      const pos = shuffleQueue.indexOf(next);
      if (pos !== -1) shufflePosition = pos;
    }
    return tracks[currentIndex];
  }

  function goToPrev() {
    const prev = getPrevIndex();
    currentIndex = prev;
    return tracks[currentIndex];
  }

  function goToTrack(index) {
    currentIndex = index;
    if (shuffleOn) {
      const pos = shuffleQueue.indexOf(index);
      if (pos !== -1) shufflePosition = pos;
    }
    return tracks[currentIndex];
  }

  // --- Favorites ---
  function toggleFavorite(trackId) {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      track.favorite = !track.favorite;
      saveFavorites();
      return track.favorite;
    }
    return false;
  }

  function isCurrentFavorite() {
    return tracks[currentIndex]?.favorite || false;
  }

  // --- Tabs ---
  function setTab(tab) {
    currentTab = tab;
  }

  function getTab() {
    return currentTab;
  }

  return {
    init, getTracks, getVisibleTracks, getCurrentTrack, getCurrentIndex,
    setCurrentIndex, toggleShuffle, isShuffleOn, cycleRepeat, getRepeatMode,
    toggleAutoplay, isAutoplayOn, goToNext, goToPrev, goToTrack,
    toggleFavorite, isCurrentFavorite, setTab, getTab,
    setSearchQuery, getSearchQuery,
  };
})();
