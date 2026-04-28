/**
 * ═══════════════════════════════════════════════════════════════
 *   K TEC SOLUTIONS — YouTube Downloader Server v3.0 FINAL
 *   Engine: yt-dlp binary | Node.js + Express
 *   Fixed: Unicode filename support + Download headers
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const express         = require('express');
const cors            = require('cors');
const path            = require('path');
const fs              = require('fs');
const { exec, spawn } = require('child_process');
const { promisify }   = require('util');

const execAsync = promisify(exec);
const app       = express();
const PORT      = process.env.PORT || 3000;

/* ═══════════════════════════════════════════════════════════════
   MIDDLEWARE
═══════════════════════════════════════════════════════════════ */
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition', 'Content-Length']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

/* ═══════════════════════════════════════════════════════════════
   RESOLVE YT-DLP BINARY PATH
═══════════════════════════════════════════════════════════════ */
function resolveYtdlpPath() {
  const candidates = [
    path.join(__dirname, 'yt-dlp.exe'),       // Windows — project root
    path.join(__dirname, 'yt-dlp'),            // Linux/Mac — project root
    path.join(__dirname, 'bin', 'yt-dlp.exe'), // Windows — bin folder
    path.join(__dirname, 'bin', 'yt-dlp'),     // Linux/Mac — bin folder
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log(`[yt-dlp] ✓ Found binary: ${candidate}`);
      return candidate;
    }
  }

  console.log('[yt-dlp] ℹ Using system PATH');
  return 'yt-dlp';
}

const YTDLP = resolveYtdlpPath();

/* ═══════════════════════════════════════════════════════════════
   VALIDATE YT-DLP INSTALLATION
═══════════════════════════════════════════════════════════════ */
async function validateYtdlp() {
  try {
    const { stdout } = await execAsync(`"${YTDLP}" --version`, {
      timeout: 10000,
      windowsHide: true
    });
    const version = stdout.trim();
    console.log(`[yt-dlp] ✓ Version: ${version}`);
    return { ok: true, version };
  } catch (error) {
    console.error('[yt-dlp] ✗ NOT FOUND');
    console.error('[yt-dlp] → Download from: https://github.com/yt-dlp/yt-dlp/releases/latest');
    console.error('[yt-dlp] → Place yt-dlp.exe in project root folder');
    return { ok: false, version: null };
  }
}

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
 * Format date (20231225 → 2023-12-25)
 */
function formatDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return 'N/A';
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

/**
 * Sanitize filename (FIXED for Unicode/special characters)
 */
function sanitizeFilename(name) {
  if (!name) return 'video';
  
  return name
    // Remove all non-ASCII characters (Unicode, Emojis, Special chars)
    .replace(/[^\x00-\x7F]/g, '')
    
    // Remove illegal filename characters
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    
    // Replace multiple spaces with single underscore
    .replace(/\s+/g, '_')
    
    // Remove duplicate underscores
    .replace(/_+/g, '_')
    
    // Remove leading/trailing underscores and dots
    .replace(/^[._]+|[._]+$/g, '')
    
    // Remove special punctuation that may cause issues
    .replace(/[()[\]{}]/g, '')
    
    // Limit length
    .slice(0, 100)
    
    // Final cleanup
    .trim() || 'video';
}

/**
 * Encode filename for HTTP header (RFC 5987)
 */
function encodeFilenameForHeader(filename) {
  return encodeURIComponent(filename)
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A');
}

/* ═══════════════════════════════════════════════════════════════
   BUILD QUALITY MAP FROM YT-DLP FORMATS
═══════════════════════════════════════════════════════════════ */
function buildQualityMap(formats) {
  const qualityMap = {};

  // Define video quality targets
  const videoTargets = [
    { label: '4320p', height: 4320 }, // 8K
    { label: '2160p', height: 2160 }, // 4K
    { label: '1440p', height: 1440 }, // 2K
    { label: '1080p', height: 1080 }, // Full HD
    { label: '720p',  height: 720  }, // HD
    { label: '480p',  height: 480  }, // SD
    { label: '360p',  height: 360  }, // SD
    { label: '240p',  height: 240  }, // Low
    { label: '144p',  height: 144  }, // Low
  ];

  // Find best format for each quality
  for (const { label, height } of videoTargets) {
    // Priority: mp4 with both video and audio
    let format = formats.find(f => 
      f.height === height && 
      f.ext === 'mp4' && 
      f.vcodec !== 'none' && 
      f.acodec !== 'none'
    );

    // Fallback: any format with video and audio
    if (!format) {
      format = formats.find(f => 
        f.height === height && 
        f.vcodec !== 'none' && 
        f.acodec !== 'none'
      );
    }

    // Fallback: video only (will be merged with audio by yt-dlp)
    if (!format) {
      format = formats.find(f => 
        f.height === height && 
        f.vcodec !== 'none'
      );
    }

    if (format) {
      qualityMap[label] = {
        quality:     label,
        formatId:    format.format_id,
        container:   format.ext || 'mp4',
        filesize:    formatBytes(format.filesize || format.filesize_approx) || 'Unknown',
        filesizeRaw: parseInt(format.filesize || format.filesize_approx) || 0,
        fps:         parseInt(format.fps) || 30,
        width:       format.width  || 0,
        height:      format.height || 0,
        hasAudio:    format.acodec !== 'none',
        isVideoOnly: format.acodec === 'none',
        vcodec:      (format.vcodec || 'unknown').split('.')[0],
        acodec:      (format.acodec || 'none').split('.')[0],
        bitrate:     Math.round(format.tbr || 0),
      };
    }
  }

  // Add best audio-only format
  const audioFormats = formats
    .filter(f => f.vcodec === 'none' && f.acodec !== 'none' && f.abr)
    .sort((a, b) => (b.abr || 0) - (a.abr || 0));

  if (audioFormats.length > 0) {
    const bestAudio = audioFormats[0];
    qualityMap['Audio Only'] = {
      quality:     'Audio Only',
      formatId:    bestAudio.format_id,
      container:   'mp3',
      filesize:    formatBytes(bestAudio.filesize) || 'Unknown',
      filesizeRaw: parseInt(bestAudio.filesize) || 0,
      isAudio:     true,
      abr:         Math.round(bestAudio.abr || 0),
      acodec:      (bestAudio.acodec || 'unknown').split('.')[0],
    };
  }

  return qualityMap;
}

/* ═══════════════════════════════════════════════════════════════
   API ROUTES
═══════════════════════════════════════════════════════════════ */

/**
 * GET /api/health — Server health check
 */
app.get('/api/health', async (req, res) => {
  const ytdlp = await validateYtdlp();
  
  res.json({
    status:   ytdlp.ok ? 'online' : 'degraded',
    ytdlp:    ytdlp,
    server:   'K Tec Solutions YT Downloader',
    version:  '3.0.0',
    uptime:   Math.floor(process.uptime()),
    node:     process.version,
    platform: process.platform,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/info?url= — Get video information
 */
app.get('/api/info', async (req, res) => {
  const url = (req.query.url || '').trim();

  // Validation
  if (!url) {
    return res.status(400).json({ 
      ok: false, 
      error: 'URL parameter is required.' 
    });
  }

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Please enter a valid YouTube URL (youtube.com or youtu.be).' 
    });
  }

  console.log(`\n[INFO] Fetching: ${url}`);

  try {
    // Build yt-dlp command
    const command = [
      `"${YTDLP}"`,
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--socket-timeout 20',
      '--retries 3',
      '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
      `"${url}"`,
    ].join(' ');

    // Execute yt-dlp
    const { stdout } = await execAsync(command, {
      timeout:   45000,
      maxBuffer: 1024 * 1024 * 30, // 30MB buffer
      windowsHide: true,
    });

    // Parse JSON response
    const info = JSON.parse(stdout.trim());
    
    // Build quality map
    const qualities = buildQualityMap(info.formats || []);

    // Build response
    const video = {
      id:           info.id,
      title:        info.title || 'Unknown Title',
      channel:      info.channel || info.uploader || 'Unknown Channel',
      channelUrl:   info.channel_url || info.uploader_url || '#',
      channelSubs:  formatNumber(info.channel_follower_count),
      thumbnail:    info.thumbnail || `https://img.youtube.com/vi/${info.id}/maxresdefault.jpg`,
      duration:     formatDuration(info.duration),
      durationSec:  parseInt(info.duration) || 0,
      views:        formatNumber(info.view_count),
      likes:        formatNumber(info.like_count) || 'N/A',
      comments:     formatNumber(info.comment_count) || 'N/A',
      uploadDate:   formatDate(info.upload_date),
      description:  (info.description || '').slice(0, 600).trim(),
      isLive:       !!info.is_live,
      ageLimit:     info.age_limit || 0,
      tags:         (info.tags || []).slice(0, 10),
      categories:   info.categories || [],
      qualities,
      qualityCount: Object.keys(qualities).length,
    };

    console.log(`[INFO] ✓ Success: "${video.title}" | ${video.qualityCount} formats available`);

    res.json({ 
      ok: true, 
      video 
    });

  } catch (error) {
    console.error(`[INFO] ✗ Error: ${error.message}`);

    // User-friendly error messages
    let errorMessage = 'Could not fetch video information.';

    if (error.message.includes('Private video')) {
      errorMessage = 'This video is private and cannot be accessed.';
    } else if (error.message.includes('Sign in')) {
      errorMessage = 'This video requires sign-in to access.';
    } else if (error.message.includes('not available')) {
      errorMessage = 'This video is not available in your region.';
    } else if (error.message.includes('removed')) {
      errorMessage = 'This video has been removed by the uploader.';
    } else if (error.message.includes('copyright')) {
      errorMessage = 'This video has been removed due to copyright.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout. YouTube may be slow or blocking requests.';
    }

    res.status(500).json({ 
      ok: false, 
      error: errorMessage 
    });
  }
});

/**
 * GET /api/download — Download video (FIXED for special characters)
 */
app.get('/api/download', async (req, res) => {
  const { url, formatId, quality, title, audio } = req.query;

  // Validation
  if (!url || !formatId) {
    return res.status(400).json({ 
      ok: false, 
      error: 'url and formatId parameters are required.' 
    });
  }

  const cleanUrl    = decodeURIComponent(url).trim();
  const cleanFormat = decodeURIComponent(formatId).trim();
  const rawTitle    = decodeURIComponent(title || 'video');
  const cleanTitle  = sanitizeFilename(rawTitle);
  const isAudio     = audio === 'true';
  const ext         = isAudio ? 'mp3' : 'mp4';
  
  // Build safe filename
  const safeQuality = decodeURIComponent(quality || 'video').replace(/[^\w]/g, '');
  const filename    = `${cleanTitle}_${safeQuality}.${ext}`;

  if (!isValidYouTubeUrl(cleanUrl)) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Invalid YouTube URL.' 
    });
  }

  console.log(`\n[DOWNLOAD] Starting: ${filename}`);
  console.log(`[DOWNLOAD] Format: ${cleanFormat} | Audio: ${isAudio}`);

  // Build yt-dlp arguments
  const args = isAudio
    ? [
        '--format', cleanFormat,
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificate',
        '--prefer-ffmpeg',
        '--output', '-',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        cleanUrl,
      ]
    : [
        '--format', `${cleanFormat}+bestaudio[ext=m4a]/${cleanFormat}+bestaudio/${cleanFormat}/best[ext=mp4]/best`,
        '--merge-output-format', 'mp4',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificate',
        '--prefer-ffmpeg',
        '--output', '-',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        cleanUrl,
      ];

  try {
    // ✅ FIXED: Set headers with proper encoding for Unicode support
    const encodedFilename = encodeFilenameForHeader(filename);
    
    res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');

  } catch (headerError) {
    console.error('[DOWNLOAD] Header error:', headerError.message);
    return res.status(500).json({ 
      ok: false, 
      error: 'Failed to set download headers: ' + headerError.message 
    });
  }

  // Spawn yt-dlp process
  const ytdlpProcess = spawn(YTDLP, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let downloadStarted = false;
  let bytesDownloaded = 0;

  // Pipe stdout to response
  ytdlpProcess.stdout.on('data', chunk => {
    if (!downloadStarted) {
      console.log(`[DOWNLOAD] ✓ Stream started`);
      downloadStarted = true;
    }
    bytesDownloaded += chunk.length;
  });

  ytdlpProcess.stdout.pipe(res);

  // Log stderr (progress/errors)
  ytdlpProcess.stderr.on('data', data => {
    const message = data.toString().trim();
    
    // Only log important messages
    if (message.includes('[download]') || 
        message.includes('Destination') ||
        message.includes('Merging')) {
      console.log(`[yt-dlp] ${message}`);
    }
    
    if (message.toLowerCase().includes('error')) {
      console.error(`[yt-dlp] ✗ ${message}`);
    }
  });

  // Handle process completion
  ytdlpProcess.on('close', code => {
    const sizeMB = (bytesDownloaded / (1024 * 1024)).toFixed(2);
    console.log(`[DOWNLOAD] ✓ Complete | ${sizeMB} MB | Exit code: ${code}`);
    
    if (!res.writableEnded) {
      res.end();
    }
  });

  // Handle process errors
  ytdlpProcess.on('error', error => {
    console.error(`[DOWNLOAD] ✗ Process error: ${error.message}`);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        ok: false, 
        error: 'Download process failed: ' + error.message 
      });
    } else if (!res.writableEnded) {
      res.end();
    }
  });

  // Handle client disconnect
  req.on('close', () => {
    if (!res.writableEnded) {
      console.log(`[DOWNLOAD] ✗ Client disconnected — killing process`);
      ytdlpProcess.kill('SIGTERM');
    }
  });

  // Handle response errors
  res.on('error', error => {
    console.error(`[DOWNLOAD] ✗ Response error: ${error.message}`);
    ytdlpProcess.kill('SIGTERM');
  });
});

/* ═══════════════════════════════════════════════════════════════
   STATIC FILES & SPA FALLBACK
═══════════════════════════════════════════════════════════════ */

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
}));

// SPA fallback — serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ═══════════════════════════════════════════════════════════════
   ERROR HANDLERS
═══════════════════════════════════════════════════════════════ */

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    ok: false, 
    error: 'Endpoint not found' 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ 
    ok: false, 
    error: 'Internal server error' 
  });
});

/* ═══════════════════════════════════════════════════════════════
   START SERVER
═══════════════════════════════════════════════════════════════ */

app.listen(PORT, async () => {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║                                                    ║');
  console.log('║     K TEC SOLUTIONS — YT Downloader v3.0 FINAL    ║');
  console.log('║                                                    ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log();
  console.log(`  🌐  Server running:  http://localhost:${PORT}`);
  console.log(`  📁  Project root:    ${__dirname}`);
  console.log(`  🎬  Engine:          yt-dlp`);
  console.log();
  
  // Validate yt-dlp
  const ytdlp = await validateYtdlp();
  
  if (!ytdlp.ok) {
    console.log('  ⚠️   WARNING: yt-dlp not found!');
    console.log();
    console.log('  📥  Download from:');
    console.log('      https://github.com/yt-dlp/yt-dlp/releases/latest');
    console.log();
    console.log('  📌  Place yt-dlp.exe in project root folder');
    console.log('      (same folder as server.js)');
    console.log();
  } else {
    console.log('  ✅  All systems ready!');
    console.log();
  }
  
  console.log('════════════════════════════════════════════════════\n');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received — shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received — shutting down gracefully');
  process.exit(0);
});