var THREE = require('three');
require('../lib/three-utils');
require('../lib/stereo-effect');
require('../lib/postprocessing');
require('../lib/three-model-loader');
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

var noiseScale = 20;

for (var i = 0; i < planeGeometry.vertices.length; i++) {
  var vertex = planeGeometry.vertices[i];
  vertex.z = vertex.z + noise.simplex2(vertex.x / noiseScale, vertex.y / noiseScale);
}

planeGeometry.computeFaceNormals();
planeGeometry.computeVertexNormals();

object.add(land);


var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
object.add(camera);

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

var chosen = false;
var started = false;

var pixelRatio = window.devicePixelRatio || 1;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(pixelRatio);
renderer.setClearColor(0x000000);
document.querySelector('.wrapper').appendChild(renderer.domElement);

var composer = new THREE.EffectComposer(renderer);
var renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);

var composer2 = new THREE.EffectComposer(renderer);
composer2.addPass(new THREE.RenderPass(scene, camera));

var shader = {
  uniforms: {
    tDiffuse: { type: 't', value: null },
    tColor: { type: 't', value: null },
    resolution: { type: 'v2', value: new THREE.Vector2( 1, 1 ) },
    viewProjectionInverseMatrix: { type: 'm4', value: new THREE.Matrix4() },
    previousViewProjectionMatrix: { type: 'm4', value: new THREE.Matrix4() },
    velocityFactor: { type: 'f', value: 1 }
  },
  vertexShader: document.getElementById('vs-motionBlur').textContent,
  fragmentShader: document.getElementById('fs-motionBlur').textContent,
};

var shaderPass = new THREE.ShaderPass(shader);
shaderPass.renderToScreen = true;
composer.addPass(shaderPass);

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
  composer.setSize(width, height);
  composer2.setSize(width, height);
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

var moving = false;

var raycaster = new THREE.Raycaster(camera.position.clone(), across.clone(), 0, 12);
var casting = false;
var target = false;
var blink = false;

var shouting = false;

var shout = function(all) {
  shouting = true;
  setTimeout(function() { shouting = false; }, 400);
  var cameraDirection = forward.clone().applyQuaternion(camera.quaternion);
  var cameraNormalDirection = across.clone().applyQuaternion(camera.quaternion);
  chickens.map(function(chicken) {
    var chickenDirection = chicken.position.clone().sub(camera.position);
    var chickenDistance = chickenDirection.length();
    chickenDirection.multiplyScalar(1 / chickenDistance);
    var amount = cameraDirection.dot(chickenDirection);
    var sign = cameraNormalDirection.dot(chickenDirection) > 0;
    if (all || (sign && Math.abs(amount) < 0.7 && chickenDistance < 10)) {
      chicken.dead = true;
      chicken.velocity.add(chickenDirection.multiplyScalar(0.2 + 0.2 * Math.random()));
    }
  });
};

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

var listening = false;

var found = false;

var Recognition = window.webkitSpeechRecognition || window.SpeechRecognition;

var startListening = function() {
  var recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.maxAlternatives = 10;
  recognition.start();

  found = false;

  recognition.onend = function() {
    listening = false;
    startListening();
  };

  recognition.onresult = function(event) {
    var results = event.results[0][0].transcript.toLowerCase();

    if (results === 'busradar') {
      if (!found) {
        found = true;
        shout();
      }
      return;
    }

    var matches = [
      ['bus', 'fosse', 'fos', 'foss', 'fox', 'voss', 'boss', 'bos', 'first', 'force', 'forced', 'foster', 'fast', 'crossroads', 'vostro', 'horse', 'fastroad'],
      ['ro', 'road', 'roald', 'roll', 'dell', 'router', 'route', 'radar', 'are'],
      ['r', 'dah', 'da', 'dar', 'dahl', 'are', 'art', 'bath', 'dark'],
    ];

    var words = results.split(' ').filter(function(word, i) {
      return matches[i] && matches[i].indexOf(word) !== -1;
    });

    if (words.length === 2 || words.length === 3) {
      if (!found) {
        found = true;
        shout();
      }
      return;
    }
  };
};

if (Recognition) {
  startListening();
} else {
  alert('Sorry, your device doesn\'t support speech recognition');
}

var chickenTemplate = {};

var mtlLoader = new THREE.MTLLoader();
mtlLoader.load('chicken.mtl', function(materials) {
  materials.preload();

  var objLoader = new THREE.OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load('chicken.obj', function(group) {
    chickenTemplate.loaded = true;
    chickenTemplate.geometry = group.children[0].geometry;
    chickenTemplate.material = group.children[0].material;
  });
});

var separation = function(boid, boids, radius, intensity) {
  var distance;
  var posSum = new THREE.Vector3();
  var repulse = new THREE.Vector3();

  for (var i = 0; i < boids.length; i++) {
    if (Math.random() > 0.6) continue;

    distance = boids[i].position.distanceTo(boid.position);

    if (distance > 0 && distance <= boid.radius + boids[i].radius) {
      repulse.subVectors(boid.position, boids[i].position);
      repulse.normalize();
      repulse.divideScalar(distance);
      posSum.add(repulse);
    }
  }

  var l = posSum.length();

  if (l > (intensity)) {
    posSum.divideScalar(l / (intensity));
  }

  return posSum;
};

var chickens = [];

// Do count your chickens
var count = 0;

var gravity = new THREE.Vector3(0, -0.003, 0);

var mCurrent = new THREE.Matrix4();
var mPrev = new THREE.Matrix4();
var tmpArray = new THREE.Matrix4();

var depthMaterial = new THREE.ShaderMaterial({
  uniforms: {
    mNear: { type: 'f', value: camera.near },
    mFar: { type: 'f', value: camera.far },
    opacity: { type: 'f', value: 1 }
  },

  vertexShader: document.getElementById('vs-depthRender').textContent,
  fragmentShader: document.getElementById('fs-depthRender').textContent
});

camera.radius = 1;

var soundFile = document.createElement('audio');
soundFile.preload = 'auto';
var src = document.createElement('source');
src.src = 'fusrodah.mp3';
soundFile.appendChild(src);

soundFile.load();
soundFile.volume = 0;
soundFile.play();

var play = function() {
  soundFile.currentTime = 0.01;
  soundFile.volume = 1;
  soundFile.play();
  setTimeout(function() {
    shout(true);
    setTimeout(function() {
      document.querySelector('.mic1').classList.remove('hidden');
      document.querySelector('.mic2').classList.remove('hidden');
    }, 500);
  }, 9200);
};

var prevStarted = vrui.started;

var render = function(time) {
  shaderPass.material.uniforms.velocityFactor.value = shouting || blink ? 0.4 : 0;

  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
  }

  if (vrui.started && !prevStarted) {
    prevStarted = vrui.started;
    play();
  }

  if (vrui.started) {
    if (chickenTemplate.loaded && chickens.length < 60 && Math.random() > 0.9) {
      var chicken = new THREE.Mesh(chickenTemplate.geometry, chickenTemplate.material);
      var scale = count * 0.001 + 0.1 + 0.1 * Math.random();
      chicken.scale.set(scale, scale, scale);
      chicken.radius = scale * 2;
      object.add(chicken);

      chicken.velocity = new THREE.Vector3();
      chicken.drift = Math.random() * 2 - 1;

      chicken.position.x = Math.random() * 1 - 0.5;
      chicken.position.z = Math.random() * 1 - 0.5;
      chicken.position.setLength(Math.random() * 20 + 20)
      chicken.position.y = noise.simplex2(chicken.position.x / noiseScale, -chicken.position.z / noiseScale) - 1;

      chickens.push(chicken);
      count++;
    }

    chickens.forEach(function(chicken, i) {
      var direction = chicken.position.clone().sub(camera.position);

      if (chicken.dead) {
        chicken.rotation.x -= Math.random() * 0.2;
        chicken.rotation.y += Math.random() * 0.2;
      }

      else {
        chicken.velocity.add(direction.clone().multiplyScalar(-0.0002));
        chicken.velocity.add(chicken.velocity.clone().cross(up).setLength(chicken.drift * 0.0005));
        chicken.velocity.multiplyScalar(0.95);

        chicken.velocity.add(separation(chicken, chickens.concat([camera]), 0.75, 0.0075));

        direction.y = 0;
        chicken.quaternion.setFromUnitVectors(across, direction.normalize());
      }

      if (chicken.position.y <= noise.simplex2(chicken.position.x / noiseScale, -chicken.position.z / noiseScale) - 1) {
        chicken.velocity.y = chicken.dead ? 0.2 : 0.1;
      }

      chicken.velocity.add(gravity);
      chicken.position.add(chicken.velocity);

      if (chicken.position.lengthSq() > 15000) {
        object.remove(chicken);
        chickens.splice(i, 1);
      }
    });

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

  tmpArray.copy(camera.matrixWorldInverse);
  tmpArray.multiply(camera.projectionMatrix);
  mCurrent.getInverse(tmpArray);

  shaderPass.material.uniforms.viewProjectionInverseMatrix.value.copy(mCurrent);
  shaderPass.material.uniforms.previousViewProjectionMatrix.value.copy(mPrev);

  if (vrui.renderStereoscopic()) {
    renderer.callback = function(scene, camera) {
      composer2.render();
      shaderPass.material.uniforms.tColor.value = composer2.renderTarget2;

      chickens.forEach(function(chicken) {
        chicken.material = depthMaterial;
      });
      land.material = depthMaterial;
      stars.material = depthMaterial;

      composer.render(scene, camera);

      chickens.forEach(function(chicken) {
        chicken.material = chickenTemplate.material;
      });
      land.material = groundMaterial;
      stars.material = starsMaterial;
    }
    effect.render(scene, camera);
  }
  else {
    composer2.render();
    shaderPass.material.uniforms.tColor.value = composer2.renderTarget2;

    chickens.forEach(function(chicken) {
      chicken.material = depthMaterial;
    });
    land.material = depthMaterial;
    stars.material = depthMaterial;

    composer.render(scene, camera);

    chickens.forEach(function(chicken) {
      chicken.material = chickenTemplate.material;
    });
    land.material = groundMaterial;
    stars.material = starsMaterial;
  }

  mPrev.copy(mCurrent);

  requestAnimationFrame(render);
};

render(0);
