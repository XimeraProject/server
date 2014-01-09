exports.renderTemplate = function(req, res){
    res.render("templates/" + req.params.templateFile);
};