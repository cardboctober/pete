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

var random = function() {
  return Math.random() * 2 - 1;
};

var object = new THREE.Object3D();
var templateMaterial = new THREE.MeshNormalMaterial({ overdraw: 0.5 });

var extrudeSettings = { steps: 1, bevelEnabled: false, amount: 0.2 };

var points = [
  new THREE.Vector2(0, -0.5),
  new THREE.Vector2(0, 0.5),
  new THREE.Vector2(2, 0.5),
  new THREE.Vector2(2, 1),
  new THREE.Vector2(3, 0),
  new THREE.Vector2(2, -1),
  new THREE.Vector2(2, -0.5),
];

var shape = new THREE.Shape(points);
var geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
var mesh = new THREE.Mesh(geometry, templateMaterial);
mesh.scale.multiplyScalar(5);
mesh.rotation.x = Math.PI / 2;
mesh.rotation.z = -Math.PI / 2;

object.add(mesh);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
scene.add(camera);

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

scene.add(object);

var stars = _.times(300, function() {
  var particle = new THREE.Particle();
  particle.position.copy(THREE.Vector3.randomUnit()).multiplyScalar(Math.random() * 500 + 200);
  scene.add(particle);
  return particle;
});

var previousLateralDirection = across.clone().multiplyScalar(-1);
var angleOffset = 0;

var compassOffset = 0;
var screenOrientationAngle = 0;
var threshold = 0;

var hasScreenOrientationAPI = window.screen && window.screen.orientation && window.screen.orientation.angle !== undefined;

if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', function(eventData) {
    if (threshold < 15) {
      if (event.webkitCompassHeading !== undefined) {
        compassOffset = event.webkitCompassHeading + event.alpha;
        if (compassOffset > 360) compassOffset -= 360;
        compassOffset = compassOffset * 2 * Math.PI / 360;
      }

      screenOrientationAngle = (hasScreenOrientationAPI ? window.screen.orientation.angle : (window.orientation || 0)) * Math.PI * 2 / 360;

      threshold++;
    }
  });
}

var render = function(time) {
  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);

    camera.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(up, -screenOrientationAngle));
    camera.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(up, -compassOffset));
  }

  // document.querySelector('.score').textContent = screenOrientationAngle;
  // document.querySelector('.score.duplicate').textContent = compassOffset;

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
