module.exports = function (req) {
    // Does this cause terrible race conditions?
    req.user.lastUrlVisited = req.url;
    req.user.save();
};

