// ============================================
// MyVibe — Audio Player Engine (YouTube IFrame + Audio fallback)
// ============================================
//
// Strategy:
//  1. When a track is played, search YouTube for "<title> <artist> audio"
//  2. Play full song via a hidden YouTube IFrame (official API, free, full songs)
//  3. Sync progress/state to store so all UI (mini-player, now-playing) works normally
//  4. iTunes preview is used only as an instant-start fallback while YT loads

import { store } from './store.js';
import { queue } from './queue.js';

// ---- YouTube IFrame API Loader ----
let ytApiReady = false;
let ytApiLoadStarted = false;
const ytReadyCallbacks = [];

function loadYTApi() {
  if (ytApiLoadStarted) return;
  ytApiLoadStarted = true;

  window.onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    ytReadyCallbacks.forEach(cb => cb());
    ytReadyCallbacks.length = 0;
  };

  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

function onYTReady(cb) {
  if (ytApiReady) { cb(); return; }
  ytReadyCallbacks.push(cb);
  loadYTApi();
}

// ---- Invidious instances for search (no API key needed) ----
const INVIDIOUS_SEARCH = [
  'https://inv.nadeko.net/api/v1/search',
  'https://invidious.nerdvpn.de/api/v1/search',
  'https://invidious.protokolla.fi/api/v1/search',
  'https://iv.melmac.space/api/v1/search',
];

async function searchYouTubeForTrack(title, artist) {
  const query = `${title} ${artist} audio official`;
  for (const base of INVIDIOUS_SEARCH) {
    try {
      const url = `${base}?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        // Pick first result that's not too long (skip mixes > 8 min)
        const best = data.find(v => v.videoId && (v.lengthSeconds || 999) < 480) || data[0];
        if (best?.videoId) return best.videoId;
      }
    } catch (e) {}
  }
  return null;
}

class Player {
  constructor() {
    // Fallback HTML5 audio (for iTunes 30s previews as instant start)
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'none'; // don't preload previews eagerly

    // YouTube IFrame player
    this.ytPlayer = null;
    this.ytContainer = null;
    this._ytReady = false;
    this._ytVideoId = null;
    this._ytDuration = 0;
    this._mode = 'audio'; // 'audio' | 'youtube'

    // State
    this.listeners = new Map();
    this._progressInterval = null;
    this._errorRetryCount = 0;
    this._currentTrack = null;

    this._setupAudioEvents();
    this._setupMediaSession();
    this._initYTContainer();
    loadYTApi(); // preload YT API immediately
  }

  // ---- Create hidden YT iframe container ----
  _initYTContainer() {
    this.ytContainer = document.createElement('div');
    this.ytContainer.id = 'yt-player-hidden';
    this.ytContainer.style.cssText = `
      position:fixed; bottom:-9999px; left:-9999px;
      width:1px; height:1px; opacity:0; pointer-events:none;
      z-index:-1;
    `;
    document.body.appendChild(this.ytContainer);
  }

  // ---- Create/reinit YouTube Player ----
  _initYTPlayer(videoId) {
    return new Promise((resolve) => {
      onYTReady(() => {
        // Destroy existing player if any
        if (this.ytPlayer) {
          try { this.ytPlayer.destroy(); } catch (e) {}
          this.ytPlayer = null;
        }

        // Inner div for YT to mount into
        const inner = document.createElement('div');
        inner.id = 'yt-inner-' + Date.now();
        this.ytContainer.innerHTML = '';
        this.ytContainer.appendChild(inner);

        this.ytPlayer = new YT.Player(inner.id, {
          width: '1',
          height: '1',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            // vq=tiny minimizes video quality → less data
            vq: 'tiny',
          },
          events: {
            onReady: (e) => {
              this._ytReady = true;
              e.target.setVolume(Math.round((store.get('volume') ?? 1) * 100));
              resolve(e.target);
            },
            onStateChange: (e) => this._onYTStateChange(e),
            onError: (e) => {
              console.warn('YT player error:', e.data);
              this._mode = 'audio';
              this._startAudioFallback();
            },
          },
        });
      });
    });
  }

  _onYTStateChange(e) {
    const S = YT.PlayerState;
    if (e.data === S.PLAYING) {
      this._ytDuration = this.ytPlayer.getDuration() || 0;
      store.set('duration', this._ytDuration);
      store.set('isPlaying', true);
      this._startProgressTracking();
      // Stop the preview audio if it was playing
      this.audio.pause();
      this.audio.src = '';
      this.emit('play');
    } else if (e.data === S.PAUSED) {
      store.set('isPlaying', false);
      this._stopProgressTracking();
      this.emit('pause');
    } else if (e.data === S.ENDED) {
      this._stopProgressTracking();
      store.set('isPlaying', false);
      this.emit('ended');
      this.playNext();
    }
  }

  // ---- Audio fallback events ----
  _setupAudioEvents() {
    this.audio.addEventListener('loadedmetadata', () => {
      if (this._mode !== 'audio') return;
      if (this.audio.duration && !isNaN(this.audio.duration)) {
        store.set('duration', this.audio.duration);
      }
    });

    this.audio.addEventListener('play', () => {
      if (this._mode !== 'audio') return;
      store.set('isPlaying', true);
      this._startProgressTracking();
      this.emit('play');
    });

    this.audio.addEventListener('pause', () => {
      if (this._mode !== 'audio') return;
      store.set('isPlaying', false);
      this._stopProgressTracking();
      this.emit('pause');
    });

    this.audio.addEventListener('ended', () => {
      if (this._mode !== 'audio') return;
      this._stopProgressTracking();
      this.emit('ended');
      this.playNext();
    });

    this.audio.addEventListener('error', () => {
      if (this._mode !== 'audio') return;
      this.emit('error');
      if (this._errorRetryCount < 2) {
        this._errorRetryCount++;
        setTimeout(() => this.playNext(), 800);
      }
    });
  }

  _startAudioFallback() {
    const track = this._currentTrack;
    if (!track?.previewUrl) return;
    this.audio.src = track.previewUrl;
    this.audio.load();
    this.audio.play().catch(() => {});
  }

  _startProgressTracking() {
    this._stopProgressTracking();
    this._progressInterval = setInterval(() => {
      if (this._mode === 'youtube' && this.ytPlayer) {
        try {
          const t = this.ytPlayer.getCurrentTime();
          if (typeof t === 'number') store.set('progress', t);
        } catch (e) {}
      } else if (this._mode === 'audio' && !this.audio.paused) {
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

  // ---- AudioContext / Analyser (visualizer) ----
  initAudioContext() { return null; } // not available in YT mode
  getAnalyserData() { return null; }

  // ---- MAIN PLAY ----
  async play(track) {
    if (!track) return;
    this._errorRetryCount = 0;
    this._currentTrack = track;

    store.set('currentTrack', track);
    store.set('progress', 0);
    store.set('duration', track.duration || 180);
    store.set('isPlaying', false);

    this._updateMediaSession(track);
    store.addToRecentlyPlayed(track);
    store.updateListeningProfile(track);
    this.emit('trackChange', track);

    // Step 1: Start iTunes preview immediately for instant audio feedback
    if (track.previewUrl) {
      this._mode = 'audio';
      this.audio.src = track.previewUrl;
      this.audio.load();
      this.audio.play().catch(() => {});
    }

    // Step 2: Search YouTube in background for full song
    try {
      const videoId = await searchYouTubeForTrack(track.title, track.artist);
      if (!videoId) {
        console.warn('No YouTube result found for:', track.title);
        return;
      }

      // Don't interrupt if user already changed track
      if (this._currentTrack?.id !== track.id) return;

      this._mode = 'youtube';
      this._ytVideoId = videoId;

      // Stop preview audio before YT takes over
      this.audio.pause();
      this.audio.src = '';

      store.set('progress', 0);
      await this._initYTPlayer(videoId);
    } catch (e) {
      console.warn('YouTube play error:', e);
      // Stay on preview audio if YT failed
      this._mode = 'audio';
    }
  }

  resume() {
    if (this._mode === 'youtube' && this.ytPlayer) {
      try { this.ytPlayer.playVideo(); } catch (e) {}
    } else if (this.audio.src) {
      if (this.audioContext?.state === 'suspended') this.audioContext.resume();
      this.audio.play().catch(() => {});
    }
  }

  pause() {
    if (this._mode === 'youtube' && this.ytPlayer) {
      try { this.ytPlayer.pauseVideo(); } catch (e) {}
    } else {
      this.audio.pause();
    }
  }

  toggle() {
    if (store.get('isPlaying')) {
      this.pause();
    } else {
      this.resume();
    }
  }

  seek(time) {
    if (this._mode === 'youtube' && this.ytPlayer) {
      try {
        this.ytPlayer.seekTo(time, true);
        store.set('progress', time);
      } catch (e) {}
    } else if (this.audio.src) {
      const dur = this.audio.duration || store.get('duration') || 30;
      this.audio.currentTime = Math.max(0, Math.min(time, dur));
      store.set('progress', this.audio.currentTime);
    }
  }

  seekPercent(percent) {
    const duration = this._mode === 'youtube'
      ? (this._ytDuration || store.get('duration') || 180)
      : (this.audio.duration || store.get('duration') || 30);
    this.seek(duration * percent);
  }

  setVolume(vol) {
    const v = Math.max(0, Math.min(1, vol));
    this.audio.volume = v;
    if (this._mode === 'youtube' && this.ytPlayer) {
      try { this.ytPlayer.setVolume(Math.round(v * 100)); } catch (e) {}
    }
    store.set('volume', v);
  }

  // ---- Queue Integration ----
  playNext() {
    const repeat = store.get('repeat');
    if (repeat === 'one') {
      store.set('progress', 0);
      if (this._mode === 'youtube' && this.ytPlayer) {
        try { this.ytPlayer.seekTo(0); this.ytPlayer.playVideo(); } catch (e) {}
      } else {
        this.audio.currentTime = 0;
        this.audio.play().catch(() => {});
      }
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
    const current = store.get('progress') || 0;
    if (current > 3) { this.seek(0); return; }
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

  get currentTime() {
    if (this._mode === 'youtube' && this.ytPlayer) {
      try { return this.ytPlayer.getCurrentTime() || 0; } catch (e) {}
    }
    return this.audio.currentTime;
  }

  get duration() {
    if (this._mode === 'youtube' && this._ytDuration) return this._ytDuration;
    return this.audio.duration || store.get('duration') || 180;
  }

  get playing() { return store.get('isPlaying') || false; }
  get volume() { return store.get('volume') ?? 1; }
}

export const player = new Player();
