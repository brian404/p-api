const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const pornstarController = require('../controllers/pornstarController');
const studioController = require('../controllers/studioController');

router.get('/', (req, res) => res.json({ message: "Welcome to the Unofficial Pornhub API" }));
router.get('/trending', apiController.getTrendingVideos);
router.get('/random', apiController.getRandomVideo);
router.get('/categories', apiController.getCategories);
router.get('/video/:id', apiController.getVideoDetails);
router.get('/download/:id', apiController.downloadVideo);
router.get('/pornstar/:name?', pornstarController.getPornstarVideos);
router.get('/studios', studioController.getStudios);
router.get('/studio/:name', studioController.getStudioVideos);
router.get('/category/:name', apiController.getCategoryVideos);
router.get('/docs', apiController.getApiDocs);
router.post('/status', (req, res) => {
    console.log('Status check received');
    res.status(200).json({
        status: 'online',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;
