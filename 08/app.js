var THREE = require('three');
require('../lib/three-utils');
require('../lib/stereo-effect');
var _ = require('lodash');
var FastClick = require('fastclick');
var VrData = require('../lib/vr-data');
require('webvr-polyfill');

var VRUI = require('../lib/vrui');

new FastClick(document.body);

var vrData = new VrData();

var object = new THREE.Object3D();

var smokeTexture = THREE.ImageUtils.loadTexture('./smoke.png');

var smokeDirection = THREE.Vector3.randomUnit();

var createSmoke = function() {
  var smokeMaterial = new THREE.SpriteMaterial({
    map: smokeTexture,
    transparent: true,
    opacity: 0.1,
  });
  var sprite = new THREE.Sprite(smokeMaterial);
  sprite.scale.set(3, 3, 1);

  sprite.position.copy(THREE.Vector3.randomUnit()).setLength(9);

  sprite.rotationSpeed = Math.random() * 0.015 + 0.005;

  object.add(sprite);
  return sprite;
};

var smokes = _.times(500, createSmoke);

var material = new THREE.MeshNormalMaterial({ overdraw: 0.5 });
var geometry = new THREE.CubeGeometry(4, 4, 4);
var cube = new THREE.Mesh(geometry, material);

cube.rotation.y = Math.PI / 4;
cube.rotation.x = Math.PI / 4;

object.add(cube);

var chosen = false;
var started = false;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
scene.add(camera)

var pixelRatio = window.devicePixelRatio || 1;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(pixelRatio);
renderer.setClearColor(0x000000);
document.querySelector('.wrapper').appendChild(renderer.domElement);

var effect = new THREE.StereoEffect(renderer);
effect.setSize(window.innerWidth, window.innerHeight);
effect.setEyeSeparation(0.1);

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
  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
  }

  smokes.map(function(smoke) {
    smoke.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(
      smokeDirection,
      smoke.rotationSpeed
    ));
  });

  smokeDirection.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    0.003
  ));

  var direction = across.clone().applyQuaternion(camera.quaternion);
  object.position.copy(direction.clone().multiplyScalar(40));

  // Get a vector of the lateral direction of the camera
  var lateralDirection = direction.cross(up).cross(up);
  // Get the lateral angle of the camera
  var angle = (lateralDirection.angleTo(forward) > Math.PI / 2 ? 1 : -1) * lateralDirection.angleTo(across);

  previousLateralDirection = lateralDirection.clone();

  lateralDirection.applyAxisAngle(up, angleOffset);

  vrui.renderStereoscopic() ? effect.render(scene, camera) : renderer.render(scene, camera);

  requestAnimationFrame(render);
};

render(0);
