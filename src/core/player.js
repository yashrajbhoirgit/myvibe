// ============================================
// MyVibe — Audio Player Engine
// Uses local yt-dlp proxy (port 3001) to get
// ad-free, full-length audio streams from YouTube.
// Falls back to iTunes 30s preview if proxy unavailable.
// ============================================

import { store } from './store.js';
import { queue } from './queue.js';

const PROXY_BASE = 'http://localhost:3001';
let _proxyAvailable = null; // null = unchecked, true/false after check

// Check once if the local proxy is running
async function checkProxy() {
  if (_proxyAvailable !== null) return _proxyAvailable;
  try {
    const res = await fetch(`${PROXY_BASE}/health`, { signal: AbortSignal.timeout(1500) });
    _proxyAvailable = res.ok;
  } catch {
    _proxyAvailable = false;
  }
  return _proxyAvailable;
}

// Get ad-free audio stream URL via local yt-dlp proxy
async function getStreamUrl(videoId) {
  const res = await fetch(`${PROXY_BASE}/stream?videoId=${videoId}`, {
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
  const json = await res.json();
  if (!json.url) throw new Error('No stream URL in response');
  return json.url;
}

// Search YouTube for a song via proxy
async function searchForTrack(title, artist) {
  const q = encodeURIComponent(`${title} ${artist} audio`);
  const res = await fetch(`${PROXY_BASE}/search?q=${q}`, {
    signal: AbortSignal.timeout(18000),
  });
  if (!res.ok) throw new Error(`Search error: ${res.status}`);
  const json = await res.json();
  return json.videoId || null;
}

class Player {
  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'none';

    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.listeners = new Map();
    this._progressInterval = null;
    this._errorRetryCount = 0;
    this._currentTrackId = null;

    this._setupAudioEvents();
    this._setupMediaSession();

    // Pre-check proxy availability in background
    checkProxy().then(ok => {
      if (ok) console.log('✅ yt-dlp proxy available — ad-free full songs enabled');
      else console.warn('⚠️ yt-dlp proxy not running — using 30s previews. Run: npm run proxy');
    });
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
      store.set('isPlaying', false);
      this.emit('ended');
      this.playNext();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio error:', e);
      this.emit('error', e);
      if (this._errorRetryCount < 2) {
        this._errorRetryCount++;
        setTimeout(() => this.playNext(), 800);
      }
    });
  }

  _startProgressTracking() {
    this._stopProgressTracking();
    this._progressInterval = setInterval(() => {
      if (!this.audio.paused) {
        store.set('progress', this.audio.currentTime);
      }
    }, 500);
  }

  _stopProgressTracking() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
    }
  }

  _setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
      navigator.mediaSession.setActionHandler('seekto', (d) => {
        if (d.seekTime !== undefined) this.seek(d.seekTime);
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

  // ---- AudioContext for visualizer ----
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
      console.warn('AudioContext init note:', e.message);
    }
    return this.analyser;
  }

  getAnalyserData() {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  // ---- MAIN PLAY ----
  async play(track) {
    if (!track) return;

    this._errorRetryCount = 0;
    this._currentTrackId = track.id;

    store.set('currentTrack', track);
    store.set('progress', 0);
    store.set('duration', track.duration || 180);

    this._updateMediaSession(track);
    store.addToRecentlyPlayed(track);
    store.updateListeningProfile(track);
    this.emit('trackChange', track);

    const proxyOk = await checkProxy();

    if (proxyOk) {
      // ── Proxy path: get ad-free full song ──
      // 1. Play preview immediately for instant audio feedback
      if (track.previewUrl) {
        this.audio.src = track.previewUrl;
        this.audio.volume = store.get('volume') ?? 1;
        this.audio.load();
        this.audio.play().catch(() => {});
      }

      // 2. In background, find YouTube video + get full stream
      try {
        const videoId = await searchForTrack(track.title, track.artist);
        if (!videoId || this._currentTrackId !== track.id) return; // track changed

        const streamUrl = await getStreamUrl(videoId);
        if (!streamUrl || this._currentTrackId !== track.id) return;

        // Switch to full stream seamlessly
        const wasTime = this.audio.currentTime;
        this.audio.src = streamUrl;
        this.audio.volume = store.get('volume') ?? 1;
        this.audio.load();
        // Resume from roughly where preview was
        this.audio.currentTime = wasTime;
        await this.audio.play();
        console.log(`🎵 Full song loaded: ${track.title}`);
      } catch (e) {
        console.warn('Proxy full-song failed, staying on preview:', e.message);
        // Already playing preview — just let it continue
      }
    } else {
      // ── Fallback path: iTunes 30s preview ──
      if (!track.previewUrl) {
        console.warn('No playable URL for:', track.title);
        return;
      }
      this.audio.src = track.previewUrl;
      this.audio.volume = store.get('volume') ?? 1;
      this.audio.load();
      try {
        await this.audio.play();
      } catch (e) {
        if (e.name === 'NotAllowedError') {
          store.set('currentTrack', track);
          this._updateMediaSession(track);
          this.emit('trackChange', track);
        }
      }
    }
  }

  resume() {
    if (this.audioContext?.state === 'suspended') this.audioContext.resume();
    this.audio.play().catch(e => console.warn('Resume:', e));
  }

  pause() {
    this.audio.pause();
  }

  toggle() {
    if (this.audio.paused) this.resume(); else this.pause();
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
    if (this.audio.currentTime > 3) { this.seek(0); return; }
    const prev = queue.previous();
    if (prev) this.play(prev);
  }

  toggleShuffle() {
    const current = store.get('shuffle');
    store.set('shuffle', !current);
    if (!current) queue.shuffle(); else queue.unshuffle();
  }

  toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const current = store.get('repeat') || 'off';
    store.set('repeat', modes[(modes.indexOf(current) + 1) % modes.length]);
  }

  // ---- Event System ----
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
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
