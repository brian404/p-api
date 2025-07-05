const axios = require('axios');
const cheerio = require('cheerio');
const sanitizeHtml = require('sanitize-html');
const { getRandomUserAgent } = require('./ua-rotate'); // Import ua

const categoryMap = {};

const populateCategories = async () => {
    try {
        const url = 'https://www.pornhub.com/categories';
        const ua = getRandomUserAgent();
        console.log(`Fetching categories with UA: ${ua}`);
        const { data } = await axios.get(url, { 
            headers: { 'User-Agent': ua } 
        });
        const $ = cheerio.load(data);

        let categoriesData = null;
        $('script').each((i, elem) => {
            const scriptContent = $(elem).html();
            if (scriptContent && scriptContent.includes('allCategoriesCombined')) {
                const match = scriptContent.match(/allCategoriesCombined = JSON\.parse\('(.+?)'\);/);
                if (match && match[1]) {
                    categoriesData = JSON.parse(match[1].replace(/\\"/g, '"'));
                }
            }
        });

        if (!categoriesData) {
            throw new Error('Could not find allCategoriesCombined in the page');
        }

        categoriesData.forEach(category => {
            const name = category.name.toLowerCase().replace(/\s+/g, '-');
            const id = category.id;
            if (name && id) {
                categoryMap[name] = id;
            }
        });

        console.log('Category mapping initialized with', Object.keys(categoryMap).length, 'categories');
    } catch (error) {
        console.error('Failed to initialize category mapping:', error.message);
    }
};

populateCategories();

const getTrendingVideos = async (req, res) => {
    try {
        const url = 'https://www.pornhub.com/video';
        const ua = getRandomUserAgent();
        console.log(`Fetching trending videos with UA: ${ua}`);
        const { data } = await axios.get(url, { 
            headers: { 'User-Agent': ua } 
        });
        const $ = cheerio.load(data);
        let trendingVideos = new Set();
        $('a[href^="/view_video.php?viewkey="]').each((index, element) => {
            let videoKeyMatch = $(element).attr('href').match(/viewkey=([^&]+)/);
            if (videoKeyMatch && videoKeyMatch[1]) trendingVideos.add(videoKeyMatch[1]);
            if (trendingVideos.size >= 10) return false;
        });
        res.json({ trending: [...trendingVideos] });
    } catch (error) {
        console.error("Error fetching trending videos:", error.message);
        res.status(500).json({ error: 'Failed to fetch trending videos' });
    }
};

const getRandomVideo = async (req, res) => {
    try {
        const url = 'https://www.pornhub.com/video';
        const ua = getRandomUserAgent();
        console.log(`Fetching random video with UA: ${ua}`);
        const { data } = await axios.get(url, { 
            headers: { 'User-Agent': ua } 
        });
        const $ = cheerio.load(data);
        let videoIds = [];
        $('a[href^="/view_video.php?viewkey="]').each((index, element) => {
            let videoKeyMatch = $(element).attr('href').match(/viewkey=([^&]+)/);
            if (videoKeyMatch && videoKeyMatch[1]) videoIds.push(videoKeyMatch[1]);
        });
        const randomId = videoIds[Math.floor(Math.random() * videoIds.length)];
        res.json({ randomVideo: randomId });
    } catch (error) {
        console.error("Error fetching random video:", error.message);
        res.status(500).json({ error: 'Failed to fetch random video' });
    }
};

const getCategories = async (req, res) => {
    try {
        if (Object.keys(categoryMap).length === 0) {
            await populateCategories();
        }
        if (Object.keys(categoryMap).length === 0) {
            throw new Error('Category mapping failed to initialize');
        }
        const categories = Object.entries(categoryMap).map(([name, id]) => ({ name, id }));
        res.json({ categories });
    } catch (error) {
        console.error("Error fetching categories:", error.message);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

const getVideoDetails = async (req, res) => {
    try {
        const videoId = req.params.id;
        const url = `https://www.pornhub.com/view_video.php?viewkey=${videoId}`;
        const ua = getRandomUserAgent();
        console.log(`Fetching video details for ${videoId} with UA: ${ua}`);
        
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': ua,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://www.pornhub.com/'
            },
            timeout: 10000,
            validateStatus: status => status >= 200 && status < 300
        });
        
        const $ = cheerio.load(data);
        let title = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content');
        if (!title) {
            const jsonLd = $('script[type="application/ld+json"]').html();
            if (jsonLd) {
                try {
                    const json = JSON.parse(jsonLd);
                    title = json.name;
                } catch (e) {
                    console.warn(`Failed to parse JSON-LD for ${videoId}: ${e.message}`);
                }
            }
        }
        if (!title) {
            title = $('title').text().trim().replace(/ \| Pornhub$/, '');
        }
        title = sanitizeHtml(title, { allowedTags: [] }).replace(/\s+/g, ' ').trim() || `Untitled Video (${videoId})`;
        
        const videoUrl = url;
        let length = $('.video-info-row .duration').first().text().trim() ||
                     $('.duration').first().text().trim() ||
                     $('.time-remaining').text().trim() ||
                     "Unknown";
        let thumbnail = $('meta[property="og:image"]').attr('content') || 
                        $('img[data-thumb_url]').attr('data-thumb_url') || 
                        "Thumbnail not found";

        res.json({ 
            video_id: videoId, 
            title, 
            url: videoUrl, 
            length, 
            thumbnail 
        });
    } catch (error) {
        console.error(`Error fetching video details for ${req.params.id}:`, error.message, error.response?.status);
        res.status(404).json({ error: 'Video not found or failed to fetch', details: error.message });
    }
};
const downloadVideo = async (req, res) => {
    try {
        const videoId = req.params.id;
        const pageUrl = `https://www.pornhub.com/view_video.php?viewkey=${videoId}`;
        const apiUrl = `http://80.211.131.188:5577/api/ytdlp?url=${encodeURIComponent(pageUrl)}`;
        console.log(`Requesting video ${videoId} from custom API: ${apiUrl}`);

        const videoResponse = await axios({
            method: 'get',
            url: apiUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', // Static for custom API
                'Referer': pageUrl
            },
            timeout: 30000
        });

        console.log(`Streaming video ${videoId} from custom API`);
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `inline; filename="${videoId}.mp4"`);
        videoResponse.data.pipe(res);

        videoResponse.data.on('end', () => console.log(`Finished streaming video ${videoId}`));
        videoResponse.data.on('error', (err) => {
            console.error(`Stream error for video ${videoId}:`, err.message);
            res.status(500).end();
        });
    } catch (error) {
        console.error(`Error downloading video ${req.params.id} via custom API:`, error.message);
        if (error.code === 'ECONNREFUSED') {
            res.status(503).json({ error: 'Custom API unavailable' });
        } else if (error.code === 'ETIMEDOUT') {
            res.status(504).json({ error: 'API request timed out' });
        } else {
            res.status(500).json({ error: 'Failed to stream video from custom API' });
        }
    }
};

const getCategoryVideos = async (req, res) => {
    try {
        const categoryName = req.params.name.toLowerCase().replace(/\s+/g, '-');
        if (!categoryName) {
            return res.status(400).json({ error: 'Category parameter is required' });
        }
        if (Object.keys(categoryMap).length === 0) {
            await populateCategories();
        }
        const categoryId = categoryMap[categoryName];
        if (!categoryId) {
            return res.status(404).json({ 
                error: `Category '${categoryName}' not found`, 
                hint: 'Check /api/categories for valid category names' 
            });
        }

        console.log(`Fetching videos for category '${categoryName}' (ID: ${categoryId})`);
        const url = `https://www.pornhub.com/video?c=${categoryId}`;
        const ua = getRandomUserAgent();
        console.log(`Using UA: ${ua}`);
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': ua }
        });
        const $ = cheerio.load(data);
        let videoIds = new Set();

        $('a[href^="/view_video.php?viewkey="]').each((index, element) => {
            const href = $(element).attr('href');
            const videoKey = href.match(/viewkey=([^&]+)/);
            if (videoKey && videoKey[1]) {
                videoIds.add(videoKey[1]);
            }
            if (videoIds.size >= 20) return false;
        });

        if (videoIds.size === 0) {
            console.log(`No videos found for category: ${categoryName} (ID: ${categoryId})`);
            return res.status(404).json({ error: 'No videos found for this category' });
        }

        res.json({ category: categoryName, videos: [...videoIds] });
    } catch (error) {
        console.error(`Error fetching videos for category ${req.params.name}:`, error.message);
        res.status(500).json({ error: 'Failed to fetch category videos' });
    }
};

const getApiDocs = (req, res) => {
    console.log('Serving API docs');
    const docsHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Documentation</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 40px;
            background: #f0f2f5;
            color: #2d3748;
            line-height: 1.6;
        }
        h1 {
            color: #1a202c;
            font-size: 2.5em;
            border-bottom: 2px solid #4a5568;
            padding-bottom: 10px;
        }
        h2 {
            color: #319795;
            font-size: 1.8em;
            margin-top: 40px;
            font-weight: 600;
        }
        p { margin: 10px 0; }
        .endpoint {
            margin-bottom: 50px;
            padding: 20px;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            position: relative;
        }
        .method {
            font-weight: bold;
            color: #2f855a;
            padding: 2px 8px;
            background: #e6fffa;
            border-radius: 4px;
        }
        .endpoint-path {
            color: #9f7aea;
            background: #f7fafc;
            padding: 2px 6px;
            border-radius: 4px;
        }
        pre {
            background: #1a202c;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 0.95em;
        }
        code {
            font-family: 'Fira Code', Consolas, monospace;
        }
        pre code .key { color: #63b3ed; }
        pre code .string { color: #68d391; }
        pre code .number { color: #ed8936; }
        pre code .bracket { color: #e2e8f0; }
        pre code .command { color: #e2e8f0; }
        pre code .option { color: #ed8936; }
        pre code .url { color: #63b3ed; }
        .usage {
            font-weight: 500;
            color: #4a5568;
            display: inline-block;
            margin-right: 10px;
        }
        .copy-button {
            position: sticky;
            top: 10px;
            display: inline-block;
            padding: 6px 12px;
            background: rgba(74, 85, 104, 0.7);
            color: #ffffff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
            transition: background 0.2s;
            z-index: 10;
        }
        .copy-button:hover {
            background: rgba(113, 128, 150, 0.7);
        }
    </style>
</head>
<body>
    <h1>Unofficial Pornhub API Documentation</h1>
    <p>Welcome to the API docs! Below are all endpoints as of March 19, 2025. Built with grit and chill vibes.</p>

    <div class="endpoint">
        <h2>1. Root Endpoint</h2>
        <p><span class="method">GET</span> <code class="endpoint-path">/api/</code></p>
        <p>Returns a welcome message for the API.</p>
        <p class="usage">Usage:</p><button class="copy-button" onclick="copyToClipboard('curl https://node-1-sync.obj3ct32.com:8443/api/')">Copy</button>
        <pre><code><span class="command">curl</span> <span class="url">https://node-1-sync.obj3ct32.com:8443/api/</span></code></pre>
        <p class="usage">Response:</p>
        <pre><code class="json">
<span class="bracket">{</span>
  <span class="key">"message"</span>: <span class="string">"Welcome to the Unofficial Pornhub API"</span>
<span class="bracket">}</span>
        </code></pre>
    </div>

    <div class="endpoint">
        <h2>2. Get Trending Videos</h2>
        <p><span class="method">GET</span> <code class="endpoint-path">/api/trending</code></p>
        <p>Fetches up to 10 trending video IDs from Pornhub.</p>
        <p class="usage">Usage:</p><button class="copy-button" onclick="copyToClipboard('curl https://node-1-sync.obj3ct32.com:8443/api/trending')">Copy</button>
        <pre><code><span class="command">curl</span> <span class="url">https://node-1-sync.obj3ct32.com:8443/api/trending</span></code></pre>
        <p class="usage">Response:</p>
        <pre><code class="json">
<span class="bracket">{</span>
  <span class="key">"trending"</span>: <span class="bracket">[</span><span class="string">"ph5d6402c66bf90"</span>, <span class="string">"ph123456789abcd"</span>, ...<span class="bracket">]</span>
<span class="bracket">}</span>
        </code></pre>
    </div>

    <div class="endpoint">
        <h2>3. Get Random Video</h2>
        <p><span class="method">GET</span> <code class="endpoint-path">/api/random</code></p>
        <p>Fetches a single random video ID from Pornhub’s video page.</p>
        <p class="usage">Usage:</p><button class="copy-button" onclick="copyToClipboard('curl https://node-1-sync.obj3ct32.com:8443/api/random')">Copy</button>
        <pre><code><span class="command">curl</span> <span class="url">https://node-1-sync.obj3ct32.com:8443/api/random</span></code></pre>
        <p class="usage">Response:</p>
        <pre><code class="json">
<span class="bracket">{</span>
  <span class="key">"randomVideo"</span>: <span class="string">"ph5d6402c66bf90"</span>
<span class="bracket">}</span>
        </code></pre>
    </div>

    <div class="endpoint">
        <h2>4. Get Categories</h2>
        <p><span class="method">GET</span> <code class="endpoint-path">/api/categories</code></p>
        <p>Lists all Pornhub categories with their names and IDs.</p>
        <p class="usage">Usage:</p><button class="copy-button" onclick="copyToClipboard('curl https://node-1-sync.obj3ct32.com:8443/api/categories')">Copy</button>
        <pre><code><span class="command">curl</span> <span class="url">https://node-1-sync.obj3ct32.com:8443/api/categories</span></code></pre>
        <p class="usage">Response:</p>
        <pre><code class="json">
<span class="bracket">{</span>
  <span class="key">"categories"</span>: <span class="bracket">[</span>
    <span class="bracket">{</span> <span class="key">"name"</span>: <span class="string">"amateur"</span>, <span class="key">"id"</span>: <span class="string">"1"</span> <span class="bracket">}</span>,
    <span class="bracket">{</span> <span class="key">"name"</span>: <span class="string">"anal"</span>, <span class="key">"id"</span>: <span class="string">"2"</span> <span class="bracket">}</span>,
    ...
  <span class="bracket">]</span>
<span class="bracket">}</span>
        </code></pre>
    </div>

    <div class="endpoint">
        <h2>5. Get Video Details</h2>
        <p><span class="method">GET</span> <code class="endpoint-path">/api/video/:id</code></p>
        <p>Fetches metadata (title, URL, length, thumbnail) for a specific video ID.</p>
        <p class="usage">Usage:</p><button class="copy-button" onclick="copyToClipboard('curl https://node-1-sync.obj3ct32.com:8443/api/video/ph5d6402c66bf90')">Copy</button>
        <pre><code><span class="command">curl</span> <span class="url">https://node-1-sync.obj3ct32.com:8443/api/video/ph5d6402c66bf90</span></code></pre>
        <p class="usage">Response:</p>
        <pre><code class="json">
<span class="bracket">{</span>
  <span class="key">"video_id"</span>: <span class="string">"ph5d6402c66bf90"</span>,
  <span class="key">"title"</span>: <span class="string">"Example Video Title"</span>,
  <span class="key">"url"</span>: <span class="string">"https://www.pornhub.com/view_video.php?viewkey=ph5d6402c66bf90"</span>,
  <span class="key">"length"</span>: <span class="string">"22:15"</span>,
  <span class="key">"thumbnail"</span>: <span class="string">"https://example.com/thumb.jpg"</span>
<span class="bracket">}</span>
        </code></pre>
    </div>

    <div class="endpoint">
        <h2>6. Download Video</h2>
        <p><span class="method">GET</span> <code class="endpoint-path">/api/download/:id</code></p>
        <p>Streams an MP4 video for a given video ID using a custom API.</p>
        <p class="usage">Usage:</p><button class="copy-button" onclick="copyToClipboard('curl -o video.mp4 https://node-1-sync.obj3ct32.com:8443/api/download/ph5d6402c66bf90')">Copy</button>
        <pre><code><span class="command">curl</span> <span class="option">-o video.mp4</span> <span class="url">https://node-1-sync.obj3ct32.com:8443/api/download/ph5d6402c66bf90</span></code></pre>
        <p class="usage">Response:</p>
        <pre><code>Streams MP4 content (e.g., 252MB file)</code></pre>
    </div>

    <div class="endpoint">
        <h2>7. Get Pornstar Videos</h2>
        <p><span class="method">GET</span> <code class="endpoint-path">/api/pornstar/:name?</code></p>
        <p>Fetches videos for a specific pornstar by name (optional param; omit for all pornstars).</p>
        <p class="usage">Usage:</p><button class="copy-button" onclick="copyToClipboard('curl https://node-1-sync.obj3ct32.com:8443/api/pornstar/riley-reid')">Copy</button>
        <pre><code><span class="command">curl</span> <span class="url">https://node-1-sync.obj3ct32.com:8443/api/pornstar/riley-reid</span></code></pre>
        <p class="usage">Response:</p>
        <pre><code class="json">
<span class="bracket">{</span>
  <span class="key">"pornstar"</span>: <span class="string">"riley-reid"</span>,
  <span class="key">"videos"</span>: <span class="bracket">[</span><span class="string">"ph5d6402c66bf90"</span>, <span class="string">"ph123456789abcd"</span>, ...<span class="bracket">]</span>
<span class="bracket">}</span>
        </code></pre>
    </div>

    <div class="endpoint">
        <h2>8. Get Studios</h2>
        <p><span class="method">GET</span> <code class="endpoint-path">/api/studios</code></p>
        <p>Lists all Pornhub studios.</p>
        <p class="usage">Usage:</p><button class="copy-button" onclick="copyToClipboard('curl https://node-1-sync.obj3ct32.com:8443/api/studios')">Copy</button>
        <pre><code><span class="command">curl</span> <span class="url">https://node-1-sync.obj3ct32.com:8443/api/studios</span></code></pre>
        <p class="usage">Response:</p>
        <pre><code class="json">
<span class="bracket">{</span>
  <span class="key">"studios"</span>: <span class="bracket">[</span>
    <span class="bracket">{</span> <span class="key">"name"</span>: <span class="string">"brazzers"</span>, <span class="key">"id"</span>: <span class="string">"1"</span> <span class="bracket">}</span>,
    <span class="bracket">{</span> <span class="key">"name"</span>: <span class="string">"reality-kings"</span>, <span class="key">"id"</span>: <span class="string">"2"</span> <span class="bracket">}</span>,
    ...
  <span class="bracket">]</span>
<span class="bracket">}</span>
        </code></pre>
    </div>

    <div class="endpoint">
        <h2>9. Get Studio Videos</h2>
        <p><span class="method">GET</span> <code class="endpoint-path">/api/studio/:name</code></p>
        <p>Fetches videos for a specific studio by name.</p>
        <p class="usage">Usage:</p><button class="copy-button" onclick="copyToClipboard('curl https://node-1-sync.obj3ct32.com:8443/api/studio/brazzers')">Copy</button>
        <pre><code><span class="command">curl</span> <span class="url">https://node-1-sync.obj3ct32.com:8443/api/studio/brazzers</span></code></pre>
        <p class="usage">Response:</p>
        <pre><code class="json">
<span class="bracket">{</span>
  <span class="key">"studio"</span>: <span class="string">"brazzers"</span>,
  <span class="key">"videos"</span>: <span class="bracket">[</span><span class="string">"ph5d6402c66bf90"</span>, <span class="string">"ph123456789abcd"</span>, ...<span class="bracket">]</span>
<span class="bracket">}</span>
        </code></pre>
    </div>

    <div class="endpoint">
        <h2>10. Get Category Videos</h2>
        <p><span class="method">GET</span> <code class="endpoint-path">/api/category/:name</code></p>
        <p>Fetches up to 20 video IDs for a specific category (use hyphenated names from /api/categories).</p>
        <p class="usage">Usage:</p><button class="copy-button" onclick="copyToClipboard('curl https://node-1-sync.obj3ct32.com:8443/api/category/amateur')">Copy</button>
        <pre><code><span class="command">curl</span> <span class="url">https://node-1-sync.obj3ct32.com:8443/api/category/amateur</span></code></pre>
        <p class="usage">Response:</p>
        <pre><code class="json">
<span class="bracket">{</span>
  <span class="key">"category"</span>: <span class="string">"amateur"</span>,
  <span class="key">"videos"</span>: <span class="bracket">[</span><span class="string">"ph5d6402c66bf90"</span>, <span class="string">"ph123456789abcd"</span>, ...<span class="bracket">]</span>
<span class="bracket">}</span>
        </code></pre>
    </div>

    <div class="endpoint">
        <h2>11. Check API Status</h2>
        <p><span class="method">POST</span> <code class="endpoint-path">/api/status</code></p>
        <p>Checks if the API server is online and returns basic status info.</p>
        <p class="usage">Usage:</p><button class="copy-button" onclick="copyToClipboard('curl -X POST https://node-1-sync.obj3ct32.com:8443/api/status')">Copy</button>
        <pre><code><span class="command">curl</span> <span class="option">-X POST</span> <span class="url">https://node-1-sync.obj3ct32.com:8443/api/status</span></code></pre>
        <p class="usage">Response:</p>
        <pre><code class="json">
<span class="bracket">{</span>
  <span class="key">"status"</span>: <span class="string">"online"</span>,
  <span class="key">"timestamp"</span>: <span class="string">"2025-03-19T12:00:00.000Z"</span>,
  <span class="key">"uptime"</span>: <span class="number">1234.56</span>
<span class="bracket">}</span>
        </code></pre>
    </div>

    <div class="endpoint">
        <h2>12. API Documentation</h2>
        <p><span class="method">GET</span> <code class="endpoint-path">/api/docs</code></p>
        <p>Displays this documentation page.</p>
        <p class="usage">Usage:</p><button class="copy-button" onclick="copyToClipboard('curl https://node-1-sync.obj3ct32.com:8443/api/docs')">Copy</button>
        <pre><code><span class="command">curl</span> <span class="url">https://node-1-sync.obj3ct32.com:8443/api/docs</span></code></pre>
        <p class="usage">Response:</p>
        <pre><code>This HTML page</code></pre>
    </div>

    <script>
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Command copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        }
    </script>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(docsHtml);
};
module.exports = {
    getTrendingVideos,
    getRandomVideo,
    getCategories,
    getVideoDetails,
    downloadVideo,
    getCategoryVideos,
    getApiDocs
};