var THREE = require('three');
require('../lib/three-utils');
require('../lib/stereo-effect');
require('../lib/mirror');
var _ = require('lodash');
var FastClick = require('fastclick');
var VrData = require('../lib/vr-data');
require('webvr-polyfill');
var Noise = require('noisejs').Noise;
var detectSphereCollision = require('../lib/detect-sphere-collision');

var VRUI = require('../lib/vrui');

new FastClick(document.body);

var vrData = new VrData();

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

camera.position.y = vertex.z + land.position.y + 0.75;

verticalMirror = new THREE.Mirror(renderer, camera, {
  clipBias: 0.003, textureWidth: window.innerWidth, textureHeight: window.innerHeight, color:0x889999
});

var verticalMirrorMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(5, 10), verticalMirror.material);
verticalMirrorMesh.add(verticalMirror);
verticalMirrorMesh.position.y = -2;
verticalMirrorMesh.position.z = -5;
object.add(verticalMirrorMesh);

verticalMirror2 = new THREE.Mirror(renderer, camera, {
  clipBias: 0.003, textureWidth: window.innerWidth, textureHeight: window.innerHeight, color:0x889999
});

var verticalMirrorMesh2 = new THREE.Mesh(new THREE.PlaneBufferGeometry(5, 10), verticalMirror2.material);
verticalMirrorMesh2.add(verticalMirror2);
verticalMirrorMesh2.position.y = -2;
verticalMirrorMesh2.position.z = -6;
verticalMirrorMesh2.rotation.y = Math.PI;
object.add(verticalMirrorMesh2);

verticalMirror3 = new THREE.Mirror(renderer, camera, {
  clipBias: 0.003, textureWidth: window.innerWidth, textureHeight: window.innerHeight, color:0x889999
});

var verticalMirrorMesh3 = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 10), verticalMirror3.material);
verticalMirrorMesh3.add(verticalMirror3);
verticalMirrorMesh3.position.x = 2.5;
verticalMirrorMesh3.position.y = -2;
verticalMirrorMesh3.position.z = -5.5;
verticalMirrorMesh3.rotation.y = Math.PI / 2;
object.add(verticalMirrorMesh3);

verticalMirror4 = new THREE.Mirror(renderer, camera, {
  clipBias: 0.003, textureWidth: window.innerWidth, textureHeight: window.innerHeight, color:0x889999
});

var verticalMirrorMesh4 = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 10), verticalMirror4.material);
verticalMirrorMesh4.add(verticalMirror4);
verticalMirrorMesh4.position.x = -2.5;
verticalMirrorMesh4.position.y = -2;
verticalMirrorMesh4.position.z = -5.5;
verticalMirrorMesh4.rotation.y = 3 * Math.PI / 2;
object.add(verticalMirrorMesh4);

scene.add(object);

var moving = false;

var raycaster = new THREE.Raycaster(camera.position.clone(), across.clone(), 0, 8);
var casting = false;
var target = false;
var blink = false;

var start = function(e) {
  casting = true;
};

var stop = function(e) {
  if (target) {
    var endPosition = glow.position.clone();
    endPosition.y += 0.75;
    blink = [camera.position.clone(), endPosition, 0];
  }
  casting = false;
  target = false;
};

document.querySelector('.wrapper').addEventListener('mousedown', start);
document.querySelector('.wrapper').addEventListener('mouseup', stop);

document.querySelector('.wrapper').addEventListener('touchstart', start);
document.querySelector('.wrapper').addEventListener('touchend', stop);

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

var render = function(time) {
  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
  }

  if (vrui.started) {
    if (blink) {
      camera.position.lerpVectors(blink[0], blink[1], blink[2]);
      blink[2] += 0.05;
      if (blink[2] > 1) {
        camera.position.copy(blink[1]);
        blink = false;
      }
    } else if (casting) {
      raycaster.set(camera.position.clone(), across.clone().applyQuaternion(camera.quaternion));
      var rays = raycaster.intersectObjects([land, verticalMirrorMesh, verticalMirrorMesh2, verticalMirrorMesh3, verticalMirrorMesh4]);
      if (rays[0] && rays[0].object === land) {
        target = true;
        glow.position.copy(rays[0].point);
        glow.position.y += 0.15;
        var rotation = new THREE.Quaternion().setFromUnitVectors(up, rays[0].face.normal);
        glow.rotation.set(0, 0, 0);
        glow.quaternion.multiply(rotation);
      }
      else if (rays[0]) {
        var reflection = across.clone().applyQuaternion(camera.quaternion).reflect(rays[0].face.normal.clone().normalize());
        raycaster.set(rays[0].point.clone(), reflection);
        var rays2 = raycaster.intersectObjects([land]);
        if (rays2[0] && rays2[0].object === land) {
          target = true;
          glow.position.copy(rays2[0].point);
          glow.position.y += 0.15;
          var rotation = new THREE.Quaternion().setFromUnitVectors(up, rays2[0].face.normal.clone().normalize());
          glow.rotation.set(0, 0, 0);
          glow.quaternion.multiply(rotation);
        } else {
          target = false;
          glow.position.set(0, -10, 0);
        }
      }
      else {
        target = false;
        glow.position.set(0, -10, 0);
      }
    } else {
      glow.position.set(0, -10, 0);
    }
  }

  verticalMirror.render();
  verticalMirror2.render();
  verticalMirror3.render();
  verticalMirror4.render();

  if (vrui.renderStereoscopic()) {
    effect.render(scene, camera);
  }
  else {
    renderer.render(scene, camera)
  }

  requestAnimationFrame(render);
};

render(0);
