/**
 * ═══════════════════════════════════════════════════════════════
 *   K TEC SOLUTIONS — YouTube Info Function (Netlify)
 *   Engine: ytdl-core (pure JavaScript)
 * ═══════════════════════════════════════════════════════════════
 */

const ytdl = require('ytdl-core');

/* ═══════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════ */

/**
 * Validate YouTube URL
 */
function isValidYouTubeUrl(url) {
  const patterns = [
    /^https?:\/\/(www\.|m\.)?(youtube\.com\/watch\?v=[\w-]+)/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.|m\.)?(youtube\.com\/shorts\/[\w-]+)/,
    /^https?:\/\/(www\.|m\.)?(youtube\.com\/embed\/[\w-]+)/,
  ];
  return patterns.some(pattern => pattern.test(url));
}

/**
 * Format number (1500000 → 1.5M)
 */
function formatNumber(num) {
  const n = parseInt(num);
  if (!n || isNaN(n) || n <= 0) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

/**
 * Format bytes (1048576 → 1.00 MB)
 */
function formatBytes(bytes) {
  bytes = parseInt(bytes);
  if (!bytes || bytes <= 0) return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

/**
 * Format duration (3665 → 1:01:05)
 */
function formatDuration(seconds) {
  seconds = parseInt(seconds) || 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = v => String(v).padStart(2, '0');
  
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

/**
 * Build quality map from ytdl formats
 */
function buildQualityMap(formats) {
  const qualityMap = {};

  // Define video quality targets
  const videoTargets = [
    { label: '2160p', height: 2160, quality: '2160' },
    { label: '1440p', height: 1440, quality: '1440' },
    { label: '1080p', height: 1080, quality: '1080' },
    { label: '720p',  height: 720,  quality: '720' },
    { label: '480p',  height: 480,  quality: '480' },
    { label: '360p',  height: 360,  quality: '360' },
    { label: '240p',  height: 240,  quality: '240' },
    { label: '144p',  height: 144,  quality: '144' },
  ];

  // Find best format for each quality
  for (const { label, height, quality } of videoTargets) {
    const format = formats.find(f => 
      f.qualityLabel === label || 
      (f.height && Math.abs(f.height - height) < 10)
    );

    if (format) {
      qualityMap[label] = {
        quality: label,
        formatId: format.itag.toString(),
        container: format.container || 'mp4',
        filesize: formatBytes(format.contentLength) || 'Unknown',
        filesizeRaw: parseInt(format.contentLength) || 0,
        fps: format.fps || 30,
        width: format.width || 0,
        height: format.height || 0,
        hasAudio: format.hasAudio,
        qualityLabel: format.qualityLabel || label,
      };
    }
  }

  // Add audio-only option
  const audioFormats = formats.filter(f => f.hasAudio && !f.hasVideo);
  if (audioFormats.length > 0) {
    const bestAudio = audioFormats[0];
    qualityMap['Audio Only'] = {
      quality: 'Audio Only',
      formatId: bestAudio.itag.toString(),
      container: 'mp3',
      filesize: formatBytes(bestAudio.contentLength) || 'Unknown',
      filesizeRaw: parseInt(bestAudio.contentLength) || 0,
      isAudio: true,
      abr: Math.round(bestAudio.audioBitrate || 128),
    };
  }

  return qualityMap;
}

/* ═══════════════════════════════════════════════════════════════
   NETLIFY FUNCTION HANDLER
═══════════════════════════════════════════════════════════════ */

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  // Get URL from query parameters
  const url = (event.queryStringParameters?.url || '').trim();

  // Validation
  if (!url) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ ok: false, error: 'URL parameter is required.' }),
    };
  }

  if (!isValidYouTubeUrl(url)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ ok: false, error: 'Please enter a valid YouTube URL (youtube.com or youtu.be).' }),
    };
  }

  console.log(`[INFO] Fetching: ${url}`);

  try {
    // Get video info using ytdl-core
    const info = await ytdl.getInfo(url);
    
    // Build quality map
    const qualities = buildQualityMap(info.formats);

    // Build response
    const video = {
      id: info.videoDetails.videoId,
      title: info.videoDetails.title || 'Unknown Title',
      channel: info.videoDetails.author.name || 'Unknown Channel',
      channelUrl: info.videoDetails.author.channel_url || '#',
      channelSubs: 'N/A',
      thumbnail: info.videoDetails.thumbnails?.pop()?.url || `https://img.youtube.com/vi/${info.videoDetails.videoId}/maxresdefault.jpg`,
      duration: formatDuration(info.videoDetails.lengthSeconds),
      durationSec: parseInt(info.videoDetails.lengthSeconds) || 0,
      views: formatNumber(info.videoDetails.viewCount),
      likes: 'N/A',
      comments: 'N/A',
      uploadDate: info.videoDetails.publishDate || 'N/A',
      description: (info.videoDetails.description || '').slice(0, 600).trim(),
      isLive: info.videoDetails.isLiveContent || false,
      ageLimit: 0,
      tags: [],
      categories: [],
      qualities,
      qualityCount: Object.keys(qualities).length,
    };

    console.log(`[INFO] ✓ Success: "${video.title}" | ${video.qualityCount} formats available`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, video }),
    };

  } catch (error) {
    console.error(`[INFO] ✗ Error: ${error.message}`);

    // User-friendly error messages
    let errorMessage = 'Could not fetch video information.';

    if (error.message.includes('Private video')) {
      errorMessage = 'This video is private and cannot be accessed.';
    } else if (error.message.includes('sign in')) {
      errorMessage = 'This video requires sign-in to access.';
    } else if (error.message.includes('unavailable')) {
      errorMessage = 'This video is not available in your region.';
    } else if (error.message.includes('removed')) {
      errorMessage = 'This video has been removed by the uploader.';
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: errorMessage }),
    };
  }
};
