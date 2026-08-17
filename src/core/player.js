// ============================================
// MyVibe — Audio Player Engine
// ============================================

import { store } from './store.js';
import { queue } from './queue.js';

class Player {
  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.listeners = new Map();
    this._progressRAF = null;
    this._errorRetryCount = 0;

    this._setupAudioEvents();
    this._setupMediaSession();
  }

  _setupAudioEvents() {
    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio.duration && !isNaN(this.audio.duration)) {
        store.set('duration', this.audio.duration);
      }
    });

    this.audio.addEventListener('play', () => {
      store.set('isPlaying', true);
      this._startProgressTracking();
      this.emit('play');
    });

    this.audio.addEventListener('pause', () => {
      store.set('isPlaying', false);
      this._stopProgressTracking();
      this.emit('pause');
    });

    this.audio.addEventListener('ended', () => {
      this._stopProgressTracking();
      this.emit('ended');
      this.playNext();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio playback error:', e);
      this.emit('error', e);
      if (this._errorRetryCount < 3) {
        this._errorRetryCount++;
        setTimeout(() => this.playNext(), 800);
      }
    });

    this.audio.addEventListener('timeupdate', () => {
      store.set('progress', this.audio.currentTime);
    });
  }

  _startProgressTracking() {
    this._stopProgressTracking();
    const update = () => {
      if (!this.audio.paused) {
        store.set('progress', this.audio.currentTime);
        this._progressRAF = requestAnimationFrame(update);
      }
    };
    this._progressRAF = requestAnimationFrame(update);
  }

  _stopProgressTracking() {
    if (this._progressRAF) {
      cancelAnimationFrame(this._progressRAF);
      this._progressRAF = null;
    }
  }

  _setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) this.seek(details.seekTime);
      });
    }
  }

  _updateMediaSession(track) {
    if ('mediaSession' in navigator && track) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album || 'MyVibe',
          artwork: [
            { src: track.coverSmall || '/placeholder.svg', sizes: '96x96', type: 'image/jpeg' },
            { src: track.coverMedium || '/placeholder.svg', sizes: '256x256', type: 'image/jpeg' },
            { src: track.coverLarge || '/placeholder.svg', sizes: '512x512', type: 'image/jpeg' },
          ],
        });
      } catch (e) {}
    }
  }

  // ---- Audio Context & Analyser (for Visualizer) ----
  initAudioContext() {
    if (this.analyser) return this.analyser;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('AudioContext init note (falling back to simulated visualizer):', e.message);
    }

    return this.analyser;
  }

  getAnalyserData() {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  // ---- Playback Controls ----
  async play(track) {
    if (!track || !track.previewUrl) {
      console.warn('No playable URL for track:', track?.title);
      return;
    }

    this._errorRetryCount = 0;
    store.set('currentTrack', track);
    store.set('progress', 0);
    store.set('duration', track.duration || 30);

    try {
      this.audio.src = track.previewUrl;
      this.audio.load();
      await this.audio.play();

      this._updateMediaSession(track);
      store.addToRecentlyPlayed(track);
      store.updateListeningProfile(track);
      this.emit('trackChange', track);
    } catch (e) {
      console.warn('Play attempt:', e.name);
      if (e.name === 'NotAllowedError') {
        store.set('currentTrack', track);
        this._updateMediaSession(track);
        this.emit('trackChange', track);
      }
    }
  }

  resume() {
    if (this.audio.src) {
      if (this.audioContext?.state === 'suspended') {
        this.audioContext.resume();
      }
      this.audio.play().catch(e => console.warn('Resume error:', e));
    }
  }

  pause() {
    this.audio.pause();
  }

  toggle() {
    if (this.audio.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  seek(time) {
    if (this.audio.src) {
      const dur = this.audio.duration || store.get('duration') || 30;
      this.audio.currentTime = Math.max(0, Math.min(time, dur));
      store.set('progress', this.audio.currentTime);
    }
  }

  seekPercent(percent) {
    const duration = this.audio.duration || store.get('duration') || 30;
    this.seek(duration * percent);
  }

  setVolume(vol) {
    this.audio.volume = Math.max(0, Math.min(1, vol));
    store.set('volume', this.audio.volume);
  }

  // ---- Queue Integration ----
  playNext() {
    const repeat = store.get('repeat');

    if (repeat === 'one') {
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
      return;
    }

    const next = queue.next();
    if (next) {
      this.play(next);
    } else if (repeat === 'all') {
      queue.restart();
      const first = queue.current();
      if (first) this.play(first);
    }
  }

  playPrevious() {
    if (this.audio.currentTime > 3) {
      this.seek(0);
      return;
    }

    const prev = queue.previous();
    if (prev) {
      this.play(prev);
    }
  }

  toggleShuffle() {
    const current = store.get('shuffle');
    store.set('shuffle', !current);
    if (!current) {
      queue.shuffle();
    } else {
      queue.unshuffle();
    }
  }

  toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const current = store.get('repeat') || 'off';
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    store.set('repeat', next);
  }

  // ---- Event System ----
  on(event, fn) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(fn => fn(data));
  }

  get currentTime() { return this.audio.currentTime; }
  get duration() { return this.audio.duration || store.get('duration') || 30; }
  get playing() { return !this.audio.paused; }
  get volume() { return this.audio.volume; }
}

export const player = new Player();
