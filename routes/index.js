var express = require('express');
var router = express.Router();

var match_statistics = require('../controllers/matchStatistics');

router.get('/stats', match_statistics.stats)

module.exports = router;
