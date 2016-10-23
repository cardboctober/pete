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

document.body.style.minHeight = (window.innerHeight + 100) + 'px';

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
effect.setEyeSeparation(1);

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

var render = function() {
  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
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

  vrui.renderStereoscopic() ? effect.render(scene, camera) : renderer.render(scene, camera);

  requestAnimationFrame(render);
};

render();
