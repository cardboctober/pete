var THREE = require('../lib/three-utils')(require('three'));
var detectSphereCollision = require('../lib/detect-sphere-collision');
var _ = require('lodash');
var socket = io.connect('https://cardboctober-sockets.herokuapp.com/');

var up = new THREE.Vector3(0, 1, 0);
var forward = new THREE.Vector3(1, 0, 0);
var across = new THREE.Vector3(0, 0, -1);

var object = new THREE.Object3D();

var repeat = 60;
var groundMaterial = new THREE.MeshLambertMaterial();
groundMaterial.map = THREE.ImageUtils.loadTexture('sand.jpg');
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
  vertex.z = vertex.z + noise.simplex2(vertex.x / scale, vertex.y / scale);
}

var vertex = planeGeometry.vertices[height / 2 + width / 2 * height];

planeGeometry.computeFaceNormals();
planeGeometry.computeVertexNormals();

object.add(land);


var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
object.add(camera);

var sunlight = new THREE.DirectionalLight(0xffffff, 1);
scene.add(sunlight);
sunlight.position.set(-50, 50, -50).normalize();
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

var chosen = false;
var started = false;

var pixelRatio = window.devicePixelRatio || 1;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);

document.body.appendChild(renderer.domElement);

var effect = new THREE.StereoEffect(renderer);
effect.eyeSeparation = 0.3;
effect.setSize(window.innerWidth, window.innerHeight);

var started = false;
var cardboard = false;

camera.position.y = vertex.z + land.position.y + 0.75;

scene.add(object);

var moving = false;

var raycaster = new THREE.Raycaster(camera.position.clone(), across.clone(), 0, 8);
var casting = false;
var target = false;
var blink = false;

var start = function(e) {
  casting = true;
  e.preventDefault();
};

var stop = function(e) {
  if (target) {
    var endPosition = glow.position.clone();
    endPosition.y += 0.75;
    blink = [camera.position.clone(), endPosition, 0];
  }
  casting = false;
  target = false;
  e.preventDefault();
};

document.querySelector('canvas').addEventListener('mousedown', start);
document.querySelector('canvas').addEventListener('mouseup', stop);

document.querySelector('canvas').addEventListener('touchstart', start);
document.querySelector('canvas').addEventListener('touchend', stop);

var glowMaterial = new THREE.MeshLambertMaterial();
glowMaterial.transparent = true;
glowMaterial.map = THREE.ImageUtils.loadTexture('glow.png');
glowMaterial.side = THREE.DoubleSide;

var glowLight = new THREE.PointLight(0xddddff, 2, 2);
glowLight.position.z = -0.2;

var plane = new THREE.PlaneGeometry(0.5, 0.5);
var glow = new THREE.Mesh(plane, glowMaterial);
glow.add(glowLight);
glow.renderOrder = 1;
object.add(glow);

var createTree = function(index) {
  var treeModel = new Tree({
    "seed": Math.floor(Math.random() * 100000),
    "segments": 10,
    "levels": 5,
    "vMultiplier": 0.66,
    "twigScale": 0.4,
    "initalBranchLength": 0.5,
    "lengthFalloffFactor": 0.85,
    "lengthFalloffPower": 0.99,
    "clumpMax": 0.449,
    "clumpMin": 0.404,
    "branchFactor": 2.75,
    "dropAmount": 0.07,
    "growAmount": -0.005,
    "sweepAmount": 0.01,
    "maxRadius": 0.1,
    "climbRate": 0.2,
    "trunkKink": 0.108,
    "treeSteps": 4,
    "taperRate": 0.876,
    "radiusFalloffRate": 0.7,
    "twistRate": 5,
    "trunkLength": 1.55,
    "trunkMaterial": "TrunkType2",
    "twigMaterial": "BranchType5",
  });

  var model = {};
  model.vertices = Tree.flattenArray(treeModel.verts);
  model.normals = Tree.flattenArray(treeModel.normals);
  model.uvs = [Tree.flattenArray(treeModel.UV)];

  model.faces = [];
  for (var i = 0; i < treeModel.faces.length; i++) {
    var face = treeModel.faces[i];
    model.faces.push(0);
    model.faces.push(face[0]);
    model.faces.push(face[1]);
    model.faces.push(face[2]);
  }

  var loader = new THREE.JSONLoader();
  var treeGeometry = loader.parse(model).geometry;

  treeGeometry.computeFaceNormals();
  treeGeometry.computeVertexNormals();

  var tree = new THREE.Mesh(treeGeometry, new THREE.MeshLambertMaterial({ color: 0x6b4d33 }));

  console.log(index);
  tree.position.set(index * 2 + 4, 0, 0);
  tree.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(up, index));
  tree.quaternion.setFromAxisAngle(up, Math.random() * Math.PI * 2);
  tree.position.y = -2;

  var scale = Math.random() + 1;
  tree.scale.set(scale, scale, scale);
  object.add(tree);
}

_.times(20, createTree);

var render = function(time) {
  if (started) {
    if (sensor) {
      camera.quaternion.copy(sensor.getState().orientation);
    }

    if (blink) {
      camera.position.lerpVectors(blink[0], blink[1], blink[2]);
      blink[2] += 0.05;
      if (blink[2] > 1) {
        camera.position.copy(blink[1]);
        blink = false;
      }
    } else if (casting) {
      raycaster.set(camera.position.clone(), across.clone().applyQuaternion(camera.quaternion));
      var rays = raycaster.intersectObjects([land]);
      if (rays[0] && rays[0].object === land) {
        target = true;
        glow.position.copy(rays[0].point);
        glow.position.y += 0.15;
        var rotation = new THREE.Quaternion().setFromUnitVectors(up, rays[0].face.normal);
        glow.rotation.set(0, 0, 0);
        glow.quaternion.multiply(rotation);
      }
      else {
        target = false;
        glow.position.set(0, -10, 0);
      }
    } else {
      glow.position.set(0, -10, 0);
    }
  }

  if (cardboard && window.orientation !== 0) {
    effect.render(scene, camera);
  }
  else {
    renderer.render(scene, camera)
  }

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
