// ============================================
// MyVibe — Bottom Navigation Bar
// ============================================

import { icon } from '../core/icons.js';
import { router } from '../core/router.js';

const tabs = [
  { id: 'home', path: '/', label: 'Home', iconName: 'home', iconActive: 'homeFilled' },
  { id: 'search', path: '/search', label: 'Search', iconName: 'search', iconActive: 'search' },
  { id: 'library', path: '/library', label: 'Library', iconName: 'library', iconActive: 'library' },
];

let navInitialized = false;

export function renderNavbar() {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;

  nav.style.display = 'flex';
  updateNavbar();

  if (!navInitialized) {
    navInitialized = true;
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-item');
      if (btn && btn.dataset.path) {
        router.navigate(btn.dataset.path);
      }
    });
  }

  router.onChange(() => updateNavbar());
}

function updateNavbar() {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  const current = router.getCurrentRoute();

  nav.innerHTML = tabs.map(tab => {
    const isActive = current === tab.path || (tab.path !== '/' && current.startsWith(tab.path));
    return `
      <button class="nav-item ${isActive ? 'active' : ''} no-select" 
              data-path="${tab.path}" 
              id="nav-${tab.id}"
              type="button"
              aria-label="${tab.label}">
        ${icon(isActive ? tab.iconActive : tab.iconName, 24)}
        <span>${tab.label}</span>
      </button>
    `;
  }).join('');
}
