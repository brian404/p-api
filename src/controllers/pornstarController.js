const axios = require('axios');
const cheerio = require('cheerio');
const getPornstarVideos = async (req, res) => {
    try {
        if (!req.params.name) {
            const url = 'https://www.pornhub.com/pornstars';
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
            });
            const $ = cheerio.load(data);
            let topPornstars = new Set();

            const selectors = [
                '#trendingPornstarsSection .pornstarCard a',
                '#verifiedPornstarSection .pornstarCard a',
                '.pornstarCard a',
                'a[href*="/pornstar/"]'
            ];

            selectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const name = $(element).text().trim();
                    
                    if (name && 
                        name.length > 2 && 
                        !/^\d+$/.test(name) && 
                        !name.toLowerCase().includes('pornstar') && 
                        !name.toLowerCase().includes('video') && 
                        !name.toLowerCase().includes('verified') && 
                        !name.toLowerCase().includes('trending')) {
                        topPornstars.add(name);
                    }
                });
            });

            // Limit 20
            const limitedPornstars = [...topPornstars].slice(0, 20);

            if (limitedPornstars.length === 0) {
                console.log('No pornstar names found with any selectors');
            } else {
                console.log('Final pornstar list:', limitedPornstars);
            }

            res.json({ topPornstars: limitedPornstars });
        } else {
            
            const pornstar = req.params.name.toLowerCase().replace(/\s+/g, '-');
            const url = `https://www.pornhub.com/pornstar/${pornstar}`;
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
            });
            const $ = cheerio.load(data);
            let videoIds = new Set();

            $('a[href^="/view_video.php?viewkey="]').each((index, element) => {
                let videoKey = $(element).attr('href').match(/viewkey=([^&]+)/);
                if (videoKey && videoKey[1]) {
                    videoIds.add(videoKey[1]);
                }
                if (videoIds.size >= 10) return false;
            });

            res.json({ pornstar, results: [...videoIds] });
        }
    } catch (error) {
        console.error(`Error in pornstar endpoint for ${req.params.name || 'top 20'}:`, error.message);
        res.status(500).json({ error: 'Failed to fetch pornstar data' });
    }
};

module.exports = { getPornstarVideos };
