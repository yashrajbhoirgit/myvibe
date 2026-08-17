// ============================================
// MyVibe — Main App Entry Point
// ============================================

import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

import { router } from './core/router.js';
import { store } from './core/store.js';
import { renderHome } from './pages/home.js';
import { renderSearch } from './pages/search.js';
import { renderLibrary } from './pages/library.js';
import { renderNavbar } from './components/navbar.js';
import { renderMiniPlayer } from './components/miniPlayer.js';
import { queue } from './core/queue.js';
import { player } from './core/player.js';

// Expose globals for debugging and direct access
window.__myvibe = { queue, player, store, router };

// ---- Initialize App ----
function initApp() {
  // Register routes
  router.register('/', () => renderHome());
  router.register('/search', () => renderSearch());
  router.register('/library', () => renderLibrary());

  // Initialize router
  router.init('page-container');

  // Render persistent components
  renderNavbar();
  renderMiniPlayer();

  // Show main content, hide splash smoothly
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    const main = document.getElementById('main-content');
    const nav = document.getElementById('bottom-nav');

    if (main) main.style.display = 'flex';
    if (nav) nav.style.display = 'flex';

    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 600);
    }
  }, 1000);

  // Navigate to home if no hash
  if (!window.location.hash) {
    router.navigate('/');
  }

  console.log('%c🎵 MyVibe', 'color:#1DB954;font-size:20px;font-weight:bold;');
  console.log('%cYour Music Universe is ready.', 'color:#b3b3b3;font-size:12px;');
}

// ---- Clear old caches and update SW ----
if ('caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      if (name !== 'myvibe-v2') caches.delete(name);
    });
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      reg.update();
    } catch (e) {}
  });
}

// ---- Start ----
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
