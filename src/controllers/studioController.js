const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetch studios
 */
const getStudios = async (req, res) => {
    try {
        const url = 'https://www.pornhub.com/channels';
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const $ = cheerio.load(data);
        let studios = new Set();

        $('a[href*="/channels/"]').each((index, element) => {
            const name = $(element).text().trim();
            const href = $(element).attr('href');
            if (name && 
                name.length > 2 && 
                href && 
                href.startsWith('/channels/') && 
                !name.toLowerCase().includes('channel') && 
                !name.toLowerCase().includes('porn') && 
                !name.toLowerCase().includes('video') && 
                !name.toLowerCase().includes('rank') && 
                !/^\d+$/.test(name)) {
                console.log(`Found studio: "${name}"`);
                studios.add(name);
            }
        });

        const limitedStudios = [...studios].slice(0, 20);

        if (limitedStudios.length === 0) {
            console.log('No studios found on /channels page');
        } else {
            console.log('Final studio list:', limitedStudios);
        }

        res.json({ studios: limitedStudios });
    } catch (error) {
        console.error('Error fetching studios:', error.message);
        res.status(500).json({ error: 'Failed to fetch studios' });
    }
};

const getStudioVideos = async (req, res) => {
    try {
        const studioName = req.params.name.toLowerCase().replace(/\s+/g, '-');
        const url = `https://www.pornhub.com/channels/${studioName}`;
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
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
            console.log(`No videos found for studio: ${studioName}`);
            return res.status(404).json({ error: 'No videos found for this studio' });
        }

        res.json({ studio: studioName, videos: [...videoIds] });
    } catch (error) {
        console.error(`Error fetching videos for studio ${studioName}:`, error.message);
        res.status(500).json({ error: 'Failed to fetch studio videos' });
    }
};

module.exports = { getStudios, getStudioVideos };
