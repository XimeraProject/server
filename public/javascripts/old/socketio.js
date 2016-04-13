
// This will let me pull in socketio...
define([], function () {
  var io = window.io;
  window.io = null;

  return io;
});
