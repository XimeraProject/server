/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , course = require('./routes/course')
  , certificate = require('./routes/certificate')
  , user = require('./routes/user')
  , github = require('./routes/github')
  , tincan = require('./routes/tincan')
  , instructor = require('./routes/instructor')
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
    !process.env.XIMERA_MONGO_URL ||
    !process.env.GITHUB_WEBHOOK_SECRET)
    {
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

/*
app.use(function(req, res, next) {
    var contentType = req.headers['content-type'] || ''
    , mime = contentType.split(';')[0];

    console.log(mime);
    if ((mime != 'text/plain') && (mime != 'image/svg+xml'))
	next();
    else {
	req.chunks = [];
	req.on('data', function(chunk) {
	    console.log( "new data = ", chunk.length );
	    req.chunks.push( new Buffer(chunk) );
	});
	req.on('end', function(chunk) {
	    req.chunks.push( new Buffer(chunk) );  OR NOT?
	    console.log( "req.chunks.length = ", req.chunks.length );
	    req.rawBody = Buffer.concat( req.chunks );
	    console.log( "rawBody length = ", req.rawBody.length );
	    next();
	});    
    }
    
    });*/

app.use(function(req, res, next) {
    req.rawBody = '';
    
    req.on('data', function(chunk) { 
	req.rawBody += chunk;
    });
    
    next();
});

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

// Middleware for all environments
function addDatabaseMiddleware(req, res, next) {
    //req.db = db;

    if ('user' in req)
	res.locals.user = req.user;
    else {
	res.locals.user = req.user = {};
    }
    
    next();
}


    app.version = require('./package.json').version;

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
    
    //app.use(versionator.middleware);
    app.use('/public', express.static(path.join(__dirname, 'public')));
    app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

    //app.locals.versionPath = versionator.versionPath;

    //console.log( versionator.versionPath('/template/test') );

    app.use(passport.initialize());
    app.use(passport.session());
    
    app.use(login.guestUserMiddleware);
    app.use(addDatabaseMiddleware);
    
    // Middleware for development only
    if ('development' == app.get('env')) {
        app.use(errorHandler());
    }

    // Setup routes.
    app.get('/install.sh', function(req, res) {
	res.sendFile('views/install.sh', { root: __dirname });
    });

    // TinCan (aka Experience) API
    app.post('/xAPI/statements', function(req,res) { res.status(200).send('ignored statemtents without a repository.'); } );
    app.post('/:repository/xAPI/statements', tincan.postStatements);    
    
    // Requires the rawBody middleware above
    github.secret = process.env.GITHUB_WEBHOOK_SECRET;
    app.post('/github', github.github);

    app.get('/', routes.index);

    app.get('/users/me', user.getCurrent);
    //app.get('/users/profile', user.currentProfile);
    //app.get('/users/:id/profile', user.profile);
    app.get('/users/:id', user.get);
    app.get('/users/:id/edit', user.edit);
    app.post('/users/:id', user.update);

    app.get('/users/', user.index);
    app.get('/users/page/:page', user.index); // pagination in Mongo is fairly slow
    
    app.delete('/users/:id/google', function( req, res ) { user.deleteLinkedAccount( req, res, 'google' ); } );
    app.delete('/users/:id/github', function( req, res ) { user.deleteLinkedAccount( req, res, 'github' ); } );
    app.delete('/users/:id/twitter', function( req, res ) { user.deleteLinkedAccount( req, res, 'twitter' ); } );

    app.put('/users/:id/secret', function( req, res ) { user.putSecret( req, res ); } );

    // BADBAD: this should probably be a PUT since it changes state
    app.get('/users/:id/courses/:owner/:repo', function( req, res ) { user.courses( req, res ); } );
    
    //app.get('/course/', course.index );
    app.get( '/course', function( req, res ) { res.redirect(req.url + '/'); });
    app.get( '/courses', function( req, res ) { res.redirect('/course/'); });
    app.get( '/courses/', function( req, res ) { res.redirect('/course/'); });

    app.get( '/certificate/:certificate/:signature', certificate.view );
    
    app.get( '/course/:commit([0-9a-fA-F]+)/certificate', course.xourseFromCommit, certificate.xourse );
    app.get( '/course/:username/:repository/certificate', course.xourseFromUserAndRepo, certificate.xourse );
    app.get( '/course/:username/:repository/:branch/certificate', course.xourseFromUserAndRepo, certificate.xourse );
    
    app.get( '/course/:commit([0-9a-fA-F]+)/', course.xourseFromCommit, course.tableOfContents );
    app.get( '/course/:username/:repository/', course.xourseFromUserAndRepo, course.tableOfContents );
    app.get( '/course/:username/:repository/:branch/', course.xourseFromUserAndRepo, course.tableOfContents );

    app.get( '/labels/:commit([0-9a-fA-F]+)/:label', course.getLabel );

    var appXimera = function( regexp, callback ) {
	app.get( '/:noun(course|activity)/:commit([0-9a-fA-F]+)/:path(' + regexp + ')', course.objectFromCommit, callback );
	app.get( '/:noun(course|activity)/:username/:repository/:path(' + regexp + ')', course.objectFromUserAndRepo, callback );
	app.get( '/:noun(course|activity)/:username/:repository/:branch/:path(' + regexp + ')', course.objectFromUserAndRepo, callback );
    };

    appXimera( '*.tex', course.source );

    // SVG files will only be rendered if they are sent with content type image/svg+xml
    appXimera( '*.svg', course.file('image/svg+xml') );
    appXimera( '*.png', course.file('image/png') );
    appXimera( '*.pdf', course.file('image/pdf') );
    appXimera( '*.jpg', course.file('image/jpeg') );
    appXimera( '*.js',  course.file('text/javascript') );
    appXimera( '*.css', course.file('text/css') );                

    appXimera( '*', course.activity );

    app.get( '/course/:commit([0-9a-fA-F]+)$' ,function( req, res ) { res.redirect(req.url + '/'); });
    app.get( '/course/:username/:repository', function( req, res ) { res.redirect(req.url + '/'); });
    app.get( '/course/:username/:repository/:branch', function( req, res ) { res.redirect(req.url + '/'); });

    app.get( '/statistics/:commit/:hash/answers', course.answers );
    app.get( '/statistics/:commit/:hash/successes', course.successes );
    
    app.get( '/progress/:username/:repository', course.progress );    

    //app.head( '/activity/:commit/:path(*.png)', course.imageHead );
    //app.head( '/activity/:commit/:path(*.jpg)', course.imageHead );
    //app.head( '/activity/:commit/:path(*.pdf)', course.imageHead );
    //app.head( '/activity/:commit/:path(*.svg)', course.imageHead );    
    app.head( '/activity/:commit/:path(*)', course.activityByHashHead );
    
    // Instructor paths
    app.get(/^\/instructor\/course\/(.+)\/activity\/(.+)\/$/, instructor.instructorActivity );
    app.get('/instructor/activity-analytics/:id', instructor.activityAnalytics);

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

    app.get('/mailing-list', function( req, res ) {
        fs.appendFile( 'emails.txt', req.query['email'] + "\n", function(err) { return; });
        res.send(200);
    });

    var state = require('./routes/state.js')(null);
    app.get('/state/:activityHash', state.get);
    app.put('/state/:activityHash', state.put);
    app.delete('/state/:activityHash', state.remove);

    app.put('/completion/:activityHash', state.completion);
    app.get('/users/:id/completions', state.getCompletions);
    
    // BADBAD: this is where we'll put the NEW routes

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
    
    // BADBAD: serve source too
    //appXimera( '*.tex', course.source );

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
        res.render('404', { status: 404, url: req.url });
    });
});
