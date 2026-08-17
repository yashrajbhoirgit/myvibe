// ============================================
// MyVibe — State Store with localStorage
// ============================================

const STORAGE_KEY = 'myvibe_store';

const defaultState = {
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off', // 'off', 'all', 'one'
  queue: [],
  queueIndex: -1,
  history: [],       // listening history (track ids)
  likedSongs: [],    // liked track objects
  playlists: [],     // user-created playlists
  recentlyPlayed: [], // recently played tracks
  listeningProfile: { // for recommendation engine
    genreCounts: {},
    moodCounts: {},
    avgTempo: 120,
    avgEnergy: 0.6,
    totalPlays: 0,
  },
};

class Store {
  constructor() {
    this.state = { ...defaultState };
    this.listeners = new Map();
    this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge but don't restore playback state
        this.state = {
          ...this.state,
          likedSongs: parsed.likedSongs || [],
          playlists: parsed.playlists || [],
          recentlyPlayed: parsed.recentlyPlayed || [],
          listeningProfile: parsed.listeningProfile || defaultState.listeningProfile,
          volume: parsed.volume ?? 0.8,
          shuffle: parsed.shuffle ?? false,
          repeat: parsed.repeat ?? 'off',
        };
      }
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
  }

  save() {
    try {
      const toSave = {
        likedSongs: this.state.likedSongs,
        playlists: this.state.playlists,
        recentlyPlayed: this.state.recentlyPlayed,
        listeningProfile: this.state.listeningProfile,
        volume: this.state.volume,
        shuffle: this.state.shuffle,
        repeat: this.state.repeat,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    const old = this.state[key];
    this.state[key] = value;
    this.notify(key, value, old);
    
    // Auto-save persistent fields
    const persistent = ['likedSongs', 'playlists', 'recentlyPlayed', 'listeningProfile', 'volume', 'shuffle', 'repeat'];
    if (persistent.includes(key)) {
      this.save();
    }
  }

  update(key, updater) {
    const current = this.state[key];
    const updated = updater(current);
    this.set(key, updated);
  }

  on(key, fn) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(fn);
    return () => this.listeners.get(key)?.delete(fn);
  }

  notify(key, value, old) {
    this.listeners.get(key)?.forEach(fn => fn(value, old));
    this.listeners.get('*')?.forEach(fn => fn(key, value, old));
  }

  // ---- Convenience Methods ----
  
  isLiked(trackId) {
    return this.state.likedSongs.some(t => t.id === trackId);
  }

  toggleLike(track) {
    if (this.isLiked(track.id)) {
      this.set('likedSongs', this.state.likedSongs.filter(t => t.id !== track.id));
      return false;
    } else {
      this.set('likedSongs', [track, ...this.state.likedSongs]);
      return true;
    }
  }

  addToRecentlyPlayed(track) {
    const filtered = this.state.recentlyPlayed.filter(t => t.id !== track.id);
    this.set('recentlyPlayed', [track, ...filtered].slice(0, 50));
  }

  updateListeningProfile(track) {
    const profile = { ...this.state.listeningProfile };
    profile.totalPlays++;
    
    if (track.genre) {
      profile.genreCounts[track.genre] = (profile.genreCounts[track.genre] || 0) + 1;
    }
    if (track.mood) {
      profile.moodCounts[track.mood] = (profile.moodCounts[track.mood] || 0) + 1;
    }
    if (track.tempo) {
      const total = profile.totalPlays;
      profile.avgTempo = ((profile.avgTempo * (total - 1)) + track.tempo) / total;
    }
    if (track.energy !== undefined) {
      const total = profile.totalPlays;
      profile.avgEnergy = ((profile.avgEnergy * (total - 1)) + track.energy) / total;
    }
    
    this.set('listeningProfile', profile);
  }

  createPlaylist(name) {
    const playlist = {
      id: 'pl_' + Date.now(),
      name,
      tracks: [],
      createdAt: Date.now(),
    };
    this.set('playlists', [playlist, ...this.state.playlists]);
    return playlist;
  }

  addToPlaylist(playlistId, track) {
    this.set('playlists', this.state.playlists.map(pl => {
      if (pl.id === playlistId) {
        if (pl.tracks.some(t => t.id === track.id)) return pl;
        return { ...pl, tracks: [...pl.tracks, track] };
      }
      return pl;
    }));
  }

  removeFromPlaylist(playlistId, trackId) {
    this.set('playlists', this.state.playlists.map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) };
      }
      return pl;
    }));
  }
}

export const store = new Store();
