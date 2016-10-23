var THREE = require('three');
require('../lib/three-utils');
require('../lib/stereo-effect');
var _ = require('lodash');
var FastClick = require('fastclick');
var VrData = require('../lib/vr-data');
require('webvr-polyfill');
var Noise = require('noisejs').Noise;

var VRUI = require('../lib/vrui');

new FastClick(document.body);

var vrData = new VrData();

var object = new THREE.Object3D();

var timeout = 0;
var velocity = new THREE.Vector3();
var height = 5;
var stance = new THREE.Vector3();

var groundMaterial = new THREE.MeshPhongMaterial();
groundMaterial.map = THREE.ImageUtils.loadTexture('grass.jpg');
groundMaterial.normalMap = THREE.ImageUtils.loadTexture('grass-normal.jpg')
groundMaterial.specularMap = THREE.ImageUtils.loadTexture('grass-specular.jpg')
groundMaterial.specular = new THREE.Color(0xffdddd);

var repeat = 60;
groundMaterial.map.wrapS = groundMaterial.map.wrapT = THREE.RepeatWrapping;
groundMaterial.normalMap.wrapS = groundMaterial.normalMap.wrapT = THREE.RepeatWrapping;
groundMaterial.specularMap.wrapS = groundMaterial.specularMap.wrapT = THREE.RepeatWrapping;
groundMaterial.map.repeat.set(repeat, repeat);
groundMaterial.normalMap.repeat.set(repeat, repeat);
groundMaterial.specularMap.repeat.set(repeat, repeat);

var plane = new THREE.PlaneGeometry(2000, 2000, 500, 500);
var floor = new THREE.Mesh(plane, groundMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -10;

var noise = new Noise(Math.random());
var scale = 150;

plane.vertices.map(function(vertex) {
  vertex.z = noise.simplex2(vertex.x / scale, vertex.y / scale) * 5;
});

plane.computeFaceNormals();
plane.computeVertexNormals();

object.add(floor);

var textureLoader = new THREE.TextureLoader();

function createSkyMaterial(path) {
  var texture = textureLoader.load(path);
  var material = new THREE.MeshBasicMaterial({
    map: texture,
    overdraw: 0.5
  });

  return material;
}

var materials = [
  createSkyMaterial('px.jpg'),
  createSkyMaterial('nx.jpg'),
  createSkyMaterial('py.jpg'),
  createSkyMaterial('ny.jpg'),
  createSkyMaterial('pz.jpg'),
  createSkyMaterial('nz.jpg')
];

var mesh = new THREE.Mesh(
  new THREE.BoxGeometry(2000, 2000, 2000, 1, 1, 1),
  new THREE.MeshFaceMaterial(materials)
);

mesh.scale.set(-1, 1, 1);
object.add(mesh);

var bow = new THREE.Object3D();

var geometry = new THREE.CylinderGeometry(0.04, 0.015, 3, 8);
var material = new THREE.MeshLambertMaterial({ color: 0x7f602a });
var top = new THREE.Mesh(geometry, material);
top.position.y = -1.5;
bow.add(top);

var geometry = new THREE.CylinderGeometry(0.015, 0.04, 3, 8);
var material = new THREE.MeshLambertMaterial({ color: 0x7f602a });
var bottom = new THREE.Mesh(geometry, material);
bottom.position.y = 1.5;
bow.add(bottom);

object.add(bow);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 3000);
scene.add(camera);

var light = new THREE.AmbientLight(0x444444);
scene.add(light);

var sunlight = new THREE.DirectionalLight(0xffffff, 0.8);
scene.add(sunlight);
sunlight.position.set(-100, 60, 0);

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

var createBalloon = function() {
  var geometry = new THREE.SphereGeometry(2, 32, 32);
  var material = new THREE.MeshPhongMaterial({ color: 0xff2222 });
  var balloon = new THREE.Mesh(geometry, material);

  balloon.position.copy(THREE.Vector3.randomUnit()).multiplyScalar(120);
  balloon.position.y = noise.simplex2(balloon.position.x / scale, -balloon.position.z / scale) * 5 - 7;
  balloon.scale.y = 1.1;

  object.add(balloon);

  return balloon;
};

var balloons = _.times(40, createBalloon);

var createArrow = function() {
  var arrow = new THREE.Object3D();

  var geometry = new THREE.ConeGeometry(0.08, 0.25, 4);
  var material = new THREE.MeshPhongMaterial({ color: 0x444444 });
  var head = new THREE.Mesh(geometry, material);
  head.position.z = -2.1;
  head.rotation.x = -Math.PI / 2;
  head.rotation.y = -Math.PI / 6;
  head.scale.x = 0.5;
  arrow.add(head);
  arrow.head = head;

  var geometry = new THREE.CylinderGeometry(0.02, 0.02, 2, 8);
  var material = new THREE.MeshLambertMaterial({ color: 0x9f602a });
  var shaft = new THREE.Mesh(geometry, material);
  shaft.position.z = -1;
  shaft.rotation.x = -Math.PI / 2;
  arrow.add(shaft);

  arrow.velocity = new THREE.Vector3();
  object.add(arrow);
  return arrow;
};

var arrow = createArrow();

var gravity = new THREE.Vector3(0, -0.02, 0);

var drawLevel = 0;
var drawing = false;
var release = false;

var draw = function(e) {
  drawing = true;
};

var undraw = function(e) {
  drawing = false;
  if (drawLevel > 0.5) {
    release = true;
    arrow.velocity.copy(across).applyQuaternion(camera.quaternion).multiplyScalar(drawLevel * 2);
    prevTip.set(0, 0, 0);
  }
};

document.querySelector('.wrapper').addEventListener('mousedown', draw);
document.querySelector('.wrapper').addEventListener('mouseup', undraw);

document.querySelector('.wrapper').addEventListener('touchstart', draw);
document.querySelector('.wrapper').addEventListener('touchend', undraw);

var prevTip = new THREE.Vector3();

var render = function(time) {
  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
  }

  var direction = up.clone().applyQuaternion(camera.quaternion);
  camera.position.copy(direction.multiplyScalar(2).sub(stance));

  if (drawing) {
    // camera.position.add(across.clone().applyQuaternion(camera.quaternion).multiplyScalar(0.2));
    drawLevel = Math.min(drawLevel + 0.03, 1);
  } else {
    drawLevel = Math.max(drawLevel - 0.08, 0);
  }

  bow.position.copy(camera.position)
  bow.quaternion.copy(camera.quaternion);
  bow.position.add(new THREE.Vector3(-0.4, -0.25, -1.2).applyQuaternion(bow.quaternion));

  if (release) {
    arrow.velocity.add(gravity);
    arrow.position.add(arrow.velocity);
    arrow.quaternion.setFromUnitVectors(across, arrow.velocity.clone().normalize());
    arrow.head.rotation.y = arrow.head.rotation.y + 0.3;

    var tip = arrow.position.clone().add(arrow.velocity.normalize().multiplyScalar(2.25))
    var line = new THREE.Line3(prevTip, tip);

    balloons.map(function(balloon) {
      var point = line.closestPointToPoint(balloon.position, true);
      if (point.sub(balloon.position).lengthSq() < 4) {
        object.remove(balloon);
      }
    });

    prevTip.copy(tip);

    if (tip.y < noise.simplex2(tip.x / scale, -tip.z / scale) * 5 - 9.5) {
      release = false;
      arrow = createArrow();
    }
  } else {
    arrow.position.copy(camera.position)
    arrow.quaternion.copy(camera.quaternion);
    arrow.position.add(new THREE.Vector3(-0.5, -0.25, -0.5 + drawLevel).applyQuaternion(arrow.quaternion));
  }

  vrui.renderStereoscopic() ? effect.render(scene, camera) : renderer.render(scene, camera);

  requestAnimationFrame(render);
};

render(0);
