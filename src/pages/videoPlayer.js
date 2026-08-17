// ============================================
// MyVibe — YouTube Music Video Player Page
// ============================================

import { icon } from '../core/icons.js';
import { youtube } from '../core/api.js';
import { showToast } from '../components/toast.js';

let currentVideoId = null;

export function showVideoPlayer(videoId, title = '', channel = '') {
  const overlay = document.getElementById('video-player-overlay');
  if (!overlay) return;

  currentVideoId = videoId;
  overlay.style.display = 'block';
  overlay.className = 'overlay animate-in';

  overlay.innerHTML = `
    <div class="video-player-page">
      <!-- Header -->
      <div style="display:flex;align-items:center;padding:var(--space-3) var(--space-4);background:#121212;border-bottom:1px solid rgba(255,255,255,0.08);z-index:10;">
        <button class="btn-icon btn-ghost" id="vp-close" aria-label="Close Video">
          ${icon('arrowLeft', 24)}
        </button>
        <span style="flex:1;text-align:center;font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold);color:var(--text-secondary);">
          Music Video
        </span>
        <div style="width:40px;"></div>
      </div>

      <!-- Video Container -->
      <div class="video-player-container" id="vp-container">
        <iframe 
          id="vp-iframe"
          src="${youtube.getEmbedUrl(videoId)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>

      <!-- Video Info & Related Section -->
      <div class="video-player-info" id="vp-info">
        <h2 class="video-player-title" id="vp-title">${escapeHtml(title || 'Playing Video')}</h2>
        <p class="video-player-meta" id="vp-meta">${escapeHtml(channel || 'YouTube Artist')}</p>

        <!-- Actions -->
        <div class="video-player-actions">
          <button class="video-action-btn" id="vp-like-btn">
            ${icon('heart', 20)}
            <span>Like</span>
          </button>
          <button class="video-action-btn" id="vp-share-btn">
            ${icon('share', 20)}
            <span>Share</span>
          </button>
          <button class="video-action-btn" id="vp-fullscreen-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
            <span>Full Screen</span>
          </button>
        </div>

        <!-- Related Videos -->
        <div id="vp-related" style="margin-top:var(--space-6);">
          <h3 style="font-size:var(--font-size-base);font-weight:var(--font-weight-bold);margin-bottom:var(--space-3);color:var(--text-primary);">
            Related Music Videos
          </h3>
          <div id="vp-related-content">
            <div style="display:flex;flex-direction:column;gap:var(--space-3);">
              ${Array(3).fill(`
                <div style="display:flex;gap:var(--space-3);">
                  <div class="skeleton" style="width:140px;aspect-ratio:16/9;border-radius:var(--radius-md);flex-shrink:0;"></div>
                  <div style="flex:1;">
                    <div class="skeleton" style="height:14px;width:90%;margin-bottom:var(--space-2);"></div>
                    <div class="skeleton" style="height:12px;width:60%;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setupVideoPlayerHandlers();
  loadRelatedVideos(title || 'top trending music');
}

export function hideVideoPlayer() {
  const overlay = document.getElementById('video-player-overlay');
  if (!overlay) return;

  const iframe = document.getElementById('vp-iframe');
  if (iframe) iframe.src = '';

  overlay.className = 'overlay animate-out';
  currentVideoId = null;

  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.innerHTML = '';
  }, 250);
}

function setupVideoPlayerHandlers() {
  // Close
  document.getElementById('vp-close')?.addEventListener('click', hideVideoPlayer);

  // Like
  document.getElementById('vp-like-btn')?.addEventListener('click', () => {
    const btn = document.getElementById('vp-like-btn');
    btn?.classList.toggle('active');
    showToast(btn?.classList.contains('active') ? 'Added video to favorites' : 'Removed from favorites');
  });

  // Share
  document.getElementById('vp-share-btn')?.addEventListener('click', () => {
    const url = `https://youtube.com/watch?v=${currentVideoId}`;
    if (navigator.share) {
      navigator.share({
        title: document.getElementById('vp-title')?.textContent || 'Video',
        url: url,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      showToast('Video link copied to clipboard!', 'info');
    }
  });

  // Fullscreen
  document.getElementById('vp-fullscreen-btn')?.addEventListener('click', () => {
    const container = document.getElementById('vp-container');
    const iframe = document.getElementById('vp-iframe');
    if (iframe?.requestFullscreen) {
      iframe.requestFullscreen();
    } else if (iframe?.webkitRequestFullscreen) {
      iframe.webkitRequestFullscreen();
    } else if (container?.requestFullscreen) {
      container.requestFullscreen();
    }
  });
}

async function loadRelatedVideos(query) {
  const container = document.getElementById('vp-related-content');
  if (!container) return;

  try {
    const related = await youtube.search(query, 6);
    const filtered = related.filter(v => v.videoId !== currentVideoId);

    if (filtered.length === 0) {
      container.innerHTML = '<p style="color:var(--text-secondary);font-size:var(--font-size-sm);">No related videos found</p>';
      return;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:var(--space-3);">
        ${filtered.map(v => `
          <div class="related-video-item" data-video-id="${v.videoId}" 
               style="display:flex;gap:var(--space-3);cursor:pointer;padding:var(--space-2);background:rgba(255,255,255,0.03);border-radius:var(--radius-md);transition:background var(--transition-fast);">
            <div style="width:130px;flex-shrink:0;position:relative;border-radius:var(--radius-md);overflow:hidden;">
              <img src="${v.thumbnail}" alt="${escapeHtml(v.title)}" 
                   style="width:100%;aspect-ratio:16/9;object-fit:cover;"
                   onerror="this.style.background='var(--bg-tertiary)'" loading="lazy" />
              <div class="video-card-duration">${formatDurationVideo(v.duration)}</div>
            </div>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;">
              <div class="text-clamp-2" style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);margin-bottom:var(--space-1);color:var(--text-primary);">
                ${escapeHtml(v.title)}
              </div>
              <div style="font-size:var(--font-size-xs);color:var(--text-secondary);">${escapeHtml(v.channel)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Click handler for related videos
    container.querySelectorAll('.related-video-item').forEach(item => {
      item.addEventListener('click', () => {
        const videoId = item.dataset.videoId;
        const title = item.querySelector('.text-clamp-2')?.textContent?.trim() || '';
        const channel = item.querySelector('[style*="color:var(--text-secondary)"]')?.textContent?.trim() || '';

        const iframe = document.getElementById('vp-iframe');
        if (iframe && videoId) {
          iframe.src = youtube.getEmbedUrl(videoId);
          currentVideoId = videoId;
          const titleEl = document.getElementById('vp-title');
          const metaEl = document.getElementById('vp-meta');
          if (titleEl) titleEl.textContent = title;
          if (metaEl) metaEl.textContent = channel;

          document.getElementById('vp-info')?.scrollTo({ top: 0, behavior: 'smooth' });
          loadRelatedVideos(title);
        }
      });
    });

  } catch (err) {
    console.warn('Related videos error:', err);
    container.innerHTML = '<p style="color:var(--text-tertiary);font-size:var(--font-size-sm);">Could not load related videos</p>';
  }
}

function formatDurationVideo(seconds) {
  if (!seconds || isNaN(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
