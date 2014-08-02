module.exports = function (req) {
    // Does this cause terrible race conditions?
    if (req.user) {
	req.user.lastUrlVisited = req.url;
	req.user.save();
    }
};

