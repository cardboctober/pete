var THREE = require('three');
require('../lib/three-utils');
require('../lib/stereo-effect');
require('../lib/postprocessing');
require('../lib/three-model-loader');
var _ = require('lodash');
var FastClick = require('fastclick');
var VrData = require('../lib/vr-data');
require('webvr-polyfill');

var VRUI = require('../lib/vrui');

new FastClick(document.body);

var vrData = new VrData();

var object = new THREE.Object3D();

var chosen = false;
var started = false;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
scene.add(camera)

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

var started = false;

scene.add(object);

var stars = _.times(300, function() {
  var particle = new THREE.Particle();
  particle.position.copy(THREE.Vector3.randomUnit()).multiplyScalar(Math.random() * 500 + 200);
  scene.add(particle);
  return particle;
});

var cardboard = false;

var previousLateralDirection = across.clone().multiplyScalar(-1);
var angleOffset = 0;

var normalMaterial = new THREE.MeshNormalMaterial();

var loader = new THREE.TGALoader();
var texture = loader.load('cat.tga');
var normal = loader.load('cat-normal.tga');
var material = new THREE.MeshPhongMaterial({
  color: 0xffffff,
  map: texture,
  normalMap: normal,
  shininess: 20,
});

var texture2 = loader.load('cat.tga');
var material2 = new THREE.MeshPhongMaterial({
  color: 0xffffff,
  map: texture2,
  normalMap: normal,
  shininess: 100,
});
material2.map.offset.set(0, 1);

var cat;

var loader = new THREE.OBJLoader();
loader.load('cat.obj', function (catMesh) {
  cat = catMesh;
  cat.children[0].material = material2;
  cat.children[1].material = material;
  cat.scale.set(30, 30, 30);
  cat.position.set(0, -12, 0);
  object.add(cat);
});

var sunlight = new THREE.DirectionalLight(0xffffff, 1);
scene.add(sunlight);
sunlight.position.set(-50, 50, -50).normalize();
sunlight.castShadow = true;

var light = new THREE.AmbientLight(0x666666);
scene.add(light);

var glowLight = new THREE.PointLight(0xddddff, 1, 10);
glowLight.position.y = 0.1;
scene.add(light);

var party = false;

var start = function(e) {
  cat.children[0].material = normalMaterial;
  party = true;
};

var stop = function(e) {
  cat.children[0].material = material2;
  party = false;
};

document.querySelector('.wrapper').addEventListener('mousedown', start);
document.querySelector('.wrapper').addEventListener('mouseup', stop);

document.querySelector('.wrapper').addEventListener('touchstart', start);
document.querySelector('.wrapper').addEventListener('touchend', stop);

var render = function(time) {
  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
  }

  if (party) {
    camera.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(THREE.Vector3.randomUnit(), 0.01));
  }

  shaderPass.material.uniforms.velocityFactor.value = party ? 0.8 : 0;

  var direction = across.clone().applyQuaternion(camera.quaternion);
  object.position.copy(direction.clone().multiplyScalar(30));

  // Get a vector of the lateral direction of the camera
  var lateralDirection = direction.cross(up).cross(up);
  // Get the lateral angle of the camera
  var angle = (lateralDirection.angleTo(forward) > Math.PI / 2 ? 1 : -1) * lateralDirection.angleTo(across);

  previousLateralDirection = lateralDirection.clone();

  lateralDirection.applyAxisAngle(up, angleOffset);

  camera.updateMatrix();
  camera.updateMatrixWorld();

  tmpArray.copy(camera.matrixWorldInverse);
  tmpArray.multiply(camera.projectionMatrix);
  mCurrent.getInverse(tmpArray);

  shaderPass.material.uniforms.viewProjectionInverseMatrix.value.copy(mCurrent);
  shaderPass.material.uniforms.previousViewProjectionMatrix.value.copy(mPrev);

  if (vrui.renderStereoscopic()) {
    renderer.callback = function(scene, camera) {
      composer2.passes[0].camera = camera;
      composer2.render();
      shaderPass.material.uniforms.tColor.value = composer2.renderTarget2;

      if (cat) {
        cat.children[0].material = depthMaterial;
        cat.children[1].material = depthMaterial;
      }

      composer.render(scene, camera);

      if (cat) {
        cat.children[0].material = party ? normalMaterial : material2;
        cat.children[1].material = material;
      }
    }
    effect.render(scene, camera);
  }
  else {
    composer2.passes[0].camera = camera;
    composer2.render();
    shaderPass.material.uniforms.tColor.value = composer2.renderTarget2;

    if (cat) {
      cat.children[0].material = depthMaterial;
      cat.children[1].material = depthMaterial;
    }

    composer.render(scene, camera);

    if (cat) {
      cat.children[0].material = party ? normalMaterial : material2;
      cat.children[1].material = material;
    }
  }

  mPrev.copy(tmpArray);

  requestAnimationFrame(render);
};

render(0);
