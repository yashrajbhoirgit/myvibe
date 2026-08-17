// ============================================
// MyVibe — Now Playing Full Screen Player
// ============================================

import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { player } from '../core/player.js';
import { queue } from '../core/queue.js';
import { formatDuration } from '../components/cards.js';
import { showToast } from '../components/toast.js';
import { showVideoPlayer } from './videoPlayer.js';
import { youtube } from '../core/api.js';

let visualizerRAF = null;
let isNowPlayingVisible = false;
let cleanupFns = [];

export function showNowPlaying() {
  const overlay = document.getElementById('now-playing-overlay');
  if (!overlay) return;

  isNowPlayingVisible = true;
  overlay.style.display = 'block';
  overlay.className = 'overlay animate-in';

  renderNowPlayingContent();
  setupNowPlayingListeners();
}

export function hideNowPlaying() {
  const overlay = document.getElementById('now-playing-overlay');
  if (!overlay) return;

  isNowPlayingVisible = false;
  overlay.className = 'overlay animate-out';

  stopVisualizer();
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];

  setTimeout(() => {
    overlay.style.display = 'none';
  }, 250);
}

function renderNowPlayingContent() {
  const overlay = document.getElementById('now-playing-overlay');
  const track = store.get('currentTrack');
  const isPlaying = store.get('isPlaying');
  const shuffleOn = store.get('shuffle');
  const repeatMode = store.get('repeat') || 'off';
  const progress = store.get('progress') || 0;
  const duration = store.get('duration') || track?.duration || 30;
  const isLiked = track ? store.isLiked(track.id) : false;

  const upNext = queue.getUpcoming(3);

  overlay.innerHTML = `
    <div class="now-playing">
      <!-- Header -->
      <div class="now-playing-header">
        <button class="btn-icon btn-ghost" id="np-close" aria-label="Close Now Playing">
          ${icon('chevronDown', 28)}
        </button>
        <span class="now-playing-header-title">Now Playing</span>
        <button class="btn-icon btn-ghost" id="np-queue-btn" aria-label="View Queue" title="Queue">
          ${icon('queue', 22)}
        </button>
      </div>

      <!-- Artwork -->
      <div class="now-playing-artwork">
        <img src="${track?.coverLarge || track?.coverMedium || '/placeholder.svg'}" 
             alt="${escapeHtml(track?.title || 'Track')}" 
             id="np-artwork"
             onerror="this.src='/placeholder.svg'" />
      </div>

      <!-- Visualizer (Equalizer Frequency Bars) -->
      <div class="visualizer-container" id="np-visualizer">
        ${Array(28).fill(0).map(() => '<div class="visualizer-bar" style="height:3px;"></div>').join('')}
      </div>

      <!-- Track Info -->
      <div class="now-playing-info">
        <div style="flex:1;min-width:0;padding-right:var(--space-3);">
          <div class="now-playing-song-title text-ellipsis" id="np-title">
            ${escapeHtml(track?.title || 'No track selected')}
          </div>
          <div class="now-playing-song-artist text-ellipsis" id="np-artist">
            ${escapeHtml(track?.artist || 'Select a song to play')}
          </div>
        </div>
        <button class="btn-icon like-btn ${isLiked ? 'liked' : ''}" id="np-like-btn" aria-label="Like">
          ${isLiked ? icon('heartFilled', 26) : icon('heart', 26)}
        </button>
      </div>

      <!-- Progress Bar & Timestamps -->
      <div class="now-playing-progress">
        <div class="progress-bar" id="np-progress-bar">
          <div class="progress-bar-fill" id="np-progress-fill" 
               style="width:${duration > 0 ? (progress / duration) * 100 : 0}%">
            <div class="progress-bar-thumb"></div>
          </div>
        </div>
        <div class="now-playing-timestamps">
          <span id="np-time-current">${formatDuration(progress)}</span>
          <span id="np-time-total">${formatDuration(duration)}</span>
        </div>
      </div>

      <!-- Playback Controls -->
      <div class="now-playing-controls">
        <button class="btn-icon control-secondary ${shuffleOn ? 'active' : ''}" 
                id="np-shuffle" aria-label="Shuffle" title="Shuffle">
          ${icon('shuffle', 22)}
        </button>
        <button class="btn-icon" id="np-prev" aria-label="Previous Track" title="Previous">
          ${icon('skipBack', 28)}
        </button>
        <button class="btn-play btn-play-lg" id="np-play" aria-label="${isPlaying ? 'Pause' : 'Play'}" title="Play/Pause">
          ${isPlaying ? icon('pause', 32) : icon('play', 32)}
        </button>
        <button class="btn-icon" id="np-next" aria-label="Next Track" title="Next">
          ${icon('skipForward', 28)}
        </button>
        <button class="btn-icon control-secondary ${repeatMode !== 'off' ? 'active' : ''}" 
                id="np-repeat" aria-label="Repeat" title="Repeat">
          ${repeatMode === 'one' ? icon('repeatOne', 22) : icon('repeat', 22)}
        </button>
      </div>

      <!-- Extra Action Buttons: Watch Video & Share -->
      <div class="now-playing-extra">
        <button class="btn btn-secondary" id="np-video-btn" aria-label="Watch Music Video"
                style="padding:var(--space-2) var(--space-4);font-size:var(--font-size-sm);border-radius:var(--radius-full);display:inline-flex;align-items:center;gap:var(--space-2);">
          ${icon('video', 18)} <span>Watch Video</span>
        </button>
        <button class="btn-icon btn-ghost" id="np-share-btn" aria-label="Share Track" title="Share">
          ${icon('share', 20)}
        </button>
      </div>

      <!-- Up Next Preview -->
      ${upNext.length > 0 ? `
        <div style="margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid rgba(255,255,255,0.08);" id="np-upnext-section">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">
            <span style="font-size:var(--font-size-xs);font-weight:var(--font-weight-semibold);color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">
              ${icon('sparkles', 14)} Up Next
            </span>
            <button class="btn-ghost" id="np-view-full-queue" style="font-size:var(--font-size-xs);color:var(--accent);">
              View Queue
            </button>
          </div>
          <div style="display:flex;flex-direction:column;gap:var(--space-1);">
            ${upNext.map((t, i) => `
              <div class="track-item" data-upnext-idx="${i}" style="padding:var(--space-2) var(--space-2);background:rgba(255,255,255,0.03);border-radius:var(--radius-md);">
                <div class="track-item-cover" style="width:36px;height:36px;">
                  <img src="${t.coverSmall || '/placeholder.svg'}" alt="" onerror="this.src='/placeholder.svg'" loading="lazy" />
                </div>
                <div class="track-item-info">
                  <div class="track-title text-ellipsis" style="font-size:var(--font-size-sm);">${escapeHtml(t.title)}</div>
                  <div class="track-artist text-ellipsis" style="font-size:var(--font-size-xs);">${escapeHtml(t.artist)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  if (isPlaying) startVisualizer();
}

function setupNowPlayingListeners() {
  // Close
  document.getElementById('np-close')?.addEventListener('click', hideNowPlaying);

  // Play/Pause
  document.getElementById('np-play')?.addEventListener('click', () => player.toggle());

  // Previous/Next
  document.getElementById('np-prev')?.addEventListener('click', () => player.playPrevious());
  document.getElementById('np-next')?.addEventListener('click', () => player.playNext());

  // Shuffle
  document.getElementById('np-shuffle')?.addEventListener('click', () => {
    player.toggleShuffle();
    const btn = document.getElementById('np-shuffle');
    btn?.classList.toggle('active', store.get('shuffle'));
    showToast(store.get('shuffle') ? 'Shuffle on' : 'Shuffle off', 'info');
  });

  // Repeat
  document.getElementById('np-repeat')?.addEventListener('click', () => {
    player.toggleRepeat();
    const mode = store.get('repeat');
    const btn = document.getElementById('np-repeat');
    btn?.classList.toggle('active', mode !== 'off');
    if (btn) btn.innerHTML = mode === 'one' ? icon('repeatOne', 22) : icon('repeat', 22);
    showToast(`Repeat: ${mode}`, 'info');
  });

  // Like
  document.getElementById('np-like-btn')?.addEventListener('click', () => {
    const track = store.get('currentTrack');
    if (track) {
      const liked = store.toggleLike(track);
      const btn = document.getElementById('np-like-btn');
      btn?.classList.toggle('liked', liked);
      if (btn) btn.innerHTML = liked ? icon('heartFilled', 26) : icon('heart', 26);
      showToast(liked ? 'Added to Liked Songs' : 'Removed from Liked Songs');
    }
  });

  // Seek bar
  const progressBar = document.getElementById('np-progress-bar');
  if (progressBar) {
    const handleSeek = (clientX) => {
      const rect = progressBar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      player.seekPercent(percent);
    };

    progressBar.addEventListener('click', (e) => handleSeek(e.clientX));

    let isSeeking = false;
    progressBar.addEventListener('touchstart', (e) => {
      isSeeking = true;
      handleSeek(e.touches[0].clientX);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (isSeeking && e.touches[0]) handleSeek(e.touches[0].clientX);
    }, { passive: true });

    document.addEventListener('touchend', () => { isSeeking = false; });
  }

  // Video button (1-click search & play official YouTube video)
  document.getElementById('np-video-btn')?.addEventListener('click', async () => {
    const track = store.get('currentTrack');
    if (track) {
      showToast('Finding music video...', 'info');
      try {
        const videos = await youtube.search(`${track.title} ${track.artist}`, 1);
        if (videos.length > 0) {
          player.pause();
          showVideoPlayer(videos[0].videoId, videos[0].title, videos[0].channel);
        } else {
          showToast('No video found for this track', 'info');
        }
      } catch {
        showToast('Could not load video', 'error');
      }
    }
  });

  // Share button
  document.getElementById('np-share-btn')?.addEventListener('click', () => {
    const track = store.get('currentTrack');
    if (track) {
      if (navigator.share) {
        navigator.share({
          title: track.title,
          text: `Listening to ${track.title} by ${track.artist} on MyVibe!`,
          url: window.location.href,
        }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(`${track.title} - ${track.artist}`);
        showToast('Track info copied to clipboard!', 'info');
      }
    }
  });

  // Queue buttons
  document.getElementById('np-queue-btn')?.addEventListener('click', showQueueView);
  document.getElementById('np-view-full-queue')?.addEventListener('click', showQueueView);

  // Up next item click
  document.querySelectorAll('[data-upnext-idx]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.upnextIdx || '0');
      const upcoming = queue.getUpcoming(10);
      if (upcoming[idx]) {
        player.play(upcoming[idx]);
      }
    });
  });

  // Store real-time subscriptions
  const unsubs = [];

  unsubs.push(store.on('isPlaying', (playing) => {
    if (!isNowPlayingVisible) return;
    const btn = document.getElementById('np-play');
    if (btn) btn.innerHTML = playing ? icon('pause', 32) : icon('play', 32);
    if (playing) startVisualizer();
    else stopVisualizer();
  }));

  unsubs.push(store.on('progress', (progress) => {
    if (!isNowPlayingVisible) return;
    const duration = store.get('duration') || 30;
    const fill = document.getElementById('np-progress-fill');
    const timeCurrent = document.getElementById('np-time-current');
    if (fill) fill.style.width = `${(progress / Math.max(1, duration)) * 100}%`;
    if (timeCurrent) timeCurrent.textContent = formatDuration(progress);
  }));

  unsubs.push(store.on('currentTrack', (track) => {
    if (!isNowPlayingVisible || !track) return;
    renderNowPlayingContent();
    setupNowPlayingListeners();
  }));

  cleanupFns = unsubs;
}

function startVisualizer() {
  stopVisualizer();

  const analyser = player.initAudioContext();
  const bars = document.querySelectorAll('#np-visualizer .visualizer-bar');
  if (!bars.length) return;

  if (analyser) {
    const data = new Uint8Array(analyser.frequencyBinCount);
    const barCount = bars.length;

    const animate = () => {
      analyser.getByteFrequencyData(data);
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * data.length);
        const value = data[dataIndex] / 255;
        const height = Math.max(3, value * 55);
        bars[i].style.height = `${height}px`;
        bars[i].style.opacity = 0.4 + value * 0.6;
      }
      visualizerRAF = requestAnimationFrame(animate);
    };
    visualizerRAF = requestAnimationFrame(animate);
  } else {
    // Dynamic simulated equalizer animation
    const barCount = bars.length;
    const animate = () => {
      const isPlaying = store.get('isPlaying');
      for (let i = 0; i < barCount; i++) {
        const wave = Math.sin(Date.now() * 0.008 + i * 0.35) * 0.5 + 0.5;
        const height = isPlaying ? Math.max(3, wave * 45 + Math.random() * 8) : 3;
        bars[i].style.height = `${height}px`;
        bars[i].style.opacity = isPlaying ? 0.7 + wave * 0.3 : 0.2;
      }
      visualizerRAF = requestAnimationFrame(animate);
    };
    visualizerRAF = requestAnimationFrame(animate);
  }
}

function stopVisualizer() {
  if (visualizerRAF) {
    cancelAnimationFrame(visualizerRAF);
    visualizerRAF = null;
  }
  const bars = document.querySelectorAll('#np-visualizer .visualizer-bar');
  bars.forEach(b => { b.style.height = '3px'; b.style.opacity = '0.3'; });
}

function showQueueView() {
  const overlay = document.getElementById('now-playing-overlay');
  if (!overlay) return;

  const currentTrack = store.get('currentTrack');
  const upcoming = queue.getUpcoming(20);

  overlay.innerHTML = `
    <div class="now-playing" style="background:var(--bg-primary);">
      <div class="now-playing-header">
        <button class="btn-icon btn-ghost" id="queue-back" aria-label="Back to Player">
          ${icon('arrowLeft', 24)}
        </button>
        <span class="now-playing-header-title">Play Queue</span>
        <button class="btn-ghost" id="queue-clear-btn" style="font-size:var(--font-size-xs);color:var(--text-tertiary);">
          Clear
        </button>
      </div>

      <div style="padding:var(--space-2) 0;">
        ${currentTrack ? `
          <div style="padding:0 var(--space-4);margin-bottom:var(--space-4);">
            <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-bold);color:var(--accent);text-transform:uppercase;margin-bottom:var(--space-2);">Now Playing</div>
            <div class="track-item playing" style="background:var(--accent-subtle);border-radius:var(--radius-md);">
              <div class="track-item-cover" style="width:44px;height:44px;">
                <img src="${currentTrack.coverSmall || '/placeholder.svg'}" alt="" onerror="this.src='/placeholder.svg'" />
                <div class="playing-indicator">
                  <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
                </div>
              </div>
              <div class="track-item-info">
                <div class="track-title text-ellipsis">${escapeHtml(currentTrack.title)}</div>
                <div class="track-artist text-ellipsis">${escapeHtml(currentTrack.artist)}</div>
              </div>
            </div>
          </div>
        ` : ''}

        <div style="padding:0 var(--space-4);margin-top:var(--space-4);">
          <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-bold);color:var(--text-secondary);text-transform:uppercase;margin-bottom:var(--space-2);">
            ${icon('sparkles', 14)} Next In Queue (${upcoming.length})
          </div>
          ${upcoming.length > 0 ? `
            <div id="queue-items-list">
              ${upcoming.map((t, i) => `
                <div class="track-item" data-queue-target-idx="${i}" style="margin-bottom:var(--space-1);">
                  <div class="track-item-cover" style="width:40px;height:40px;">
                    <img src="${t.coverSmall || '/placeholder.svg'}" alt="" onerror="this.src='/placeholder.svg'" loading="lazy" />
                  </div>
                  <div class="track-item-info">
                    <div class="track-title text-ellipsis">${escapeHtml(t.title)}</div>
                    <div class="track-artist text-ellipsis">${escapeHtml(t.artist)}</div>
                  </div>
                  <button class="btn-icon-sm btn-ghost queue-remove-btn" data-remove-idx="${i}" aria-label="Remove">
                    ${icon('close', 16)}
                  </button>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="empty-state" style="padding:var(--space-6);">
              <p class="empty-state-text">Songs will be automatically recommended as you listen</p>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  document.getElementById('queue-back')?.addEventListener('click', () => {
    renderNowPlayingContent();
    setupNowPlayingListeners();
  });

  // Tap any queue item to play it immediately
  document.querySelectorAll('[data-queue-target-idx]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.queue-remove-btn')) return;
      const idx = parseInt(el.dataset.queueTargetIdx || '0');
      if (upcoming[idx]) {
        player.play(upcoming[idx]);
        renderNowPlayingContent();
        setupNowPlayingListeners();
      }
    });
  });

  // Remove from queue
  document.querySelectorAll('.queue-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.removeIdx || '0');
      const currentIdx = store.get('queueIndex') ?? 0;
      queue.remove(currentIdx + 1 + idx);
      showQueueView();
    });
  });

  // Clear queue
  document.getElementById('queue-clear-btn')?.addEventListener('click', () => {
    if (currentTrack) {
      queue.set([currentTrack], 0);
      showToast('Queue cleared');
      showQueueView();
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
