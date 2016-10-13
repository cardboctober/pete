(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var THREE = require('../lib/three-utils')((typeof window !== "undefined" ? window['THREE'] : typeof global !== "undefined" ? global['THREE'] : null));
var detectSphereCollision = require('../lib/detect-sphere-collision');
var flattenObjects = require('../lib/flatten-objects');
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

var normalMaterial = new THREE.MeshNormalMaterial();

var groundMaterial = new THREE.MeshPhongMaterial();
groundMaterial.map = THREE.ImageUtils.loadTexture('grass.jpg');
groundMaterial.normalMap = THREE.ImageUtils.loadTexture('grass-normal.jpg')
groundMaterial.specularMap = THREE.ImageUtils.loadTexture('grass-specular.jpg')
groundMaterial.specular = new THREE.Color(0xffdddd);

var repeat = 600;
groundMaterial.map.wrapS = groundMaterial.map.wrapT = THREE.RepeatWrapping;
groundMaterial.normalMap.wrapS = groundMaterial.normalMap.wrapT = THREE.RepeatWrapping;
groundMaterial.specularMap.wrapS = groundMaterial.specularMap.wrapT = THREE.RepeatWrapping;
groundMaterial.map.repeat.set(repeat, repeat);
groundMaterial.normalMap.repeat.set(repeat, repeat);
groundMaterial.specularMap.repeat.set(repeat, repeat);

var object = new THREE.Object3D();

var planeGeometry = new THREE.PlaneGeometry(1000, 1000);
var land = new THREE.Mesh(planeGeometry, groundMaterial);
land.rotation.x = -Math.PI / 2;
land.position.y = -1;
object.add(land);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
scene.add(camera);

var sunlight = new THREE.DirectionalLight(0xffffff, 1);
scene.add(sunlight);
sunlight.position.set(-50, 50, -50).normalize();
sunlight.castShadow = true;

var light = new THREE.AmbientLight(0x444444);
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

var skyMaterial = new THREE.MeshFaceMaterial(materials);
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

camera.position.y = 0.75;

var moving = false;

var raycaster = new THREE.Raycaster(camera.position, across.clone(), 0, 15);
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
    endPosition.y += 0.95;
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

var cubeMaterial = new THREE.MeshPhongMaterial({ color: 0x3344cc, shading: THREE.FlatShading });
var coneMaterial = new THREE.MeshPhongMaterial({ color: 0xdd11aa, shading: THREE.FlatShading });
var cylinderMaterial = new THREE.MeshPhongMaterial({ color: 0x22cc44, shading: THREE.FlatShading });
var octahedronMaterial = new THREE.MeshPhongMaterial({ color: 0xcc6622, shading: THREE.FlatShading });

var createCube = function() {
  var scale = Math.random() * 0.5 + 0.5;
  var geometry = new THREE.BoxGeometry(scale * 2, scale * 2, scale * 2);
  var mesh = new THREE.Mesh(geometry);
  mesh.rotation.y = Math.random() * Math.PI + Math.PI / 2;
  mesh.position.x = Math.random() * 5 + 5;
  mesh.position.applyQuaternion(mesh.quaternion);
  mesh.position.y -= 1 - scale;
  mesh.rotation.y = Math.random() * Math.PI;
  mesh.updateMatrixWorld(true);

  var bakedGeometry = new THREE.Geometry();
  bakedGeometry.merge(geometry, mesh.matrix);
  var meshFinal = new THREE.Mesh(bakedGeometry, cubeMaterial);
  meshFinal.index = 0;
  meshFinal.angle = (mesh.position.angleTo(forward) > Math.PI / 2 ? 1 : -1) * mesh.position.angleTo(across);
  meshFinal.radius = Math.sqrt(Math.pow(scale, 2) * 2);
  meshFinal.originalGeometry = meshFinal.geometry;
  meshFinal.originalPosition = mesh.position.clone();
  meshFinal.csg = new ThreeBSP(bakedGeometry);

  object.add(meshFinal);
  return meshFinal;
};

var createCone = function() {
  var scale = Math.random() * 0.5 + 0.5;
  var geometry = new THREE.ConeGeometry(scale, scale * 2, 4);
  var mesh = new THREE.Mesh(geometry);
  mesh.rotation.y = Math.random() * Math.PI + Math.PI / 2;
  mesh.position.x = Math.random() * 5 + 5;
  mesh.position.applyQuaternion(mesh.quaternion);
  mesh.position.y -= 1 - scale;
  mesh.rotation.y = Math.random() * Math.PI;
  mesh.updateMatrixWorld(true);

  var bakedGeometry = new THREE.Geometry();
  bakedGeometry.merge(geometry, mesh.matrix);
  var meshFinal = new THREE.Mesh(bakedGeometry, coneMaterial);
  meshFinal.index = 1;
  meshFinal.angle = (mesh.position.angleTo(forward) > Math.PI / 2 ? 1 : -1) * mesh.position.angleTo(across);
  meshFinal.radius = scale * 2;
  meshFinal.originalGeometry = meshFinal.geometry;
  meshFinal.originalPosition = mesh.position.clone();
  meshFinal.csg = new ThreeBSP(bakedGeometry);

  object.add(meshFinal);
  return meshFinal;
};

var createCylinder = function() {
  var scale = Math.random() * 0.5 + 0.5;
  var geometry = new THREE.CylinderGeometry(scale, scale, scale * 2, 3);
  var mesh = new THREE.Mesh(geometry);
  mesh.rotation.y = -Math.random() * Math.PI + Math.PI / 2;
  mesh.position.x = Math.random() * 5 + 5;
  mesh.position.applyQuaternion(mesh.quaternion);
  mesh.position.y -= 1 - scale;
  mesh.rotation.y = -Math.random() * Math.PI;
  mesh.updateMatrixWorld(true);

  var bakedGeometry = new THREE.Geometry();
  bakedGeometry.merge(geometry, mesh.matrix);
  var meshFinal = new THREE.Mesh(bakedGeometry, cylinderMaterial);
  meshFinal.index = 0;
  meshFinal.angle = (mesh.position.angleTo(forward) > Math.PI / 2 ? 1 : -1) * mesh.position.angleTo(across);
  meshFinal.radius = scale;
  meshFinal.originalGeometry = meshFinal.geometry;
  meshFinal.originalPosition = mesh.position.clone();
  meshFinal.csg = new ThreeBSP(bakedGeometry);

  object.add(meshFinal);
  return meshFinal;
};

var createOctahedron = function() {
  var scale = Math.random() * 0.5 + 0.5;
  var geometry = new THREE.OctahedronGeometry(scale, 0);
  var mesh = new THREE.Mesh(geometry);
  mesh.rotation.y = -Math.random() * Math.PI + Math.PI / 2;
  mesh.position.x = Math.random() * 5 + 5;
  mesh.position.applyQuaternion(mesh.quaternion);
  mesh.position.y -= 1 - scale;
  mesh.rotation.y = -Math.random() * Math.PI;
  mesh.updateMatrixWorld(true);

  var bakedGeometry = new THREE.Geometry();
  bakedGeometry.merge(geometry, mesh.matrix);
  var meshFinal = new THREE.Mesh(bakedGeometry, octahedronMaterial);
  meshFinal.index = 1;
  meshFinal.angle = (mesh.position.angleTo(forward) > Math.PI / 2 ? 1 : -1) * mesh.position.angleTo(across);
  meshFinal.radius = scale * 2;
  meshFinal.originalGeometry = meshFinal.geometry;
  meshFinal.originalPosition = mesh.position.clone();
  meshFinal.csg = new ThreeBSP(bakedGeometry);

  object.add(meshFinal);
  return meshFinal;
};

var cubes = _.times(10, createCube);
var cones = _.times(10, createCone);
var cylinders = _.times(10, createCylinder);
var octahedrons = _.times(10, createOctahedron);

var geometry = new THREE.BoxGeometry(1, 1, 1);
var geometryCsg = new ThreeBSP(new THREE.Mesh(geometry));
var geometry2 = new THREE.BoxGeometry(1.5, 0.8, 0.8);
var mesh2 = new THREE.Mesh(geometry2);

mesh2.position.y = 1;

var beamMaterial = new THREE.MeshPhongMaterial({ color: 0xdddddd, shading: THREE.FlatShading });
var geometry = new THREE.CylinderGeometry(0.1, 0.1, 2000, 12);
var beam = new THREE.Mesh(geometry, beamMaterial);
beam.rotation.y = 1000;
object.add(beam);

var shapes = [].concat(cubes, cones, octahedrons, cylinders);
var things = [land, beam].concat(shapes);

camera.position.z = 3;
camera.index = 0;
var previousAngle = 0;

var transitionPlane = new THREE.Plane(forward.clone(), 0);
var distancePlane = new THREE.Plane(across.clone(), 0)

var rightClip = new THREE.Mesh(new THREE.CubeGeometry(50, 50, 50));
rightClip.position.set(25, 0, 0);

var leftClip = new THREE.Mesh(new THREE.CubeGeometry(50, 50, 50));
leftClip.position.set(-25, 0, 0);

var render = function(time) {
  shaderPass.material.uniforms.velocityFactor.value = blink ? 0.4 : 0;

  // Get a vector of the lateral direction of the camera
  var lateralDirection = camera.position.clone().cross(up).cross(up);
  // Get the lateral angle of the camera
  var angle = (lateralDirection.angleTo(forward) > Math.PI / 2 ? 1 : -1) * lateralDirection.angleTo(across);
  if (Math.abs(previousAngle - angle) > Math.PI * 1.5) {
    camera.index = (camera.index + 1) % 2;
  }
  previousAngle = angle;

  transitionPlane.normal = camera.position.clone().cross(up).normalize();
  distancePlane.normal = camera.position.clone().normalize();
  var transitionRightShapes = shapes.filter(function(shape) {
    if (camera.index !== shape.index || distancePlane.distanceToPoint(shape.originalPosition) > 0) {
      return false;
    }
    var distance = Math.abs(transitionPlane.distanceToPoint(shape.originalPosition)) - shape.radius;
    return distance <= 0;
  });

  var transitionLeftShapes = shapes.filter(function(shape) {
    if (camera.index === shape.index || distancePlane.distanceToPoint(shape.originalPosition) > 0) {
      return false;
    }
    var distance = Math.abs(transitionPlane.distanceToPoint(shape.originalPosition)) - shape.radius;
    return distance <= 0;
  });

  rightClip.quaternion.setFromUnitVectors(across.clone().multiplyScalar(-1), lateralDirection.clone().normalize());
  rightClip.position.set(25, 0, 0);
  rightClip.position.applyQuaternion(rightClip.quaternion);
  rightClip.updateMatrixWorld(true);
  var rightClipBaked = new THREE.Geometry();
  rightClipBaked.merge(rightClip.geometry, rightClip.matrix);
  var rightClipCsg = new ThreeBSP(rightClipBaked);

  leftClip.quaternion.setFromUnitVectors(across.clone().multiplyScalar(-1), lateralDirection.clone().normalize());
  leftClip.position.set(-25, 0, 0);
  leftClip.position.applyQuaternion(leftClip.quaternion);
  leftClip.updateMatrixWorld(true);
  var leftClipBaked = new THREE.Geometry();
  leftClipBaked.merge(leftClip.geometry, leftClip.matrix);
  var leftClipCsg = new ThreeBSP(leftClipBaked);

  shapes.forEach(function(shape) {
    shape.geometry = shape.originalGeometry;
    if ((camera.index === shape.index && angle < shape.angle) || (camera.index !== shape.index && angle >= shape.angle)) {
      shape.position.y = -10
    } else {
      shape.position.y = 0;
    }
  });

  transitionRightShapes.forEach(function(shape) {
    shape.geometry = shape.csg.subtract(rightClipCsg).toGeometry();
    shape.position.y = 0;
  });

  transitionLeftShapes.forEach(function(shape) {
    shape.geometry = shape.csg.subtract(leftClipCsg).toGeometry();
    shape.position.y = 0;
  });

  if (started) {
    if (sensor) {
      camera.quaternion.copy(sensor.getState().orientation);
    }

    // camera.position.applyAxisAngle(up, 0.005);
    camera.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(up, 0.01));

    if (blink) {
      camera.position.lerpVectors(blink[0], blink[1], blink[2]);
      blink[2] += 0.05;
      if (blink[2] > 1) {
        camera.position.copy(blink[1]);
        blink = false;
      }
    } else if (casting) {
      raycaster.set(camera.position, across.clone().applyQuaternion(camera.quaternion));
      var rays = raycaster.intersectObjects(things);
      if (rays[0] && rays[0].object === land) {
        target = true;
        glow.position.copy(rays[0].point);
        glow.position.y += 0.08;
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
      composer2.render();
      shaderPass.material.uniforms.tColor.value = composer2.renderTarget2;

      land.material = depthMaterial;
      skybox.material = depthMaterial;

      composer.render(scene, camera);

      land.material = groundMaterial;
      skybox.material = skyMaterial;
    }
    effect.render(scene, camera);
  }
  else {
    composer2.render();
    shaderPass.material.uniforms.tColor.value = composer2.renderTarget2;

    land.material = depthMaterial;
    skybox.material = depthMaterial;

    composer.render(scene, camera);

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
}

window.addEventListener('resize', _.debounce(resize, 50), false);

var sensor;
navigator.getVRDevices().then(function(devices) {
  sensor =_.find(devices, 'getState');
});

updateOrientation();
resize();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lib/detect-sphere-collision":2,"../lib/flatten-objects":3,"../lib/three-utils":4}],2:[function(require,module,exports){
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
(function (global){
var THREE = (typeof window !== "undefined" ? window['THREE'] : typeof global !== "undefined" ? global['THREE'] : null);

var matrix = new THREE.Matrix4();
var quaternion = new THREE.Quaternion();

var flattenObject = function(object, root, stack) {
  root = root || object;
  stack = stack || [];
  object.updateMatrix();

  if (!object.preserveHierarchy) {
    object.children.forEach(function(child) {
      return flattenObject(child, root, stack.concat([[object.matrix, object.quaternion]]));
    });
  }

  if (object.parent) object.parent.remove(object);

  if (object.geometry || object.preserveHierarchy) {
    matrix.identity();
    quaternion.set(0, 0, 0, 1);

    stack.forEach(function(item) {
      matrix.multiply(item[0]);
      quaternion.multiply(item[1]);
    });

    object.position.applyMatrix4(matrix);
    object.quaternion.copy(quaternion.multiply(object.quaternion));

    root.add ? root.add(object) : root.push(object);
  }
};

module.exports = function(objects, root) {
  objects.forEach(function(object) {
    flattenObject(object, root || object.parent);
  });
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
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
