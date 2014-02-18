/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , activity = require('./routes/activity')
  , course = require('./routes/course')
  , user = require('./routes/user')
  , about = require('./routes/about')
  , http = require('http')
  , path = require('path')
  , mdb = require("./mdb")
  , less = require('less-middleware')
  , passport = require('passport')
  , mongo = require('mongodb')
  , mongoose = require('mongoose')
  , GoogleStrategy = require('passport-google').Strategy
  , http = require('http')
  , path = require('path')
  , angularState = require('./routes/angular-state')
  , winston = require('winston')
  , template = require('./routes/template')
  , mongoImage = require('./routes/mongo-image')
  , async = require('async')
  , fs = require('fs')
  , io = require('socket.io')
  ;

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

var rootUrl = 'http://localhost:' + app.get('port');
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

// Configure passport for use with Google authentication.
passport.use(new GoogleStrategy({
	returnURL: rootUrl + '/auth/google/return',
	realm: rootUrl
    }, function (identifier, profile, done) {
	var err = null;

    	// add unique index on openId field
    	db.ensureIndex({openId:1}, {unique: true}, function(err,indexName) {} );

    	// Save this to the users collection if we haven't already
    	db.users.findAndModify({
            query: {openId: identifier},
            update: {$set: {name: profile.displayName,
			    emails: [profile.emails[0].value]}
		    },
            new: true,
            upsert: true
        }, function(err, document) {
            console.log("Upserted:");
            console.log(err);
            console.log(document);
            done(err, document);
    	});
    }));

// Only store the user _id in the session
passport.serializeUser(function(user, done) {
   done(null, user._id);
});

passport.deserializeUser(function(id, done) {
   db.users.findOne({_id: new mongo.ObjectID(id)}, function(err,document) {
       done(err, document);
   });
});

// Middleware for all environments
function addDatabaseMiddleware(req, res, next) {
   req.db = db;
   res.locals.user = req.user;
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
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/components', express.static(path.join(__dirname, 'components')));

app.use(express.favicon(path.join(__dirname, 'public/images/icons/favicon/favicon.ico')));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());

cookieSecret = 'BADBAD: Fill in with an actual secret from ENV';
app.use(express.cookieParser(cookieSecret));
app.use(express.session({
	secret: cookieSecret,
	store: new MongoStore({
	    db: mongoose.connections[0].db
	})
}));

app.use(express.session());
app.use(passport.initialize());
app.use(passport.session());


// Add guest users account if not logged in.
// If logged in and previously a guest user, copy over activity scopes (non-destructively.)
// TODO: Clean these out occasionally.
// TODO: Move this all to a different file.
app.use(function(req, res, next) {
  if (!req.user) {
      if (!req.session.guestUserId) {
          req.user = new mdb.User({isGuest: true, name: "Guest User", email: ""});
          req.session.guestUserId = req.user._id;
          req.user.save(next);
      }
      else {
          mdb.User.findOne({_id: req.session.guestUserId}, function (err, user) {
              req.user = user;
              next();
          });
      }
  }
  else {
      if (req.session.guestUserId) {
          // Was previously signed in as a guest user.
          var guestUserId = req.session.guestUserId;
          req.session.guestUserId = null;
          copyGuestScopes(guestUserId, req.user._id, next);
      }
      else {
          next();
      }
  }
});

// TODO: Still say sign-in.
// Copy guest scopes to new user non-destructively; if user has saved work, that wins out.
function copyGuestScopes(guestUserId, userId, next) {
    mdb.Scope.find({user: guestUserId}, function (err, scopes) {
        if (err) next(err);
        else {
            async.each(scopes, function (guestScope, callback) {
                mdb.Scope.findOne({user: userId, activity: guestScope.activityId}, function (err, userScope) {
                    if (err) callback(err);
                    else {
                        if (!userScope) {
                            guestScope.user = userId;
                            guestScope.save(callback);
                        }
                        else {
                            callback();
                        }
                    }
                });
            }, next);
        }
    });
}

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
app.get('/', routes.index);
app.get('/users', user.list);
app.get('/users/:id', user.get);
app.put('/users/:id', user.put);

app.get('/activities', activity.list);
app.get('/activity/:id/', activity.display);    
app.get('/activity/:id/source', activity.source);

app.get( '/course/calculus-one/', function( req, res ) { res.redirect('/about/plans'); });
app.get( '/course/calculus-one', function( req, res ) { res.redirect('/about/plans'); });
app.get( '/course/calculus-two/', function( req, res ) { res.redirect('/about/plans'); });
app.get( '/course/calculus-two', function( req, res ) { res.redirect('/about/plans'); });
app.get( '/course/multivariable/', function( req, res ) { res.redirect('/about/plans'); });
app.get( '/course/multivariable', function( req, res ) { res.redirect('/about/plans'); });

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


app.get('/auth/google', passport.authenticate('google'));
app.get('/auth/google/return',
    passport.authenticate('google', { successRedirect: '/',
				      failureRedirect: '/auth/google'}));
app.get('/logout', function (req, res) {
req.logout();
res.redirect('/');
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

app.get('/angular-state/:activityId', angularState.get);
app.put('/angular-state/:activityId', angularState.put);

app.get('/template/:templateFile', template.renderTemplate);
app.get('/image/:hash', mongoImage.get);


app.locals({
    moment: require('moment'),
    _: require('underscore')
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

    // Setup chat rooms
    var chat = require('./routes/chat.js')(socket);
    app.get('/chats', chat.view);
    app.post('/chats/upvote/:post', chat.upvote);
    app.get('/chats/:room/:timestamp', chat.get);
    app.post('/chat/:room', chat.post);

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
