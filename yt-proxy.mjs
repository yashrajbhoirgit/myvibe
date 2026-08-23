// ============================================
// MyVibe — Local yt-dlp Proxy Server
// Runs on http://localhost:3001
// Extracts ad-free YouTube audio stream URLs via yt-dlp
// ============================================

import { createServer } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PORT = 3001;

// Cache stream URLs (they expire in ~6 hours, so cache for 4h)
const cache = new Map();
const CACHE_TTL = 4 * 60 * 60 * 1000;

async function getAudioStream(videoId) {
  const cached = cache.get(videoId);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.url;
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  // Get best audio-only stream URL (no video, less data)
  const cmd = `yt-dlp -f "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio" --get-url "${url}"`;
  
  const { stdout, stderr } = await execAsync(cmd, { timeout: 20000 });
  const streamUrl = stdout.trim().split('\n')[0];
  
  if (!streamUrl || !streamUrl.startsWith('http')) {
    throw new Error('No stream URL returned: ' + stderr);
  }

  cache.set(videoId, { url: streamUrl, time: Date.now() });
  return streamUrl;
}

async function searchYouTube(query) {
  // Search YouTube via yt-dlp and return top video ID
  const cmd = `yt-dlp "ytsearch1:${query}" --get-id --no-playlist`;
  const { stdout } = await execAsync(cmd, { timeout: 15000 });
  const videoId = stdout.trim().split('\n')[0];
  return videoId || null;
}

const server = createServer(async (req, res) => {
  // CORS headers — allow MyVibe frontend to call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  try {
    // GET /stream?videoId=dQw4w9WgXcQ  → returns { url: "..." }
    if (url.pathname === '/stream') {
      const videoId = url.searchParams.get('videoId');
      if (!videoId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing videoId' }));
        return;
      }
      console.log(`[yt-proxy] Getting stream for: ${videoId}`);
      const streamUrl = await getAudioStream(videoId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ url: streamUrl, videoId }));
      return;
    }

    // GET /search?q=Kesariya+Arijit+Singh  → returns { videoId: "..." }
    if (url.pathname === '/search') {
      const query = url.searchParams.get('q');
      if (!query) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing query' }));
        return;
      }
      console.log(`[yt-proxy] Searching: ${query}`);
      const videoId = await searchYouTube(query + ' audio official');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ videoId }));
      return;
    }

    // GET /health → health check
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', port: PORT }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    console.error(`[yt-proxy] Error:`, err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`✅ MyVibe yt-dlp proxy running on http://localhost:${PORT}`);
  console.log(`   /stream?videoId=VIDEO_ID  → ad-free audio stream URL`);
  console.log(`   /search?q=QUERY           → find videoId for a song`);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} already in use. Proxy may already be running.`);
  } else {
    console.error('Server error:', e);
  }
});
