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

var texture = THREE.ImageUtils.loadTexture('grass.jpg');
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(30, 20);

var grassMaterial = new THREE.MeshLambertMaterial({
  map: texture,
});

var noise = new Noise();

var moonRadius = 10;
var sphere = new THREE.IcosahedronGeometry(moonRadius, 6);

var noiseScale = 30;
var noiseIntensity = 0.01;

sphere.vertices.map(function(vertex) {
  vertex.multiplyScalar(1 + noise.simplex3(vertex.x / noiseScale, vertex.y / noiseScale, vertex.z / noiseScale) * noiseIntensity);
});
sphere.computeFaceNormals();
sphere.computeVertexNormals();

var planet = new THREE.SceneUtils.createMultiMaterialObject(sphere, [grassMaterial]);
planet.rotation.x = 0;
planet.scale.y = 0.95;

var planet2 = new THREE.SceneUtils.createMultiMaterialObject(sphere, [grassMaterial]);
planet2.rotation.x = Math.PI / 2;
planet2.rotation.z = Math.PI / 4;
planet2.scale.y = 0.95;

object.add(planet);
object.add(planet2);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);

var sunlight = new THREE.DirectionalLight(0xffffff, 0.2);
scene.add(sunlight);
sunlight.position.set(100, 50, 50);
sunlight.castShadow = true;

var light = new THREE.AmbientLight(0xb0b0b8);
scene.add(light);

var starsMaterial = new THREE.MeshBasicMaterial({
  map: THREE.ImageUtils.loadTexture('stars.png'),
  depthWrite: false,
  side: THREE.BackSide,
  shading: THREE.FlatShading,
  color: 'white',
});

var cube = new THREE.CubeGeometry(30000, 30000, 30000);
var stars = new THREE.Mesh(cube, starsMaterial);
object.add(stars);

var material = new THREE.LineBasicMaterial({
    color: 0x0000ff,
});

var geometry = new THREE.Geometry();
geometry.vertices.push(new THREE.Vector3(0, 200, 0));
geometry.vertices.push(new THREE.Vector3(0, -200, 0));

scene.add(object);

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

var acrossUp = up.clone().add(across).normalize();

var moving = false;

var cameraRotation = new THREE.Quaternion();
var currentRotation = new THREE.Quaternion();
var planetRotation = new THREE.Quaternion();

var oldPosition = new THREE.Vector3();

var cube = new THREE.Mesh(new THREE.CubeGeometry(5, 8, 5), new THREE.MeshNormalMaterial());
cube.position.y = moonRadius + 4;
cube.acceleration = new THREE.Vector3();
cube.velocity = new THREE.Vector3();

var geometry = new THREE.PlaneGeometry(3, 3);
var texture = THREE.ImageUtils.loadTexture('grass-sprite-1.png');
var material = new THREE.MeshPhongMaterial({
  map: texture,
  transparent: true,
  side: THREE.DoubleSide,
  shininess: 60,
});

var makeGrass = function() {
  var tuft = new THREE.Object3D();
  var grass = new THREE.Mesh(geometry, material);
  tuft.add(grass);
  var grass = new THREE.Mesh(geometry, material);
  grass.rotation.y = Math.PI * 2 / 3
  tuft.add(grass);
  var grass = new THREE.Mesh(geometry, material);
  grass.rotation.y = Math.PI * 2 * 2 / 3;
  tuft.add(grass);

  tuft.position.y = moonRadius;
  var rotation = new THREE.Quaternion().setFromUnitVectors(up, THREE.Vector3.randomUnit());
  tuft.position.applyQuaternion(rotation);
  tuft.quaternion.copy(rotation);
  object.add(tuft);
  return tuft;
}

_.times(800, makeGrass);

cube.add(camera);
object.add(cube);

var direction = new THREE.Vector3();

var move = function(e) {
  if (vrui.started) {
    moving = true;
  }
};

var stop = function(e) {
  if (cube.position.length() < moonRadius + 5) {
    cube.velocity.add(cube.position.clone().setLength(1));
    cube.velocity.add(direction.clone().multiplyScalar(0.5));
  }
  moving = false;
};

document.querySelector('.wrapper').addEventListener('mousedown', move);
document.querySelector('.wrapper').addEventListener('mouseup', stop);

document.querySelector('.wrapper').addEventListener('touchstart', move);
document.querySelector('.wrapper').addEventListener('touchend', stop);

var render = function(time) {
  oldPosition.copy(cube.position);

  var planetDistance = cube.position.length();
  var gravityDirection = cube.position.clone().multiplyScalar(1 / planetDistance);
  var gravity = gravityDirection.multiplyScalar(-0.6 / planetDistance);

  cube.velocity.add(gravity);
  cube.position.add(cube.velocity);

  var flying = true;

  if (cube.velocity.length() > 1) {
    cube.velocity.setLength(1);
  }

  if (cube.position.length() <= moonRadius + 4) {
    cube.velocity.multiplyScalar(0);
    cube.position.setLength(moonRadius + 4);
    flying = false;
  }

  currentRotation.setFromUnitVectors(oldPosition.normalize(), cube.position.clone().normalize());
  planetRotation.premultiply(currentRotation);

  if (vrData.enabled()) {
    var data = vrData.getData();
    cameraRotation.fromArray(data.orientation);
  }

  var cameraDirection = across.clone().applyQuaternion(camera.quaternion);
  var lateralDirection = cameraDirection.cross(up).cross(up).normalize();
  var lateralRotation = new THREE.Quaternion().setFromUnitVectors(lateralDirection, up);

  if (moving && !flying) {
    direction = across.clone().applyQuaternion(cameraRotation).applyQuaternion(planetRotation);
    cube.velocity.add(direction.multiplyScalar(0.3));
  }

  stars.rotation.z = stars.rotation.z + Math.PI / 15000;

  direction = across.clone().applyQuaternion(cameraRotation).applyQuaternion(planetRotation);

  camera.quaternion.copy(cameraRotation);
  cube.quaternion.copy(planetRotation);

  vrui.renderStereoscopic() ? effect.render(scene, camera) : renderer.render(scene, camera);

  requestAnimationFrame(render);
};

render(0);
