// ============================================
// MyVibe — API Service Layer
// ============================================

const JIOSAAVN_BASE = 'https://saavn.dev/api';
const DEEZER_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];
const DEEZER_BASE = 'https://api.deezer.com';

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache(url, ttl = CACHE_TTL) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.time < ttl) {
    return cached.data;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cache.set(url, { data, time: Date.now() });
  return data;
}

// ---- Curated Fallback & Instant Hits Catalog (20+ Top Hits) ----
// Note: previewUrl here are iTunes 30-second previews used only as last resort.
// The app will attempt to upgrade these to full songs via JioSaavn at runtime.
const CURATED_HITS = [
  {
    id: 'cur_1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    coverSmall: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a4/0d/31/a40d311d-21a8-ff03-5188-d652d8e411b7/20UMGIM08479.rgb.jpg/100x100bb.jpg',
    coverMedium: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a4/0d/31/a40d311d-21a8-ff03-5188-d652d8e411b7/20UMGIM08479.rgb.jpg/300x300bb.jpg',
    coverLarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a4/0d/31/a40d311d-21a8-ff03-5188-d652d8e411b7/20UMGIM08479.rgb.jpg/600x600bb.jpg',
    duration: 200,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/80/e7/ee/80e7ee9f-b7a4-0a37-56e6-992383fa6f05/mzaf_12683050119294967380.plus.aac.p.m4a',
    genre: 'Pop',
    mood: 'Energetic',
    tempo: 171,
    energy: 0.9,
    source: 'curated',
    isFullSong: false,
  },
  {
    id: 'cur_2',
    title: 'Starboy (feat. Daft Punk)',
    artist: 'The Weeknd',
    album: 'Starboy',
    coverSmall: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/91/97/81/9197813f-2b28-1ef6-c7fb-7484b8d78906/16UMGIM56391.rgb.jpg/100x100bb.jpg',
    coverMedium: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/91/97/81/9197813f-2b28-1ef6-c7fb-7484b8d78906/16UMGIM56391.rgb.jpg/300x300bb.jpg',
    coverLarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/91/97/81/9197813f-2b28-1ef6-c7fb-7484b8d78906/16UMGIM56391.rgb.jpg/600x600bb.jpg',
    duration: 230,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/3a/0d/eb/3a0deb4c-9f68-7c87-8fb6-787be0ff0977/mzaf_13506240212001555546.plus.aac.p.m4a',
    genre: 'R&B',
    mood: 'Energetic',
    tempo: 186,
    energy: 0.85,
    source: 'curated',
  },
  {
    id: 'cur_3',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: '÷ (Divide)',
    coverSmall: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/19/22/e1/1922e1ab-a50d-b4b7-e21a-4d2c8fb8c232/0190295851286.jpg/100x100bb.jpg',
    coverMedium: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/19/22/e1/1922e1ab-a50d-b4b7-e21a-4d2c8fb8c232/0190295851286.jpg/300x300bb.jpg',
    coverLarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/19/22/e1/1922e1ab-a50d-b4b7-e21a-4d2c8fb8c232/0190295851286.jpg/600x600bb.jpg',
    duration: 233,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/a4/aa/63/a4aa637a-4286-9762-c116-43513364f9bf/mzaf_10526019551460331707.plus.aac.p.m4a',
    genre: 'Pop',
    mood: 'Happy',
    tempo: 96,
    energy: 0.82,
    source: 'curated',
  },
  {
    id: 'cur_4',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    coverSmall: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/fa/69/be/fa69be84-5a21-9952-ec0a-e3dbf2976b9a/190295052959.jpg/100x100bb.jpg',
    coverMedium: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/fa/69/be/fa69be84-5a21-9952-ec0a-e3dbf2976b9a/190295052959.jpg/300x300bb.jpg',
    coverLarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/fa/69/be/fa69be84-5a21-9952-ec0a-e3dbf2976b9a/190295052959.jpg/600x600bb.jpg',
    duration: 203,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/b9/78/3f/b9783f9b-6325-1ff5-a92c-15cfd371cf12/mzaf_17208119041221193306.plus.aac.p.m4a',
    genre: 'Pop',
    mood: 'Happy',
    tempo: 103,
    energy: 0.88,
    source: 'curated',
  },
  {
    id: 'cur_5',
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    album: 'F*CK LOVE 3+: OVER YOU',
    coverSmall: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f3/7c/49/f37c493c-2374-1296-6e54-0ca1a6a57564/886449495744.jpg/100x100bb.jpg',
    coverMedium: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f3/7c/49/f37c493c-2374-1296-6e54-0ca1a6a57564/886449495744.jpg/300x300bb.jpg',
    coverLarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f3/7c/49/f37c493c-2374-1296-6e54-0ca1a6a57564/886449495744.jpg/600x600bb.jpg',
    duration: 141,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/44/22/e4/4422e431-7b9a-5fa3-0249-14a5efb78aa5/mzaf_10034509176313797682.plus.aac.p.m4a',
    genre: 'Pop',
    mood: 'Energetic',
    tempo: 170,
    energy: 0.76,
    source: 'curated',
  },
  {
    id: 'cur_6',
    title: 'Kesariya',
    artist: 'Arijit Singh & Pritam',
    album: 'Brahmastra',
    coverSmall: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/64/a3/ff/64a3ffae-c694-82ee-e5eb-d90c918c5e00/8902894360341_cover.jpg/100x100bb.jpg',
    coverMedium: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/64/a3/ff/64a3ffae-c694-82ee-e5eb-d90c918c5e00/8902894360341_cover.jpg/300x300bb.jpg',
    coverLarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/64/a3/ff/64a3ffae-c694-82ee-e5eb-d90c918c5e00/8902894360341_cover.jpg/600x600bb.jpg',
    duration: 268,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/11/4a/01/114a01c4-1188-f99a-8be8-232185dca3c3/mzaf_17208753228945695026.plus.aac.p.m4a',
    genre: 'Bollywood',
    mood: 'Romantic',
    tempo: 95,
    energy: 0.65,
    source: 'curated',
  },
  {
    id: 'cur_7',
    title: 'Apna Bana Le',
    artist: 'Arijit Singh & Sachin-Jigar',
    album: 'Bhediya',
    coverSmall: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/be/81/25/be8125d0-9993-9cfa-a581-ea933b91a27e/8903247071728.jpg/100x100bb.jpg',
    coverMedium: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/be/81/25/be8125d0-9993-9cfa-a581-ea933b91a27e/8903247071728.jpg/300x300bb.jpg',
    coverLarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/be/81/25/be8125d0-9993-9cfa-a581-ea933b91a27e/8903247071728.jpg/600x600bb.jpg',
    duration: 261,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/fb/c4/8a/fbc48a73-3c99-d41c-8f4f-45b0d463d11b/mzaf_1495115161099616335.plus.aac.p.m4a',
    genre: 'Bollywood',
    mood: 'Romantic',
    tempo: 88,
    energy: 0.6,
    source: 'curated',
  },
  {
    id: 'cur_8',
    title: 'As It Was',
    artist: 'Harry Styles',
    album: "Harry's House",
    coverSmall: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/8e/3c/c1/8e3cc1dd-18e4-84c4-7264-ef090d8011c7/886449982466.jpg/100x100bb.jpg',
    coverMedium: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/8e/3c/c1/8e3cc1dd-18e4-84c4-7264-ef090d8011c7/886449982466.jpg/300x300bb.jpg',
    coverLarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/8e/3c/c1/8e3cc1dd-18e4-84c4-7264-ef090d8011c7/886449982466.jpg/600x600bb.jpg',
    duration: 167,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/0d/bf/bb/0dbfbb5e-a28c-02cf-81ee-bb729bf33682/mzaf_7882264660882855130.plus.aac.p.m4a',
    genre: 'Indie',
    mood: 'Chill',
    tempo: 174,
    energy: 0.73,
    source: 'curated',
  },
  {
    id: 'cur_9',
    title: 'Sunflower',
    artist: 'Post Malone & Swae Lee',
    album: 'Spider-Man: Into the Spider-Verse',
    coverSmall: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/74/49/71/744971c2-c646-0b19-efab-2b3f11d13f9f/18UMGIM78942.rgb.jpg/100x100bb.jpg',
    coverMedium: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/74/49/71/744971c2-c646-0b19-efab-2b3f11d13f9f/18UMGIM78942.rgb.jpg/300x300bb.jpg',
    coverLarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/74/49/71/744971c2-c646-0b19-efab-2b3f11d13f9f/18UMGIM78942.rgb.jpg/600x600bb.jpg',
    duration: 158,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/04/b8/91/04b891e4-ee0f-5636-681b-535fc03caad7/mzaf_18175066491745427142.plus.aac.p.m4a',
    genre: 'Hip-Hop',
    mood: 'Chill',
    tempo: 90,
    energy: 0.5,
    source: 'curated',
  },
  {
    id: 'cur_10',
    title: 'Closer (feat. Halsey)',
    artist: 'The Chainsmokers',
    album: 'Collage EP',
    coverSmall: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/2b/9b/ec/2b9bec15-8025-a81d-e549-3ca71d234f9e/886446162236.jpg/100x100bb.jpg',
    coverMedium: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/2b/9b/ec/2b9bec15-8025-a81d-e549-3ca71d234f9e/886446162236.jpg/300x300bb.jpg',
    coverLarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/2b/9b/ec/2b9bec15-8025-a81d-e549-3ca71d234f9e/886446162236.jpg/600x600bb.jpg',
    duration: 244,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/74/4b/34/744b34b9-fa64-bc17-1049-9dbebb977464/mzaf_15783351980313887114.plus.aac.p.m4a',
    genre: 'Electronic',
    mood: 'Romantic',
    tempo: 95,
    energy: 0.75,
    source: 'curated',
  },
  {
    id: 'cur_11',
    title: 'Believer',
    artist: 'Imagine Dragons',
    album: 'Evolve',
    coverSmall: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/58/0b/48/580b4844-3d07-28d8-912b-a37a92237eb6/17UMGIM86307.rgb.jpg/100x100bb.jpg',
    coverMedium: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/58/0b/48/580b4844-3d07-28d8-912b-a37a92237eb6/17UMGIM86307.rgb.jpg/300x300bb.jpg',
    coverLarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/58/0b/48/580b4844-3d07-28d8-912b-a37a92237eb6/17UMGIM86307.rgb.jpg/600x600bb.jpg',
    duration: 204,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/f0/54/64/f0546452-f38b-d7d8-04ea-4113cb124316/mzaf_18118021008743171343.plus.aac.p.m4a',
    genre: 'Rock',
    mood: 'Energetic',
    tempo: 125,
    energy: 0.95,
    source: 'curated',
  },
  {
    id: 'cur_12',
    title: 'Heat Waves',
    artist: 'Glass Animals',
    album: 'Dreamland',
    coverSmall: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/80/40/8b/80408bcf-bbce-f6a8-a3f2-1ea15486e921/20UMGIM60980.rgb.jpg/100x100bb.jpg',
    coverMedium: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/80/40/8b/80408bcf-bbce-f6a8-a3f2-1ea15486e921/20UMGIM60980.rgb.jpg/300x300bb.jpg',
    coverLarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/80/40/8b/80408bcf-bbce-f6a8-a3f2-1ea15486e921/20UMGIM60980.rgb.jpg/600x600bb.jpg',
    duration: 238,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/58/57/9d/58579df6-b7ff-11c5-4309-8fe8eb3a693c/mzaf_14782014798363654402.plus.aac.p.m4a',
    genre: 'Indie',
    mood: 'Chill',
    tempo: 81,
    energy: 0.52,
    source: 'curated',
  }
];

// ---- iTunes API (Direct CORS) ----
export const itunes = {
  async search(query, limit = 25) {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`;
      const data = await fetchWithCache(url);
      const results = (data.results || []).filter(t => t.previewUrl);
      if (results.length) return results.map(mapItunesTrack);
    } catch (e) {
      console.warn('iTunes search note:', e.message);
    }
    // Return filtered curated list
    const qLower = (query || '').toLowerCase();
    return CURATED_HITS.filter(t =>
      t.title.toLowerCase().includes(qLower) ||
      t.artist.toLowerCase().includes(qLower) ||
      t.genre.toLowerCase().includes(qLower)
    );
  },

  async getTopChart(limit = 40) {
    // First try JioSaavn for full songs
    try {
      const saavnTracks = await jiosaavn.getTopCharts(limit);
      if (saavnTracks && saavnTracks.length >= 6) return saavnTracks;
    } catch (e) {}
    // Fallback to iTunes previews
    try {
      const queries = ['top hits', 'billboard 100', 'global hits'];
      const query = queries[Math.floor(Math.random() * queries.length)];
      const tracks = await itunes.search(query, limit);
      if (tracks && tracks.length >= 6) return tracks;
    } catch (e) {}
    return CURATED_HITS;
  },

  async getGenreTracks(genre, limit = 25) {
    // Try JioSaavn first for full songs
    try {
      const saavnTracks = await jiosaavn.search(`${genre} hits`, limit);
      if (saavnTracks && saavnTracks.length >= 3) return saavnTracks;
    } catch (e) {}
    try {
      const tracks = await itunes.search(`${genre} hits`, limit);
      if (tracks && tracks.length >= 3) return tracks;
    } catch (e) {}
    return CURATED_HITS.filter(t => t.genre.toLowerCase().includes((genre || '').toLowerCase()));
  }
};

function mapItunesTrack(t) {
  const artwork = t.artworkUrl100 || t.artworkUrl60 || '/placeholder.svg';
  const coverLarge = artwork.replace('100x100bb', '600x600bb').replace('60x60bb', '600x600bb');
  const coverMedium = artwork.replace('100x100bb', '300x300bb');
  const genre = normalizeGenre(t.primaryGenreName || guessGenre(t));
  const mood = guessMood(t);

  return {
    id: `it_${t.trackId}`,
    itunesId: t.trackId,
    title: t.trackName || 'Unknown Title',
    artist: t.artistName || 'Unknown Artist',
    artistId: t.artistId,
    album: t.collectionName || '',
    coverSmall: t.artworkUrl60 || artwork,
    coverMedium: coverMedium,
    coverLarge: coverLarge,
    duration: Math.round((t.trackTimeMillis || 30000) / 1000),
    previewUrl: t.previewUrl,
    source: 'itunes',
    isFullSong: false,   // iTunes only gives 30s previews
    genre: genre,
    mood: mood,
    tempo: guessTempo(genre),
    energy: guessEnergy(genre, mood),
  };
}

// ---- Deezer API ----
export const deezer = {
  async search(query, limit = 25) {
    for (const proxy of DEEZER_PROXIES) {
      try {
        const url = `${proxy}${encodeURIComponent(`${DEEZER_BASE}/search?q=${encodeURIComponent(query)}&limit=${limit}`)}`;
        const data = await fetchWithCache(url, 2 * 60 * 1000);
        const list = (data.data || []).filter(t => t.preview);
        if (list.length) return list.map(mapDeezerTrack);
      } catch (err) {}
    }
    return [];
  },

  async getChart(limit = 40) {
    return itunes.getTopChart(limit);
  }
};

function mapDeezerTrack(t) {
  const genre = normalizeGenre(guessGenre(t));
  const mood = guessMood(t);
  return {
    id: `dz_${t.id}`,
    deezerID: t.id,
    title: t.title || t.title_short || 'Unknown',
    artist: t.artist?.name || 'Unknown Artist',
    artistId: t.artist?.id,
    album: t.album?.title || '',
    coverSmall: t.album?.cover_small || t.album?.cover || '/placeholder.svg',
    coverMedium: t.album?.cover_medium || t.album?.cover || '/placeholder.svg',
    coverLarge: t.album?.cover_big || t.album?.cover_xl || t.album?.cover || '/placeholder.svg',
    duration: t.duration || 30,
    previewUrl: t.preview || null,
    source: 'deezer',
    isFullSong: false,   // Deezer free API only gives 30s previews
    genre: genre,
    mood: mood,
    tempo: guessTempo(genre),
    energy: guessEnergy(genre, mood),
  };
}

// ---- JioSaavn API ----
export const jiosaavn = {
  async search(query, limit = 20) {
    try {
      const url = `${JIOSAAVN_BASE}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`;
      const data = await fetchWithCache(url, 3 * 60 * 1000);
      const results = data.data?.results || [];
      return results.filter(t => t.downloadUrl?.length).map(mapJioSaavnTrack);
    } catch (e) {
      return [];
    }
  },

  async getTopCharts(limit = 40) {
    // Try several popular Bollywood / global chart queries
    const queries = ['top hindi hits 2024', 'bollywood hits', 'top songs 2024', 'arijit singh hits'];
    for (const q of queries) {
      try {
        const results = await jiosaavn.search(q, limit);
        if (results && results.length >= 6) return results;
      } catch (e) {}
    }
    return [];
  },

  // Try to find a full-song match for a preview-only track
  async upgradeToFullSong(track) {
    try {
      const results = await jiosaavn.search(`${track.title} ${track.artist}`, 5);
      if (!results || !results.length) return null;
      // Pick the closest match by title similarity
      const titleLower = track.title.toLowerCase();
      const match = results.find(r =>
        r.title.toLowerCase().includes(titleLower) ||
        titleLower.includes(r.title.toLowerCase())
      ) || results[0];
      return match || null;
    } catch (e) {
      return null;
    }
  }
};

function mapJioSaavnTrack(t) {
  const images = t.image || [];
  const downloadUrls = t.downloadUrl || [];
  const genre = normalizeGenre(t.language || 'Bollywood');
  const mood = guessMood(t);
  const url = getDownloadUrl(downloadUrls);

  return {
    id: `js_${t.id}`,
    jiosaavnId: t.id,
    title: t.name || 'Unknown',
    artist: (t.artists?.primary || []).map(a => a.name).join(', ') || t.primaryArtists || 'Unknown Artist',
    album: t.album?.name || '',
    coverSmall: getImageUrl(images, 0) || '/placeholder.svg',
    coverMedium: getImageUrl(images, 1) || '/placeholder.svg',
    coverLarge: getImageUrl(images, 2) || getImageUrl(images, 1) || '/placeholder.svg',
    duration: t.duration || 180,
    previewUrl: url || null,
    source: 'jiosaavn',
    isFullSong: !!url,     // JioSaavn provides full songs!
    genre: genre,
    mood: mood,
    tempo: 100,
    energy: 0.75,
  };
}

function getImageUrl(images, index) {
  if (Array.isArray(images)) {
    const img = images[index] || images[images.length - 1];
    return img?.url || img?.link || (typeof img === 'string' ? img : null);
  }
  return typeof images === 'string' ? images : null;
}

function getDownloadUrl(urls) {
  if (Array.isArray(urls)) {
    const preferred = urls.find(u => u.quality === '320kbps')
      || urls.find(u => u.quality === '160kbps')
      || urls.find(u => u.quality === '96kbps')
      || urls[urls.length - 1];
    return preferred?.url || preferred?.link || (typeof preferred === 'string' ? preferred : null);
  }
  return typeof urls === 'string' ? urls : null;
}

// ---- YouTube ----
export const youtube = {
  async search(query, limit = 8) {
    const instances = [
      'https://inv.nadeko.net/api/v1/search',
      'https://invidious.nerdvpn.de/api/v1/search',
    ];

    for (const inst of instances) {
      try {
        const url = `${inst}?q=${encodeURIComponent(query + ' official music video')}&type=video&sort_by=relevance`;
        const data = await fetchWithCache(url, 15 * 60 * 1000);
        if (Array.isArray(data) && data.length) {
          return data.slice(0, limit).map(mapYouTubeVideo);
        }
      } catch (e) {}
    }

    return generateFallbackVideos(query);
  },

  getEmbedUrl(videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  },

  getThumbnail(videoId, quality = 'mq') {
    return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
  }
};

function mapYouTubeVideo(v) {
  return {
    id: `yt_${v.videoId}`,
    videoId: v.videoId,
    title: v.title || 'Unknown Video',
    channel: v.author || 'YouTube Artist',
    thumbnail: v.videoThumbnails?.[0]?.url || youtube.getThumbnail(v.videoId),
    thumbnailHQ: v.videoThumbnails?.[4]?.url || youtube.getThumbnail(v.videoId, 'hq'),
    duration: v.lengthSeconds || 210,
    views: v.viewCount || 0,
    source: 'youtube',
  };
}

function generateFallbackVideos(query) {
  const popular = [
    { videoId: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', channel: 'Rick Astley', duration: 213 },
    { videoId: 'kJQP7kiw5Fk', title: 'Luis Fonsi - Despacito ft. Daddy Yankee', channel: 'Luis Fonsi', duration: 282 },
    { videoId: '09R8_2nJtjg', title: 'Maroon 5 - Sugar', channel: 'Maroon 5', duration: 307 },
    { videoId: 'RgKAFK5djSk', title: 'Wiz Khalifa - See You Again ft. Charlie Puth', channel: 'Wiz Khalifa', duration: 237 },
    { videoId: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You', channel: 'Ed Sheeran', duration: 263 },
    { videoId: 'OPf0YbXqDm0', title: 'Mark Ronson - Uptown Funk ft. Bruno Mars', channel: 'Mark Ronson', duration: 271 },
    { videoId: 'fJ9rUzIMcZQ', title: 'Queen - Bohemian Rhapsody', channel: 'Queen Official', duration: 359 },
    { videoId: '4NRXx6U8ABQ', title: 'The Weeknd - Blinding Lights (Official Music Video)', channel: 'The Weeknd', duration: 260 }
  ];
  return popular.map(v => ({
    id: `yt_${v.videoId}`,
    videoId: v.videoId,
    title: v.title,
    channel: v.channel,
    thumbnail: youtube.getThumbnail(v.videoId),
    thumbnailHQ: youtube.getThumbnail(v.videoId, 'hq'),
    duration: v.duration,
    views: 0,
    source: 'youtube',
  }));
}

// ---- Combined Search Across All Sources ----
export async function searchAll(query) {
  if (!query || !query.trim()) {
    // For home screen: JioSaavn top charts first for full songs
    try {
      const saavnTop = await jiosaavn.getTopCharts(30);
      if (saavnTop && saavnTop.length >= 6) {
        return { songs: saavnTop, videos: generateFallbackVideos('') };
      }
    } catch (e) {}
    return { songs: CURATED_HITS, videos: generateFallbackVideos('') };
  }

  const cleanQuery = query.trim();

  // Run all sources in parallel — JioSaavn first for full songs
  const [saavnRes, itunesRes, deezerRes, ytRes] = await Promise.allSettled([
    jiosaavn.search(cleanQuery, 20),   // Full songs — primary
    itunes.search(cleanQuery, 15),     // 30s previews — secondary
    deezer.search(cleanQuery, 10),     // 30s previews — tertiary
    youtube.search(cleanQuery, 8),
  ]);

  const allSongs = [];
  const seenTitles = new Set();

  const addUnique = (list) => {
    if (!Array.isArray(list)) return;
    for (const track of list) {
      if (!track || !track.previewUrl) continue;
      const key = `${track.title.toLowerCase().trim()}_${track.artist.toLowerCase().trim()}`;
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        allSongs.push(track);
      }
    }
  };

  // Priority: JioSaavn (full) → iTunes (preview) → Deezer (preview)
  if (saavnRes.status === 'fulfilled') addUnique(saavnRes.value);
  if (itunesRes.status === 'fulfilled') addUnique(itunesRes.value);
  if (deezerRes.status === 'fulfilled') addUnique(deezerRes.value);

  // If search returned nothing from remote, search curated list
  if (allSongs.length === 0) {
    const qLower = cleanQuery.toLowerCase();
    const curatedMatches = CURATED_HITS.filter(t =>
      t.title.toLowerCase().includes(qLower) ||
      t.artist.toLowerCase().includes(qLower) ||
      t.genre.toLowerCase().includes(qLower)
    );
    addUnique(curatedMatches.length ? curatedMatches : CURATED_HITS);
  }

  const videos = ytRes.status === 'fulfilled' && ytRes.value?.length
    ? ytRes.value
    : generateFallbackVideos(cleanQuery);

  return {
    songs: allSongs,
    videos: videos,
  };
}

function normalizeGenre(g) {
  if (!g) return 'Pop';
  const gl = g.toLowerCase();
  if (gl.includes('pop') || gl.includes('dance')) return 'Pop';
  if (gl.includes('rock') || gl.includes('metal') || gl.includes('alt')) return 'Rock';
  if (gl.includes('hip') || gl.includes('rap') || gl.includes('trap')) return 'Hip-Hop';
  if (gl.includes('r&b') || gl.includes('soul')) return 'R&B';
  if (gl.includes('electr') || gl.includes('house') || gl.includes('edm')) return 'Electronic';
  if (gl.includes('hindi') || gl.includes('bollywood') || gl.includes('punjabi') || gl.includes('tamil')) return 'Bollywood';
  if (gl.includes('indie') || gl.includes('folk')) return 'Indie';
  if (gl.includes('latin') || gl.includes('reggaeton')) return 'Latin';
  if (gl.includes('jazz') || gl.includes('blues')) return 'Jazz';
  if (gl.includes('classical')) return 'Classical';
  return 'Pop';
}

function guessGenre(t) {
  const text = `${t.title || t.trackName || ''} ${t.genre_id || ''} ${t.primaryGenreName || ''}`.toLowerCase();
  if (text.includes('rock') || text.includes('metal')) return 'Rock';
  if (text.includes('hip') || text.includes('rap')) return 'Hip-Hop';
  if (text.includes('electr') || text.includes('edm') || text.includes('house')) return 'Electronic';
  if (text.includes('hindi') || text.includes('arijit') || text.includes('pritam') || text.includes('kesariya')) return 'Bollywood';
  if (text.includes('jazz')) return 'Jazz';
  if (text.includes('class')) return 'Classical';
  if (text.includes('latin') || text.includes('despacito')) return 'Latin';
  if (text.includes('indie') || text.includes('alt')) return 'Indie';
  if (text.includes('r&b') || text.includes('soul') || text.includes('weeknd')) return 'R&B';
  return 'Pop';
}

function guessMood(t) {
  const text = `${t.title || t.trackName || ''} ${t.album || ''}`.toLowerCase();
  if (text.includes('love') || text.includes('heart') || text.includes('baby') || text.includes('kesariya') || text.includes('closer') || text.includes('apna bana le')) return 'Romantic';
  if (text.includes('sad') || text.includes('cry') || text.includes('alone') || text.includes('die')) return 'Sad';
  if (text.includes('party') || text.includes('dance') || text.includes('fire') || text.includes('believer') || text.includes('blinding') || text.includes('stay')) return 'Energetic';
  if (text.includes('night') || text.includes('dark') || text.includes('starboy')) return 'Dark';
  if (text.includes('chill') || text.includes('relax') || text.includes('heat waves') || text.includes('sunflower') || text.includes('calm')) return 'Chill';
  if (text.includes('happy') || text.includes('good') || text.includes('levitating') || text.includes('shape of you')) return 'Happy';
  return 'Happy';
}

function guessTempo(genre) {
  switch (genre) {
    case 'Pop': return 120;
    case 'Rock': return 135;
    case 'Hip-Hop': return 92;
    case 'Electronic': return 128;
    case 'Bollywood': return 100;
    case 'R&B': return 88;
    case 'Indie': return 110;
    case 'Chill': return 80;
    default: return 115;
  }
}

function guessEnergy(genre, mood) {
  let base = 0.6;
  if (mood === 'Energetic') base += 0.3;
  if (mood === 'Happy') base += 0.2;
  if (mood === 'Chill' || mood === 'Sad') base -= 0.2;
  if (genre === 'Rock' || genre === 'Electronic') base += 0.15;
  return Math.max(0.1, Math.min(1.0, base));
}

// ---- Genre List for Browse / Explorer ----
export const genreList = [
  { id: 132, name: 'Pop', color: '#1DB954', query: 'pop' },
  { id: 500, name: 'Bollywood', color: '#ff5722', query: 'bollywood' },
  { id: 116, name: 'Hip-Hop', color: '#ff9800', query: 'hip hop' },
  { id: 106, name: 'Electronic', color: '#00bcd4', query: 'electronic' },
  { id: 165, name: 'R&B', color: '#9c27b0', query: 'r&b' },
  { id: 152, name: 'Rock', color: '#e91e63', query: 'rock' },
  { id: 85,  name: 'Indie', color: '#4caf50', query: 'indie' },
  { id: 197, name: 'Latin', color: '#e64a19', query: 'latin' },
  { id: 129, name: 'Jazz & Lo-Fi', color: '#795548', query: 'jazz' },
  { id: 98,  name: 'Acoustic & Chill', color: '#607d8b', query: 'chill' },
  { id: 464, name: 'Party & Workout', color: '#f44336', query: 'party' },
  { id: 169, name: 'Romantic & Love', color: '#e040fb', query: 'romantic' },
];

export { CURATED_HITS };
