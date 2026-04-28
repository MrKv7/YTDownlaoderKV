/**
 * ═══════════════════════════════════════════════════════════════
 *   K TEC SOLUTIONS — YouTube Download Function (Netlify)
 *   Engine: ytdl-core (pure JavaScript)
 *   Note: Returns direct download URL (streaming proxy)
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
 * Sanitize filename
 */
function sanitizeFilename(name) {
  if (!name) return 'video';
  
  return name
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]+|[._]+$/g, '')
    .replace(/[()[\]{}]/g, '')
    .slice(0, 100)
    .trim() || 'video';
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

  // Get parameters
  const { url, formatId, quality, title, audio } = event.queryStringParameters || {};

  // Validation
  if (!url || !formatId) {
    return {
      statusCode: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'url and formatId parameters are required.' }),
    };
  }

  const cleanUrl = decodeURIComponent(url).trim();
  const cleanFormat = decodeURIComponent(formatId).trim();
  const rawTitle = decodeURIComponent(title || 'video');
  const cleanTitle = sanitizeFilename(rawTitle);
  const isAudio = audio === 'true';
  const ext = isAudio ? 'mp3' : 'mp4';
  const safeQuality = decodeURIComponent(quality || 'video').replace(/[^\w]/g, '');
  const filename = `${cleanTitle}_${safeQuality}.${ext}`;

  if (!isValidYouTubeUrl(cleanUrl)) {
    return {
      statusCode: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Invalid YouTube URL.' }),
    };
  }

  console.log(`[DOWNLOAD] Starting: ${filename}`);
  console.log(`[DOWNLOAD] Format: ${cleanFormat} | Audio: ${isAudio}`);

  try {
    // Get video info
    const info = await ytdl.getInfo(cleanUrl);
    
    // Find the format
    const format = info.formats.find(f => f.itag.toString() === cleanFormat);
    
    if (!format) {
      return {
        statusCode: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Format not found.' }),
      };
    }

    // Get direct URL from format
    const downloadUrl = format.url;

    if (!downloadUrl) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Download URL not available.' }),
      };
    }

    console.log(`[DOWNLOAD] ✓ Generated download URL`);

    // Return redirect to direct download URL
    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Location': downloadUrl,
      },
      body: '',
    };

  } catch (error) {
    console.error(`[DOWNLOAD] ✗ Error: ${error.message}`);

    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Download failed: ' + error.message }),
    };
  }
};
