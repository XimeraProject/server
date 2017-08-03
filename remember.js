module.exports = function (req, res, next) {
    // BADBAD: Does this cause terrible race conditions?  Why would it?
    if (req.user) {
	req.user.lastUrlVisited = req.url;
	req.user.lastSeen = new Date();
	req.user.save();
    }
    next();
};

