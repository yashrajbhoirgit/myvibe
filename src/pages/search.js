// ============================================
// MyVibe — Search & Explore Page
// ============================================

import { icon } from '../core/icons.js';
import { searchAll, genreList, CURATED_HITS } from '../core/api.js';
import { renderTrackList, renderVideoGrid, attachTrackListeners } from '../components/cards.js';

let searchTimeout = null;
let lastQuery = '';

export function renderSearch() {
  const page = document.createElement('div');
  page.className = 'page';
  page.id = 'search-page';

  page.innerHTML = `
    <div class="page-header" style="padding-bottom:var(--space-2);">
      <h1 class="page-title" style="margin-bottom:var(--space-4);">Search</h1>
      <div class="search-input-wrapper">
        <span class="search-icon-text">🔍</span>
        <input type="text" class="search-input" id="search-input" 
               placeholder="Songs, artists, or videos..." 
               autocomplete="off" autocorrect="off" spellcheck="false" />
        <button id="search-clear-btn" class="btn-ghost" 
                style="position:absolute;right:12px;top:50%;transform:translateY(-50%);display:none;padding:4px;color:var(--text-tertiary);" 
                aria-label="Clear Search">
          ${icon('close', 18)}
        </button>
      </div>
    </div>
    
    <div id="search-chips" style="padding:0 var(--space-4) var(--space-3);display:none;">
      <div style="display:flex;gap:var(--space-2);overflow-x:auto;scrollbar-width:none;">
        <button class="chip active" data-filter="all">All</button>
        <button class="chip" data-filter="songs">Songs</button>
        <button class="chip" data-filter="videos">Videos</button>
      </div>
    </div>

    <div class="page-content" id="search-content">
      ${renderBrowseGenres()}
    </div>
  `;

  setTimeout(() => setupSearchHandlers(), 30);

  return page;
}

function setupSearchHandlers() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear-btn');
  if (!input) return;

  input.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (clearBtn) clearBtn.style.display = query.length ? 'block' : 'none';

    if (searchTimeout) clearTimeout(searchTimeout);

    if (query.length === 0) {
      lastQuery = '';
      document.getElementById('search-chips').style.display = 'none';
      document.getElementById('search-content').innerHTML = renderBrowseGenres();
      setupGenreHandlers();
      return;
    }

    document.getElementById('search-chips').style.display = 'block';

    searchTimeout = setTimeout(() => performSearch(query), 350);
  });

  clearBtn?.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    lastQuery = '';
    document.getElementById('search-chips').style.display = 'none';
    document.getElementById('search-content').innerHTML = renderBrowseGenres();
    setupGenreHandlers();
    input.focus();
  });

  // Filter chips
  const chipsContainer = document.getElementById('search-chips');
  if (chipsContainer) {
    chipsContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) {
        chipsContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        applyFilter(chip.dataset.filter);
      }
    });
  }

  setupGenreHandlers();
}

async function performSearch(query) {
  if (query === lastQuery) return;
  lastQuery = query;

  const content = document.getElementById('search-content');
  if (!content) return;

  content.innerHTML = `
    <div style="padding: var(--space-8); text-align:center;">
      <div style="width:28px;height:28px;border:3px solid var(--text-tertiary);border-top-color:var(--accent);border-radius:50%;margin:0 auto;animation:spin 0.8s linear infinite;"></div>
      <p style="color:var(--text-secondary);margin-top:var(--space-3);font-size:var(--font-size-sm);">Searching for "${escapeHtml(query)}"...</p>
    </div>
  `;

  try {
    const results = await searchAll(query);

    if (query !== lastQuery) return; // Stale

    let html = '';

    // Songs
    if (results.songs.length > 0) {
      html += `
        <section class="page-section" id="search-songs-section">
          <div class="section-header">
            <h2 class="section-title" style="font-size:var(--font-size-lg);">Songs</h2>
            <span style="color:var(--text-secondary);font-size:var(--font-size-sm);">${results.songs.length} results</span>
          </div>
          ${renderTrackList(results.songs, 'search-songs-list')}
        </section>
      `;
    }

    // Videos
    if (results.videos.length > 0) {
      html += `
        <section class="page-section" id="search-videos-section" style="margin-top:var(--space-6);">
          <div class="section-header">
            <h2 class="section-title" style="font-size:var(--font-size-lg);">${icon('video', 18)} Music Videos</h2>
            <span style="color:var(--text-secondary);font-size:var(--font-size-sm);">${results.videos.length} videos</span>
          </div>
          ${renderVideoGrid(results.videos, 'search-videos-grid')}
        </section>
      `;
    }

    if (!results.songs.length && !results.videos.length) {
      html = `
        <div class="empty-state">
          <h3 class="empty-state-title">No results found for "${escapeHtml(query)}"</h3>
          <p class="empty-state-text">Check spelling or try searching for popular artists like The Weeknd, Arijit Singh, or Ed Sheeran.</p>
        </div>
      `;
    }

    content.innerHTML = html;

    // Attach listeners
    if (results.songs.length) attachTrackListeners('search-songs-list', results.songs);
    if (results.videos.length) attachTrackListeners('search-videos-grid', results.videos);

  } catch (err) {
    console.error('Search error:', err);
    content.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-state-title">Search failed</h3>
        <p class="empty-state-text">Please check your connection and try again</p>
      </div>
    `;
  }
}

function applyFilter(filter) {
  const songs = document.getElementById('search-songs-section');
  const videos = document.getElementById('search-videos-section');

  if (songs) songs.style.display = (filter === 'all' || filter === 'songs') ? 'block' : 'none';
  if (videos) videos.style.display = (filter === 'all' || filter === 'videos') ? 'block' : 'none';
}

function renderBrowseGenres() {
  return `
    <section class="page-section">
      <div class="section-header">
        <h2 class="section-title">Browse Categories</h2>
      </div>
      <div class="grid-2" id="genre-grid">
        ${genreList.map((g) => `
          <div class="genre-card" data-genre-query="${g.query || g.name}"
               style="background: linear-gradient(135deg, ${g.color}, ${g.color}88);">
            <span class="genre-card-title" style="color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.4);">${g.name}</span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function setupGenreHandlers() {
  const grid = document.getElementById('genre-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.genre-card');
    if (!card) return;

    const query = card.dataset.genreQuery;
    const input = document.getElementById('search-input');
    if (input && query) {
      input.value = query;
      input.dispatchEvent(new Event('input'));
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
