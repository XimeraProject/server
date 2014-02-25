exports.renderTemplate = function(req, res){
    res.render("templates/" + req.params.templateFile);
};

exports.renderForumTemplate = function(req, res){
    res.render("templates/forum/" + req.params.templateFile);
};
