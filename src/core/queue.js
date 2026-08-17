// ============================================
// MyVibe — Queue Manager with Smart Auto-Fill
// ============================================

import { store } from './store.js';
import { recommender } from './recommendation.js';
import { itunes, jiosaavn, CURATED_HITS } from './api.js';

class Queue {
  constructor() {
    this.originalOrder = [];
    this._isAutoFilling = false;
  }

  /**
   * Set queue with a list of tracks and start at index
   */
  set(tracks, startIndex = 0) {
    const validTracks = (tracks || []).filter(t => t && t.previewUrl);
    const pool = validTracks.length ? validTracks : CURATED_HITS;
    this.originalOrder = [...pool];
    store.set('queue', [...pool]);
    store.set('queueIndex', Math.max(0, Math.min(startIndex, pool.length - 1)));
  }

  /**
   * Add tracks to end of queue
   */
  add(tracks) {
    const current = store.get('queue') || [];
    const valid = (tracks || []).filter(t => t && t.previewUrl);
    store.set('queue', [...current, ...valid]);
  }

  /**
   * Add a single track to play next
   */
  playNext(track) {
    if (!track || !track.previewUrl) return;
    const q = store.get('queue') || [];
    const idx = store.get('queueIndex') ?? -1;
    const newQ = [...q];
    newQ.splice(idx + 1, 0, track);
    store.set('queue', newQ);
  }

  /**
   * Get current track
   */
  current() {
    const q = store.get('queue') || [];
    const idx = store.get('queueIndex') ?? -1;
    return q[idx] || null;
  }

  /**
   * Move to next track. Auto-fills with Spotify-like recommendations if queue is near end.
   */
  next() {
    const q = store.get('queue') || [];
    const idx = store.get('queueIndex') ?? -1;

    // Check if we need to pre-fetch auto-fill (when 2 or fewer tracks remain)
    if (idx >= q.length - 3) {
      this._autoFill();
    }

    if (idx < q.length - 1) {
      store.set('queueIndex', idx + 1);
      return q[idx + 1];
    }

    // Queue reached end — trigger autoFill synchronously if needed
    const currentTrack = this.current();
    const fallbackRecs = recommender.recommend(CURATED_HITS, currentTrack, 5);
    if (fallbackRecs.length) {
      this.add(fallbackRecs);
      const updatedQ = store.get('queue');
      store.set('queueIndex', idx + 1);
      return updatedQ[idx + 1] || null;
    }

    return null;
  }

  /**
   * Move to previous track
   */
  previous() {
    const idx = store.get('queueIndex') ?? 0;
    if (idx > 0) {
      store.set('queueIndex', idx - 1);
      return (store.get('queue') || [])[idx - 1];
    }
    return null;
  }

  /**
   * Shuffle upcoming tracks (keep current track in place)
   */
  shuffle() {
    const q = [...(store.get('queue') || [])];
    const idx = store.get('queueIndex') ?? 0;

    const upcoming = q.slice(idx + 1);
    for (let i = upcoming.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]];
    }

    store.set('queue', [...q.slice(0, idx + 1), ...upcoming]);
  }

  /**
   * Restore original queue order
   */
  unshuffle() {
    const currentTrack = this.current();
    store.set('queue', [...this.originalOrder]);
    if (currentTrack) {
      const newIdx = this.originalOrder.findIndex(t => t.id === currentTrack.id);
      store.set('queueIndex', newIdx >= 0 ? newIdx : 0);
    }
  }

  /**
   * Restart queue from beginning
   */
  restart() {
    store.set('queueIndex', 0);
  }

  /**
   * Remove track at index
   */
  remove(index) {
    const q = [...(store.get('queue') || [])];
    const currentIdx = store.get('queueIndex') ?? 0;
    q.splice(index, 1);
    store.set('queue', q);
    if (index < currentIdx) {
      store.set('queueIndex', currentIdx - 1);
    }
  }

  /**
   * Get upcoming tracks
   */
  getUpcoming(count = 10) {
    const q = store.get('queue') || [];
    const idx = store.get('queueIndex') ?? -1;
    const upcoming = q.slice(idx + 1, idx + 1 + count);

    // If upcoming is empty, provide dynamic recommendations
    if (upcoming.length === 0 && this.current()) {
      return recommender.recommend(CURATED_HITS, this.current(), count);
    }

    return upcoming;
  }

  /**
   * Auto-fill queue with smart recommendations
   */
  async _autoFill() {
    if (this._isAutoFilling) return;
    this._isAutoFilling = true;

    try {
      const currentTrack = this.current();
      if (!currentTrack) return;

      let candidates = [];

      // Fetch tracks based on current genre or artist
      if (currentTrack.genre) {
        candidates = await itunes.getGenreTracks(currentTrack.genre, 15);
      }

      if (candidates.length < 5 && currentTrack.artist) {
        candidates = await itunes.search(currentTrack.artist, 10);
      }

      if (candidates.length < 5) {
        candidates = await itunes.getTopChart(20);
      }

      // Merge with curated hits
      const fullCandidates = [...candidates, ...CURATED_HITS];
      const recommended = recommender.recommend(fullCandidates, currentTrack, 8);

      if (recommended.length > 0) {
        this.add(recommended);
      }
    } catch (e) {
      console.warn('Auto-fill error:', e);
      this.add(recommender.recommend(CURATED_HITS, this.current(), 5));
    } finally {
      this._isAutoFilling = false;
    }
  }

  get length() {
    return (store.get('queue') || []).length;
  }
}

export const queue = new Queue();
