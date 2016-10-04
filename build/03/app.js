(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var THREE = require('../lib/three-utils')((typeof window !== "undefined" ? window['THREE'] : typeof global !== "undefined" ? global['THREE'] : null));
var detectSphereCollision = require('../lib/detect-sphere-collision');
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var object = new THREE.Object3D();
var templateMaterial = new THREE.MeshNormalMaterial({ overdraw: 0.5 });

var log = document.querySelector('.log');

var timeout = 0;
var velocity = new THREE.Vector3();
var height = 5;
var stance = new THREE.Vector3();

// var promise = new FULLTILT.getDeviceMotion();
// promise.then(function(deviceMotion) {
//   deviceMotion.start(function(data) {
//     var a = deviceMotion.getScreenAdjustedAcceleration();
//     velocity.add(new THREE.Vector3(a.y, a.x, a.z).multiplyScalar(0.1)).multiplyScalar(0.9);

//     height = height - velocity.x;
//     if (height < 5) height = 5;
//     if (height > 10) height = 10;

//     stance.set(0, height, 0);
//   });
// });

var radius = 1;
var sphere = new THREE.SphereGeometry(radius, 32, 32);
var material = new THREE.MeshLambertMaterial();
material.map = THREE.ImageUtils.loadTexture('ball.png');

var balls = _.range(0, 30).map(function() {
  var ball = new THREE.Mesh(sphere, material);
  ball.geometry.radius = radius;
  ball.position.y = Math.random() * 7 + 3;
  ball.position.x = Math.random() * 40 - 20;
  ball.position.z = Math.random() * 60 - 30;
  ball.velocity = new THREE.Vector3(
    Math.random() * 0.6 - 0.3,
    0,
    Math.random() * 0.6 - 0.3
  );

  ball.angularVelocity = ball.velocity.clone().multiplyScalar(0.5);
  object.add(ball);
  return ball;
});

var building = new THREE.Object3D();

var floorTexture = THREE.ImageUtils.loadTexture('floor.jpg');
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(10, 10);

var floorMaterial = new THREE.MeshPhongMaterial({
  map: floorTexture,
});

var plane = new THREE.PlaneGeometry(60, 100);
var floor = new THREE.Mesh(plane, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -9.4;
building.add(floor);

var ceilingTexture = THREE.ImageUtils.loadTexture('ceiling.jpg');
ceilingTexture.wrapS = ceilingTexture.wrapT = THREE.RepeatWrapping;
ceilingTexture.repeat.set(5, 10);

var ceilingMaterial = new THREE.MeshPhongMaterial({
  map: ceilingTexture,
});

var ceiling = new THREE.Mesh(plane, ceilingMaterial);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 15;
building.add(ceiling);

var wallTexture = THREE.ImageUtils.loadTexture('walls.jpg');
wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
wallTexture.repeat.set(1, 1);

var wallMaterial = new THREE.MeshLambertMaterial({
  map: wallTexture,
});
var plane = new THREE.PlaneGeometry(60, 30);
var wall1 = new THREE.Mesh(plane, wallMaterial);
wall1.position.z = -50;
building.add(wall1);

var wall2 = new THREE.Mesh(plane, wallMaterial);
wall2.position.z = 50;
wall2.rotation.y = Math.PI;
building.add(wall2);

var plane = new THREE.PlaneGeometry(100, 30);
var wall3 = new THREE.Mesh(plane, wallMaterial);
wall3.position.x = -30;
wall3.rotation.y = Math.PI / 2;
building.add(wall3);

var wall4 = new THREE.Mesh(plane, wallMaterial);
wall4.position.x = 30;
wall4.rotation.y = -Math.PI / 2;
building.add(wall4);

object.add(building);

object.setVisible(false);

var chosen = false;
var started = false;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
scene.add(camera);

var light = new THREE.AmbientLight(0xdddddd);
scene.add(light);

var pixelRatio = window.devicePixelRatio || 1;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);

document.body.appendChild(renderer.domElement);

var effect = new THREE.StereoEffect(renderer);
effect.eyeSeparation = 0.25;
effect.setSize(window.innerWidth, window.innerHeight);

var up = new THREE.Vector3(0, 1, 0);
var forward = new THREE.Vector3(1, 0, 0);
var across = new THREE.Vector3(0, 0, -1);

scene.add(object);

var cardboard = false;

var gravity = new THREE.Vector3(0, -0.02, 0);

var render = function(time) {
  if (started) {
    object.setVisible(true);
  }

  if (sensor) {
    camera.quaternion.copy(sensor.getState().orientation);
  }

  var direction = up.clone().applyQuaternion(camera.quaternion);

  camera.position.copy(direction.multiplyScalar(5).sub(stance));

  balls.map(function(ball) {
    if (Math.abs(ball.velocity.lengthSq()) > 0.000001) {
      ball.velocity.add(gravity);

      ball.rotation.x = ball.rotation.x + ball.angularVelocity.y;
      ball.rotation.y = ball.rotation.y + ball.angularVelocity.z;
      ball.rotation.z = ball.rotation.z + ball.angularVelocity.x;
    }

    ball.position.add(ball.velocity);

    building.children.forEach(function(child) {
      detectSphereCollision(ball, child, function(normal, overshoot) {
        var overshootRatio = overshoot / ball.velocity.length();
        ball.position.sub(ball.velocity.clone().multiplyScalar(overshootRatio));
        ball.velocity.reflect(normal).multiplyScalar(0.95);
        ball.position.add(ball.velocity.clone().multiplyScalar(overshootRatio));
        ball.angularVelocity = ball.velocity.clone().multiplyScalar(0.1);
      });
    });

    balls.map(function(ball2) {
      if (ball === ball2) return;

      var diff = ball.position.clone().sub(ball2.position);
      var dist = diff.length();
      if (dist < radius * 2) {
        var normal = diff.normalize();
        var overshootRatio = (radius * 2 - dist) / ball.velocity.length();
        ball.position.sub(ball.velocity.clone().multiplyScalar(overshootRatio));
        ball.velocity.reflect(normal).multiplyScalar(0.95);
        ball.position.add(ball.velocity.clone().multiplyScalar(overshootRatio));
        ball.angularVelocity = ball.velocity.clone().multiplyScalar(0.1);
      }
    });
  });

  cardboard && window.orientation !== 0 ? effect.render(scene, camera) : renderer.render(scene, camera);

  requestAnimationFrame(render);
};

render(0);

document.addEventListener('DOMContentLoaded', function() {
  FastClick.attach(document.body);
}, false);

document.querySelector('.with-viewer').addEventListener('click', function() {
  chosen = true;
  cardboard = true;
  camera.fov = cardboard ? '60' : '45';
  resize();
  document.querySelector('.viewer-prompt').style.display = 'none';
  document.querySelector('.cardboard-prompt').style.display = 'block';
  document.querySelector('.cardboard-overlay').style.display = 'block';
  updateOrientation();
});

document.querySelector('.no-viewer').addEventListener('click', function() {
  chosen = true;
  cardboard = false;
  camera.fov = cardboard ? '60' : '45';
  resize();
  updateOrientation();
  document.querySelector('.viewer-prompt').style.display = 'none';
  document.querySelector('.phone-prompt').style.display = window.orientation === 0 ? 'block' : 'none';
  if (window.orientation !== 0) {
    document.querySelector('.intro-modal').style.display = 'none';
    document.querySelector('.cardboard-overlay').style.display = 'none';
    started = true;
  }
});

document.querySelector('.cardboard-overlay').addEventListener('click', function() {
  document.querySelector('.intro-modal').style.display = 'none';
  document.querySelector('.intro-modal.stereo').style.display = 'none';
  document.querySelector('.cardboard-overlay').style.display = 'none';
  started = true;
  updateOrientation();
});

document.querySelector('.cardboard-button').addEventListener('click', function() {
  cardboard = !cardboard;
  camera.fov = cardboard ? '60' : '45';
  resize();
});

var updateOrientation = function() {
  document.body.classList[cardboard && window.orientation !== 0 ? 'add' : 'remove']('stereo');

  if (!started && chosen && !cardboard && window.orientation !== 0) {
    document.querySelector('.intro-modal').style.display = 'none';
    document.querySelector('.cardboard-overlay').style.display = 'none';
    started = true;
    updateOrientation();
  }

  document.querySelector('.cardboard-button').style.display = window.orientation !== 0 && started ? 'block' : 'none';
};

window.addEventListener('orientationchange', updateOrientation, false);

var resize = function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  effect.setSize(window.innerWidth, window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', _.debounce(resize, 50), false);

var sensor;
navigator.getVRDevices().then(function(devices) {
  sensor =_.find(devices, 'getState');
});

updateOrientation();
resize();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lib/detect-sphere-collision":2,"../lib/three-utils":3}],2:[function(require,module,exports){
(function (global){
var THREE = (typeof window !== "undefined" ? window['THREE'] : typeof global !== "undefined" ? global['THREE'] : null);
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var center = new THREE.Vector3();
var line = new THREE.Line3();
var point = new THREE.Vector3();
var triangle = new THREE.Triangle();
var plane = new THREE.Plane();
var normal = new THREE.Vector3();

module.exports = function(sphere, object, callback) {
  var radius = sphere.geometry.radius;
  var radiusSquared = Math.pow(radius);

  // center.copy(object.geometry.boundingSphere.center).applyMatrix4(object.matrix);
  // if (sphere.position.distanceToSquared(center) > Math.pow(radius + object.geometry.boundingSphere.radius, 2)) {
  //   return;
  // }

  // Face collisions
  var collision = _.find(object.geometry.faces, function(face) {
    triangle.a.copy(object.geometry.vertices[face.a]).applyMatrix4(object.matrix);
    triangle.b.copy(object.geometry.vertices[face.b]).applyMatrix4(object.matrix);
    triangle.c.copy(object.geometry.vertices[face.c]).applyMatrix4(object.matrix);

    if (triangle.containsPoint(sphere.position)) {
      triangle.plane(plane);
      var distance = plane.distanceToPoint(sphere.position);
      if (Math.abs(distance) < radius) {
        normal.copy(plane.normal).multiplyScalar(distance > 0 ? 1 : -1);
        callback(normal, radius - Math.abs(distance), sphere.position);
        return true;
      }
    }
  })
  if (collision) return;

  // Vertex and edge collisions
  _.find(object.geometry.edges, function(edge) {
    line.start.copy(edge[0]).applyMatrix4(object.matrix);
    line.end.copy(edge[1]).applyMatrix4(object.matrix);

    line.closestPointToPoint(sphere.position, true, point);
    var distanceSquared = sphere.position.distanceToSquared(point);
    if (distanceSquared < radiusSquared) {
      normal.copy(point).sub(sphere.position).normalize();
      callback(normal, radius - Math.sqrt(distanceSquared), point);
      return true;
    }
  });
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
module.exports = function(THREE) {
  THREE.Object3D.prototype.setVisible = function(visible) {
    return this.traverse(function(object) { object.visible = visible; });
  };

  THREE.Vector3.randomUnit = function() {
	  return new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
	};

  return THREE;
};

},{}]},{},[1]);
