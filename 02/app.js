var THREE = require('../lib/three-utils')(require('three'));
var _ = require('lodash');

var object = new THREE.Object3D();

var texture = THREE.ImageUtils.loadTexture('texture.png');
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(20, 20);

var templateMaterial = new THREE.MeshLambertMaterial({ map: texture });

var randomNoise = function(width, height) {
  var noise = document.createElement('canvas');
  noise.width = width;
  noise.height = height;

  var context = noise.getContext("2d");
  var imageData = context.getImageData(0, 0, noise.width, noise.height);
  var pixels = imageData.data;

  for (var i = 0; i < pixels.length; i += 4) {
    pixels[i] = pixels[i+1] = pixels[i+2] = (Math.random() * 256) | 0;
    pixels[i+3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  return noise;
};

var perlinNoise = function(width, height, persistence) {
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  var context = canvas.getContext('2d');

  var noise = randomNoise(width, height);

  var ratio = width / height;

  /* Scale random iterations onto the canvas to generate Perlin noise. */
  for (var size = 2; size <= height; size *= 2) {
    var x = (Math.random() * (width - size)) | 0;
    var y = (Math.random() * (height - size)) | 0;
    context.globalAlpha = 1 / persistence / size;
    context.drawImage(noise, Math.max(x, 0), y, size * ratio, size, 0, 0, width, height);
  }

  return canvas.getContext('2d').getImageData(0, 0, width, height).data;
};

var width = 150;
var height = 150;
var noise = perlinNoise(width, height, 0.25);

var planeGeometry = new THREE.PlaneGeometry(30, 30, width - 1, height - 1);
var plane = new THREE.Mesh(planeGeometry, templateMaterial);

plane.rotation.x = -Math.PI / 2;

for (var i = 0; i < planeGeometry.vertices.length; i++) {
  var vertex = planeGeometry.vertices[i];
  var noiseHeight = noise[i * 4] / 255;
  vertex.z = vertex.z + noiseHeight * 5;
}

var radiusSq = Math.pow(13, 2);
var center = new THREE.Vector2(0, 0);

for (var x = 0; x < width; x++) {
  for (var y = 0; y < height; y++) {
    var vertex = planeGeometry.vertices[x * height + y];
    var position = new THREE.Vector2(vertex.x, vertex.y);
    if (position.sub(center).lengthSq() < radiusSq) {
      vertex.z = vertex.z + Math.sqrt(radiusSq - position.lengthSq()) / 5;
    }
  }
}

radiusSq = Math.pow(10, 2);
center = new THREE.Vector2(0, 0);

for (var x = 0; x < width; x++) {
  for (var y = 0; y < height; y++) {
    var vertex = planeGeometry.vertices[x * height + y];
    var position = new THREE.Vector2(vertex.x, vertex.y);
    if (position.sub(center).lengthSq() < radiusSq) {
      vertex.z = vertex.z - Math.sqrt(radiusSq - position.lengthSq()) / 2;
    }
  }
}

var vertex = planeGeometry.vertices[height / 2 + width / 2 * height];
plane.position.y = -vertex.z - 0.75;

planeGeometry.computeFaceNormals();
planeGeometry.computeVertexNormals();

object.add(plane);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
scene.add(camera);

var sunlight = new THREE.DirectionalLight(0xffffff, 0.8);
scene.add(sunlight);
sunlight.position.set(100, 50, 50);
sunlight.castShadow = true;

var light = new THREE.AmbientLight(0x202028);
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

var chosen = false;
var started = false;

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

var started = false;
var cardboard = false;

var previousLateralDirection = across.clone().multiplyScalar(-1);
var angleOffset = 0;

var render = function(time) {
  if (started) {
    object.setVisible(true);
  }

  if (sensor) {
    camera.quaternion.copy(sensor.getState().orientation);
  }

  stars.rotation.z = stars.rotation.z + Math.PI / 20000;
  stars.position.y = stars.position.y + 0.03;
  earth.rotation.z = earth.rotation.z + Math.PI / 20000;
  earth.position.y = earth.position.y + 0.03;
  clouds.rotation.y = clouds.rotation.x + Math.PI / 35000;
  clouds2.rotation.y = clouds2.rotation.y + Math.PI / 40000;

  var direction = across.clone().applyQuaternion(camera.quaternion);
  object.position.copy(direction.clone().multiplyScalar(0));

  // Get a vector of the lateral direction of the camera
  var lateralDirection = direction.cross(up).cross(up);
  // Get the lateral angle of the camera
  var angle = (lateralDirection.angleTo(forward) > Math.PI / 2 ? 1 : -1) * lateralDirection.angleTo(across);

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
