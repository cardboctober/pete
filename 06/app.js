var THREE = require('../lib/three-utils')(require('three'));
var _ = require('lodash');

var object = new THREE.Object3D();

var timeout = 0;
var velocity = new THREE.Vector3();
var height = 5;
var stance = new THREE.Vector3();

// var promise = new FULLTILT.getDeviceMotion();
// promise.then(function(deviceMotion) {
//   deviceMotion.start(function(data) {
//     var a = deviceMotion.getScreenAdjustedAcceleration();
//     velocity.add(new THREE.Vector3(a.y, a.x, a.z).multiplyScalar(0.1)).multiplyScalar(0.9);

//     height = height - velocity.x;
//     if (height < 5) height = 5;
//     if (height > 10) height = 10;

//     stance.set(0, height, 0);
//   });
// });

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

object.setVisible(false);

// var chosen = true;
// var started = true;
var chosen = false;
var started = false;

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
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);

document.body.appendChild(renderer.domElement);

var effect = new THREE.StereoEffect(renderer);
effect.eyeSeparation = 0.25;
effect.setSize(window.innerWidth, window.innerHeight);

var up = new THREE.Vector3(0, 1, 0);
var forward = new THREE.Vector3(1, 0, 0);
var across = new THREE.Vector3(0, 0, -1);

scene.add(object);

var cardboard = false;

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
  e.preventDefault();
};

var undraw = function(e) {
  drawing = false;
  if (drawLevel > 0.5) {
    release = true;
    arrow.velocity.copy(across).applyQuaternion(camera.quaternion).multiplyScalar(drawLevel * 2);
    prevTip.set(0, 0, 0);
  }
  e.preventDefault();
};

document.querySelector('canvas').addEventListener('mousedown', draw);
document.querySelector('canvas').addEventListener('mouseup', undraw);

document.querySelector('canvas').addEventListener('touchstart', draw);
document.querySelector('canvas').addEventListener('touchend', undraw);

var prevTip = new THREE.Vector3();

var render = function(time) {
  if (started) {
    object.setVisible(true);
  }

  if (sensor) {
    camera.quaternion.copy(sensor.getState().orientation);
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
      if (point.sub(balloon.position).lengthSq() < 1) {
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
