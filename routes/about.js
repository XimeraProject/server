exports.privacy = function(req, res){
    res.render('about/privacy', { title: 'Privacy',  user: req.user });
};

exports.index = function(req, res){
    res.render('about/index', { title: 'About', user: req.user });
};

exports.contact = function(req, res){
    res.render('about/contact', { title: 'Contact', user: req.user });
};

exports.faq = function(req, res){
    res.render('about/faq', { title: 'FAQ', user: req.user });
};
