(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var THREE = require('../lib/three-utils')((typeof window !== "undefined" ? window['THREE'] : typeof global !== "undefined" ? global['THREE'] : null));
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var object = new THREE.Object3D();
var templateMaterial = new THREE.MeshNormalMaterial({ overdraw: 0.5 });

var createArc = function(shape, x, y, radius, from, to, sign, parts) {
  var src = sign ? from : to;
  var trg = sign ? to : from;
  var delta = sign ? 0 : Math.PI;

  for (var i = 1; i < parts; i++) {
    var t = i / parts;
    var cx = x + radius * Math.cos(delta + (src * (1 - t) + trg * t));
    var cy = y + radius * Math.sin(delta + (src * (1 - t) + trg * t));
    shape.lineTo(cx, cy);
  }
}

var createCogGeometry = function(radius, connectionRadius, holeRadius, legs, phi) {
  var shape = new THREE.Shape();

  var sign = legs % 2;
  var from = -Math.PI / 2 + phi;
  var to = Math.PI / 2 + phi;
  var src = sign ? from : to;
  var trg = sign ? to : from;
  var delta = sign ? 0 : Math.PI;

  var x0 = Math.cos(phi)*radius + connectionRadius*Math.cos(delta + src);
  var y0 = Math.sin(phi)*radius + connectionRadius*Math.sin(delta + src);
  shape.moveTo(x0, y0);

  for (var i = 0; i < legs * 2; i++) {
      var alpha = 2 * Math.PI * (i / (legs * 2)) + phi;
      var x = Math.cos(alpha) * radius;
      var y = Math.sin(alpha) * radius;

      createArc(shape, x, y, connectionRadius,
          -Math.PI / 2 + alpha,
          Math.PI / 2 + alpha,
          i % 2 == 0,
          3
      );
  }

  var holePath = new THREE.Path();
  holePath.moveTo(holeRadius, 0);
  createArc(holePath, 0, 0, holeRadius, 0, 2 * Math.PI, true, 20);
  shape.holes.push(holePath);

  return new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    amount: 1,
    bevelEnabled: true,
    bevelThickness: 0.25,
    bevelSize: 0.25,
    bevelSegments: 1,
  });
};

var bigCogGeometry = createCogGeometry(10, 1, 1.5, 16, 0.1);
var smallCogGeometry = createCogGeometry(5, 1, 1.5, 8, 0.1);
var cog1 = new THREE.Mesh(bigCogGeometry, templateMaterial);
var cog2 = new THREE.Mesh(bigCogGeometry, templateMaterial);
var cog3 = new THREE.Mesh(smallCogGeometry, templateMaterial);
cog1.position.z = -5;
cog2.rotation.x = Math.PI/2;
cog2.position.y = -10;
cog2.position.z = 6;
cog3.rotation.y = Math.PI/2;
cog3.position.x = 10;
cog3.position.z = 1;

object.add(cog1);
object.add(cog2);
object.add(cog3);

var chosen = false;
var started = false;
var game = false;
var explode = false;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
scene.add(camera)

var pixelRatio = window.devicePixelRatio || 1;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);

document.body.appendChild(renderer.domElement);

var effect = new THREE.StereoEffect(renderer);
effect.eyeSeparation = 1;
effect.setSize(window.innerWidth, window.innerHeight);

var up = new THREE.Vector3(0, 1, 0);
var forward = new THREE.Vector3(1, 0, 0);
var across = new THREE.Vector3(0, 0, -1);

var started = false;

scene.add(object);

var stars = _.times(300, function() {
  var particle = new THREE.Particle();
  particle.position.copy(THREE.Vector3.randomUnit()).multiplyScalar(Math.random() * 500 + 200);
  scene.add(particle);
  return particle;
});

var cardboard = false;

var previousLateralDirection = across.clone().multiplyScalar(-1);
var angleOffset = 0;

var render = function(time) {
  if (sensor) {
    camera.quaternion.copy(sensor.getState().orientation);
  }

  var direction = across.clone().applyQuaternion(camera.quaternion);
  object.position.copy(direction.clone().multiplyScalar(40));

  // Get a vector of the lateral direction of the camera
  var lateralDirection = direction.cross(up).cross(up);
  // Get the lateral angle of the camera
  var angle = (lateralDirection.angleTo(forward) > Math.PI / 2 ? 1 : -1) * lateralDirection.angleTo(across);

  cog1.rotation.z = angle;
  cog2.rotation.z = angle + 0.1 * 2;
  cog3.rotation.z = angle * 2 + 0.5;

  previousLateralDirection = lateralDirection.clone();

  lateralDirection.applyAxisAngle(up, angleOffset);

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
},{"../lib/three-utils":2}],2:[function(require,module,exports){
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
