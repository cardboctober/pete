var THREE = require('three');
require('../lib/three-utils');
require('../lib/three-water');
require('../lib/stereo-effect');
require('../lib/postprocessing');
var _ = require('lodash');
var FastClick = require('fastclick');
var VrData = require('../lib/vr-data');
require('webvr-polyfill');
var ThreeBSP = require('../lib/csg');

var VRUI = require('../lib/vrui');

new FastClick(document.body);

var vrData = new VrData();

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

camera.position.y = 0.75;

var moving = false;

var raycaster = new THREE.Raycaster(camera.position, across.clone(), 0, 15);
var casting = false;
var target = false;
var blink = false;

var start = function(e) {
  casting = true;
};

var stop = function(e) {
  if (target) {
    var endPosition = glow.position.clone();
    endPosition.y += 0.95;
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

var glowLight = new THREE.PointLight(0xddddff, 1, 10);
glowLight.position.z = -0.2;

var plane = new THREE.PlaneGeometry(0.5, 0.5);
var glow = new THREE.Mesh(plane, glowMaterial);
glow.position.y = -10;
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

  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
  }

  if (vrui.started) {
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

  if (vrui.renderStereoscopic()) {
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
