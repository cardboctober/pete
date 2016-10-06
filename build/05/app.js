(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var THREE = require('../lib/three-utils')((typeof window !== "undefined" ? window['THREE'] : typeof global !== "undefined" ? global['THREE'] : null));
var detectSphereCollision = require('../lib/detect-sphere-collision');
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var object = new THREE.Object3D();

var texture = THREE.ImageUtils.loadTexture('texture.png');
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(20, 20);

var templateMaterial = new THREE.MeshLambertMaterial({ map: texture });

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

var width = 150;
var height = 150;
var noise = perlinNoise(width, height, 0.25);

var planeGeometry = new THREE.PlaneGeometry(30, 30, width - 1, height - 1);
var plane = new THREE.Mesh(planeGeometry, templateMaterial);

plane.rotation.x = -Math.PI / 2;

for (var i = 0; i < planeGeometry.vertices.length; i++) {
  var vertex = planeGeometry.vertices[i];
  var noiseHeight = noise[i * 4] / 255;
  vertex.z = vertex.z + noiseHeight * 3;
}

var radiusSq = Math.pow(13, 2);
var center = new THREE.Vector2(0, 0);

for (var x = 0; x < width; x++) {
  for (var y = 0; y < height; y++) {
    var vertex = planeGeometry.vertices[x * height + y];
    var position = new THREE.Vector2(vertex.x, vertex.y);
    if (position.sub(center).lengthSq() < radiusSq) {
      vertex.z = vertex.z + Math.sqrt(radiusSq - position.lengthSq()) / 5;
    }
  }
}

radiusSq = Math.pow(10, 2);
center = new THREE.Vector2(0, 0);

for (var x = 0; x < width; x++) {
  for (var y = 0; y < height; y++) {
    var vertex = planeGeometry.vertices[x * height + y];
    var position = new THREE.Vector2(vertex.x, vertex.y);
    if (position.sub(center).lengthSq() < radiusSq) {
      vertex.z = vertex.z - Math.sqrt(radiusSq - position.lengthSq()) / 2;
    }
  }
}

var vertex = planeGeometry.vertices[height / 2 + width / 2 * height];
plane.position.y = -vertex.z - 0.75;

planeGeometry.computeFaceNormals();
planeGeometry.computeVertexNormals();

object.add(plane);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
scene.add(camera);

var sunlight = new THREE.DirectionalLight(0xffffff, 0.8);
scene.add(sunlight);
sunlight.position.set(100, 50, 50);
sunlight.castShadow = true;

var light = new THREE.AmbientLight(0x202028);
scene.add(light);

var earth = new THREE.Object3D();
object.add(earth);
earth.scale.set(150, 150, 150);
earth.position.z = -600;
earth.position.y = 600;

var earthGeometry = new THREE.SphereGeometry(1, 32, 32);
var material = new THREE.MeshPhongMaterial();
material.map = THREE.ImageUtils.loadTexture('earth.jpg');
material.specularMap = THREE.ImageUtils.loadTexture('earth-spec.jpg')
material.specular  = new THREE.Color('grey');
var planet = new THREE.Mesh(earthGeometry, material);
earth.add(planet);
planet.rotation.x = 0;
planet.rotation.y = -Math.PI * 3 / 4;

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
clouds2.rotation.x = Math.PI / 3;
clouds2.rotation.y = -Math.PI / 2;

var starsMaterial = new THREE.MeshBasicMaterial({
  map: THREE.ImageUtils.loadTexture('stars.png'),
  depthWrite: false,
  side: THREE.BackSide,
  shading: THREE.FlatShading,
  color: 'white',
});

var cube = new THREE.CubeGeometry(1500, 1500, 1500);
var stars = new THREE.Mesh(cube, starsMaterial);
object.add(stars);

object.setVisible(false);
scene.add(object);

var chosen = false;
var started = false;

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

var started = false;
var cardboard = false;

var previousLateralDirection = across.clone().multiplyScalar(-1);
var angleOffset = 0;

var testPlanet = new THREE.Mesh(earthGeometry, material);
testPlanet.velocity = new THREE.Vector3();
testPlanet.angularVelocity = new THREE.Vector3();

var render = function(time) {
  if (started) {
    object.setVisible(true);

    if (sensor) {
      camera.quaternion.copy(sensor.getState().orientation);
    }

    stars.rotation.z = stars.rotation.z + Math.PI / 15000;
    stars.position.y = stars.position.y + 0.03;
    earth.rotation.z = earth.rotation.z + Math.PI / 15000;
    // earth.position.y = earth.position.y + 0.03;
    clouds.rotation.z = clouds.rotation.z + Math.PI / 3500;
    clouds2.rotation.y = clouds2.rotation.y + Math.PI / 4000;

    earth.position.add(new THREE.Vector3.randomUnit().multiplyScalar(earth.scale.length() * 0.001));

    if (earth.scale.lengthSq() > 0.5) {
      earth.position.multiplyScalar(0.994);
      earth.scale.multiplyScalar(0.9944);
    } else if (!earth.disablePhysics) {
      testPlanet.velocity.add(new THREE.Vector3(0, -0.001, 0));
      testPlanet.position.copy(earth.position);
      testPlanet.position.add(testPlanet.velocity);

      testPlanet.geometry.radius = earth.scale.x;

      detectSphereCollision(testPlanet, plane, function(normal, overshoot) {
        var overshootRatio = overshoot / testPlanet.velocity.length();
        testPlanet.position.sub(testPlanet.velocity.clone().multiplyScalar(overshootRatio));
        testPlanet.velocity.reflect(normal).multiplyScalar(0.95);
        testPlanet.position.add(testPlanet.velocity.clone().multiplyScalar(overshootRatio));
        testPlanet.angularVelocity = testPlanet.velocity.clone().multiplyScalar(0.3);

        if (Math.abs(testPlanet.velocity.lengthSq()) < 0.0001) {
          testPlanet.disablePhysics = true;
        }
      });

      earth.rotation.x = earth.rotation.x + testPlanet.angularVelocity.y;
      earth.rotation.y = earth.rotation.y + testPlanet.angularVelocity.z;
      earth.rotation.z = earth.rotation.z + testPlanet.angularVelocity.x;

      earth.position.copy(testPlanet.position)
    }

    var direction = across.clone().applyQuaternion(camera.quaternion);
    object.position.copy(direction.clone().multiplyScalar(0));

    // Get a vector of the lateral direction of the camera
    var lateralDirection = direction.cross(up).cross(up);
    // Get the lateral angle of the camera
    var angle = (lateralDirection.angleTo(forward) > Math.PI / 2 ? 1 : -1) * lateralDirection.angleTo(across);

    previousLateralDirection = lateralDirection.clone();

    lateralDirection.applyAxisAngle(up, angleOffset);

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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lib/detect-sphere-collision":2,"../lib/three-utils":3}],2:[function(require,module,exports){
(function (global){
var THREE = (typeof window !== "undefined" ? window['THREE'] : typeof global !== "undefined" ? global['THREE'] : null);
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var center = new THREE.Vector3();
var line = new THREE.Line3();
var point = new THREE.Vector3();
var triangle = new THREE.Triangle();
var plane = new THREE.Plane();
var normal = new THREE.Vector3();

module.exports = function(sphere, object, callback) {
  var radius = sphere.geometry.radius;
  var radiusSquared = Math.pow(radius);

  // center.copy(object.geometry.boundingSphere.center).applyMatrix4(object.matrix);
  // if (sphere.position.distanceToSquared(center) > Math.pow(radius + object.geometry.boundingSphere.radius, 2)) {
  //   return;
  // }

  // Face collisions
  var collision = _.find(object.geometry.faces, function(face) {
    triangle.a.copy(object.geometry.vertices[face.a]).applyMatrix4(object.matrix);
    triangle.b.copy(object.geometry.vertices[face.b]).applyMatrix4(object.matrix);
    triangle.c.copy(object.geometry.vertices[face.c]).applyMatrix4(object.matrix);

    if (triangle.containsPoint(sphere.position)) {
      triangle.plane(plane);
      var distance = plane.distanceToPoint(sphere.position);
      if (Math.abs(distance) < radius) {
        normal.copy(plane.normal).multiplyScalar(distance > 0 ? 1 : -1);
        callback(normal, radius - Math.abs(distance), sphere.position);
        return true;
      }
    }
  })
  if (collision) return;

  // Vertex and edge collisions
  _.find(object.geometry.edges, function(edge) {
    line.start.copy(edge[0]).applyMatrix4(object.matrix);
    line.end.copy(edge[1]).applyMatrix4(object.matrix);

    line.closestPointToPoint(sphere.position, true, point);
    var distanceSquared = sphere.position.distanceToSquared(point);
    if (distanceSquared < radiusSquared) {
      normal.copy(point).sub(sphere.position).normalize();
      callback(normal, radius - Math.sqrt(distanceSquared), point);
      return true;
    }
  });
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
module.exports = function(THREE) {
  THREE.Object3D.prototype.setVisible = function(visible) {
    return this.traverse(function(object) { object.visible = visible; });
  };

  THREE.Vector3.randomUnit = function() {
	  return new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
	};

  return THREE;
};

},{}]},{},[1]);
