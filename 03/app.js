var THREE = require('../lib/three-utils')(require('three'));
var detectSphereCollision = require('../lib/detect-sphere-collision');
var _ = require('lodash');

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

var gravityOn = function() {
  gravity.y = -0.02;
};

var gravityOff = function() {
  gravity.y = 0;
};

document.querySelector('canvas').addEventListener('mousedown', gravityOff);
document.querySelector('canvas').addEventListener('mouseup', gravityOn);

document.querySelector('canvas').addEventListener('touchstart', gravityOff);
document.querySelector('canvas').addEventListener('touchend', gravityOn);

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
    if (!ball.disablePhysics) {
      ball.velocity.add(gravity);

      ball.rotation.x = ball.rotation.x + ball.angularVelocity.y;
      ball.rotation.y = ball.rotation.y + ball.angularVelocity.z;
      ball.rotation.z = ball.rotation.z + ball.angularVelocity.x;

      ball.position.add(ball.velocity);

      building.children.forEach(function(child) {
        detectSphereCollision(ball, child, function(normal, overshoot) {
          var overshootRatio = overshoot / ball.velocity.length();
          ball.position.sub(ball.velocity.clone().multiplyScalar(overshootRatio));
          ball.velocity.reflect(normal).multiplyScalar(0.95);
          ball.position.add(ball.velocity.clone().multiplyScalar(overshootRatio));
          ball.angularVelocity = ball.velocity.clone().multiplyScalar(0.1);

          if (Math.abs(ball.velocity.lengthSq()) < 0.0001) {
            console.log(1);
            ball.disablePhysics = true;
          }
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
    }
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
