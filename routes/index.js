var express = require('express');
var router = express.Router();

var match_statistics = require('../controllers/matchStatistics');

router.get('/', match_statistics.stats)

module.exports = router;
