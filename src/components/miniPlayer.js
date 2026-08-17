// ============================================
// MyVibe — Floating Mini Player Component
// ============================================

import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { player } from '../core/player.js';
import { showNowPlaying } from '../pages/nowPlaying.js';

export function renderMiniPlayer() {
  const container = document.getElementById('mini-player');
  if (!container) return;

  // Listen for track changes
  store.on('currentTrack', (track) => {
    if (track) {
      container.style.display = 'block';
      updateMiniPlayer(track);
    } else {
      container.style.display = 'none';
    }
  });

  store.on('isPlaying', () => updateMiniPlayerState());
  store.on('progress', () => updateMiniProgress());

  // Initial state check
  const track = store.get('currentTrack');
  if (track) {
    container.style.display = 'block';
    updateMiniPlayer(track);
  }
}

function updateMiniPlayer(track) {
  const container = document.getElementById('mini-player');
  if (!container) return;
  const isPlaying = store.get('isPlaying');
  const isLiked = store.isLiked(track.id);

  container.innerHTML = `
    <div class="mini-player-wrapper" id="mini-player-tap">
      <div class="mini-player-progress" id="mini-progress-bar"></div>
      <div class="mini-player-cover">
        <img src="${track.coverSmall || '/placeholder.svg'}" alt="${escapeHtml(track.title)}" 
             onerror="this.src='/placeholder.svg'" loading="lazy" />
      </div>
      <div class="mini-player-info">
        <div class="mini-player-title text-ellipsis">${escapeHtml(track.title)}</div>
        <div class="mini-player-artist text-ellipsis">${escapeHtml(track.artist)}</div>
      </div>
      <div class="mini-player-controls">
        <button class="btn-icon-sm btn-ghost like-btn ${isLiked ? 'liked' : ''}" 
                id="mini-like-btn" aria-label="Like">
          ${isLiked ? icon('heartFilled', 20) : icon('heart', 20)}
        </button>
        <button class="btn-icon btn-ghost" id="mini-play-btn" aria-label="${isPlaying ? 'Pause' : 'Play'}">
          ${isPlaying ? icon('pause', 28) : icon('play', 28)}
        </button>
      </div>
    </div>
  `;

  // Tap handler to expand Now Playing
  const tapArea = document.getElementById('mini-player-tap');
  tapArea?.addEventListener('click', (e) => {
    if (e.target.closest('#mini-play-btn') || e.target.closest('#mini-like-btn')) return;
    showNowPlaying();
  });

  // Play/Pause button
  document.getElementById('mini-play-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    player.toggle();
  });

  // Like button
  document.getElementById('mini-like-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const curr = store.get('currentTrack');
    if (curr) {
      const liked = store.toggleLike(curr);
      const btn = document.getElementById('mini-like-btn');
      btn?.classList.toggle('liked', liked);
      if (btn) btn.innerHTML = liked ? icon('heartFilled', 20) : icon('heart', 20);
    }
  });
}

function updateMiniPlayerState() {
  const btn = document.getElementById('mini-play-btn');
  const isPlaying = store.get('isPlaying');
  if (btn) {
    btn.innerHTML = isPlaying ? icon('pause', 28) : icon('play', 28);
  }
}

function updateMiniProgress() {
  const bar = document.getElementById('mini-progress-bar');
  if (!bar) return;
  const progress = store.get('progress') || 0;
  const duration = store.get('duration') || 30;
  if (duration > 0) {
    bar.style.width = `${(progress / duration) * 100}%`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
