// ============================================
// MyVibe — Home Page
// ============================================

import { icon } from '../core/icons.js';
import { itunes, youtube, CURATED_HITS } from '../core/api.js';
import { store } from '../core/store.js';
import { recommender } from '../core/recommendation.js';
import { player } from '../core/player.js';
import { queue } from '../core/queue.js';
import { showNowPlaying } from './nowPlaying.js';
import { renderCardRow, renderVideoRow, renderTrackList, attachTrackListeners } from '../components/cards.js';

let cachedChart = null;
let cachedVideos = null;

export function renderHome() {
  const page = document.createElement('div');
  page.className = 'page';
  page.id = 'home-page';

  const greeting = getGreeting();

  page.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <h1 class="page-title">${greeting}</h1>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn-icon btn-ghost" id="home-history-btn" aria-label="History" title="History">
            ${icon('clock', 22)}
          </button>
        </div>
      </div>
    </div>
    <div class="page-content" id="home-content">
      <div class="home-loading">
        ${renderSkeletonSections()}
      </div>
    </div>
  `;

  setTimeout(() => loadHomeContent(), 30);

  return page;
}

async function loadHomeContent() {
  const content = document.getElementById('home-content');
  if (!content) return;

  try {
    const [chartTracks, videos] = await Promise.all([
      cachedChart || itunes.getTopChart(40),
      cachedVideos || youtube.search('top trending music videos 2024', 8),
    ]);

    const activeChart = (chartTracks && chartTracks.length) ? chartTracks : CURATED_HITS;
    const activeVideos = (videos && videos.length) ? videos : [];

    cachedChart = activeChart;
    cachedVideos = activeVideos;

    const recentlyPlayed = store.get('recentlyPlayed') || [];
    const likedSongs = store.get('likedSongs') || [];

    let html = '';

    // 1. Quick Picks Grid (6 items)
    const quickPicks = getQuickPicks(recentlyPlayed, likedSongs, activeChart);
    if (quickPicks.length > 0) {
      html += `
        <section class="page-section animate-fade-in-up" style="animation-delay: 0.05s">
          <div class="quick-picks-grid" id="quick-picks-container" 
               style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:0 var(--space-4);">
            ${quickPicks.slice(0, 6).map(track => `
              <div class="quick-pick-item" data-track-id="${track.id}"
                   style="display:flex;align-items:center;gap:var(--space-3);background:var(--bg-card);border-radius:var(--radius-md);overflow:hidden;cursor:pointer;height:56px;border:1px solid rgba(255,255,255,0.05);">
                <img src="${track.coverMedium || track.coverSmall || '/placeholder.svg'}" alt="" 
                     style="width:56px;height:56px;object-fit:cover;flex-shrink:0;" 
                     onerror="this.src='/placeholder.svg'" loading="lazy" />
                <span class="text-ellipsis" style="font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold);padding-right:var(--space-2);">${escapeHtml(track.title)}</span>
              </div>
            `).join('')}
          </div>
        </section>
      `;
    }

    // 2. Made For You (Algorithm-curated tracks)
    const recommended = recommender.recommend(activeChart, recentlyPlayed[0] || null, 12);
    html += `
      <section class="page-section animate-fade-in-up" style="animation-delay: 0.1s">
        <div class="section-header">
          <h2 class="section-title">${icon('sparkles', 20)} Made For You</h2>
        </div>
        ${renderCardRow(recommended, 'recommended-scroll')}
      </section>
    `;

    // 3. Trending Now (Top 5 List with live equalizers)
    html += `
      <section class="page-section animate-fade-in-up" style="animation-delay: 0.15s">
        <div class="section-header">
          <h2 class="section-title">${icon('trending', 20)} Trending Now</h2>
        </div>
        ${renderTrackList(activeChart.slice(0, 5), 'trending-list', true)}
      </section>
    `;

    // 4. Music Videos (YouTube)
    if (activeVideos.length > 0) {
      html += `
        <section class="page-section animate-fade-in-up" style="animation-delay: 0.2s">
          <div class="section-header">
            <h2 class="section-title">${icon('video', 20)} Music Videos</h2>
          </div>
          ${renderVideoRow(activeVideos, 'videos-scroll')}
        </section>
      `;
    }

    // 5. Recently Played (if any)
    if (recentlyPlayed.length > 0) {
      html += `
        <section class="page-section animate-fade-in-up" style="animation-delay: 0.25s">
          <div class="section-header">
            <h2 class="section-title">${icon('clock', 20)} Jump Back In</h2>
          </div>
          ${renderCardRow(recentlyPlayed.slice(0, 10), 'recent-scroll')}
        </section>
      `;
    }

    // 6. Top Global Hits
    html += `
      <section class="page-section animate-fade-in-up" style="animation-delay: 0.3s">
        <div class="section-header">
          <h2 class="section-title">${icon('trending', 20)} Top Global Hits</h2>
        </div>
        ${renderCardRow(activeChart.slice(5, 20), 'charts-scroll')}
      </section>
    `;

    html += '<div style="height: var(--space-8);"></div>';

    content.innerHTML = html;

    // Attach listeners to all sections
    attachTrackListeners('recommended-scroll', recommended);
    attachTrackListeners('trending-list', activeChart.slice(0, 5));
    if (activeVideos.length) attachTrackListeners('videos-scroll', activeVideos);
    if (recentlyPlayed.length) attachTrackListeners('recent-scroll', recentlyPlayed);
    attachTrackListeners('charts-scroll', activeChart.slice(5, 20));

    // Quick picks click listener
    const quickPickGrid = document.getElementById('quick-picks-container');
    if (quickPickGrid) {
      quickPickGrid.addEventListener('click', (e) => {
        const item = e.target.closest('[data-track-id]');
        if (item) {
          const trackId = item.dataset.trackId;
          const track = quickPicks.find(t => t.id === trackId);
          if (track) {
            queue.set(quickPicks, quickPicks.indexOf(track));
            player.play(track);
            showNowPlaying();
          }
        }
      });
    }

    // Top history icon button
    document.getElementById('home-history-btn')?.addEventListener('click', () => {
      window.location.hash = '/library';
    });

    // Responsive quick picks: 3 columns on wider screens
    applyResponsiveQuickPicks();
    window.addEventListener('resize', applyResponsiveQuickPicks);

  } catch (err) {
    console.error('Home load error:', err);
    // Use curated hits on error
    content.innerHTML = `
      <section class="page-section">
        <div class="section-header">
          <h2 class="section-title">${icon('sparkles', 20)} Popular Hits</h2>
        </div>
        ${renderCardRow(CURATED_HITS, 'fallback-scroll')}
      </section>
    `;
    attachTrackListeners('fallback-scroll', CURATED_HITS);
  }
}

function applyResponsiveQuickPicks() {
  const grid = document.getElementById('quick-picks-container');
  if (!grid) return;
  if (window.innerWidth >= 768) {
    grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
  } else {
    grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 22) return 'Good Evening';
  return 'Good Night';
}

function getQuickPicks(recent, liked, chart) {
  const picks = [];
  const seen = new Set();
  const sources = [recent, liked, chart, CURATED_HITS];

  for (let i = 0; picks.length < 6 && i < 20; i++) {
    for (const src of sources) {
      if (Array.isArray(src) && src[i] && !seen.has(src[i].id)) {
        picks.push(src[i]);
        seen.add(src[i].id);
        if (picks.length >= 6) break;
      }
    }
  }

  while (picks.length < 6 && CURATED_HITS[picks.length]) {
    picks.push(CURATED_HITS[picks.length]);
  }

  return picks;
}

function renderSkeletonSections() {
  return `
    <div style="padding: 0 var(--space-4);">
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:var(--space-8);">
        ${Array(6).fill('<div class="skeleton" style="height:56px;border-radius:var(--radius-md);"></div>').join('')}
      </div>
      <div class="skeleton" style="height:22px;width:180px;margin-bottom:var(--space-4);"></div>
      <div style="display:flex;gap:var(--space-4);overflow:hidden;">
        ${Array(4).fill('<div style="flex-shrink:0;width:150px;"><div class="skeleton" style="aspect-ratio:1;margin-bottom:var(--space-2);border-radius:var(--radius-md);"></div><div class="skeleton" style="height:14px;width:80%;margin-bottom:var(--space-1);"></div><div class="skeleton" style="height:12px;width:60%;"></div></div>').join('')}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
