var THREE = require('../lib/three-utils')(require('three'));
var _ = require('lodash');

var object = new THREE.Object3D();

var texture = THREE.ImageUtils.loadTexture('texture.png');
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(80, 40);

var rockMaterial = new THREE.MeshLambertMaterial({
  map: texture,
  transparent: true,
  opacity: 0.6,
});

var moonMaterial = new THREE.MeshLambertMaterial({
  map: THREE.ImageUtils.loadTexture('moon.jpg'),
  normalMap: THREE.ImageUtils.loadTexture('normal.jpg'),
});

var noise = new Noise(Math.random());

var moonRadius = 200;
var sphere = new THREE.IcosahedronGeometry(moonRadius, 6);

var noiseScale = 12;
var noiseIntensity = 0.015;

sphere.vertices.map(function(vertex) {
  vertex.multiplyScalar(1 + noise.simplex3(vertex.x / noiseScale, vertex.y / noiseScale, vertex.z / noiseScale) * noiseIntensity);
});
sphere.computeFaceNormals();
sphere.computeVertexNormals();

var planet = new THREE.SceneUtils.createMultiMaterialObject(sphere, [moonMaterial, rockMaterial]);
planet.rotation.x = 0;
planet.scale.y = 0.95;

var planet2 = new THREE.SceneUtils.createMultiMaterialObject(sphere, [moonMaterial, rockMaterial]);
planet2.rotation.x = Math.PI / 2;
planet2.rotation.z = Math.PI / 4;
planet2.scale.y = 0.95;

object.add(planet);
object.add(planet2);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);

var sunlight = new THREE.DirectionalLight(0xffffff, 0.8);
scene.add(sunlight);
sunlight.position.set(100, 50, 50);
sunlight.castShadow = true;

var light = new THREE.AmbientLight(0x909098);
scene.add(light);

var earthWrapper = new THREE.Object3D();
var earth = new THREE.Object3D();
earthWrapper.add(earth);
object.add(earthWrapper);
earth.scale.set(400, 400, 400);
earth.position.z = -2000;
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

var cube = new THREE.CubeGeometry(30000, 30000, 30000);
var stars = new THREE.Mesh(cube, starsMaterial);
object.add(stars);

var material = new THREE.LineBasicMaterial({
    color: 0x0000ff,
});

var geometry = new THREE.Geometry();
geometry.vertices.push(new THREE.Vector3(0, 200, 0));
geometry.vertices.push(new THREE.Vector3(0, -200, 0));

var line = new THREE.Line(geometry, material);

// object.add(line);

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

var acrossUp = up.clone().add(across).normalize();

var cardboard = false;

var moving = false;

var baseDirection = across.clone();

var smokes = [];

var cameraRotation = new THREE.Quaternion();
var currentRotation = new THREE.Quaternion();
var planetRotation = new THREE.Quaternion();

var oldPosition = new THREE.Vector3();

var cube = new THREE.Mesh(new THREE.CubeGeometry(5, 8, 5), new THREE.MeshNormalMaterial());
cube.position.y = moonRadius + 4;
cube.acceleration = new THREE.Vector3();
cube.velocity = new THREE.Vector3();

cube.add(camera);
object.add(cube);

var smokeTexture = THREE.ImageUtils.loadTexture('./smoke.png');

var createSmoke = function(position, direction) {
  var smokeMaterial = new THREE.SpriteMaterial({
    map: smokeTexture,
    transparent: true,
    opacity: 0.15,
  });
  var sprite = new THREE.Sprite(smokeMaterial);
  sprite.scale.set(1, 1, 1);

  sprite.velocity = direction.clone().multiplyScalar(20);
  sprite.velocity.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(
    THREE.Vector3.randomUnit(),
    Math.random() * 0.1
  ));

  sprite.position.copy(position).add(position.clone().setLength(1));

  object.add(sprite);
  return sprite;
};

var direction = new THREE.Vector3();

var move = function(e) {
  e.preventDefault();
  baseDirection = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
  moving = true;

  if (cube.position.length() < moonRadius + 5) {
    cube.velocity.add(cube.position.clone().setLength(0.2));
  }
};

var stop = function(e) {
  e.preventDefault();
  moving = false;
};

document.querySelector('canvas').addEventListener('mousedown', move);
document.querySelector('canvas').addEventListener('mouseup', stop);

document.querySelector('canvas').addEventListener('touchstart', move);
document.querySelector('canvas').addEventListener('touchend', stop);

var render = function(time) {
  oldPosition.copy(cube.position);

  var planetDistance = cube.position.length();
  var gravityDirection = cube.position.clone().multiplyScalar(1 / planetDistance);
  var gravity = gravityDirection.multiplyScalar(-0.04 / planetDistance);

  smokes.map(function(smoke) {
    if (smoke.material.opacity <= 0) {
      object.remove(smoke);
      smokes.splice(smokes.indexOf(smoke), 1);
      return;
    }
    smoke.velocity.add(gravity);
    smoke.position.add(smoke.velocity);
    smoke.material.opacity -= 0.0002;

    if (smoke.position.lengthSq() < Math.pow(moonRadius + 2)) {
      smoke.position.setLength(moonRadius + 2);
    }
  });

  if (moving /*&& camera.position.length() < 110*/) {
    // camera.velocity.add(lateralDirection.applyQuaternion(planetRotation).multiplyScalar(0.002));
    //camera.quaternion.multiply(sensor.getState().orientation); camera.acceleration.add(camera.position.clone().normalize().multiplyScalar(0.00004));
    cube.velocity.add(direction.multiplyScalar(0.005));
    // cube.velocity.sub(gravityDirection.clone().multiplyScalar(1.2));

    var smoke = createSmoke(cube.position, direction.multiplyScalar(-1));
    smokes.push(smoke);
    smoke.velocity.add(cube.velocity)

    var smoke2 = createSmoke(cube.position, direction.multiplyScalar(-1));
    smokes.push(smoke2);
    smoke2.velocity.add(cube.velocity)
  }

  rockMaterial.opacity = Math.min(Math.max((500 - cube.position.length()) / 500, 0.1), 0.6);

  cube.velocity.add(gravity);
  cube.position.add(cube.velocity);

  if (cube.position.length() < moonRadius + 4) {
    cube.position.setLength(moonRadius + 4);
    cube.velocity.reflect(gravityDirection).multiplyScalar(0.9);
  }

  currentRotation.setFromUnitVectors(oldPosition.normalize(), cube.position.clone().normalize());
  planetRotation.premultiply(currentRotation);
  // camera.quaternion.copy(planetRotation);
  // camera.updateMatrix()

  if (sensor) {
    cameraRotation.copy(sensor.getState().orientation);
  }

  var cameraDirection = across.clone().applyQuaternion(camera.quaternion);
  var lateralDirection = cameraDirection.cross(up).cross(up).normalize();
  var lateralRotation = new THREE.Quaternion().setFromUnitVectors(lateralDirection, up);

  stars.rotation.z = stars.rotation.z + Math.PI / 15000;
  // stars.position.y = stars.position.y + 0.03;
  earth.rotation.z = earth.rotation.z + Math.PI / 15000;
  // earth.position.y = earth.position.y + 0.03;
  clouds.rotation.y = clouds.rotation.x + Math.PI / 35000;
  clouds2.rotation.y = clouds2.rotation.y + Math.PI / 40000;

  earthWrapper.position.copy(cube.position);
  stars.position.copy(cube.position);

  // var cameraUp = up.clone().applyQuaternion(planetRotation);

  direction = across.clone().applyQuaternion(cameraRotation).applyQuaternion(planetRotation);

  camera.quaternion.copy(cameraRotation);
  cube.quaternion.copy(planetRotation);

  // Get a vector of the lateral direction of the camera
  // var lateralDirection = direction//.cross(up).cross(up);

  // var gravity = cube.position.clone().setLength(-10 / cube.position.lengthSq());
  // cube.acceleration.copy(gravity);

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
