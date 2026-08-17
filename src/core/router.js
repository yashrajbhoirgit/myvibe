// ============================================
// MyVibe — Hash-Based SPA Router
// ============================================

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.container = null;
    this.listeners = [];
    
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    this.handleRoute();
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path) {
    window.location.hash = path;
  }

  handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, ...params] = hash.split('/').filter(Boolean);
    const route = '/' + (path || '');
    
    if (this.routes[route]) {
      this.currentRoute = route;
      const content = this.routes[route](params);
      if (this.container && content) {
        this.container.innerHTML = '';
        if (typeof content === 'string') {
          this.container.innerHTML = content;
        } else if (content instanceof HTMLElement) {
          this.container.appendChild(content);
        }
      }
      this.listeners.forEach(fn => fn(route, params));
    }
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  getCurrentRoute() {
    return this.currentRoute || '/';
  }
}

export const router = new Router();
