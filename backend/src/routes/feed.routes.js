const express = require('express');
const controller = require('../controllers/feed.controller');

const router = express.Router();

router.get('/', controller.getFeeds);
router.post('/', controller.createFeed);

module.exports = router;
