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
  , winston = require('winston')
  , template = require('./routes/template')
  , mongoImage = require('./routes/mongo-image')
  , async = require('async')
  , fs = require('fs')
  , favicon = require('serve-favicon' )
  , util = require('util')
  , session = require('express-session')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , logger = require('morgan')
  , methodOverride = require('method-override')
  , errorHandler = require('errorhandler')
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

// Create Express 4 app to configure.
var app = express();

// Use Jade as our templating engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// all environments
app.set('port', process.env.PORT || 3000);

var rootUrl = 'http://localhost:' + app.get('port');
if (process.env.DEPLOYMENT === 'production') {
    rootUrl = 'http://ximera.osu.edu';
}

// Temporarily use NGROK for the server
rootUrl = 'http://497a6980.ngrok.com';

// Common mongodb initializer for the app server and the activity service
mdb.initialize(function (err) {
});

app.use(logger('dev'));
app.use(favicon(path.join(__dirname, 'public/images/icons/favicon/favicon.ico')));

app.use(function(req, res, next) {
    req.rawBody = '';
    
    req.on('data', function(chunk) { 
	req.rawBody += chunk;
    });
    
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride());

cookieSecret = process.env.XIMERA_COOKIE_SECRET;

app.use(cookieParser(cookieSecret));

// Store session data in the mongo database; this is needed if we're
// going to have multiple web servers sharing a single db
var MongoStore = require('connect-mongo')(session);

var theSession = session({
    secret: cookieSecret,
    resave: false,
    saveUninitialized: false,
    db: new MongoStore({ mongooseConnection: mongoose.connection })
});

app.use(theSession);

// setup ANOTHER connection to the mongo database (maybe you are upset
// that I have two connections to mongodb, but it seems like this is
// the easiest way to use both mongoose for our models and
// connect-mongo for sessions).
var databaseUrl = 'mongodb://' + process.env.XIMERA_MONGO_URL + "/" + process.env.XIMERA_MONGO_DATABASE;
var collections = ['users', 'scopes', 'imageFiles'];
var mongojs = require('mongojs');
var db = mongojs(databaseUrl, collections);

passport.use(login.googleStrategy(rootUrl));
passport.use(login.twitterStrategy(rootUrl));
passport.use(login.courseraStrategy(rootUrl));
passport.use(login.ltiStrategy(rootUrl));
passport.use(login.githubStrategy(rootUrl));

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

    app.locals.versionPath = versionator.versionPath;

    console.log( versionator.versionPath('/template/test') );

    app.use(passport.initialize());
    app.use(passport.session());

    app.use(login.guestUserMiddleware);
    app.use(addDatabaseMiddleware);

    
    // Middleware for development only
    if ('development' == app.get('env')) {
        app.use(errorHandler());
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

    app.get('/users/', user.getCurrent);
    //app.get('/users/profile', user.currentProfile);
    //app.get('/users/:id/profile', user.profile);
    app.get('/users/:id', user.get);
    app.put('/users/:id', user.put);

    app.delete('/users/:id/google', function( req, res ) { user.deleteLinkedAccount( req, res, 'google' ); } );
    app.delete('/users/:id/coursera', function( req, res ) { user.deleteLinkedAccount( req, res, 'coursera' ); } );
    app.delete('/users/:id/github', function( req, res ) { user.deleteLinkedAccount( req, res, 'github' ); } );
    app.delete('/users/:id/twitter', function( req, res ) { user.deleteLinkedAccount( req, res, 'twitter' ); } );
    
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
    app.get( '/course/:username/:repository/:branch/:path(*.tex)', course.source );
    app.get( '/course/:username/:repository/:branch/:path(*.png)', course.image );
    app.get( '/course/:username/:repository/:branch/:path(*.pdf)', course.image );
    app.get( '/course/:username/:repository/:branch/:path(*.svg)', course.image );
    app.get( '/course/:username/:repository/:branch/:path(*.css)', course.stylesheet );
    app.get( '/course/:username/:repository/:branch/:path(*.js)', course.javascript );
    app.get( '/course/:username/:repository/:branch/:path(*)', course.activity );
    
    //app.get(/^\/course\/(.+)\/activity\/(.+)\/update\/$/, course.activityUpdate);
    //app.get(/^\/course\/(.+)\/activity\/(.+)\/source\/$/, course.activitySource);
    //app.get(/^\/course\/(.+)\/activity\/(.+)\/$/, course.activity );
    //app.get( /^\/course\/(.+)\/activity\/(.+)$/, function( req, res ) { res.redirect(req.url + '/'); });
    //app.get(/^\/course\/(.+)\/$/, course.landing );
    //app.get( /^\/course\/(.+)$/, function( req, res ) { res.redirect(req.url + '/'); });
    
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
    app.get('/auth/google', passport.authenticate('google-openidconnect'));
    app.get('/auth/google/callback',
            passport.authenticate('google-openidconnect', { successRedirect: '/just-logged-in',
							    failureRedirect: '/auth/google'}));

    // Twitter login.
    app.get('/auth/twitter', passport.authenticate('twitter'));
    app.get('/auth/twitter/callback',
            passport.authenticate('twitter', { successRedirect: '/just-logged-in',
					       failureRedirect: '/auth/twitter'}));    

    // GitHub login.
    app.get('/auth/github', passport.authenticate('oauth2'));
    app.get('/auth/github/callback',
            passport.authenticate('oauth2', { successRedirect: '/just-logged-in',
				              failureRedirect: '/',
					      failureFlash: true}));

    // LTI login
    app.post('/lti', passport.authenticate('lti', { successRedirect: '/just-logged-in',
						    failureRedirect: '/'}));

    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    app.get('/just-logged-in', function (req, res) {
        if (req.user.lastUrlVisited && (req.user.lastUrlVisited != "/")) {
	    console.log( "lastUrlVisited = ", req.user.lastUrlVisited);
            res.redirect(req.user.lastUrlVisited);
        }
        else {
            if (req.user.course) {
		console.log( "course = ", req.user.course);
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

    app.get('/template/:templateFile', template.renderTemplate);
    app.get('/template/forum/:templateFile', template.renderForumTemplate);

    var state = require('./routes/state.js')(null);    
    app.get('/state/:activityHash', state.get);
    app.put('/state/:activityHash', state.put);
    app.delete('/state/:activityHash', state.remove);    	
    
    app.get('/image/:hash', mongoImage.get);


    app.locals.moment = require('moment');
    app.locals._ = require('underscore');
    app.locals.deployment = process.env.DEPLOYMENT;

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

	var ios = require('socket.io-express-session');
	var io = require('socket.io')(server);
	io.use(ios(theSession, cookieParser(cookieSecret)));
	
	// Setup forum rooms
	/*
	var forum = require('./routes/forum.js')(socket);
	app.post('/forum/upvote/:post', forum.upvote);
	app.post('/forum/flag/:post', forum.flag);
	app.get(/\/forum\/(.+)/, forum.get);
	app.post(/\/forum\/(.+)/, forum.post);
	app.put('/forum/:post', forum.put);
	app.delete('/forum/:post', forum.delete);
	*/

        server.listen(app.get('port'), function(stream){
	    console.log('Express server listening on port ' + app.get('port'));
        });	
	
	io.on('connection', function (socket) {
	    // join to room and save the room name
	    socket.on('join room', function (room) {
		socket.join(room);
	    });
	    
	    socket.on('send', function (data) {
		socket.sockets.emit('message', data);
	    });

	    socket.on('activity', function (activityHash) {
		var userId = socket.handshake.session.guestUserId;
		if (socket.handshake.session.passport) {
		    userId = socket.handshake.session.passport.userId || userId;
		}
		socket.join(activityHash + '/' + userId);
	    });
	    
	    socket.on('persistent-data', function (data) {
		var userId = socket.handshake.session.guestUserId;
		if (socket.handshake.session.passport) {
		    userId = socket.handshake.session.passport.userId || userId;
		}
		
		if (socket.handshake.session.userdata)
		    socket.handshake.session.userdata = socket.handshake.session.userdata + 1;
		else
		    socket.handshake.session.userdata = 0;

		socket.to(data.activityHash + '/' + userId).emit('persistent-data', data);
	    });
	});
	
	// If nothing else matches, it is a 404
	app.use(function(req, res, next){
            res.render('404', { status: 404, url: req.url });
	});
	
    });
    
});
