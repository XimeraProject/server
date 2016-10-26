# Interactive widgets

Ximera defines a format for interactive widgets via JavaScript.

The widgets are described in JavaScript files conforming to the AMD
module format.  Inside the interactive, `this` points to a div on the
page with a unique id.

## Special modules

### 'db'

The database is exposed via a db object.

```
define(['jquery', 'db'], function($, db) {
     var target = this;

     target.width("100%");
     target.height(300);

     // The callback is called whenever the remote database is updated
     db(function(event) {
       if (db.correct)
	   target.css('background-color','#DFE');
	else
	   target.css('background-color','#EEE');
     });

     target.click( function() {
       // The properties set on the db object are
       // automatically persisted to the database
       db.correct = true;
     });
});
```

The db object is proxied so any time you set a property on the db
object, it'll get persisted to the remote database.  And the db object
is also a function, which accepts a callback which is called whenever
there is a remote update that needs to be propagated to the page
state.

This seems to me to be the minimal way to handle persistent state
across a variety of possible use cases.

### 'parameters'

In your LaTeX file, you might have
```
\includeinteractive[x=16,y=18]{example.js}
```
and then in `example.js` you could access x and y via
```
define(['parameters'], function(parameters) {
  console.log( "x = ", parameters.x );
  console.log( "y = ", parameters.y );
});
```

### 'reset'

Invoking the 'reset' module in your javascript file will create a
"Reset" button below the interactive; the reset object can be called
with a callback which will be invoked whenever the learner clicks on
the reset button.

```
define(['reset'], function(reset) {
  reset( function() {
    console.log( "This is when I reset myself." );
  });
});
```

### 'answer' (not implemented yet)

Invoking the 'answer' module in your interactive will create a "Check
Work" button below the interactive; the answer object can be called
with a callback which will be invoked whenever the learner clicks on
the "Check Work" button.

The functions `answer.correct` and `answer.incorrect` and can be
called from within the callback to record whether or not the widget's
state should be adjudicated as correct or not.  To record partial
work, `answer.score` can be called.  Indeed,
`answer.correct(feedback)` is equivalent to `answer.score(1,feedback)` and `answer.incorrect(feedback)` is equivalent to
`answer.score(0, feedback)`.


```
define(['db', 'answer'], function(db, answer) {
  this.click( function() {
    db.clicked = true;
  });

  target.width("100%");
  target.height(300);

  answer( function() {
    if (db.clicked) {
      answer.correct('You clicked the button.');
    } else {
      answer.incorrect('You should click the button.');
    }
  });
});
```
