exports.index = function(req, res) {
    res.render('about/index', { title: 'About', user: req.user });
};

exports.contact = function(req, res) {
    res.render('about/contact', { title: 'Contact', user: req.user });
};

exports.who = function(req, res) {
    res.render('about/for-various-users', { title: 'Who is this for?', user: req.user });
};

exports.workshop = function(req, res) {
    res.render('about/workshop', { title: 'Workshop', user: req.user });
};

exports.support = function(req, res) {
    res.render('about/support', { title: 'Supporters', user: req.user });
};

exports.plans = function(req, res) {
    res.render('about/plans', { title: 'Future Plans', user: req.user });
};

exports.ltiFailed = function(req, res) {
    res.render('about/lti-failed', { title: 'LTI Failure', user: req.user });
};

exports.m2o2c2 = function(req, res) {
    res.render('about/m2o2c2', { title: 'M2O2C2', user: req.user });
};

exports.xarma = function(req, res) {
    res.render('about/xarma', { title: 'Xarma', user: req.user });
};

exports.xudos = function(req, res) {
    res.render('about/xudos', { title: 'Xudos', user: req.user });
};

var principal_investigators = [
    {
	"name": "Bart Snapp",
	"photo":  "bart-snapp",
	"description": 'Bart Snapp teaches mathematics at OSU.  His research interests include commutative ring theory and recreational mathematics.  He enjoys exploring connections between mathematics and real-world problems, art, and music.',
	"link":'http://www.math.osu.edu/~snapp/', 
	"email": 'snapp.14@osu.edu'
    },
    {
	"name": "Jim Fowler",
	"photo":  "jim-fowler",
	"description": 'Jim\'s research broadly includes geometry and topology; specifically, his interests focus on the topology of high-dimensional manifolds and geometric group theory, which means he thinks about highly symmetric (and therefore very beautiful) geometric objects.  He\'s fond of using computational techniques to attack problems in pure mathematics. He received an undergraduate degree from <a href="http://www.harvard.edu/">Harvard University</a> and received a Ph.D. from the <a href="http://www.uchicago.edu/">University of Chicago</a>.  Jim built the adaptive learning platform that powers MOOCulus.',
	"link":'http://www.math.osu.edu/~fowler/',
	"email": 'fowler@math.osu.edu'
    }
];

var people = [
    {
	"name": "Corey Staten",
	"photo": "corey-staten",
	"description": 'Corey Staten studies mathematics and builds software.  For Ximera, he was hired as an external contractor and built the backend server with mongodb, express, angular, nodejs, and Haskell.',
	"email": 'corey.staten@gmail.com',
    },
    {
	"name": "Steve Gubkin",
	"photo":  "steve-gubkin",
	"description": 'Steve Gubkin is a mathematics Ph.D. student at OSU.  Steve has extensive experience with the <a href="https://github.com/Khan/khan-exercises/" rel="external">khan exercise framework</a>, so for MOOCulus and Ximera, he leads the development of our interactive exercises.',
	"link":'http://www.math.osu.edu/people/gubkin.1/view',
	"email": 'gubkin@math.osu.edu'
    },
    {
	"name": "Tom Evans",
	"photo":  "tom-evans",
	"description": 'Tom Evans is an Educational Technologist and the lead for open courses at the Ohio State University. You can follow him on Twitter at <a href="http://www.twitter.com/taevans">@taevans</a>.  For Calculus One, Tom created the music and edited some of the videos.',
	"link":'http://www.twitter.com/taevans',
	"email": 'evans.1517@osu.edu'
    },
    {
	"name": "Roman Holowinsky",
	"photo":  "roman-holowinsky",
	"description": 'Roman Holowinsky has been a professor in the OSU Math Department since Fall 2010.  His research is in the field of analytic number theory with a focus on L-functions and modular forms.  Roman is an Alfred P. Sloan fellow and the recipient of the 2011 SASTRA Ramanujan prize.',
	"link":'http://www.math.osu.edu/~holowinsky.1',
	"email": 'romanh@math.osu.edu'
    },
    {
	"name": "Sean Corey",
	"photo":  "sean-corey",
	"description": 'Sean teaches mathematics in secondary schools and is a proponent of independent learning. Game theory and the development of artificial intelligence are prominent interests of his.',
	"email": 'corey.osumath@gmail.com'
    },
    {
	"name": "Johann Thiel", 
	"photo":  "johann-thiel",
	"description": 'Johann Thiel is an assistant professor at New York City College of Technology. His main research interests lie in analytic number theory and its applications. In his classes, Johann enjoys designing live demonstrations to illustrate mathematical concepts.  Johann has built some explorations for courses on Ximera.',
	"email": 'jthiel@citytech.cuny.edu'
    },
    {
	"name": "Chris Bolognese", 
	"photo":  "chris-bolognese",
	"description": 'Chris Bolognese has taught mathematics both at the high school and college level.  Next year, he is the district teacher leader for mathematics K-12 for Upper Arlington Schools.  Chris enjoys mathematics competitions and mathematical technology.  For Ximera, Chris will be a teaching assistant and also contribute items for exercises.',
	"email": 'cbolognese@uaschools.org'
    },
    {
	"name": "David Lindberg", 
	"photo":  "david-lindberg",
	"description": 'David Lindberg is a mathematics masters student at OSU.  David is performing data analysis on the exercises to help improve the educational aspects of Ximera.',
	"email": 'lindberg.24@buckeyemail.osu.edu'
    }
];

var _ = require('underscore');

exports.team = function(req, res) {
    console.log( _.shuffle(principal_investigators) );
    res.render('about/team', { title: 'Team', user: req.user,
			       team: _.union(_.shuffle(principal_investigators), _.shuffle(people)) });
};

exports.faq = function(req, res) {
    res.render('about/faq', { title: 'FAQ', user: req.user });
};
