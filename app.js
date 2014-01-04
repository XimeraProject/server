
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , activity = require('./routes/activity')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , mdb = require("./mdb");

var app = express();

mdb.initialize();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/activities', activity.list);
app.get('/activity/:id', activity.display);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
