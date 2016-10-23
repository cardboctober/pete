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
var material = new THREE.MeshNormalMaterial({ overdraw: 0.5 });

var sphereGeometry = new THREE.SphereGeometry(1, 32, 32);

var volume = function() {
  return Math.pow(this.radius, 3) * Math.PI * 4 / 3;
};

var createPlanet = function() {
  var planet = new THREE.Mesh(sphereGeometry, material);
  planet.radius = Math.random() * 5 + 0.5;
  planet.scale.multiplyScalar(planet.radius);
  planet.position.copy(THREE.Vector3.randomUnit()).multiplyScalar(Math.random() * 200);
  planet.velocity = new THREE.Vector3(0, 1, 0).cross(planet.position).multiplyScalar(0.01);
  planet.volume = volume;
  object.add(planet);
  return planet;
}

var planets = _.times(24, createPlanet);

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

var gravity = new THREE.Vector3();

var render = function(time) {
  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
  }

  var direction = across.clone().applyQuaternion(camera.quaternion);
  object.position.copy(direction.clone().multiplyScalar(40));
  // camera.position.copy(planets[0].position);

  planets.map(function(planet1) {
    planets.map(function(planet2) {
      if (planet1 === planet2) return;

      var distSquared = planet1.position.distanceToSquared(planet2.position);
      var minDistSquared = Math.pow(planet1.radius, 2) + Math.pow(planet2.radius, 2);

      gravity.copy(planet2.position)
        .sub(planet1.position)
        .setLength(1 / Math.max(distSquared, minDistSquared))
        .multiplyScalar(0.03 * planet2.volume());
      planet1.velocity.add(gravity);
    });
  });

  planets.map(function(planet) {
    planet.position.add(planet.velocity);

    if (planet.position.lengthSq() > 90000) {
      planet.position.multiplyScalar(-1);
    }
  });

  vrui.renderStereoscopic() ? effect.render(scene, camera) : renderer.render(scene, camera);

  requestAnimationFrame(render);
};

render(0);
