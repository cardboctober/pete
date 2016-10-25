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

var up = new THREE.Vector3(0, 1, 0);
var forward = new THREE.Vector3(1, 0, 0);
var across = new THREE.Vector3(0, 0, -1);

var object = new THREE.Object3D();
var templateMaterial = new THREE.MeshNormalMaterial({ overdraw: 0.5 });

var timeout = 0;
var velocity = new THREE.Vector3();
var height = 5;
var stance = new THREE.Vector3();

var hasScreenOrientationAPI = window.screen && window.screen.orientation && window.screen.orientation.angle !== undefined;

window.addEventListener("devicemotion", function(event) {
  var a = event.acceleration;
  var screenOrientation = hasScreenOrientationAPI ? window.screen.orientation.angle : window.orientation || 0;
  if (screenOrientation === 0) {
    var v = new THREE.Vector3(a.y, a.x, a.z);
  }
  else if (screenOrientation === 90) {
    var v = new THREE.Vector3(a.x, a.y, a.z);
  }
  else if (screenOrientation === -90) {
    var v = new THREE.Vector3(-a.x, a.y, a.z);
  }

  velocity.add(v.multiplyScalar(0.1)).multiplyScalar(0.5);

  height = height - velocity.x;
  if (height < 5) height = 5;
  if (height > 10) height = 10;

  stance.set(0, height, 0);
}, false);

var repeat = 10;
var groundMaterial = new THREE.MeshLambertMaterial();
groundMaterial.map = THREE.ImageUtils.loadTexture('rock.png');
groundMaterial.map.wrapS = groundMaterial.map.wrapT = THREE.RepeatWrapping;
groundMaterial.map.repeat.set(repeat, repeat);

var noise = new Noise(Math.random());

var planeWidth = 100;
var planeHeight = 100;

var planeGeometry = new THREE.PlaneGeometry(100, 100, planeWidth - 1, planeHeight - 1);
var land = new THREE.Mesh(planeGeometry, groundMaterial);

land.rotation.x = -Math.PI / 2;
land.position.y = -15;

var noiseScale = 20;

for (var i = 0; i < planeGeometry.vertices.length; i++) {
  var vertex = planeGeometry.vertices[i];
  vertex.z = vertex.z + noise.simplex2(vertex.x / noiseScale, vertex.y / noiseScale);
}

planeGeometry.computeFaceNormals();
planeGeometry.computeVertexNormals();

object.add(land);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.copy(up.clone().multiplyScalar(2).sub(stance));
scene.add(camera);

var enemyCount = 7;

var makeEnemy = function(i) {
  var enemy = new THREE.Object3D();
  var enemyMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
  var cube = new THREE.CubeGeometry(0.6, 0.6, 0.6);
  var head = new THREE.Mesh(cube, enemyMaterial);
  head.position.y = 2.4;
  enemy.add(head);
  var cuboid = new THREE.CubeGeometry(1.2, 2, 0.8);
  var body = new THREE.Mesh(cuboid, enemyMaterial);
  body.position.y = 1;
  enemy.add(body);
  var cuboid2 = new THREE.CubeGeometry(0.4, 0.4, 1.6);
  var arm = new THREE.Mesh(cuboid2, enemyMaterial);
  arm.position.x = 0.85;
  arm.position.y = 1.6;
  arm.position.z = 0.8;
  arm.rotation.y = -0.1;
  enemy.add(arm);
  var cuboid3 = new THREE.CubeGeometry(1, 2.5, 0.6);
  var legs = new THREE.Mesh(cuboid3, enemyMaterial);
  legs.position.y = -1.5;
  enemy.add(legs);

  var shot = new THREE.Object3D();
  var octahedron = new THREE.OctahedronGeometry(0.4, 0);
  var bullet = new THREE.Mesh(octahedron, enemyMaterial);
  bullet.scale.z = 1.5;
  shot.add(bullet);

  var light = new THREE.PointLight(0xffaa00, 1, 20);
  light.position.copy(bullet.position);
  light.position.z = -1;
  shot.add(light);

  enemy.scale.multiplyScalar(2);
  enemy.position.z = -(20 + 20 * Math.random());
  enemy.position.y = -10;
  enemy.rotation.y = Math.PI * 0.8 * i / enemyCount + Math.random() * 0.2 - Math.PI / 2;
  enemy.position.applyQuaternion(enemy.quaternion);
  object.add(enemy);

  var glowTexture = new THREE.ImageUtils.loadTexture('glow.png');
  var glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture, color: 0xffdd99, transparent: false, blending: THREE.AdditiveBlending
  });
  var glow = new THREE.Sprite(glowMaterial);
  glow.position.copy(bullet.position);
  glow.scale.multiplyScalar(2);
  shot.add(glow);

  enemy.updateMatrix();
  enemy.updateMatrixWorld();

  arm.updateMatrix();
  arm.updateMatrixWorld();

  var matrix = new THREE.Matrix4().multiply(arm.parent.matrix);
  shot.position.copy(arm.position).add(new THREE.Vector3(-0.1, 0, 1.1)).applyMatrix4(matrix);
  shot.quaternion.copy(enemy.quaternion);
  shot.setVisible(false);
  object.add(shot);
  enemy.shot = shot;

  return enemy;
};

var enemies = _.times(enemyCount, makeEnemy);

_.shuffle(enemies).map(function(enemy, i) {
  enemy.startTime = Math.round(i * 100 + Math.random() * 20);
});

var sunlight = new THREE.DirectionalLight(0xffffff, 1);
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

scene.add(object);

var gravity = new THREE.Vector3(0, -0.02, 0);

var gravityOn = function(e) {
  gravity.y = -0.02;
};

var gravityOff = function(e) {
  gravity.y = 0;
};

document.querySelector('.wrapper').addEventListener('mousedown', gravityOff);
document.querySelector('.wrapper').addEventListener('mouseup', gravityOn);

document.querySelector('.wrapper').addEventListener('touchstart', gravityOff);
document.querySelector('.wrapper').addEventListener('touchend', gravityOn);

var counter = 0;

var render = function(time) {
  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
  }

  var direction = up.clone().applyQuaternion(camera.quaternion);
  camera.position.copy(direction.multiplyScalar(2)).sub(stance);

  if (vrui.started) {

    enemies.forEach(function(enemy) {
      if (counter === enemy.startTime) {
        enemy.shot.setVisible(true);
        enemy.shot.velocity = camera.position.clone().sub(enemy.shot.position).setLength(0.2);
      }
      if (counter > enemy.startTime) {
        enemy.shot.position.add(enemy.shot.velocity);
      }

      if (camera.position.clone().sub(enemy.shot.position).length() < 0.5) {
        document.querySelector('.damage').classList.add('on');
        document.querySelector('.damage.duplicate').classList.add('on');
        setTimeout(function() {
          document.querySelector('.damage').classList.remove('on');
          document.querySelector('.damage.duplicate').classList.remove('on');
        }, 100);
      }
    });

    counter++;
  }

  vrui.renderStereoscopic() ? effect.render(scene, camera) : renderer.render(scene, camera);

  requestAnimationFrame(render);
};

render(0);
