// ============================================
// MyVibe — Context Menu Component
// ============================================

import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { queue } from '../core/queue.js';
import { showToast } from './toast.js';

let currentMenu = null;

/**
 * Show a context menu for a track
 */
export function showContextMenu(track) {
  if (!track) return;
  hideContextMenu();

  const isLiked = store.isLiked(track.id);
  const playlists = store.get('playlists') || [];

  const overlay = document.createElement('div');
  overlay.className = 'context-menu-overlay';
  overlay.id = 'context-menu-overlay';

  overlay.innerHTML = `
    <div class="context-menu">
      <div class="context-menu-handle"></div>
      <div class="context-menu-header">
        <img src="${track.coverSmall || '/placeholder.svg'}" alt="" onerror="this.src='/placeholder.svg'" />
        <div class="context-menu-header-info">
          <div class="context-menu-header-title">${escapeHtml(track.title)}</div>
          <div class="context-menu-header-artist">${escapeHtml(track.artist)}</div>
        </div>
      </div>
      <div class="context-menu-options">
        <div class="context-menu-option" data-action="play-next">
          ${icon('skipForward', 22)}
          <span>Play Next</span>
        </div>
        <div class="context-menu-option" data-action="add-queue">
          ${icon('queue', 22)}
          <span>Add to Queue</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-option" data-action="toggle-like">
          ${isLiked ? icon('heartFilled', 22) : icon('heart', 22)}
          <span>${isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}</span>
        </div>
        ${playlists.length > 0 ? `
          <div class="context-menu-divider"></div>
          ${playlists.map(pl => `
            <div class="context-menu-option" data-action="add-to-playlist" data-playlist-id="${pl.id}">
              ${icon('plus', 22)}
              <span>Add to "${escapeHtml(pl.name)}"</span>
            </div>
          `).join('')}
        ` : ''}
        <div class="context-menu-divider"></div>
        <div class="context-menu-option" data-action="share">
          ${icon('share', 22)}
          <span>Share</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  currentMenu = overlay;

  // Close on backdrop tap
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideContextMenu();
    }
  });

  // Handle option clicks
  overlay.querySelectorAll('.context-menu-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const action = opt.dataset.action;

      switch (action) {
        case 'play-next':
          queue.playNext(track);
          showToast(`"${track.title}" will play next`);
          break;

        case 'add-queue':
          queue.add([track]);
          showToast(`Added "${track.title}" to queue`);
          break;

        case 'toggle-like': {
          const liked = store.toggleLike(track);
          showToast(liked ? 'Added to Liked Songs' : 'Removed from Liked Songs');
          break;
        }

        case 'add-to-playlist': {
          const plId = opt.dataset.playlistId;
          store.addToPlaylist(plId, track);
          const pl = (store.get('playlists') || []).find(p => p.id === plId);
          showToast(`Added to "${pl?.name || 'Playlist'}"`);
          break;
        }

        case 'share':
          if (navigator.share) {
            navigator.share({
              title: track.title,
              text: `Check out "${track.title}" by ${track.artist} on MyVibe!`,
              url: window.location.href,
            }).catch(() => {});
          } else {
            navigator.clipboard?.writeText(`${track.title} - ${track.artist}`);
            showToast('Track info copied!', 'info');
          }
          break;
      }

      hideContextMenu();
    });
  });
}

/**
 * Hide the context menu
 */
export function hideContextMenu() {
  if (currentMenu) {
    currentMenu.remove();
    currentMenu = null;
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
