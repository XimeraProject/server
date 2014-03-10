var remember = require('../remember');


/*
 * GET home page.
 */

exports.index = function(req, res){
    remember(req);
    res.render('index', { title: 'Home' });
};
