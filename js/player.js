/**
 * player.js — Audio Engine
 * Handles HTMLAudioElement, playback, seek, volume, and events.
 */

const Player = (() => {
  const audio = document.getElementById('audio-player');
  let isPlaying = false;
  let currentVolume = 0.8;
  let isMuted = false;
  let previousVolume = 0.8;
  let playbackRate = 1.0;
  const supportedSpeeds = [0.75, 1.0, 1.25, 1.5, 2.0];

  // Callbacks (set by app.js)
  let onTimeUpdate = null;
  let onTrackEnd = null;
  let onMetadataLoaded = null;
  let onBufferUpdate = null;
  let onError = null;

  // Web Audio Synth Fallback (for offline or stream errors)
  let audioCtx = null;
  let synthInterval = null;
  let isUsingSynth = false;

  // --- Init ---
  function init() {
    audio.volume = currentVolume;
    audio.playbackRate = playbackRate;

    audio.addEventListener('timeupdate', () => {
      if (onTimeUpdate && !isUsingSynth) {
        onTimeUpdate(audio.currentTime, audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      isPlaying = false;
      if (onTrackEnd) onTrackEnd();
    });

    audio.addEventListener('loadedmetadata', () => {
      if (onMetadataLoaded) {
        onMetadataLoaded(audio.duration);
      }
    });

    audio.addEventListener('progress', () => {
      if (audio.buffered.length > 0 && audio.duration) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const percent = (bufferedEnd / audio.duration) * 100;
        if (onBufferUpdate) onBufferUpdate(percent);
      }
    });

    audio.addEventListener('canplay', () => {
      if (onMetadataLoaded) {
        onMetadataLoaded(audio.duration);
      }
    });

    audio.addEventListener('error', (e) => {
      console.warn('Audio stream error, activating Web Audio synthesizer fallback:', e);
      if (onError) onError(e);
      // Fallback gracefully to Web Audio synthesized ambient chords
      activateSynthFallback();
    });
  }

  // Web Audio Synth Fallback
  function activateSynthFallback() {
    try {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
      }
      isUsingSynth = true;
      if (isPlaying) startSynthNotes();
    } catch (err) {
      console.warn('Web Audio Context unavailable:', err);
    }
  }

  function startSynthNotes() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    stopSynthNotes();

    const chords = [
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
      [130.81, 164.81, 196.00], // C
      [196.00, 246.94, 293.66], // G
    ];
    let chordIdx = 0;
    let synthTime = 0;
    const fakeDuration = 180; // 3 mins

    synthInterval = setInterval(() => {
      if (!isPlaying) return;
      synthTime += 1;
      if (onTimeUpdate) onTimeUpdate(synthTime, fakeDuration);

      if (synthTime % 3 === 0) {
        playSynthChord(chords[chordIdx % chords.length]);
        chordIdx++;
      }

      if (synthTime >= fakeDuration) {
        stopSynthNotes();
        if (onTrackEnd) onTrackEnd();
      }
    }, 1000);
  }

  function playSynthChord(freqs) {
    if (!audioCtx || isMuted || currentVolume === 0) return;
    freqs.forEach(freq => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08 * currentVolume, audioCtx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.4);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 2.5);
    });
  }

  function stopSynthNotes() {
    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
  }

  // --- Load Track ---
  function loadTrack(src) {
    isUsingSynth = false;
    stopSynthNotes();
    audio.src = src;
    audio.playbackRate = playbackRate;
    audio.load();
  }

  // --- Play ---
  function play() {
    if (isUsingSynth) {
      isPlaying = true;
      startSynthNotes();
      return;
    }

    const promise = audio.play();
    if (promise) {
      promise.then(() => {
        isPlaying = true;
      }).catch(err => {
        console.warn('Play blocked or stream issue:', err);
        activateSynthFallback();
        isPlaying = true;
        startSynthNotes();
      });
    } else {
      isPlaying = true;
    }
  }

  // --- Pause ---
  function pause() {
    audio.pause();
    stopSynthNotes();
    isPlaying = false;
  }

  // --- Toggle ---
  function togglePlay() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
    return isPlaying;
  }

  // --- Seek ---
  function seek(percent) {
    if (audio.duration && !isUsingSynth) {
      audio.currentTime = (percent / 100) * audio.duration;
    }
  }

  // --- Volume ---
  function setVolume(vol) {
    currentVolume = Math.max(0, Math.min(1, vol));
    audio.volume = currentVolume;
    if (currentVolume > 0) {
      isMuted = false;
      previousVolume = currentVolume;
    }
  }

  function toggleMute() {
    if (isMuted) {
      audio.volume = previousVolume;
      currentVolume = previousVolume;
      isMuted = false;
    } else {
      previousVolume = currentVolume;
      audio.volume = 0;
      currentVolume = 0;
      isMuted = true;
    }
    return { isMuted, volume: currentVolume, displayVolume: isMuted ? 0 : previousVolume };
  }

  // --- Playback Speed ---
  function cycleSpeed() {
    const nextIdx = (supportedSpeeds.indexOf(playbackRate) + 1) % supportedSpeeds.length;
    playbackRate = supportedSpeeds[nextIdx];
    audio.playbackRate = playbackRate;
    return playbackRate;
  }

  function getSpeed() {
    return playbackRate;
  }

  // --- Getters ---
  function getState() {
    return {
      isPlaying,
      currentTime: audio.currentTime,
      duration: audio.duration || 0,
      volume: currentVolume,
      isMuted,
      playbackRate,
    };
  }

  function getDuration() {
    return audio.duration || 0;
  }

  // --- Register Callbacks ---
  function on(event, callback) {
    switch (event) {
      case 'timeupdate': onTimeUpdate = callback; break;
      case 'trackend': onTrackEnd = callback; break;
      case 'metadata': onMetadataLoaded = callback; break;
      case 'buffer': onBufferUpdate = callback; break;
      case 'error': onError = callback; break;
    }
  }

  return {
    init, loadTrack, play, pause, togglePlay, seek, setVolume, toggleMute,
    cycleSpeed, getSpeed, getState, getDuration, on
  };
})();
