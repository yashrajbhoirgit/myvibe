# 🎵 MyVibe — Music & Video Streaming

<div align="center">

![MyVibe Logo](public/icon.svg)

### Your Personal Music & Video Universe

A modern, responsive, high-performance web application for streaming music and watching music videos with smart recommendations, personalized library management, queue controls, and an ultra-sleek dark theme UI.

[![Vite](https://img.shields.io/badge/Built%20With-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

</div>

---

## ✨ Features

- 🎧 **Music Streaming & Queue Management**: Continuous audio playback with queue reordering, shuffle, loop, and playback state retention.
- 🎬 **Integrated Video Player**: Seamlessly switch between audio-only playback and high-quality video mode.
- 🔍 **Instant Search**: Search through trending tracks, artists, albums, and playlists in real time.
- 📚 **Personalized Library**: Save your favorite songs, create custom playlists, and view your listening history.
- 📱 **Responsive & PWA Ready**: Optimized for mobile and desktop screens with full Progressive Web App support and offline caching.
- 🎨 **Sleek Spotify-Inspired UI**: Glassmorphism, smooth animations, dynamic mini-player, and immersive full-screen now-playing overlays.
- ⚡ **Blazing Fast**: Powered by vanilla ES Modules and Vite for near-instant load times.

---

## 🛠️ Tech Stack

- **Core**: Vanilla JavaScript (ES6+ Modules), HTML5 Semantic markup
- **Styling**: Modern Vanilla CSS with CSS custom properties, flexbox/grid, and glassmorphic design
- **Bundler & Dev Server**: [Vite](https://vitejs.dev/)
- **Icons & Graphics**: Scalable SVG vector assets
- **PWA**: Web App Manifest & Service Worker integration

---

## 📁 Project Structure

```
myvibe/
├── public/                # Static assets, icons, manifest & service worker
│   ├── icon.svg
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── assets/            # Graphics and images
│   ├── components/        # Reusable UI components (cards, navbar, miniPlayer, toast, contextMenu)
│   ├── core/              # Core logic (player engine, API client, router, store, queue)
│   ├── pages/             # App views (Home, Search, Library, NowPlaying, VideoPlayer)
│   ├── styles/            # Modular stylesheets (base, layout, components, variables)
│   └── main.js            # App entry point and lifecycle bootstrap
├── index.html             # Application HTML shell
├── package.json           # Dependencies and scripts
└── vite.config.js         # Vite configuration
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v16+ recommended).

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yashrajbhoirgit/myvibe.git
   cd myvibe
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Preview production build**:
   ```bash
   npm run preview
   ```

---

## 👤 Author

**Yashraj Bhoir**
- GitHub: [@yashrajbhoirgit](https://github.com/yashrajbhoirgit)

---

## 📄 License

This project is licensed under the MIT License — feel free to use and modify it for your own projects!
