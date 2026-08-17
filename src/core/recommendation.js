// ============================================
// MyVibe — Spotify "Next Sound" Recommendation Algorithm
// ============================================

import { store } from './store.js';
import { CURATED_HITS } from './api.js';

const WEIGHTS = {
  genre: 0.35,
  mood: 0.25,
  tempo: 0.15,
  energy: 0.10,
  novelty: 0.10,
  history: 0.05,
};

// Genre similarity matrix (0-1 scale)
const GENRE_SIMILARITY = {
  'Pop': { 'Pop': 1, 'Bollywood': 0.6, 'Rock': 0.5, 'Hip-Hop': 0.5, 'R&B': 0.6, 'Electronic': 0.6, 'Jazz': 0.2, 'Classical': 0.1, 'Latin': 0.6, 'Indie': 0.6, 'Metal': 0.2 },
  'Bollywood': { 'Pop': 0.6, 'Bollywood': 1, 'R&B': 0.5, 'Hip-Hop': 0.4, 'Indie': 0.5, 'Romantic': 0.8, 'Electronic': 0.4, 'Rock': 0.3, 'Latin': 0.3, 'Classical': 0.4 },
  'Rock': { 'Pop': 0.5, 'Bollywood': 0.3, 'Rock': 1, 'Hip-Hop': 0.2, 'R&B': 0.3, 'Electronic': 0.4, 'Jazz': 0.3, 'Classical': 0.2, 'Latin': 0.2, 'Indie': 0.7, 'Metal': 0.8 },
  'Hip-Hop': { 'Pop': 0.5, 'Bollywood': 0.4, 'Rock': 0.2, 'Hip-Hop': 1, 'R&B': 0.7, 'Electronic': 0.5, 'Jazz': 0.3, 'Classical': 0.1, 'Latin': 0.4, 'Indie': 0.3, 'Metal': 0.1 },
  'R&B': { 'Pop': 0.6, 'Bollywood': 0.5, 'Rock': 0.3, 'Hip-Hop': 0.7, 'R&B': 1, 'Electronic': 0.4, 'Jazz': 0.6, 'Classical': 0.2, 'Latin': 0.4, 'Indie': 0.4, 'Metal': 0.1 },
  'Electronic': { 'Pop': 0.6, 'Bollywood': 0.4, 'Rock': 0.4, 'Hip-Hop': 0.5, 'R&B': 0.4, 'Electronic': 1, 'Jazz': 0.2, 'Classical': 0.2, 'Latin': 0.4, 'Indie': 0.4, 'Metal': 0.2 },
  'Indie': { 'Pop': 0.6, 'Bollywood': 0.5, 'Rock': 0.7, 'Hip-Hop': 0.3, 'R&B': 0.4, 'Electronic': 0.4, 'Jazz': 0.4, 'Classical': 0.3, 'Latin': 0.3, 'Indie': 1, 'Metal': 0.3 },
  'Latin': { 'Pop': 0.6, 'Bollywood': 0.3, 'Rock': 0.2, 'Hip-Hop': 0.4, 'R&B': 0.4, 'Electronic': 0.4, 'Jazz': 0.4, 'Classical': 0.2, 'Latin': 1, 'Indie': 0.3, 'Metal': 0.1 },
  'Jazz': { 'Pop': 0.2, 'Bollywood': 0.3, 'Rock': 0.3, 'Hip-Hop': 0.3, 'R&B': 0.6, 'Electronic': 0.2, 'Jazz': 1, 'Classical': 0.6, 'Latin': 0.4, 'Indie': 0.4, 'Metal': 0.1 },
  'Classical': { 'Pop': 0.1, 'Bollywood': 0.4, 'Rock': 0.2, 'Hip-Hop': 0.1, 'R&B': 0.2, 'Electronic': 0.2, 'Jazz': 0.6, 'Classical': 1, 'Latin': 0.2, 'Indie': 0.3, 'Metal': 0.2 },
  'Metal': { 'Pop': 0.2, 'Bollywood': 0.1, 'Rock': 0.8, 'Hip-Hop': 0.1, 'R&B': 0.1, 'Electronic': 0.2, 'Jazz': 0.1, 'Classical': 0.2, 'Latin': 0.1, 'Indie': 0.3, 'Metal': 1 },
};

// Mood similarity
const MOOD_SIMILARITY = {
  'Happy': { 'Happy': 1, 'Chill': 0.6, 'Energetic': 0.8, 'Sad': 0.1, 'Romantic': 0.6, 'Dark': 0.1, 'Uplifting': 0.9, 'Peaceful': 0.5 },
  'Chill': { 'Happy': 0.6, 'Chill': 1, 'Energetic': 0.3, 'Sad': 0.4, 'Romantic': 0.7, 'Dark': 0.3, 'Uplifting': 0.5, 'Peaceful': 0.9 },
  'Energetic': { 'Happy': 0.8, 'Chill': 0.3, 'Energetic': 1, 'Sad': 0.1, 'Romantic': 0.4, 'Dark': 0.4, 'Uplifting': 0.8, 'Peaceful': 0.2 },
  'Sad': { 'Happy': 0.1, 'Chill': 0.4, 'Energetic': 0.1, 'Sad': 1, 'Romantic': 0.5, 'Dark': 0.6, 'Uplifting': 0.2, 'Peaceful': 0.4 },
  'Romantic': { 'Happy': 0.6, 'Chill': 0.7, 'Energetic': 0.4, 'Sad': 0.5, 'Romantic': 1, 'Dark': 0.2, 'Uplifting': 0.6, 'Peaceful': 0.6 },
  'Dark': { 'Happy': 0.1, 'Chill': 0.3, 'Energetic': 0.4, 'Sad': 0.6, 'Romantic': 0.2, 'Dark': 1, 'Uplifting': 0.1, 'Peaceful': 0.2 },
  'Uplifting': { 'Happy': 0.9, 'Chill': 0.5, 'Energetic': 0.8, 'Sad': 0.2, 'Romantic': 0.6, 'Dark': 0.1, 'Uplifting': 1, 'Peaceful': 0.5 },
  'Peaceful': { 'Happy': 0.5, 'Chill': 0.9, 'Energetic': 0.2, 'Sad': 0.4, 'Romantic': 0.6, 'Dark': 0.2, 'Uplifting': 0.5, 'Peaceful': 1 },
};

export class RecommendationEngine {
  constructor() {
    this.recentlyRecommended = new Set();
  }

  /**
   * Score a candidate track against the current track and user profile.
   * Returns a score from 0 to 1.
   */
  scoreTrack(candidate, currentTrack, profile) {
    let score = 0;

    // 1. Genre Match (35%)
    const genreScore = this._genreSimilarity(currentTrack?.genre, candidate.genre);
    const genrePreference = this._genrePreference(candidate.genre, profile);
    score += WEIGHTS.genre * (genreScore * 0.65 + genrePreference * 0.35);

    // 2. Mood Similarity (25%)
    const moodScore = this._moodSimilarity(currentTrack?.mood, candidate.mood);
    score += WEIGHTS.mood * moodScore;

    // 3. Tempo Proximity (15%)
    const tempoScore = this._tempoSimilarity(currentTrack?.tempo, candidate.tempo);
    score += WEIGHTS.tempo * tempoScore;

    // 4. Energy Level (10%)
    const energyScore = this._energySimilarity(currentTrack?.energy, candidate.energy);
    score += WEIGHTS.energy * energyScore;

    // 5. Novelty Bonus (10%)
    const noveltyScore = this._noveltyScore(candidate);
    score += WEIGHTS.novelty * noveltyScore;

    // 6. History Score (5%)
    const historyScore = this._historyScore(candidate);
    score += WEIGHTS.history * historyScore;

    return Math.max(0, Math.min(1, score));
  }

  _genreSimilarity(genre1, genre2) {
    if (!genre1 || !genre2) return 0.5;
    return GENRE_SIMILARITY[genre1]?.[genre2] ?? GENRE_SIMILARITY[genre2]?.[genre1] ?? 0.3;
  }

  _genrePreference(genre, profile) {
    if (!profile || !profile.totalPlays || !genre) return 0.5;
    const count = profile.genreCounts?.[genre] || 0;
    return Math.min(1, count / Math.max(1, profile.totalPlays * 0.3));
  }

  _moodSimilarity(mood1, mood2) {
    if (!mood1 || !mood2) return 0.5;
    return MOOD_SIMILARITY[mood1]?.[mood2] ?? MOOD_SIMILARITY[mood2]?.[mood1] ?? 0.3;
  }

  _tempoSimilarity(tempo1, tempo2) {
    if (!tempo1 || !tempo2) return 0.5;
    const diff = Math.abs(tempo1 - tempo2);
    return Math.max(0, 1 - diff / 60);
  }

  _energySimilarity(e1, e2) {
    if (e1 === undefined || e2 === undefined) return 0.5;
    const diff = Math.abs(e1 - e2);
    return Math.max(0, 1 - diff / 0.5);
  }

  _noveltyScore(candidate) {
    if (this.recentlyRecommended.has(candidate.id)) return 0.15;
    return 0.5 + Math.random() * 0.5;
  }

  _historyScore(candidate) {
    const recent = store.get('recentlyPlayed') || [];
    const idx = recent.findIndex(t => t.id === candidate.id);
    if (idx === -1) return 1.0; // Fresh track
    if (idx < 3) return 0.1;   // Just played
    return 0.6;
  }

  /**
   * Get top-N recommended tracks from a candidate pool.
   */
  recommend(candidates, currentTrack, count = 10) {
    let pool = Array.isArray(candidates) && candidates.length ? [...candidates] : [...CURATED_HITS];

    // Ensure candidate pool is rich
    if (pool.length < count) {
      pool = [...pool, ...CURATED_HITS];
    }

    const profile = store.get('listeningProfile') || {};

    // Filter out current track if provided
    const filtered = currentTrack ? pool.filter(c => c.id !== currentTrack.id) : pool;

    // Deduplicate by title & artist
    const seen = new Set();
    const uniqueCandidates = [];
    for (const c of filtered) {
      const key = `${c.title?.toLowerCase().trim()}_${c.artist?.toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCandidates.push(c);
      }
    }

    // Score all candidates
    const scored = uniqueCandidates.map(candidate => ({
      track: candidate,
      score: this.scoreTrack(candidate, currentTrack, profile),
    }));

    scored.sort((a, b) => b.score - a.score);

    const results = scored.slice(0, count).map(s => s.track);

    // Track to avoid immediate loops
    results.forEach(t => this.recentlyRecommended.add(t.id));

    if (this.recentlyRecommended.size > 100) {
      const arr = [...this.recentlyRecommended];
      this.recentlyRecommended = new Set(arr.slice(-40));
    }

    return results.length ? results : CURATED_HITS.slice(0, count);
  }

  reset() {
    this.recentlyRecommended.clear();
  }
}

export const recommender = new RecommendationEngine();
