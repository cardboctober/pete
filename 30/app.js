var THREE = require('three');
require('../lib/three-utils');
require('../lib/stereo-effect');
var _ = require('lodash');
var FastClick = require('fastclick');
var VrData = require('../lib/vr-data');
require('webvr-polyfill/src/main');
var Noise = require('noisejs').Noise;

var VRUI = require('../lib/vrui');

new FastClick(document.body);

var vrData = new VrData();

var object = new THREE.Object3D();

var repeat = 60;
var groundMaterial = new THREE.MeshLambertMaterial();
groundMaterial.map = THREE.ImageUtils.loadTexture('lines.png');
groundMaterial.map.wrapS = groundMaterial.map.wrapT = THREE.RepeatWrapping;
groundMaterial.map.repeat.set(repeat, repeat);

var noise = new Noise(Math.random());

var width = 100;
var height = 100;

var planeGeometry = new THREE.PlaneGeometry(100, 100, width - 1, height - 1);
var land = new THREE.Mesh(planeGeometry, groundMaterial);

land.rotation.x = -Math.PI / 2;
land.position.y = -1;

var scale = 20;

for (var i = 0; i < planeGeometry.vertices.length; i++) {
  var vertex = planeGeometry.vertices[i];
  vertex.z = vertex.z + 3 * noise.simplex2(vertex.x / scale, vertex.y / scale);
}

var createCircle = function(geometry, radius, center, intensity) {
  var radiusSq = Math.pow(radius, 2);

  for (var x = 0; x < width; x++) {
    for (var y = 0; y < height; y++) {
      var vertex = geometry.vertices[x * height + y];
      var position = new THREE.Vector2(vertex.x, vertex.y);
      if (position.sub(center).lengthSq() < radiusSq) {
        vertex.z = vertex.z + Math.sqrt(radiusSq - position.lengthSq()) * intensity;
      }
    }
  }
}

_.times(30, function() {
  createCircle(planeGeometry, Math.random() * 5, new THREE.Vector2(Math.random() * 20 - 10, Math.random() * 20 - 10), 0.1);
});

planeGeometry.computeFaceNormals();
planeGeometry.computeVertexNormals();

object.add(land);

var noise = new Noise(Math.random());

var width = 100;
var height = 100;

var planeGeometry2 = new THREE.PlaneGeometry(100, 100, width - 1, height - 1);
var land2 = new THREE.Mesh(planeGeometry2, groundMaterial);

land2.rotation.z = Math.PI * 2 / 3;
land2.rotation.x = -Math.PI / 2;
land2.position.y = -1;
land2.position.z = 10;

var scale = 20;

for (var i = 0; i < planeGeometry2.vertices.length; i++) {
  var vertex = planeGeometry2.vertices[i];
  vertex.z = vertex.z + noise.simplex2(vertex.x / scale, vertex.y / scale);
}
_.times(30, function() {
  createCircle(planeGeometry2, Math.random() * 5, new THREE.Vector2(Math.random() * 20 - 10, Math.random() * 20 - 10), 0.2);
});

planeGeometry2.computeFaceNormals();
planeGeometry2.computeVertexNormals();

object.add(land2);

var playerHeight = Math.max(
  planeGeometry.vertices[height / 2 + width / 2 * height].z,
  planeGeometry2.vertices[height / 2 + width / 2 * height].z
);

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
scene.add(camera);

var sunlight = new THREE.DirectionalLight(0xffffff, 1);
scene.add(sunlight);
sunlight.position.set(-50, 50, -50).normalize();
sunlight.castShadow = true;

var light = new THREE.AmbientLight(0x444444);
scene.add(light);

var light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(0, 60, 0);
scene.add(light);

scene.add(object);

var chosen = false;
var started = false;

var pixelRatio = window.devicePixelRatio || 1;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(pixelRatio);
renderer.setClearColor(0x000000);
document.querySelector('.wrapper').appendChild(renderer.domElement);

var effect = new THREE.StereoEffect(renderer);
effect.setSize(window.innerWidth, window.innerHeight);
effect.eyeSeparation = 0.5;

var resize = function() {
  var height = window.innerHeight;
  var width = window.innerWidth;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  effect.setSize(width, height);
  renderer.setSize(width, height);
};

window.addEventListener('resize', _.debounce(resize, 50), false);
resize();

var vrui = new VRUI(function(vrui) {
  document.body.style.minHeight = (window.innerHeight + 100) + 'px';
  camera.fov = vrui.stereoscopic ? '70' : '60';
  resize();
});

var up = new THREE.Vector3(0, 1, 0);
var forward = new THREE.Vector3(1, 0, 0);
var across = new THREE.Vector3(0, 0, -1);

var skybox = new THREE.Mesh(
  new THREE.SphereGeometry(50, 6, 6),
  groundMaterial
);

skybox.scale.set(-1, 1, 1);
object.add(skybox);

camera.position.y = playerHeight + land.position.y + 5;

var direction = new THREE.Vector2(0.02, 0);
var render = function(time) {
  groundMaterial.map.offset.add(direction);

  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
  }

  if (vrui.renderStereoscopic()) {
    effect.render(scene, camera);
  }
  else {
    renderer.render(scene, camera);
  }

  requestAnimationFrame(render);
};

render(0);
