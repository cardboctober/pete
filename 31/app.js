var THREE = require('three');
require('../lib/three-utils');
require('../lib/stereo-effect');
require('../lib/three-model-loader');
var _ = require('lodash');
var FastClick = require('fastclick');
var VrData = require('../lib/vr-data');
require('webvr-polyfill/src/main');
var Noise = require('noisejs').Noise;

var VRUI = require('../lib/vrui');

new FastClick(document.body);

var vrData = new VrData();

var up = new THREE.Vector3(0, 1, 0);
var forward = new THREE.Vector3(1, 0, 0);
var across = new THREE.Vector3(0, 0, -1);

var object = new THREE.Object3D();

var groundMaterial = new THREE.MeshPhongMaterial();
groundMaterial.map = THREE.ImageUtils.loadTexture('grass.jpg');
groundMaterial.normalMap = THREE.ImageUtils.loadTexture('grass-normal.jpg')
groundMaterial.specularMap = THREE.ImageUtils.loadTexture('grass-specular.jpg')
groundMaterial.specular = new THREE.Color(0xffdddd);
var repeat = 60;
groundMaterial.map.wrapS = groundMaterial.map.wrapT = THREE.RepeatWrapping;
groundMaterial.map.repeat.set(repeat, repeat);

var noise = new Noise(Math.random());

var width = 100;
var height = 100;

var planeGeometry = new THREE.PlaneGeometry(100, 100, width - 1, height - 1);
var land = new THREE.Mesh(planeGeometry, groundMaterial);

land.rotation.x = -Math.PI / 2;
land.position.y = -1;

object.add(land);

var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 0, 5);

var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
object.add(camera);

var sunlight = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(sunlight);
sunlight.position.set(50, 50, 50).normalize();
sunlight.castShadow = true;

var light = new THREE.AmbientLight(0x444444);
scene.add(light);

var starsMaterial = new THREE.MeshBasicMaterial({
  map: THREE.ImageUtils.loadTexture('stars.png'),
  depthWrite: false,
  side: THREE.BackSide,
  shading: THREE.FlatShading,
  color: 'white',
});

var cube = new THREE.CubeGeometry(1000, 1000, 1000);
var stars = new THREE.Mesh(cube, starsMaterial);
object.add(stars);

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

var vertex = planeGeometry.vertices[height / 2 + width / 2 * height];
camera.position.y = vertex.z + land.position.y + 0.75;

scene.add(object);

var loader = new THREE.TGALoader();
var texture = loader.load('cat.tga');
var normal = loader.load('cat-normal.tga');
var material = new THREE.MeshPhongMaterial({
  color: 0xffffff,
  map: texture,
  normalMap: normal,
  shininess: 20,
});

var texture2 = loader.load('cat.tga');
var material2 = new THREE.MeshPhongMaterial({
  color: 0xffffff,
  map: texture2,
  normalMap: normal,
  shininess: 100,
});
material2.map.offset.set(0, 1);

var cat = new THREE.Object3D();
object.add(cat);
cat.position.z = -3;
cat.position.y = -1;
cat.velocity = new THREE.Vector3(0.01, 0, 0);

var loader = new THREE.OBJLoader();
loader.load('cat.obj', function (catMesh) {
  cat.add(catMesh);
  catMesh.children[0].material = material2;
  catMesh.children[1].material = material;
  catMesh.scale.set(0.5, 0.5, 0.5);
});

var createLeg = function() {
  var leg = new THREE.Object3D();
  var sphereGeometry =  new THREE.SphereGeometry(0.017, 8, 8);
  var cylinderGeometry = new THREE.CylinderGeometry(0.012, 0.02, 0.3, 8);
  var coneGeometry = new THREE.CylinderGeometry(0.006, 0.02, 0.3, 8);
  var spiderMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
  var legA = new THREE.Mesh(cylinderGeometry, spiderMaterial);
  legA.rotation.z = Math.PI / 2;
  legA.position.x = -0.15;
  leg.add(legA);
  var jointA = new THREE.Mesh(sphereGeometry, spiderMaterial);
  jointA.position.x = -0.3;
  leg.add(jointA);
  var legB = new THREE.Mesh(cylinderGeometry, spiderMaterial);
  legB.rotation.z = Math.PI / 2;
  legB.position.x = -0.12;
  legB.scale.set(0.85, 0.8, 0.85);
  jointA.add(legB);
  var jointB = new THREE.Mesh(sphereGeometry, spiderMaterial);
  jointB.position.x = -0.24;
  jointB.scale.set(0.75, 0.75, 0.75);
  jointA.add(jointB);
  var legC = new THREE.Mesh(coneGeometry, spiderMaterial);
  legC.rotation.z = Math.PI / 2;
  legC.position.x = -0.124;
  legC.scale.set(0.88, 0.8, 0.88);
  jointB.add(legC);

  leg.rotation.z = -0.3;
  jointA.rotation.z = 0.6;
  jointB.rotation.z = 0.8;

  leg.position.y = 0.2;
  leg.position.z = 0;

  leg.jointA = jointA;
  leg.jointB = jointB;

  cat.add(leg);
  return leg;
};

var legs = _.times(8, createLeg);
legs.map(function(leg, i) {
  leg.rotation.y = 0.45 - Math.floor(i / 2) * 0.3;
  if (i % 2 === 0) {
    leg.rotation.y += Math.PI;
    leg.position.z -= 0.15 - Math.floor(i / 2) * 0.05;
  }
  else {
    leg.position.z -= Math.floor(i / 2) * 0.05;
  }

  leg.rotation.original = leg.rotation.clone();
  leg.jointA.rotation.original = leg.jointA.rotation.clone();
  leg.jointB.rotation.original = leg.jointB.rotation.clone();
});

var t = 0;

var target = new THREE.Vector3();

var render = function(time) {
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

  if (Math.random() > 0.96) {
    target.copy(THREE.Vector3.randomUnit()).multiplyScalar(3 + Math.random() * 2);
  }

  cat.velocity.add(cat.position.clone().sub(target).multiplyScalar(-0.00008));
  if (cat.position.length < 3) {
    cat.velocity.add(cat.position.multiplyScalar(0.00008));
  }
  cat.velocity.y = 0;
  cat.velocity.multiplyScalar(0.998);
  cat.position.add(cat.velocity);
  cat.quaternion.setFromUnitVectors(across, cat.velocity.clone().setLength(-1));

  t -= cat.velocity.length() * 8;

  legs.map(function(leg, i) {
    var side = i % 2 === 0 ? 1 : -1;
    var cadence = i % 4 >= 2 ? 1 : -1;
    leg.rotation.y = leg.rotation.original.y + Math.sin(t) * 0.2 * cadence * side;
    leg.rotation.z = leg.rotation.original.z + Math.cos(t) * 0.08 * cadence;
    leg.jointA.rotation.z = leg.jointA.rotation.original.z - Math.cos(t) * 0.25 * cadence;
    leg.jointB.rotation.z = leg.jointB.rotation.original.z - Math.cos(t) * 0.25 * cadence;
  });

  requestAnimationFrame(render);
};

render(0);
