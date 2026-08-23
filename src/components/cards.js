// ============================================
// MyVibe — Track & Video Card Renderers
// ============================================

import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { player } from '../core/player.js';
import { queue } from '../core/queue.js';
import { showToast } from './toast.js';
import { showNowPlaying } from '../pages/nowPlaying.js';
import { showVideoPlayer } from '../pages/videoPlayer.js';
import { showContextMenu } from './contextMenu.js';

/**
 * Render a horizontal scrolling card row
 */
export function renderCardRow(tracks, containerId) {
  if (!tracks || !tracks.length) return '';
  return `
    <div class="h-scroll" id="${containerId}">
      ${tracks.map((track, i) => renderCard(track, i)).join('')}
    </div>
  `;
}

/**
 * Single music card (for horizontal scroll)
 */
function renderCard(track, index) {
  const isPlaying = store.get('currentTrack')?.id === track.id && store.get('isPlaying');
  const fullSongBadge = track.isFullSong
    ? `<span class="song-badge song-badge--full" title="Full song">FULL</span>`
    : `<span class="song-badge song-badge--preview" title="30 second preview">30s</span>`;
  return `
    <div class="card" style="width:150px;" data-track-id="${track.id}" data-index="${index}">
      <div class="card-cover">
        <img src="${track.coverMedium || track.coverSmall || '/placeholder.svg'}" 
             alt="${escapeHtml(track.title)}" 
             onerror="this.src='/placeholder.svg'" loading="lazy" />
        <button class="btn-play" aria-label="Play ${escapeHtml(track.title)}">
          ${isPlaying ? icon('pause', 20) : icon('play', 20)}
        </button>
        ${fullSongBadge}
      </div>
      <div class="card-info">
        <div class="card-title text-ellipsis">${escapeHtml(track.title)}</div>
        <div class="card-subtitle text-ellipsis">${escapeHtml(track.artist)}</div>
      </div>
    </div>
  `;
}

/**
 * Render a track list
 */
export function renderTrackList(tracks, containerId, showNumbers = false) {
  if (!tracks || !tracks.length) return '';
  const currentTrackId = store.get('currentTrack')?.id;
  return `
    <div class="track-list" id="${containerId}">
      ${tracks.map((track, i) => renderTrackItem(track, i, showNumbers, currentTrackId)).join('')}
    </div>
  `;
}

function renderTrackItem(track, index, showNumber, currentTrackId) {
  const isPlaying = currentTrackId === track.id;
  const isLiked = store.isLiked(track.id);
  const dur = formatDuration(track.duration);

  return `
    <div class="track-item ${isPlaying ? 'playing' : ''}" 
         data-track-id="${track.id}" data-index="${index}">
      ${showNumber ? `
        <div class="track-item-number">
          ${isPlaying ? `
            <div class="playing-indicator">
              <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
            </div>
          ` : index + 1}
        </div>
      ` : ''}
      <div class="track-item-cover">
        <img src="${track.coverSmall || '/placeholder.svg'}" alt="${escapeHtml(track.title)}" 
             onerror="this.src='/placeholder.svg'" loading="lazy" />
        ${isPlaying ? `
          <div class="playing-indicator">
            <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
          </div>
        ` : ''}
      </div>
      <div class="track-item-info">
        <div class="track-title text-ellipsis">${escapeHtml(track.title)}</div>
        <div class="track-artist text-ellipsis">${escapeHtml(track.artist)}</div>
      </div>
      <div class="track-item-actions">
        ${track.isFullSong
          ? `<span class="song-badge song-badge--full song-badge--sm" title="Full song">FULL</span>`
          : `<span class="song-badge song-badge--preview song-badge--sm" title="30 second preview">30s</span>`
        }
        <span class="track-duration">${dur}</span>
        <button class="btn-icon-sm like-btn ${isLiked ? 'liked' : ''}" 
                data-like-id="${track.id}" aria-label="Like">
          ${isLiked ? icon('heartFilled', 18) : icon('heart', 18)}
        </button>
        <button class="btn-icon-sm btn-ghost track-more-btn" 
                data-more-id="${track.id}" aria-label="More options" title="More">
          ${icon('moreVertical', 18)}
        </button>
      </div>
    </div>
  `;
}

/**
 * Render video cards grid
 */
export function renderVideoGrid(videos, containerId) {
  if (!videos || !videos.length) return '';
  return `
    <div class="grid-2" id="${containerId}" style="padding: 0 var(--space-4);">
      ${videos.map(v => renderVideoCard(v)).join('')}
    </div>
  `;
}

/**
 * Render horizontal video scroll
 */
export function renderVideoRow(videos, containerId) {
  if (!videos || !videos.length) return '';
  return `
    <div class="h-scroll" id="${containerId}">
      ${videos.map(v => `
        <div class="video-card" style="width:280px;" data-video-id="${v.videoId}">
          <div class="video-card-thumb">
            <img src="${v.thumbnail}" alt="${escapeHtml(v.title)}" 
                 onerror="this.style.background='var(--bg-tertiary)'" loading="lazy" />
            <div class="video-card-play-overlay">
              <div class="btn-play">${icon('play', 24)}</div>
            </div>
            <div class="video-card-duration">${formatDuration(v.duration)}</div>
          </div>
          <div class="video-card-info">
            <div class="video-card-title text-ellipsis">${escapeHtml(v.title)}</div>
            <div class="video-card-channel text-ellipsis">${escapeHtml(v.channel)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderVideoCard(video) {
  return `
    <div class="video-card" data-video-id="${video.videoId}">
      <div class="video-card-thumb">
        <img src="${video.thumbnail}" alt="${escapeHtml(video.title)}" 
             onerror="this.style.background='var(--bg-tertiary)'" loading="lazy" />
        <div class="video-card-play-overlay">
          <div class="btn-play" style="width:40px;height:40px;">${icon('play', 20)}</div>
        </div>
        <div class="video-card-duration">${formatDuration(video.duration)}</div>
      </div>
      <div class="video-card-info">
        <div class="video-card-title text-clamp-2">${escapeHtml(video.title)}</div>
        <div class="video-card-channel text-ellipsis">${escapeHtml(video.channel)}</div>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners to track/video containers
 */
export function attachTrackListeners(containerId, tracks) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.addEventListener('click', (e) => {
    // Handle more button (context menu)
    const moreBtn = e.target.closest('[data-more-id]');
    if (moreBtn) {
      e.stopPropagation();
      const trackId = moreBtn.dataset.moreId;
      const track = tracks.find(t => t.id === trackId);
      if (track) showContextMenu(track);
      return;
    }

    // Handle like button
    const likeBtn = e.target.closest('[data-like-id]');
    if (likeBtn) {
      e.stopPropagation();
      const trackId = likeBtn.dataset.likeId;
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        const liked = store.toggleLike(track);
        likeBtn.classList.toggle('liked', liked);
        likeBtn.innerHTML = liked ? icon('heartFilled', 18) : icon('heart', 18);
        showToast(liked ? 'Added to Liked Songs' : 'Removed from Liked Songs');
      }
      return;
    }

    // Handle track click
    const trackEl = e.target.closest('[data-track-id]');
    if (trackEl) {
      const trackId = trackEl.dataset.trackId;
      const index = parseInt(trackEl.dataset.index || '0');
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        queue.set(tracks, index);
        player.play(track);
        showNowPlaying();
      }
      return;
    }

    // Handle video click
    const videoEl = e.target.closest('[data-video-id]');
    if (videoEl) {
      const videoId = videoEl.dataset.videoId;
      const title = videoEl.querySelector('.video-card-title')?.textContent?.trim() || '';
      const channel = videoEl.querySelector('.video-card-channel')?.textContent?.trim() || '';
      showVideoPlayer(videoId, title, channel);
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format seconds to mm:ss
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
