/**
 * Module dependencies.
 */

var express = require('express')
  , certificate = require('./routes/certificate')
  , user = require('./routes/user')
  , gradebook = require('./routes/gradebook')
  , statistics = require('./routes/statistics')
  , xourses = require('./routes/xourses')
  , instructors = require('./routes/instructors')
  , tincan = require('./routes/tincan')
  , http = require('http')
  , path = require('path')
  , remember = require('./remember')
  , mdb = require('./mdb')
  , config = require('./config')
  , login = require('./login')
  , guests = require('./login/guests')
  , passport = require('passport')
  , mongo = require('mongodb')
  , http = require('http')
  , path = require('path')
  , expressWinston    = require('express-winston')
  , winston = require('winston')
  , repositories = require('./routes/repositories')
  , page = require('./routes/page')
  , keyserver = require('./routes/gpg')
  , hashcash = require('./routes/hashcash')
  , supervising = require('./routes/supervising')
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
  , versionator = require('versionator')
  ;

// Some filters for Pug; admittedly, Pug comes with its own Markdown
// filter, but I want to run everything through a filter to add
// links to Ximera
var pug = require('pug');
var md = require("markdown");
pug.filters.ximera = function(str){
    return str
	.replace(/Ximera/g, '<a class="ximera" href="/">Ximera</a>')
	.replace(/---/g, '&mdash;')
	.replace(/--/g, '&ndash;')
    ;
};
pug.filters.markdown = function(str){
    return pug.filters.ximera(md.parse(str));
};

// Create Express 4 app to configure.
var app = express();
exports.app = app;

// Because I care about trailing slashes
app.enable('strict routing');

// Use Pug as our templating engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// all environments
app.set('port', config.port);

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

app.use(cookieParser(config.session.secret));

// Common mongodb initializer for the app server and the activity service
mdb.initialize(function (err) {
    
    // Store session data in the mongo database; this is needed if we're
    // going to have multiple web servers sharing a single db
    var MongoStore = require('connect-mongo')(session);
    
    var theSession = session({
	secret: config.session.secret,
	resave: false,
	saveUninitialized: false,
	store: new MongoStore({ mongooseConnection: mdb.mongoose.connection })
    });
    
    app.use(theSession);

    console.log( "Session setup." );

    // We may have a default LTI key
    if (config.ltiAuth) {
	mdb.KeyAndSecret.update(
	    {ltiKey: config.lti.key},
	    {ltiKey: config.lti.key, ltiSecret: config.lti.secret},
	    {upsert: true},
	    function(err) {
	    });
    }
    
    if (config.logging) {
	app.use(expressWinston.logger({
	    transports: [
		new winston.transports.Console({
		    json: true,
		    colorize: true
		})	    
	    ],
	    expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
	    colorize: true, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
	}));
    }
    
passport.use(login.localStrategy(config.root));
passport.use(login.googleStrategy(config.root));
passport.use(login.twitterStrategy(config.root));
passport.use('lms', login.lmsStrategy(config.root));    
passport.use(login.githubStrategy(config.root));

// Only store the user _id in the session
passport.serializeUser(function(user, done) {
   done(null, user._id);
});

passport.deserializeUser(function(id, done) {
   mdb.User.findOne({_id: new mongo.ObjectID(id)}, function(err,document) {
       done(err, document);
   });
});

    app.version = require('./package.json').version;

    function redirectUnnormalizeRepositoryName( req, res, next ) {
	if (req.params.repository) {
	    var normalized = req.params.repository.replace( /[^0-9A-Za-z-]/, '' ).toLowerCase();
	    if (req.params.repository != normalized) {
		var splitted = req.url.split('/');
		splitted[1] = normalized;
		res.redirect(301, splitted.join('/'));
		return;
	    }
	}
	next();
    }
    
    function normalizeRepositoryName( req, res, next ) {
	if (req.params.repository)
	    req.params.repository = req.params.repository.replace( /[^0-9A-Za-z-]/, '' ).toLowerCase();
	next();
    }
    
    ////////////////////////////////////////////////////////////////
    // API endpoints for the xake tool

    var limiter = new rateLimit({
	windowMs: 15*60*1000, // 15 minutes 
	max: config.rateLimit, // limit each IP to 100 requests per windowMs 
	delayMs: 0 // disable delaying - full speed until the max limit is reached 
    });

    app.use( '/gpg/', limiter );
    app.use( '/pks/', limiter );
    app.use( '/:repository.git', normalizeRepositoryName, limiter );
    
    app.get( '/gpg/token/:keyid', keyserver.token );
    app.get( '/gpg/tokens/:keyid', keyserver.token );
    app.get( '/gpg/secret/:ltiKey/:keyid', keyserver.ltiSecret );
    app.post( '/pks/add', keyserver.add );

    app.post( '/:repository.git', normalizeRepositoryName, keyserver.authorization );
    app.post( '/:repository.git', normalizeRepositoryName, hashcash.hashcash );
    app.post( '/:repository.git', normalizeRepositoryName, page.create );

    app.use( '/:repository.git/log.sz', normalizeRepositoryName, page.authorization );
    app.use( '/:repository.git/log.sz', normalizeRepositoryName, sendSeekable );
    app.get( '/:repository.git/log.sz', normalizeRepositoryName, tincan.get );
    
    app.use( '/:repository.git', normalizeRepositoryName, repositories.git );

    ////////////////////////////////////////////////////////////////
    // Static content    

    versionator = versionator.createBasic('v' + app.version);
    app.locals.versionPath = function(url) {
	if (url.match(/^\/public\//)) {
	    return url.replace(/^\/public\//, '/public/v' + app.version + '/' );
	}
	if (url.match(/^\/node_modules\//)) {
	    return url.replace(/^\/node\_modules\//, '/node_modules/v' + app.version + '/' );
	}
	return url;	
    };
    app.use('/public', versionator.middleware);
    app.use('/public', express.static(path.join(__dirname, 'public'), {maxAge: '1y'}));;
    app.use('/node_modules', versionator.middleware);    
    app.use('/node_modules', express.static(path.join(__dirname, 'node_modules'), {maxAge: '1y'}));


    app.use(passport.initialize());
    app.use(passport.session());
    
    app.use(guests.middleware);
    
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
    
    app.post('/:repository/xAPI/statements', normalizeRepositoryName, tincan.postStatements);    
    
    ////////////////////////////////////////////////////////////////
    // User identity
    
    app.get('/users/me', user.getCurrent);
    app.get('/users/:id', user.get);
    app.get('/users/:id/edit', user.edit);
    app.post('/users/:id', user.update);

    app.get('/users/', user.index);
    app.get('/users/page/:page', user.index); // pagination in Mongo is fairly slow
    
    app.delete('/users/:id/google', function( req, res, next ) { user.deleteLinkedAccount( req, res, next, 'google' ); } );
    app.delete('/users/:id/github', function( req, res, next ) { user.deleteLinkedAccount( req, res, next, 'github' ); } );
    app.delete('/users/:id/twitter', function( req, res, next ) { user.deleteLinkedAccount( req, res, next, 'twitter' ); } );

    app.put('/users/:id/secret', function( req, res ) { user.putSecret( req, res ); } );

    app.delete('/users/:id/bridges/:bridge', function( req, res, next ) { user.deleteBridge( req, res, next ); } );    

    app.get('/supervise', supervising.watch );
    
    ////////////////////////////////////////////////////////////////
    // BADBAD: some permanent redirects for OSU courses from old URLs
    app.get( '/course', function( req, res ) { res.redirect('/mooculus'); });
    app.get( '/courses', function( req, res ) { res.redirect('/mooculus'); });
    app.get( '/courses/', function( req, res ) { res.redirect('/mooculus'); });
    
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
    
    app.get( '/statistics/:repository/:path(*)/:activityHash',
	     // include some sort of authorization here -- being an LTI "instuctor" in any xourse in the repo suffices
	     normalizeRepositoryName,
	     statistics.get );
    
    // app.get( '/statistics/:commit/:hash/successes', course.successes );
    // app.get( '/progress/:username/:repository', course.progress );    

    ////////////////////////////////////////////////////////////////
    // Logins

    // Google login.
    app.get('/auth/google', passport.authenticate('google-openidconnect'));
    app.get('/auth/google/callback',
            passport.authenticate('google-openidconnect', { successRedirect: '/just-logged-in',
							    failureRedirect: '/auth/google'}));

    if (config.localAuth) {
	app.post('/auth/local', 
		 passport.authenticate('local', { failureRedirect: '/' }),
		 function(req, res) {
		     res.redirect('/');
		 });
    }
    
    // Twitter login.
    if (config.twitterAuth) {
	app.get('/auth/twitter', passport.authenticate('twitter'));
	app.get('/auth/twitter/callback',
		passport.authenticate('twitter', { successRedirect: '/just-logged-in',
						   failureRedirect: '/auth/twitter'}));
    }

    // GitHub login.
    if (config.githubAuth) {
	app.get('/auth/github', passport.authenticate('oauth2'));
	app.get('/auth/github/callback',
		passport.authenticate('oauth2', { successRedirect: '/just-logged-in',
						  failureRedirect: '/',
						  failureFlash: true}));
    }

    // LTI login
    if (config.ltiAuth) {
	app.post('/lms', passport.authenticate('lms', { successRedirect: '/just-logged-in',
							failureRedirect: '/',
							failureFlash: true}));
    }
    
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
    // Activity page rendering

    app.get( '/:repository/:path(*)/certificate',
	     redirectUnnormalizeRepositoryName,
	     page.activitiesFromRecentCommitsOnMaster,
	     page.chooseMostRecentBlob,
	     page.parseActivity,
	     certificate.xourse );

    // BADBAD: i also need to serve pngs and pdfs and such from the repo here

    app.get( '/:repository/:path/lti.xml',
	     redirectUnnormalizeRepositoryName,
	     page.activitiesFromRecentCommitsOnMaster,
	     page.ltiConfig );
    
    var serveContent = function( regexp, callback ) {
	app.get( '/:repository/:path(' + regexp + ')',
		 redirectUnnormalizeRepositoryName,
		 page.activitiesFromRecentCommitsOnMaster,
		 callback );

	// Just ignore masquerades for non-page resources
	app.get( '/users/:masqueradingUserId/:repository/:path(' + regexp + ')',
		 normalizeRepositoryName,
		 page.activitiesFromRecentCommitsOnMaster,		 
		 callback );	
    };

    serveContent( '*.svg', page.serve('image/svg+xml') );
    serveContent( '*.png', page.serve('image/png') );
    serveContent( '*.pdf', page.serve('image/pdf') );
    serveContent( '*.jpg', page.serve('image/jpeg') );
    serveContent( '*.js',  page.serve('text/javascript') );

    app.get( '/:repository/:path(*.tex)',
	     redirectUnnormalizeRepositoryName,
	     page.activitiesFromRecentCommitsOnMaster,
	     page.source );
    
    function parallel(middlewares) {
	return function (req, res, next) {
	    async.each(middlewares, function (mw, cb) {
		mw(req, res, cb);
	    }, next);
	};
    }    
        
    // SVG files will only be rendered if they are sent with content type image/svg+xml
    
    app.locals.moment = require('moment');
    app.locals._ = require('underscore');
    app.locals.config = config;
    app.locals.version = app.version;

    // Start HTTP server for fully configured express App.
    var server = http.createServer(app);

    // Connect up to socket.io
    var ios = require('socket.io-express-session');
    var io = require('socket.io')(server, {
    });
    io.use(ios(theSession, cookieParser(config.session.secret)));

    ////////////////////////////////////////////////////////////////
    // State storage    
    
    var state = require('./routes/state.js');
    state.io = io;
    io.on( 'connection', state.connection );

    app.get( '/:repository/:path(*)/gradebook',
	     normalizeRepositoryName,
	     gradebook.record );
    app.put( '/:repository/:path(*)/gradebook',
	     normalizeRepositoryName,
	     gradebook.record );    

    // Instructors should be based around a context instead?
    app.get( '/:repository/:path/instructors',
	     redirectUnnormalizeRepositoryName,
	     page.activitiesFromRecentCommitsOnMaster,
	     page.chooseMostRecentBlob,
	     parallel([page.fetchMetadataFromActivity,
		       page.parseActivity]),	     
	     instructors.index );

    app.get( '/users/:masqueradingUserId/:repository/:path(*)',
	     redirectUnnormalizeRepositoryName,	     	     
	     supervising.masquerade,
	     page.activitiesFromRecentCommitsOnMaster,
	     page.chooseMostRecentBlob,
	     parallel([page.fetchMetadataFromActivity,
		       page.parseActivity]),
	     page.renderWithETag );        
    
    app.get( '/:repository/:path(*)',
	     redirectUnnormalizeRepositoryName,
	     remember,
	     page.activitiesFromRecentCommitsOnMaster,
	     page.chooseMostRecentBlob,
	     parallel([page.fetchMetadataFromActivity,
		       page.parseActivity]),
	     page.renderWithETag );

    app.get( '/:repository',
	     redirectUnnormalizeRepositoryName,	     	     
	     page.mostRecentMetadata,
	     xourses.index );    
    
    if(!module.parent){
        server.listen(app.get('port'), function(stream){
	    console.log('Express server listening on port ' + app.get('port'));
        });		    
    }
        
    // If nothing else matches, it is a 404
    app.use(function(req, res, next){
        res.status(404).render('404', { status: 404, url: req.url });
    });

    ////////////////////////////////////////////////////////////////
    // Present errors to the user
    
    if ('development' == app.get('env')) {
	// Middleware for development only, since this will dump a
	// stack trace
	errorHandler.title = 'Ximera';
        app.use(errorHandler());
    }

    app.use(function(err, req, res, next){
	if (res.headersSent) {
	    return next(err);
	}

	res.render('500', {
	    message: err
	});
    });
});
