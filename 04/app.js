var THREE = require('../lib/three-utils')(require('three'));
var _ = require('lodash');

var object = new THREE.Object3D();

var texture = THREE.ImageUtils.loadTexture('texture.png');
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(80, 40);

var rockMaterial = new THREE.MeshLambertMaterial({ map: texture });

var noise = new Noise(Math.random());

var sphere = new THREE.IcosahedronGeometry(100, 6);
var planet = new THREE.Mesh(sphere, rockMaterial);
planet.rotation.x = 0;
planet.scale.y = 0.95;
planet.geometry.vertices.map(function(vertex) {
  vertex.multiplyScalar(1 + noise.simplex3(vertex.x / 5, vertex.y / 5, vertex.z / 5) * 0.01);
});

planet.geometry.vertices.map(function(vertex) {
  vertex.multiplyScalar(1 + noise.simplex3(vertex.x / 5, vertex.y / 5, vertex.z / 5) * 0.01);
});

var planet2 = new THREE.Mesh(sphere, rockMaterial);
planet2.rotation.x = Math.PI / 2;
planet2.scale.y = 0.95;
planet2.geometry.vertices.map(function(vertex) {
  vertex.multiplyScalar(1 + noise.simplex3(vertex.x / 5, vertex.y / 5, vertex.z / 5) * 0.01);
});



sphere.computeFaceNormals();
sphere.computeVertexNormals();

object.add(planet);
object.add(planet2);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
scene.add(camera);

var sunlight = new THREE.DirectionalLight(0xffffff, 0.8);
scene.add(sunlight);
sunlight.position.set(100, 50, 50);
sunlight.castShadow = true;

var light = new THREE.AmbientLight(0x909098);
scene.add(light);

var earth = new THREE.Object3D();
object.add(earth);
earth.scale.set(150, 150, 150);
earth.position.z = -700;
earth.position.y = 150;

var earthGeometry = new THREE.SphereGeometry(1, 32, 32);
var material = new THREE.MeshPhongMaterial();
material.map = THREE.ImageUtils.loadTexture('earth.jpg');
material.specularMap = THREE.ImageUtils.loadTexture('earth-spec.jpg')
material.specular  = new THREE.Color('grey');
var planet = new THREE.Mesh(earthGeometry, material);
earth.add(planet);
planet.rotation.x = 0;
planet.rotation.y = -Math.PI / 4;

var material = new THREE.MeshPhongMaterial({
  map: THREE.ImageUtils.loadTexture('earth-clouds.png'),
  opacity: 1,
  transparent: true,
  depthWrite: false,
});
var clouds = new THREE.Mesh(earthGeometry, material);
earth.add(clouds);
clouds.scale.set(1.01, 1.01, 1.01);
clouds.rotation.x = -Math.PI / 4;
clouds.rotation.y = Math.PI / 8;

var material2 = new THREE.MeshPhongMaterial({
  map: THREE.ImageUtils.loadTexture('earth-clouds.png'),
  opacity: 1,
  transparent: true,
  depthWrite: false,
});
var clouds2 = new THREE.Mesh(earthGeometry, material2);
earth.add(clouds2);
clouds2.scale.set(1.02, 1.02, 1.02);
clouds2.rotation.x = -Math.PI;
clouds2.rotation.y = -Math.PI / 2;

var starsMaterial = new THREE.MeshBasicMaterial({
  map: THREE.ImageUtils.loadTexture('stars.png'),
  depthWrite: false,
  side: THREE.BackSide,
  shading: THREE.FlatShading,
  color: 'white',
});

var cube = new THREE.CubeGeometry(1500, 1500, 1500);
var stars = new THREE.Mesh(cube, starsMaterial);
object.add(stars);

object.setVisible(false);
scene.add(object);

var chosen = true;
var started = true;
// var chosen = false;
// var started = false;

var pixelRatio = window.devicePixelRatio || 1;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);

document.body.appendChild(renderer.domElement);

var effect = new THREE.StereoEffect(renderer);
effect.eyeSeparation = 0.5;
effect.setSize(window.innerWidth, window.innerHeight);

var up = new THREE.Vector3(0, 1, 0);
var forward = new THREE.Vector3(1, 0, 0);
var across = new THREE.Vector3(0, 0, -1);

var cardboard = false;

var moving = false;

var move = function(e) {
  e.preventDefault();
  moving = true;
};

var stop = function(e) {
  e.preventDefault();
  moving = false;
};

document.querySelector('canvas').addEventListener('mousedown', move);
document.querySelector('canvas').addEventListener('mouseup', stop);

document.querySelector('canvas').addEventListener('touchstart', move);
document.querySelector('canvas').addEventListener('touchend', stop);

var cameraRotation = new THREE.Quaternion();
var planetRotation = new THREE.Quaternion();

camera.acceleration = new THREE.Vector3();
camera.velocity = new THREE.Vector3();
camera.position.y = 105;

var render = function(time) {
  if (started) {
    object.setVisible(true);
  }

  planetRotation.setFromUnitVectors(up, camera.position.clone().normalize());

  camera.quaternion.copy(planetRotation)

  if (sensor) {
    cameraRotation.copy(sensor.getState().orientation);
    camera.quaternion.multiply(sensor.getState().orientation);
  }

  stars.rotation.z = stars.rotation.z + Math.PI / 15000;
  // stars.position.y = stars.position.y + 0.03;
  earth.rotation.z = earth.rotation.z + Math.PI / 15000;
  // earth.position.y = earth.position.y + 0.03;
  clouds.rotation.y = clouds.rotation.x + Math.PI / 35000;
  clouds2.rotation.y = clouds2.rotation.y + Math.PI / 40000;

  var cameraUp = up.clone().applyQuaternion(planetRotation);

  var direction = across.clone().applyQuaternion(cameraRotation);

  // Get a vector of the lateral direction of the camera
  var lateralDirection = direction.cross(up).cross(up);

  if (moving && camera.position.length() < 110) {
    camera.velocity.add(lateralDirection.applyQuaternion(planetRotation).multiplyScalar(-0.002));
    camera.acceleration.add(camera.position.clone().normalize().multiplyScalar(0.00004));
  }

  camera.acceleration.add(camera.position.clone().normalize().multiplyScalar(-0.00003));
  camera.velocity.add(camera.acceleration);
  camera.position.add(camera.velocity);

  if (camera.position.length() < 105) {
    camera.position.normalize().multiplyScalar(105);
    camera.acceleration.set(0, 0, 0);
    camera.velocity.set(0, 0, 0);
  }

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
