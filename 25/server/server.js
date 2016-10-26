var express = require('express');
var app = express();
var server = app.listen(process.env.PORT || 3000);
var io = require('socket.io').listen(server);
var THREE = require('three');

var viewers = {};
var controllers = {};

var samples = 60;

io.on('connection', function (socket) {
  socket.rotationRate = [];

  socket.on('viewer.ready', function(data) {
    viewers[socket.id] = socket;
  });

  var currentQuaternion = new THREE.Quaternion();
  var previousQuaternion = new THREE.Quaternion();

  socket.active = true;
  socket.potentials = {};
  var timeout = null;

  socket.on('viewer.move', function(data) {
    socket.active = true;
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      socket.active = false;
    }, 500);
    currentQuaternion.copy(data);
    var q = currentQuaternion.clone().inverse().premultiply(previousQuaternion);
    socket.rotationRate.unshift(Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z) || 0);
    if (socket.rotationRate.length > samples) {
      socket.rotationRate.pop();
    }
    previousQuaternion.copy(currentQuaternion);

    if (socket.rotationRate.length === samples) {
      for (var id in viewers) {
        if (viewers[id] === socket || !socket.active || socket.pair) {
          continue;
        }
        if (viewers[id].rotationRate.length === samples) {
          var magnitude = socket.rotationRate.reduce(function(acc, rotation) {
            return acc + rotation;
          });
          var error = socket.rotationRate.reduce(function(acc, rotation, i) {
            return acc + Math.abs(rotation - viewers[id].rotationRate[i]);
          });
          if (magnitude > 1.5 && error < 0.7) {
            socket.potentials[id] = socket.potentials[id] || 0;
            socket.potentials[id]++;

            if (socket.potentials[id] > 10) {
              socket.pair = viewers[id];
              viewers[id].pair = socket;
              socket.emit('viewer.paired', {});
              socket.pair.emit('controller.paired', {});
            }
          }
        }
      }
    }
  });

  socket.on('controller.move', function(data) {
    currentQuaternion.copy(data);
    var q = currentQuaternion.clone().inverse().premultiply(previousQuaternion);
    socket.rotationRate.unshift(Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z) || 0);
    if (socket.rotationRate.length > samples) {
      socket.rotationRate.pop();
    }

    previousQuaternion.copy(currentQuaternion);

    if (socket.pair) socket.pair.emit('controller.move', data);
  });

  socket.on('controller.reset', function(data) {
    if (socket.pair) socket.pair.emit('controller.reset', data);
  });
});
