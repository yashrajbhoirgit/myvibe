// ============================================
// MyVibe — Library Page
// ============================================

import { icon } from '../core/icons.js';
import { store } from '../core/store.js';
import { queue } from '../core/queue.js';
import { player } from '../core/player.js';
import { showNowPlaying } from './nowPlaying.js';
import { renderTrackList, attachTrackListeners } from '../components/cards.js';
import { showToast } from '../components/toast.js';

export function renderLibrary() {
  const page = document.createElement('div');
  page.className = 'page';
  page.id = 'library-page';

  const likedSongs = store.get('likedSongs') || [];
  const playlists = store.get('playlists') || [];
  const recentlyPlayed = store.get('recentlyPlayed') || [];
  const profile = store.get('listeningProfile') || {};

  const topGenre = Object.entries(profile.genreCounts || {})
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Pop';
  
  const topMood = Object.entries(profile.moodCounts || {})
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Happy';

  page.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <h1 class="page-title">Your Library</h1>
        <button class="btn-icon btn-ghost" id="create-playlist-btn" aria-label="Create Playlist" title="Create Playlist">
          ${icon('plus', 24)}
        </button>
      </div>
    </div>

    <div class="page-content" id="library-content">
      <!-- Liked Songs Hero Card -->
      <section class="page-section">
        <div id="liked-songs-card" 
             style="margin:0 var(--space-4);padding:var(--space-5);background:linear-gradient(135deg,#450af5 0%,#8e8ee5 100%);border-radius:var(--radius-lg);cursor:pointer;transition:transform var(--transition-normal),box-shadow var(--transition-normal);box-shadow:var(--shadow-md);"
             class="animate-fade-in-up">
          <div style="display:flex;align-items:center;gap:var(--space-4);">
            <div style="width:60px;height:60px;background:linear-gradient(135deg,var(--accent),#1ed760);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-md);">
              ${icon('heartFilled', 32)}
            </div>
            <div style="flex:1;">
              <div style="font-weight:var(--font-weight-bold);font-size:var(--font-size-lg);color:#fff;">Liked Songs</div>
              <div style="font-size:var(--font-size-sm);color:rgba(255,255,255,0.8);">${likedSongs.length} songs</div>
            </div>
            <button class="btn-play" aria-label="Play Liked Songs" id="play-liked-btn">
              ${icon('play', 24)}
            </button>
          </div>
        </div>
      </section>

      <!-- Taste Profile Capsule -->
      ${profile.totalPlays ? `
        <section class="page-section" style="margin-bottom:var(--space-6);">
          <div style="margin:0 var(--space-4);padding:var(--space-4);background:var(--bg-card);border-radius:var(--radius-lg);border:1px solid rgba(255,255,255,0.05);">
            <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-3);">
              <span style="font-size:18px;">🎧</span>
              <span style="font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold);color:var(--text-primary);">Your Taste Profile</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3);">
              <div style="background:var(--bg-tertiary);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
                <div style="font-size:var(--font-size-xs);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:var(--space-1);">Top Genre</div>
                <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-bold);color:var(--accent);">${topGenre}</div>
              </div>
              <div style="background:var(--bg-tertiary);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
                <div style="font-size:var(--font-size-xs);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:var(--space-1);">Top Mood</div>
                <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-bold);color:var(--accent);">${topMood}</div>
              </div>
              <div style="background:var(--bg-tertiary);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
                <div style="font-size:var(--font-size-xs);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:var(--space-1);">Plays</div>
                <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-bold);color:var(--accent);">${profile.totalPlays}</div>
              </div>
            </div>
          </div>
        </section>
      ` : ''}

      <!-- User Playlists -->
      ${playlists.length > 0 ? `
        <section class="page-section">
          <div class="section-header">
            <h2 class="section-title">Playlists</h2>
          </div>
          <div id="playlists-container" style="padding:0 var(--space-4);">
            ${playlists.map(pl => `
              <div class="track-item playlist-item" data-playlist-id="${pl.id}" 
                   style="margin-bottom:var(--space-2);background:var(--bg-card);border-radius:var(--radius-md);">
                <div style="width:48px;height:48px;background:linear-gradient(135deg,var(--bg-tertiary),var(--bg-hover));border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  ${icon('music', 22)}
                </div>
                <div class="track-item-info">
                  <div class="track-title">${escapeHtml(pl.name)}</div>
                  <div class="track-artist">${pl.tracks?.length || 0} songs</div>
                </div>
                <button class="btn-icon-sm btn-ghost delete-playlist-btn" data-delete-id="${pl.id}" aria-label="Delete Playlist" title="Delete">
                  ${icon('close', 16)}
                </button>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Liked Songs List -->
      ${likedSongs.length > 0 ? `
        <section class="page-section" id="liked-songs-section">
          <div class="section-header">
            <h2 class="section-title">${icon('heartFilled', 18)} Liked Songs</h2>
            <span style="color:var(--text-secondary);font-size:var(--font-size-sm);">${likedSongs.length}</span>
          </div>
          ${renderTrackList(likedSongs, 'liked-songs-list')}
        </section>
      ` : ''}

      <!-- Recently Played History -->
      ${recentlyPlayed.length > 0 ? `
        <section class="page-section">
          <div class="section-header">
            <h2 class="section-title">${icon('clock', 18)} Listening History</h2>
            <span style="color:var(--text-secondary);font-size:var(--font-size-sm);">${recentlyPlayed.length}</span>
          </div>
          ${renderTrackList(recentlyPlayed.slice(0, 20), 'history-list')}
        </section>
      ` : ''}

      <!-- Empty State -->
      ${likedSongs.length === 0 && playlists.length === 0 && recentlyPlayed.length === 0 ? `
        <div class="empty-state">
          ${icon('library', 48)}
          <h3 class="empty-state-title">Your library is ready</h3>
          <p class="empty-state-text">Tap the heart on any song to save it, or create custom playlists to build your vibe.</p>
        </div>
      ` : ''}

      <div style="height: var(--space-8);"></div>
    </div>

    <!-- Create Playlist Modal -->
    <div id="create-playlist-modal" style="display:none;"></div>
  `;

  setTimeout(() => setupLibraryHandlers(likedSongs, recentlyPlayed), 30);

  return page;
}

function setupLibraryHandlers(likedSongs, recentlyPlayed) {
  // Play all liked songs
  document.getElementById('play-liked-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (likedSongs.length > 0) {
      queue.set(likedSongs, 0);
      player.play(likedSongs[0]);
      showNowPlaying();
    } else {
      showToast('No liked songs yet! Like songs by tapping the heart ❤️', 'info');
    }
  });

  // Tap hero liked card
  document.getElementById('liked-songs-card')?.addEventListener('click', (e) => {
    if (e.target.closest('#play-liked-btn')) return;
    const list = document.getElementById('liked-songs-section');
    if (list) list.scrollIntoView({ behavior: 'smooth' });
  });

  // Liked songs card hover
  const likedCard = document.getElementById('liked-songs-card');
  if (likedCard) {
    likedCard.addEventListener('mouseenter', () => {
      likedCard.style.transform = 'scale(1.02)';
      likedCard.style.boxShadow = '0 8px 32px rgba(69, 10, 245, 0.3)';
    });
    likedCard.addEventListener('mouseleave', () => {
      likedCard.style.transform = '';
      likedCard.style.boxShadow = '';
    });
  }

  // Create playlist
  document.getElementById('create-playlist-btn')?.addEventListener('click', () => {
    showCreatePlaylistModal();
  });

  // Delete playlist
  document.querySelectorAll('.delete-playlist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.deleteId;
      const playlists = (store.get('playlists') || []).filter(p => p.id !== id);
      store.set('playlists', playlists);
      showToast('Playlist deleted');
      refreshLibrary();
    });
  });

  // View playlist tracks
  document.querySelectorAll('.playlist-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.delete-playlist-btn')) return;
      const plId = item.dataset.playlistId;
      showPlaylistDetail(plId);
    });
  });

  // Attach track listeners
  if (likedSongs.length) attachTrackListeners('liked-songs-list', likedSongs);
  if (recentlyPlayed.length) attachTrackListeners('history-list', recentlyPlayed.slice(0, 20));
}

function showCreatePlaylistModal() {
  const modal = document.getElementById('create-playlist-modal');
  if (!modal) return;

  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-content">
        <div class="modal-handle"></div>
        <h3 class="modal-title">New Playlist</h3>
        <input type="text" id="playlist-name-input" class="search-input" 
               placeholder="e.g., Road Trip Vibes, Chill Beats..." 
               style="margin-bottom:var(--space-4);padding-left:var(--space-4);" 
               autofocus />
        <div style="display:flex;gap:var(--space-3);justify-content:flex-end;">
          <button class="btn btn-secondary" id="cancel-playlist-btn">Cancel</button>
          <button class="btn btn-primary" id="save-playlist-btn">Create</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') modal.style.display = 'none';
  });

  document.getElementById('cancel-playlist-btn')?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  document.getElementById('save-playlist-btn')?.addEventListener('click', () => {
    const input = document.getElementById('playlist-name-input');
    const name = input?.value.trim();
    if (name) {
      store.createPlaylist(name);
      modal.style.display = 'none';
      showToast(`Playlist "${name}" created!`);
      refreshLibrary();
    }
  });

  document.getElementById('playlist-name-input')?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') document.getElementById('save-playlist-btn')?.click();
  });

  setTimeout(() => document.getElementById('playlist-name-input')?.focus(), 100);
}

function showPlaylistDetail(playlistId) {
  const playlist = (store.get('playlists') || []).find(p => p.id === playlistId);
  if (!playlist) return;

  const content = document.getElementById('library-content');
  if (!content) return;

  const tracks = playlist.tracks || [];

  content.innerHTML = `
    <div style="padding:var(--space-4);">
      <button class="btn btn-ghost" id="back-to-library" style="margin-bottom:var(--space-4);display:inline-flex;align-items:center;gap:var(--space-2);">
        ${icon('arrowLeft', 20)} Back to Library
      </button>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);">
        <div>
          <h2 style="font-size:var(--font-size-2xl);font-weight:var(--font-weight-bold);">${escapeHtml(playlist.name)}</h2>
          <p style="color:var(--text-secondary);font-size:var(--font-size-sm);">${tracks.length} songs</p>
        </div>
        ${tracks.length > 0 ? `
          <button class="btn-play" id="play-this-playlist-btn" aria-label="Play Playlist">
            ${icon('play', 24)}
          </button>
        ` : ''}
      </div>
      ${tracks.length > 0 
        ? renderTrackList(tracks, 'playlist-detail-list')
        : '<div class="empty-state"><p class="empty-state-text">No tracks in this playlist yet. You can add songs from the ⋮ menu on any track!</p></div>'
      }
    </div>
  `;

  document.getElementById('back-to-library')?.addEventListener('click', () => {
    refreshLibrary();
  });

  document.getElementById('play-this-playlist-btn')?.addEventListener('click', () => {
    if (tracks.length > 0) {
      queue.set(tracks, 0);
      player.play(tracks[0]);
      showNowPlaying();
    }
  });

  if (tracks.length) {
    attachTrackListeners('playlist-detail-list', tracks);
  }
}

function refreshLibrary() {
  const container = document.getElementById('page-container');
  if (container) {
    container.innerHTML = '';
    container.appendChild(renderLibrary());
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
