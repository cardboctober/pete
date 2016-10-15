(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var THREE = require('../lib/three-utils')((typeof window !== "undefined" ? window['THREE'] : typeof global !== "undefined" ? global['THREE'] : null));
var detectSphereCollision = require('../lib/detect-sphere-collision');
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

// Hacked version of Stereo effect
THREE.StereoEffect = function ( renderer ) {
  var _stereo = new THREE.StereoCamera();
  _stereo.aspect = 0.5;

  this.setEyeSeparation = function ( eyeSep ) {
    _stereo.eyeSep = eyeSep;
  };

  this.setSize = function ( width, height ) {
    renderer.setSize( width, height );
  };

  this.render = function ( scene, camera ) {
    scene.updateMatrixWorld();

    if ( camera.parent === null ) camera.updateMatrixWorld();

    _stereo.update( camera );

    var size = renderer.getSize();

    renderer.clear();
    renderer.setScissorTest( true );

    renderer.setScissor( 0, 0, size.width / 2, size.height );
    renderer.setViewport( 0, 0, size.width / 2, size.height );
    renderer.callback( scene, _stereo.cameraL );

    renderer.setScissor( size.width / 2, 0, size.width / 2, size.height );
    renderer.setViewport( size.width / 2, 0, size.width / 2, size.height );
    renderer.callback( scene, _stereo.cameraR );

    renderer.setScissorTest( false );
  };
};

var clock  = new THREE.Clock();

var object = new THREE.Object3D();

var causticsMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

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

var caustics = new THREE.Mesh(planeGeometry, causticsMaterial);

caustics.rotation.x = -Math.PI / 2;
caustics.position.y = -1;

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

_.times(30, function() {
  createCircle(Math.random() * 20, new THREE.Vector2(Math.random() * 100 - 50, Math.random() * 100 - 50), 0.05);
});

var vertex = planeGeometry.vertices[height / 2 + width / 2 * height];

planeGeometry.computeFaceNormals();
planeGeometry.computeVertexNormals();

object.add(land);
object.add(caustics);

var scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x005289, 0.2);

var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
scene.add(camera);

var sunlight = new THREE.DirectionalLight(0xffffff, 1);
scene.add(sunlight);
sunlight.position.set(-50, 50, -50).normalize();
sunlight.castShadow = true;

var light = new THREE.AmbientLight(0x444444);
scene.add(light);

var light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(0, 60, 0);
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

var skyMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
var skybox = new THREE.Mesh(
  new THREE.BoxGeometry(4000, 4000, 4000, 1, 1, 1),
  skyMaterial
);

skybox.scale.set(-1, 1, 1);
object.add(skybox);
scene.add(object);

var chosen = false;
var started = false;

var pixelRatio = window.devicePixelRatio || 1;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);

window.renderer = renderer;

var composer = new THREE.EffectComposer(renderer);
var renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);
// composer.getSize = renderer.getSize;
// composer.clear = renderer.clear;
// composer.setScissorTest = renderer.setScissorTest;
// composer.setScissor = renderer.setScissor;
// composer.setViewport = renderer.setViewport;

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

document.body.appendChild(renderer.domElement);

var effect = new THREE.StereoEffect(renderer);
effect.eyeSeparation = 0.3;
effect.setSize(window.innerWidth, window.innerHeight);

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
sea.position.y = 15;

object.add(sea);

camera.position.y = vertex.z + land.position.y + 0.75;

var moving = false;

var raycaster = new THREE.Raycaster(camera.position, across.clone(), 0, 6);
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

var glowLight = new THREE.PointLight(0xddddff, 1, 10);
glowLight.position.z = -0.2;

var plane = new THREE.PlaneGeometry(0.5, 0.5);
var glow = new THREE.Mesh(plane, glowMaterial);
glow.add(glowLight);
glow.renderOrder = 1;
object.add(glow);

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

var textures = [];
var texture;

for (var i = 1; i <= 32; i++) {
  texture = THREE.ImageUtils.loadTexture('caustics/caustics' + i + '.png');
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(15, 15);
  textures.push(texture);
}

var i = 0;

causticsMaterial.transparent = true;
causticsMaterial.opacity = 0.6;

var render = function(time) {
  shaderPass.material.uniforms.velocityFactor.value = blink ? 0.4 : 0;
  water.material.uniforms.time.value += 0.5 / 60.0;

  causticsMaterial.alphaMap = textures[Math.floor(i / 2)];
  i = (i + 1) % 64;

  // var ÷theta = clock.getElapsedTime();
  // MeshPhongCausticsMaterial.update(theta);

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
      raycaster.set(camera.position, across.clone().applyQuaternion(camera.quaternion));
      var rays = raycaster.intersectObjects([land]);
      if (rays[0] && rays[0].object === land) {
        target = true;
        glow.position.copy(rays[0].point);
        glow.position.y += 0.15;
        var rotation = new THREE.Quaternion().setFromUnitVectors(up, rays[0].face.normal);
        glow.rotation.set(0, 0, 0);
        glow.quaternion.multiply(rotation);
      } else {
        target = false;
        glow.position.set(0, -10, 0);
      }
    } else {
      glow.position.set(0, -10, 0);
    }
  }

  camera.updateMatrix();
  camera.updateMatrixWorld();

  tmpArray.copy(camera.matrixWorldInverse);
  tmpArray.multiply(camera.projectionMatrix);
  mCurrent.getInverse(tmpArray);

  shaderPass.material.uniforms.viewProjectionInverseMatrix.value.copy(mCurrent);
  shaderPass.material.uniforms.previousViewProjectionMatrix.value.copy(mPrev);

  if (cardboard && window.orientation !== 0) {
    renderer.callback = function(scene, camera) {
      water.render();

      composer2.render();
      shaderPass.material.uniforms.tColor.value = composer2.renderTarget2;

      sea.material = depthMaterial;
      land.material = depthMaterial;
      skybox.material = depthMaterial;

      composer.render(scene, camera);

      sea.material = water.material;
      land.material = groundMaterial;
      skybox.material = skyMaterial;
    }
    effect.render(scene, camera);
  }
  else {
    water.render();

    composer2.render();
    shaderPass.material.uniforms.tColor.value = composer2.renderTarget2;

    sea.material = depthMaterial;
    land.material = depthMaterial;
    skybox.material = depthMaterial;

    composer.render(scene, camera);

    sea.material = water.material;
    land.material = groundMaterial;
    skybox.material = skyMaterial;
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
  composer.setSize(window.innerWidth, window.innerHeight);
  composer2.setSize(window.innerWidth, window.innerHeight);
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
