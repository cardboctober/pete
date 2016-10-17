var express = require('express');
var app = express();
var server = app.listen(process.env.PORT || 3000);
var io = require('socket.io').listen(server);

var viewers = {};
var controllers = {};

io.on('connection', function (socket) {
  var id;

  socket.on('viewer.ready', function(data) {
    socket.id = data;
    viewers[socket.id] = socket;
  });

  socket.on('controller.ready', function(data) {
    socket.id = data;
    controllers[socket.id] = socket;
    if (viewers[socket.id]) viewers[socket.id].emit('controller.ready', {});
  });

  socket.on('controller.move', function(data) {
    if (viewers[socket.id]) viewers[socket.id].emit('controller.move', data);
  });

  socket.on('controller.reset', function(data) {
    if (viewers[socket.id]) viewers[socket.id].emit('controller.reset', data);
  });
});
