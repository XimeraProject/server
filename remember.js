module.exports = function (req) {
    // BADBAD: Does this cause terrible race conditions?
    if (req.user) {
	req.user.lastUrlVisited = req.url;
	req.user.lastSeen = new Date();
	req.user.save();
    }
};

