/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , activity = require('./routes/activity')
  , course = require('./routes/course')
  , user = require('./routes/user')
  , about = require('./routes/about')
  , score = require('./routes/score')
  , github = require('./routes/github')
  , instructor = require('./routes/instructor')
  , http = require('http')
  , path = require('path')
  , mdb = require('./mdb')
  , login = require('./login')
  , less = require('less-middleware')
  , passport = require('passport')
  , mongo = require('mongodb')
  , mongoose = require('mongoose')
  , http = require('http')
  , path = require('path')
  , angularState = require('./routes/angular-state')
  , winston = require('winston')
  , template = require('./routes/template')
  , mongoImage = require('./routes/mongo-image')
  , async = require('async')
  , fs = require('fs')
  , io = require('socket.io')
  , util = require('util')
  ;

// Check for presence of appropriate environment variables.
if (!process.env.XIMERA_COOKIE_SECRET ||
    !process.env.XIMERA_MONGO_DATABASE ||
    !process.env.XIMERA_MONGO_URL ||
    !process.env.COURSERA_CONSUMER_KEY ||
    !process.env.GITHUB_WEBHOOK_SECRET ||
    !process.env.COURSERA_CONSUMER_SECRET) {
        throw "Appropriate environment variables not set.";
    }

// Some filters for Jade; admittedly, Jade comes with its own Markdown
// filter, but I want to run everything through the a filter to add
// links to Ximera
var jade = require('jade');
var md = require("markdown");
jade.filters.ximera = function(str){
    return str
	.replace(/Ximera/g, '<a class="ximera" href="/">Ximera</a>')
	.replace(/---/g, '&mdash;')
	.replace(/--/g, '&ndash;')
    ;
};
jade.filters.markdown = function(str){
    return jade.filters.ximera(md.parse(str));
};

// Create express app to configure.
var app = express();


app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// all environments
app.set('port', process.env.PORT || 3000);

var rootUrl = 'http://127.0.0.1:' + app.get('port');
if (process.env.DEPLOYMENT === 'production') {
    rootUrl = 'http://ximera.osu.edu';
}

// Common mongodb initializer for the app server and the activity service
mdb.initialize();

// Store session data in the mongo database; this is needed if we're
// going to have multiple web servers sharing a single db
var MongoStore = require('connect-mongo')(express);

// setup ANOTHER connection to the mongo database (maybe you are upset
// that I have two connections to mongodb, but it seems like this is
// the easiest way to use both mongoose for our models and
// connect-mongo for sessions).
var databaseUrl = 'mongodb://' + process.env.XIMERA_MONGO_URL + "/" + process.env.XIMERA_MONGO_DATABASE;
var collections = ['users', 'scopes', 'imageFiles'];
var db = require('mongojs').connect(databaseUrl, collections);

passport.use(login.googleStrategy(rootUrl));
passport.use(login.courseraStrategy(rootUrl));
passport.use(login.ltiStrategy(rootUrl));
// Only store the user _id in the session
passport.serializeUser(function(user, done) {
   done(null, user._id);
});
passport.deserializeUser(function(id, done) {
   mdb.User.findOne({_id: new mongo.ObjectID(id)}, function(err,document) {
       done(err, document);
   });
});

// Middleware for all environments
function addDatabaseMiddleware(req, res, next) {
    req.db = db;

    if ('user' in req)
	res.locals.user = req.user;
    else {
	res.locals.user = req.user = {};
    }
    
    next();
}

////////////////////////////////////////////////////////////////
// Less Middleware
var bootstrapPath = path.join(__dirname, 'components', 'bootstrap');
app.use(less({
    src    : path.join(__dirname, 'public', 'stylesheets'),
    prefix   : '/public/stylesheets',
    paths  : [path.join(bootstrapPath, 'less')],
    dest   : path.join(__dirname, 'public', 'stylesheets'),
    force  : true
}));

var git = require('git-rev');
git.long(function (commit) {

    // versionator
    app.version = require('./package.json').version;
    var versionator = require('versionator').create(commit);

    app.use(versionator.middleware);
    app.use('/public', express.static(path.join(__dirname, 'public')));
    app.use('/components', express.static(path.join(__dirname, 'components')));

    app.locals({
	versionPath: versionator.versionPath,
    });

    console.log( versionator.versionPath('/template/test') );

    app.use(express.favicon(path.join(__dirname, 'public/images/icons/favicon/favicon.ico')));
    app.use(express.logger('dev'));

    app.use(function(req, res, next) {
	req.rawBody = '';
	
	req.on('data', function(chunk) { 
	    req.rawBody += chunk;
	});
	
	next();
    });

    app.use(express.bodyParser());
    app.use(express.methodOverride());

    cookieSecret = process.env.XIMERA_COOKIE_SECRET;

    app.use(express.cookieParser(cookieSecret));
    app.use(express.session({
	secret: cookieSecret,
	store: new MongoStore({
	    db: mongoose.connections[0].db
	})
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.use(login.guestUserMiddleware);
    app.use(addDatabaseMiddleware);

    app.use(app.router);

    app.use(function(req, res, next){
        res.render('404', { status: 404, url: req.url });
    });

    // Middleware for development only
    if ('development' == app.get('env')) {
        app.use(express.errorHandler());
    }

    // Setup routes.

    // TODO: Move to separate file.
    app.get('/users/xarma', score.getXarma);
    app.get('/users/xudos', score.getXudos);
    app.post('/users/xarma', score.postXarma);
    app.post('/users/xudos', score.postXudos);

    // Requires the rawBody middleware above
    github.secret = process.env.GITHUB_WEBHOOK_SECRET;
    app.post('/github', github.github);

    app.get('/', routes.index);

    app.post('/activity/log-answer', activity.logAnswer);
    app.post('/activity/log-completion', activity.logCompletion);
    app.get('/users/completion', activity.completion);

    app.put('/users/', user.put);
    app.get('/users/', user.getCurrent);
    //app.get('/users/profile', user.currentProfile);
    //app.get('/users/:id/profile', user.profile);
    app.get('/users/:id', user.get);

    app.get( '/course/calculus-one/', function( req, res ) { res.redirect('/about/plans'); });
    app.get( '/course/calculus-one', function( req, res ) { res.redirect('/about/plans'); });
    app.get( '/course/calculus-two/', function( req, res ) { res.redirect('/about/plans'); });
    app.get( '/course/calculus-two', function( req, res ) { res.redirect('/about/plans'); });
    app.get( '/course/multivariable/', function( req, res ) { res.redirect('/about/m2o2c2'); });
    app.get( '/course/multivariable', function( req, res ) { res.redirect('/about/m2o2c2'); });

    app.get('/course/', course.index );
    app.get( '/course', function( req, res ) { res.redirect(req.url + '/'); });
    app.get( '/courses', function( req, res ) { res.redirect('/course/'); });
    app.get( '/courses/', function( req, res ) { res.redirect('/course/'); });
    app.get(/^\/course\/(.+)\/activity\/(.+)\/update\/$/, course.activityUpdate);
    app.get(/^\/course\/(.+)\/activity\/(.+)\/source\/$/, course.activitySource);
    app.get(/^\/course\/(.+)\/activity\/(.+)\/$/, course.activity );
    app.get( /^\/course\/(.+)\/activity\/(.+)$/, function( req, res ) { res.redirect(req.url + '/'); });
    app.get(/^\/course\/(.+)\/$/, course.landing );
    app.get( /^\/course\/(.+)$/, function( req, res ) { res.redirect(req.url + '/'); });

    // Instructor paths
    app.get(/^\/instructor\/course\/(.+)\/activity\/(.+)\/$/, instructor.instructorActivity );
    app.get('/instructor/activity-analytics/:id', instructor.activityAnalytics);

    // Coursera login.
    app.get('/auth/coursera',
            passport.authenticate('oauth'));
    app.get('/auth/coursera/callback',
            passport.authenticate('oauth', { successRedirect: '/just-logged-in',
                                   failureRedirect: '/auth/coursera'}));

    // Google login.
    app.get('/auth/google', passport.authenticate('google'));
    app.get('/auth/google/return',
            passport.authenticate('google', { successRedirect: '/just-logged-in',
				              failureRedirect: '/auth/google'}));

    // LTI login
    app.post('/lti', passport.authenticate('lti', { successRedirect: '/just-logged-in',
						    failureRedirect: '/'}));

    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    app.get('/just-logged-in', function (req, res) {
        if (req.user.lastUrlVisited) {
            res.redirect(req.user.lastUrlVisited);
        }
        else {
            if (req.user.course) {
		res.redirect( '/course/' + req.user.course +  '/course/' );
	    } else {
		res.redirect('/');
	    }
        }
    });

    app.get('/mailing-list', function( req, res ) {
        fs.appendFile( 'emails.txt', req.query['email'] + "\n", function(err) { return; });
        res.send(200);
    });

    app.get('/about', about.index);
    app.get('/about/team', about.team);
    app.get('/about/workshop', about.workshop);
    app.get('/about/contact', about.contact);
    app.get('/about/faq', about.faq);
    app.get('/about/who', about.who);
    app.get('/about/plans', about.plans);
    app.get('/about/xarma', about.xarma);
    app.get('/about/xudos', about.xudos);
    app.get('/about/m2o2c2', about.m2o2c2);
    app.get('/about/supporters', function( req, res ) { res.redirect('/about/support'); });
    app.get('/about/support', about.support);

    app.get('/angular-state/:activityId', angularState.get);
    app.put('/angular-state/:activityId', angularState.put);

    app.get('/template/:templateFile', template.renderTemplate);
    app.get('/template/forum/:templateFile', template.renderForumTemplate);

    app.get('/image/:hash', mongoImage.get);


    app.locals({
        moment: require('moment'),
        _: require('underscore'),
        deployment: process.env.DEPLOYMENT
    });

    // Setup blogs
    var Poet = require('poet')
    var poet = Poet(app, {
        posts: './blog/',  // Directory of posts
        postsPerPage: 5,     // Posts per page in pagination
        readMoreLink: function (post) {
            // readMoreLink is a function that
            // takes the post object and formats an anchor
            // to be used to append to a post's preview blurb
            // and returns the anchor text string
            return '<a href="' + post.url + '">Read More &raquo;</a>';
        },
        readMoreTag: '<!--more-->', // tag used to generate the preview. More in 'preview' section

        routes: {
            '/blog/post/:post': 'blog/post',
            '/blog/page/:page': 'blog/page',
            '/blog/tag/:tag': 'blog/tag',
            '/blog/category/:category': 'blog/category'
        }
    });

    app.get( '/blog', function ( req, res ) { res.render( 'blog/index' ); });

    poet.init().then( function() {
    // Start HTTP server for fully configured express App.
        var server = http.createServer(app);

        server.listen(app.get('port'), function(){
	    console.log('Express server listening on port ' + app.get('port'));
        });

    var socket = io.listen(server); 

    // Setup forum rooms
    var forum = require('./routes/forum.js')(socket);
    app.post('/forum/upvote/:post', forum.upvote);
    app.post('/forum/flag/:post', forum.flag);
    app.get(/\/forum\/(.+)/, forum.get);
    app.post(/\/forum\/(.+)/, forum.post);
    app.put('/forum/:post', forum.put);
    app.delete('/forum/:post', forum.delete);

    socket.on('connection', function (client) {
	// join to room and save the room name
	client.on('join room', function (room) {
            client.join(room);
	});

	client.on('send', function (data) {
            socket.sockets.emit('message', data);
	});
    });
});

});
