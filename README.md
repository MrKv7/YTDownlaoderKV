# K TEC YouTube Downloader v3.0

A powerful YouTube video downloader built with Node.js, Express, and yt-dlp. Download videos in multiple qualities (144p to 8K) or extract audio as MP3.

## Features

- 🎬 Download videos in multiple qualities (144p to 8K)
- 🎵 Extract audio as MP3
- 🖼️ Video thumbnail preview
- 📊 Video metadata (views, likes, duration, channel info)
- ⚡ Fast and reliable downloads
- 🎨 Modern, responsive UI
- 🔒 Secure and sanitized filenames

## Tech Stack

- **Backend:** Netlify Serverless Functions
- **Engine:** ytdl-core (pure JavaScript)
- **Frontend:** HTML5, CSS3, JavaScript
- **Hosting:** Netlify (Free tier, no credit card required)

## Prerequisites

- Node.js >= 16.0.0
- Netlify CLI (for local testing): `npm install -g netlify-cli`

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the Netlify dev server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   ```
   http://localhost:3000
   ```

## Deploy to Netlify (FREE - No Credit Card Required)

1. Push this repository to GitHub
2. Sign up at [Netlify.com](https://app.netlify.com/signup)
3. Click **"Add new site"** → **"Import an existing project"**
4. Connect to GitHub and select your repository
5. Build settings (auto-detected from netlify.toml):
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`
6. Click **"Deploy site"**

Your app will be live at: `https://your-site-name.netlify.app`

### Manual Deploy (Alternative)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Get Video Info
```
GET /api/info?url={youtube_url}
```

### Download Video
```
GET /api/download?url={url}&formatId={id}&quality={quality}&title={title}&audio={true/false}
```

## Project Structure

```
YTDownLoader/
├── public/              # Frontend files
│   ├── index.html
│   ├── style.css
│   └── app.js
├── netlify/
│   └── functions/       # Serverless functions
│       ├── info.js      # Get video info
│       └── download.js  # Download video
├── netlify.toml         # Netlify configuration
├── package.json         # Dependencies
├── .gitignore          # Git ignore rules
└── README.md           # Project documentation
```

## License

MIT License - Built by K Tec Solutions

## Support

For issues or questions, please open an issue on GitHub.