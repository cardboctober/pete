var THREE = require('three');
require('../lib/three-utils');
require('../lib/three-water');
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

var randomNoise = function(width, height) {
  var noise = document.createElement('canvas');
  noise.width = width;
  noise.height = height;

  var context = noise.getContext("2d");
  var imageData = context.getImageData(0, 0, noise.width, noise.height);
  var pixels = imageData.data;

  for (var i = 0; i < pixels.length; i += 4) {
    pixels[i] = pixels[i+1] = pixels[i+2] = (Math.random() * 256) | 0;
    pixels[i+3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  return noise;
};

var perlinNoise = function(width, height, persistence) {
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  var context = canvas.getContext('2d');

  var noise = randomNoise(width, height);

  var ratio = width / height;

  /* Scale random iterations onto the canvas to generate Perlin noise. */
  for (var size = 2; size <= height; size *= 2) {
    var x = (Math.random() * (width - size)) | 0;
    var y = (Math.random() * (height - size)) | 0;
    context.globalAlpha = 1 / persistence / size;
    context.drawImage(noise, Math.max(x, 0), y, size * ratio, size, 0, 0, width, height);
  }

  return canvas.getContext('2d').getImageData(0, 0, width, height).data;
};

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

var createCircle = function(radius, center, intensity) {
  var radiusSq = Math.pow(radius, 2);

  for (var x = 0; x < width; x++) {
    for (var y = 0; y < height; y++) {
      var vertex = planeGeometry.vertices[x * height + y];
      var position = new THREE.Vector2(vertex.x, vertex.y);
      if (position.sub(center).lengthSq() < radiusSq) {
        vertex.z = vertex.z + Math.sqrt(radiusSq - position.lengthSq()) * intensity;
      }
    }
  }
}

createCircle(Math.random() * 30, new THREE.Vector2(0, 0), 0.05);

_.times(30, function() {
  createCircle(Math.random() * 20, new THREE.Vector2(Math.random() * 40 - 20, Math.random() * 40 - 20), 0.05);
});

var vertex = planeGeometry.vertices[height / 2 + width / 2 * height];

planeGeometry.computeFaceNormals();
planeGeometry.computeVertexNormals();

object.add(land);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
scene.add(camera);

var sunlight = new THREE.DirectionalLight(0xffffff, 0.8);
scene.add(sunlight);
sunlight.position.set(-50, 50, -50).normalize();
sunlight.castShadow = true;

var light = new THREE.AmbientLight(0x666666);
scene.add(light);

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

var skybox = new THREE.Mesh(
  new THREE.BoxGeometry(4000, 4000, 4000, 1, 1, 1),
  new THREE.MeshFaceMaterial(materials)
);

skybox.scale.set(-1, 1, 1);
object.add(skybox);
scene.add(object);

var chosen = false;
var started = false;

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
var cardboard = false;

var waterNormal = new THREE.ImageUtils.loadTexture('water-normal.jpg');
waterNormal.wrapS = waterNormal.wrapT = THREE.RepeatWrapping;

// Create the water effect
var water = new THREE.Water(renderer, camera, scene, {
  textureWidth: 256,
  textureHeight: 256,
  waterNormals: waterNormal,
  alpha: 1.0,
  sunDirection: sunlight.position,
  sunColor: 0xffffff,
  waterColor: 0x001e0f,
  betaVersion: 0,
  side: THREE.DoubleSide,
});

var sea = new THREE.Mesh(
  new THREE.PlaneBufferGeometry(3000, 3000, 100, 100),
  water.material
);
sea.add(water);
sea.rotation.x = -Math.PI * 0.5;

scene.add(sea);

camera.position.y = vertex.z + land.position.y + 0.75;

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

renderer.callback = function(scene, camera) {
  water.render();
  renderer.render(scene, camera);
};

var render = function(time) {
  water.material.uniforms.time.value += 0.5 / 60.0;

  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
  }

  water.render();
  vrui.renderStereoscopic() ? effect.render(scene, camera) : renderer.render(scene, camera);

  requestAnimationFrame(render);
};

render(0);
