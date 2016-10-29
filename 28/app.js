var THREE = require('three');
require('../lib/three-utils');
require('../lib/three-water');
require('../lib/stereo-effect');
var _ = require('lodash');
var FastClick = require('fastclick');
var VrData = require('../lib/vr-data');
require('webvr-polyfill/src/main');

var VRUI = require('../lib/vrui');

new FastClick(document.body);

var vrData = new VrData();

var object = new THREE.Object3D();

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
scene.add(camera);

var sunlight = new THREE.DirectionalLight(0xffffff, 1);
scene.add(sunlight);
sunlight.position.set(-50, 50, 50).normalize();
sunlight.castShadow = true;

var light = new THREE.AmbientLight(0x444444);
scene.add(light);

scene.add(object);

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

var canLabelMaterial = new THREE.MeshPhongMaterial({
  color: 'white',
  map: THREE.ImageUtils.loadTexture('beer-label.png'),
  shininess: 100,
  specular: 0xffffff,
});

var canMaterial = new THREE.MeshPhongMaterial({
  color: 0x7a7c80,
  shininess: 100,
  specular: 0xffffff,
});

var beer = new THREE.Object3D();
beer.scale.multiplyScalar(0.1);

var lidMaterial = new THREE.MeshPhongMaterial({
  map: new THREE.ImageUtils.loadTexture('can-lid.png'), shininess: 30, specular: 0xffffff, transparent: true,
});
var lid = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 1.65), lidMaterial);
lid.position.y = 2.2001;
lid.rotation.x = -Math.PI / 2;
beer.add(lid);

var cylinder = new THREE.CylinderGeometry(0.8, 1, 0.2, 16);
var head = new THREE.Mesh(cylinder, canMaterial);
head.position.y = 2.1;
beer.add(head);

var cylinder = new THREE.CylinderGeometry(1, 0.8, 0.2, 16);
var foot = new THREE.Mesh(cylinder, canMaterial);
foot.position.y = -2.1;
beer.add(foot);

var cylinder = new THREE.CylinderGeometry(1, 1, 4, 16, 10);
var shaft = new THREE.Mesh(cylinder, canLabelMaterial);
beer.add(shaft);

object.add(beer);

cylinder.vertices.map(function(vertex, i) {
  vertex.i = i;
  vertex.attached = [];
});

cylinder.faces.map(function(face) {
  cylinder.vertices[face.a].attached.push(
    cylinder.vertices[face.b],
    cylinder.vertices[face.c]
  );
  cylinder.vertices[face.a].attached = _.uniq(cylinder.vertices[face.a].attached);
  cylinder.vertices[face.b].attached.push(
    cylinder.vertices[face.a],
    cylinder.vertices[face.c]
  );
  cylinder.vertices[face.b].attached = _.uniq(cylinder.vertices[face.b].attached);
  cylinder.vertices[face.c].attached.push(
    cylinder.vertices[face.a],
    cylinder.vertices[face.b]
  );
  cylinder.vertices[face.c].attached = _.uniq(cylinder.vertices[face.c].attached);
});

var vertices = _.sampleSize(cylinder.vertices.slice(64, 178 - 64), 7);

var dent = function(vertex) {
  vertex.previous = vertex.clone();
  var direction = new THREE.Vector3(vertex.x, 0, vertex.z);
  var newVertex = vertex.clone().sub(direction.setLength(0.010 + 0.010 * direction.length()));
  if (newVertex.length() < vertex.length()) {
    console.log(newVertex.length(), vertex.length(), vertex);
    vertex.copy(newVertex);
    var cache = {};
    cache[vertex.i] = true;
    traverseVertex(vertex, cache);
  }
};

var traverseVertex = function(vertex, cache) {
  vertex.attached.forEach(function(attached) {
    if (cache[attached.i] || attached.i < 12 || attached.i > 176 - 12) return;
    attached.previous = attached.clone();
    var length = vertex.previous.clone().sub(attached).length();
    var direction = attached.clone().sub(vertex).setLength(length);
    attached.copy(vertex).add(direction);
  });
  vertex.attached.forEach(function(attached) {
    if (cache[attached.i] || attached.i < 12 || attached.i > 176 - 12) return;
    cache[attached.i] = true;
    traverseVertex(attached, cache);
  });
}

renderer.sortObjects = false;

var moving = false;

var start = function(e) {
  moving = true;
};

var stop = function(e) {
  moving = false;
};

document.querySelector('.wrapper').addEventListener('mousedown', start);
document.querySelector('.wrapper').addEventListener('mouseup', stop);

document.querySelector('.wrapper').addEventListener('touchstart', start);
document.querySelector('.wrapper').addEventListener('touchend', stop);

var render = function(time) {
  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
  }

  var direction = across.clone().applyQuaternion(camera.quaternion);
  object.position.copy(direction.clone().multiplyScalar(0.5));

  if (vrui.started) {
    if (moving) {
      if (beer.scale.y > 0.081) {
        vertices.map(dent);
        beer.scale.y = beer.scale.y * 0.997;
      }
      cylinder.verticesNeedUpdate = true;
    }
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
