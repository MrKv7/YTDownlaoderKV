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

- **Backend:** Node.js + Express
- **Engine:** yt-dlp
- **Frontend:** HTML5, CSS3, JavaScript

## Prerequisites

- Node.js >= 16.0.0
- yt-dlp binary (auto-installed on Render)

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Download yt-dlp:**
   - Windows: Download `yt-dlp.exe` from [GitHub Releases](https://github.com/yt-dlp/yt-dlp/releases/latest)
   - Place it in the project root folder

3. **Run the server:**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
   ```

## Deploy to Render.com

1. Push this repository to GitHub
2. Sign up at [Render.com](https://render.com)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name:** your-app-name
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
6. Add environment variable:
   - `PORT`: `3000`
7. Click "Create Web Service"

Your app will be live at: `https://your-app-name.onrender.com`

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
├── server.js            # Express server
├── package.json         # Dependencies
├── .gitignore          # Git ignore rules
└── README.md           # Project documentation
```

## License

MIT License - Built by K Tec Solutions

## Support

For issues or questions, please open an issue on GitHub.