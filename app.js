/**
 * Module dependencies.
 */

var express = require('express')
  , course = require('./routes/course')
  , certificate = require('./routes/certificate')
  , user = require('./routes/user')
  , tincan = require('./routes/tincan')
  , http = require('http')
  , path = require('path')
  , mdb = require('./mdb')
  , login = require('./login')
  , passport = require('passport')
  , mongo = require('mongodb')
  , http = require('http')
  , path = require('path')
  , winston = require('winston')
  , gitBackend = require('./routes/git')
  , keyserver = require('./routes/gpg')
  , hashcash = require('./routes/hashcash')
  , async = require('async')
  , fs = require('fs')
  , favicon = require('serve-favicon' )
  , util = require('util')
  , session = require('express-session')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , logger = require('morgan')
  , rateLimit = require('express-rate-limit')
  , methodOverride = require('method-override')
  , errorHandler = require('errorhandler')
  , sendSeekable = require('send-seekable')
  ;

// Check for presence of appropriate environment variables.
if (!process.env.XIMERA_COOKIE_SECRET ||
    !process.env.XIMERA_MONGO_DATABASE ||
    !process.env.XIMERA_MONGO_URL)
{
        throw "Appropriate environment variables not set.";
    }

// Some filters for Jade; admittedly, Jade comes with its own Markdown
// filter, but I want to run everything through a filter to add
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
exports.app = app;

// Because I care about trailing slashes
app.enable('strict routing');

// Use Jade as our templating engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// all environments
app.set('port', process.env.PORT || 3000);

var rootUrl = 'http://localhost:' + app.get('port');
if (process.env.DEPLOYMENT === 'production') {
    rootUrl = 'https://ximera.osu.edu';
} else {
    // Temporarily use NGROK for the server    
    rootUrl = 'http://127.0.0.1:3000';
}
gitBackend.rootUrl = rootUrl;

app.use(logger('dev'));
app.use(favicon(path.join(__dirname, 'public/images/icons/favicon/favicon.ico')));

app.use(function(req, res, next) {
    res.locals.path = req.path;    
    next();
});

app.use(require('./branding').middleware);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride());

cookieSecret = process.env.XIMERA_COOKIE_SECRET;
app.use(cookieParser(cookieSecret));

// Common mongodb initializer for the app server and the activity service
mdb.initialize(function (err) {
    
    // Store session data in the mongo database; this is needed if we're
    // going to have multiple web servers sharing a single db
    var MongoStore = require('connect-mongo')(session);
    
    var theSession = session({
	secret: cookieSecret,
	resave: false,
	saveUninitialized: false,
	store: new MongoStore({ mongooseConnection: mdb.mongoose.connection })
    });
    
    app.use(theSession);

    console.log( "Session setup." );

passport.use(login.localStrategy(rootUrl));
passport.use(login.googleStrategy(rootUrl));
passport.use(login.twitterStrategy(rootUrl));
passport.use('lms', login.lmsStrategy(rootUrl));    
passport.use(login.githubStrategy(rootUrl));

// DEPRECATED LTI
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

function addUserImplicitly(req, res, next) {
    if ('user' in req)
	res.locals.user = req.user;
    else {
	res.locals.user = req.user = {};
    }
    
    next();
}

    app.version = require('./package.json').version;

    ////////////////////////////////////////////////////////////////
    // API endpoints for the xake tool
    
    var limiter = new rateLimit({
	windowMs: 15*60*1000, // 15 minutes 
	max: 100, // limit each IP to 100 requests per windowMs 
	delayMs: 0 // disable delaying - full speed until the max limit is reached 
    });

    app.use( '/gpg/', limiter );
    app.use( '/pks/', limiter );
    app.use( '/:repository.git', limiter );
    
    app.get( '/gpg/token/:keyid', keyserver.token );
    app.get( '/gpg/tokens/:keyid', keyserver.token );
    app.post( '/pks/add', keyserver.add );

    app.post( '/:repository.git', keyserver.authorization );
    app.post( '/:repository.git', hashcash.hashcash );
    app.post( '/:repository.git', gitBackend.create );

    app.use( '/:repository.git/log.sz', gitBackend.authorization );
    app.use( '/:repository.git/log.sz', sendSeekable );
    app.get( '/:repository.git/log.sz', tincan.get );
    
    app.use( '/:repository.git', gitBackend.git );

    ////////////////////////////////////////////////////////////////
    // Static content    
    
    //app.use(versionator.middleware);
    app.use('/public', express.static(path.join(__dirname, 'public')));
    app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
    //app.locals.versionPath = versionator.versionPath;

    app.use(passport.initialize());
    app.use(passport.session());
    
    app.use(login.guestUserMiddleware);
    app.use(addUserImplicitly);
    
    ////////////////////////////////////////////////////////////////
    // Landing page and associated routes
    
    app.get('/install.sh', function(req, res) {
	res.sendFile('views/install.sh', { root: __dirname });
    });

    app.get('/', function(req,res) {
	res.render('index', { title: 'Home', landingPage: true });
    });
    
    ////////////////////////////////////////////////////////////////
    // TinCan (aka Experience) API

    app.post('/xAPI/statements', function(req,res) { res.status(200).send('ignoring statements without a repository.'); } );
    
    app.post('/:repository/xAPI/statements', tincan.postStatements);    
    
    ////////////////////////////////////////////////////////////////
    // User identity
    
    app.get('/users/me', user.getCurrent);
    app.get('/users/:id', user.get);
    app.get('/users/:id/edit', user.edit);
    app.post('/users/:id', user.update);

    app.get('/users/', user.index);
    app.get('/users/page/:page', user.index); // pagination in Mongo is fairly slow
    
    app.delete('/users/:id/google', function( req, res ) { user.deleteLinkedAccount( req, res, 'google' ); } );
    app.delete('/users/:id/github', function( req, res ) { user.deleteLinkedAccount( req, res, 'github' ); } );
    app.delete('/users/:id/twitter', function( req, res ) { user.deleteLinkedAccount( req, res, 'twitter' ); } );

    app.put('/users/:id/secret', function( req, res ) { user.putSecret( req, res ); } );

    ////////////////////////////////////////////////////////////////
    // BADBAD: some permanent redirects for OSU courses from old URLs
    app.get( '/course', function( req, res ) { res.redirect(req.url + '/'); });
    app.get( '/courses', function( req, res ) { res.redirect('/course/'); });
    app.get( '/courses/', function( req, res ) { res.redirect('/course/'); });
    app.get( '/course/mooculus/mooculus/:path(*)', function( req, res ) { 
	res.set( 'location', '/mooculus/calculus1/' + req.params.path );
	res.status(301).send();
    });
    app.get( '/course/mooculus/:path(*)', function( req, res ) { 
	res.set( 'location', '/mooculus/' + req.params.path );
	res.status(301).send();
    });
    app.get( '/course/:path(*)', function( req, res ) { 
	res.set( 'location', '/' + req.params.path );
	res.status(301).send();
    });
    app.get( '/activity/:path(*)', function( req, res ) { 
	res.set( 'location', '/' + req.params.path );
	res.status(301).send();
    });    
    
    app.get( '/certificate/:certificate/:signature', certificate.view );

    // app.get( '/course/:commit([0-9a-fA-F]+)/certificate', course.xourseFromCommit, certificate.xourse );
    // app.get( '/course/:username/:repository/certificate', course.xourseFromUserAndRepo, certificate.xourse );
    // app.get( '/course/:username/:repository/:branch/certificate', course.xourseFromUserAndRepo, certificate.xourse );
    // app.get( '/labels/:commit([0-9a-fA-F]+)/:label', course.getLabel );
    // app.get( '/statistics/:commit/:hash/answers', course.answers );
    // app.get( '/statistics/:commit/:hash/successes', course.successes );
    // app.get( '/progress/:username/:repository', course.progress );    

    ////////////////////////////////////////////////////////////////
    // Logins

    // Google login.
    app.get('/auth/google', passport.authenticate('google-openidconnect'));
    app.get('/auth/google/callback',
            passport.authenticate('google-openidconnect', { successRedirect: '/just-logged-in',
							    failureRedirect: '/auth/google'}));

    // Permit local logins when on a test machine
    if (app.locals.deployment != 'production') {
	app.post('/auth/local', 
		 passport.authenticate('local', { failureRedirect: '/' }),
		 function(req, res) {
		     res.redirect('/');
		 });
    }
    
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
						    failureRedirect: '/about/lti-failed'}));

    app.post('/lms', passport.authenticate('lms', { successRedirect: '/just-logged-in',
						    failureRedirect: '/',
						    failureFlash: true}));
    
    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    app.get('/just-logged-in', function (req, res) {
        if (req.user.course) {
	    console.log( "course = ", req.user.course);
	    res.redirect( req.user.course );
	} else {
	    if (req.user.lastUrlVisited && (req.user.lastUrlVisited != "/") && (!(req.user.lastUrlVisited.match(/\.svg$/)))) {
		console.log( "lastUrlVisited = ", req.user.lastUrlVisited);
		res.redirect(req.user.lastUrlVisited);
	    } else
		res.redirect('/');
	}
    });

    ////////////////////////////////////////////////////////////////
    // State storage    
    
    var state = require('./routes/state.js')(null);
    app.get('/state/:activityHash', state.get);
    app.put('/state/:activityHash', state.put);
    app.delete('/state/:activityHash', state.remove);

    app.put('/completion/:activityHash', state.completion);
    app.get('/users/:id/completions', state.getCompletions);

    ////////////////////////////////////////////////////////////////
    // Activity page rendering

    app.get( '/:repository/:path(*)/certificate',
	     gitBackend.repository,
	     gitBackend.recentCommitsOnMaster,
	     gitBackend.findPossibleActivityFromCommits,
	     gitBackend.chooseMostRecentBlob,
	     gitBackend.render );

    // BADBAD: i also need to serve pngs and pdfs and such from the repo here

    app.get( '/:repository/:path/lti.xml',
	     gitBackend.repository,
	     gitBackend.recentCommitsOnMaster, gitBackend.findPossibleActivityFromCommits,
	     gitBackend.ltiConfig );
    
    var serveContent = function( regexp, callback ) {
	app.get( '/:repository/:path(' + regexp + ')',
	     gitBackend.repository,
		 gitBackend.recentCommitsOnMaster,
		 gitBackend.findPossibleActivityFromCommits,
		 callback );
    };

    serveContent( '*.svg', gitBackend.serve('image/svg+xml') );
    serveContent( '*.png', gitBackend.serve('image/png') );
    serveContent( '*.pdf', gitBackend.serve('image/pdf') );
    serveContent( '*.jpg', gitBackend.serve('image/jpeg') );
    serveContent( '*.js',  gitBackend.serve('text/javascript') );

    app.get( '/:repository/:path(*.tex)',
	     gitBackend.repository,
	     gitBackend.recentCommitsOnMaster, gitBackend.findPossibleActivityFromCommits,
	     gitBackend.source );    
    
    app.get( '/:repository/:path(*)',
	     gitBackend.repository,
	     gitBackend.recentCommitsOnMaster, gitBackend.findPossibleActivityFromCommits,
	     gitBackend.chooseMostRecentBlob,
	     gitBackend.fetchMetadata,	     
	     gitBackend.render );    
    
    // SVG files will only be rendered if they are sent with content type image/svg+xml
    // app.get( '/:repository/:path(*)', gitBackend.repository, gitBackend.publishedCommitOnMaster, gitBackend.getEntry, gitBackend.render );
    
    app.locals.Color = require('color');
    app.locals.moment = require('moment');
    app.locals._ = require('underscore');
    app.locals.deployment = process.env.DEPLOYMENT;
    app.locals.version = app.version;

    // Start HTTP server for fully configured express App.
    var server = http.createServer(app);
    
    var ios = require('socket.io-express-session');
    var io = require('socket.io')(server);
    io.use(ios(theSession, cookieParser(cookieSecret)));
    
    if(!module.parent){
        server.listen(app.get('port'), function(stream){
	    console.log('Express server listening on port ' + app.get('port'));
        });		    
    }
    
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
	
	/*
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
	*/
    });
    
    // If nothing else matches, it is a 404
    app.use(function(req, res, next){
        res.status(404).render('404', { status: 404, url: req.url });
    });

    ////////////////////////////////////////////////////////////////
    // Present errors to the user
    
    if ('development' == app.get('env')) {
	// Middleware for development only
	errorHandler.title = 'Ximera';
        app.use(errorHandler());
    }

    app.use(function(err, req, res, next){
	if (res.headersSent) {
	    return next(err);
	}
	res.status(500).render('500', {
	    message: err
	} );
    });    
});
