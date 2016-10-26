var THREE = require('three');
require('../lib/three-utils');
require('../lib/stereo-effect');
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

var repeat = 30;
var groundMaterial = new THREE.MeshLambertMaterial();
groundMaterial.map = THREE.ImageUtils.loadTexture('rock.png');
groundMaterial.map.wrapS = groundMaterial.map.wrapT = THREE.RepeatWrapping;
groundMaterial.map.repeat.set(repeat, repeat);

var noise = new Noise(Math.random());

var planeWidth = 300;
var planeHeight = 300;

var planeGeometry = new THREE.PlaneGeometry(300, 300, planeWidth - 1, planeHeight - 1);
var land = new THREE.Mesh(planeGeometry, groundMaterial);

land.rotation.x = -Math.PI / 2;
land.position.y = -15;

var noiseScale = 30;

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

var crateCount = 7;

var makeCrate = function(i) {
  var crateMaterial = new THREE.MeshLambertMaterial();
  crateMaterial.map = THREE.ImageUtils.loadTexture('crate.jpg');
  var crate = new THREE.Mesh(new THREE.CubeGeometry(7, 7, 7), crateMaterial);
  object.add(crate);
  crate.position.y = -12;
  crate.position.x = 10;
  crate.rotation.y = Math.PI * Math.random();
  crate.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(up, Math.PI * 2 * i / crateCount + Math.random() * 0.1));
  return crate;
}

var crates = _.times(crateCount, makeCrate);

var counter = 0;
var enemyCount = 10;

var glowTexture = new THREE.ImageUtils.loadTexture('glow.png');
var glowMaterial = new THREE.SpriteMaterial({
  map: glowTexture, color: 0xffdd99, transparent: false, blending: THREE.AdditiveBlending
});

var bulletMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });

var makeEnemy = function(i) {
  var enemy = new THREE.Object3D();
  var enemyMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff });
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
  var bullet = new THREE.Mesh(octahedron, bulletMaterial);
  bullet.scale.z = 1.5;
  shot.add(bullet);

  var light = new THREE.PointLight(0xffaa00, 1, 20);
  light.position.copy(bullet.position);
  light.position.z = -1;
  shot.add(light);

  var glow = new THREE.Sprite(glowMaterial);
  glow.position.copy(bullet.position);
  glow.scale.multiplyScalar(2);
  shot.add(glow);

  enemy.scale.multiplyScalar(2);
  enemy.shot = shot;
  object.add(shot);

  enemy.spawn = function() {
    enemy.position.set(0, 0, 0);
    enemy.position.z = -(20 + 30 * Math.random());
    enemy.position.y = -10;
    enemy.rotation.y = Math.PI * 2 * Math.random();
    enemy.position.applyQuaternion(enemy.quaternion);
    object.add(enemy);

    enemy.updateMatrix();
    arm.updateMatrix();

    var matrix = new THREE.Matrix4().multiply(arm.parent.matrix);
    shot.position.copy(arm.position).add(new THREE.Vector3(-0.1, 0, 1.1)).applyMatrix4(matrix);
    shot.quaternion.copy(enemy.quaternion);
    shot.position.y -= 10;

    enemy.dead = false;
    enemy.damage = 0;
    enemy.spawnTime = counter;
    enemy.shootTime = counter + Math.round(100 + Math.random() * 1000);
    enemy.material = enemyMaterial;
  };

  enemy.spawn();

  return enemy;
};

var enemies = _.times(enemyCount, makeEnemy);

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

var catGun = new THREE.Object3D();

var loader = new THREE.OBJLoader();
loader.load('cat.obj', function (catMesh) {
  var cat = catMesh;
  cat.children[0].material = material2;
  cat.children[1].material = material;
  cat.scale.multiplyScalar(0.5);
  cat.rotation.y = Math.PI;
  cat.position.z = -0.5;
  cat.position.y = -0.5;
  cat.position.x = -0.3;
  catGun.add(cat);
});

camera.add(catGun);

var createLaserBeam = function() {
  var laser = new THREE.Object3D();
  var object3d  = new THREE.Object3D()
  // generate the texture
  var canvas  = generateLaserBodyCanvas()
  var texture = new THREE.Texture(canvas)
  texture.needsUpdate = true;
  // do the material
  var material  = new THREE.MeshBasicMaterial({
    map   : texture,
    blending  : THREE.AdditiveBlending,
    color   : 0x4444aa,
    side    : THREE.DoubleSide,
    depthWrite  : false,
    transparent : true
  })
  var geometry  = new THREE.PlaneGeometry(10, 0.4)
  var nPlanes = 16;
  for(var i = 0; i < nPlanes; i++){
    var mesh  = new THREE.Mesh(geometry, material)
    mesh.position.x = 2;
    mesh.rotation.x = i/nPlanes * Math.PI
    object3d.add(mesh)
  }
  object3d.rotation.y = Math.PI / 2;
  laser.add(object3d);
  object.add(laser);
  return laser;

  function generateLaserBodyCanvas(){
    // init canvas
    var canvas  = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width  = 1;
    canvas.height = 64;
    // set gradient
    var gradient  = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0  , 'rgba( 0,  0,  0,0.1)');
    gradient.addColorStop(0.1, 'rgba(160,160,160,0.3)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(0.9, 'rgba(160,160,160,0.3)');
    gradient.addColorStop(1.0, 'rgba( 0,  0,  0,0.1)');
    // fill the rectangle
    context.fillStyle = gradient;
    context.fillRect(0,0, canvas.width, canvas.height);
    // return the just built canvas
    return canvas;
  }
};

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

var recoil = 0;
var recoiling = false;
var lasers = [];
var raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0, 200);

var touch = function(e) {
  if (vrui.started) {
    recoiling = true;

    var laser = createLaserBeam();
    lasers.push(laser);

    var matrix = new THREE.Matrix4().multiply(catGun.parent.matrix).multiply(catGun.matrix);
    laser.position.copy(catGun.children[0].position).add(new THREE.Vector3(0, 0.25, -3)).applyMatrix4(matrix);
    laser.quaternion.copy(catGun.quaternion).premultiply(camera.quaternion);
    laser.velocity = across.clone().applyQuaternion(laser.quaternion);

    raycaster.set(laser.position, laser.velocity);
    var rays = raycaster.intersectObjects(enemies, true);
    if (rays.length) {
      setTimeout(function() {
        rays[0].object.parent.damage++;
      }, rays[0].distance / 60 * 1000);
    }
  }
};

var release = function(e) {
};

document.querySelector('.wrapper').addEventListener('mousedown', touch);
document.querySelector('.wrapper').addEventListener('mouseup', release);

document.querySelector('.wrapper').addEventListener('touchstart', touch);
document.querySelector('.wrapper').addEventListener('touchend', release);

var render = function(time) {
  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
  }

  var direction = up.clone().applyQuaternion(camera.quaternion);
  camera.position.copy(direction.multiplyScalar(2)).sub(stance);

  if (vrui.started) {
      if (catGun.children[0]) {
        if (recoiling) {
          recoil += 0.3;
          if (recoil > 1) recoiling = false;
        } else {
          recoil = recoil * 0.9;
        }
        catGun.rotation.x = recoil * 0.2;
        catGun.position.z = recoil * 0.1;
      }

      lasers.map(function(laser, i) {
        laser.position.add(laser.velocity);
        if (laser.position.length() > 100) {
          object.remove(laser);
          lasers.splice(i, 1);
        }
      });

    enemies.forEach(function(enemy, i) {
      if (!enemy.dead) {
        var timeRatio = Math.min(1, (counter - enemy.spawnTime) / (enemy.shootTime - enemy.spawnTime));
        // if (i === 0) console.log(timeRatio);
        if (i === 0) console.log(counter, enemy.spawnTime, enemy.shootTime);
        enemy.material.color.setRGB(timeRatio , 0, 1 - timeRatio);

        if (counter === enemy.shootTime) {
          enemy.shot.position.y += 10;
          enemy.shot.setVisible(true);
          enemy.shot.velocity = camera.position.clone().sub(enemy.shot.position).setLength(0.2);
        }

        if (enemy.damage >= 1) {
          enemy.dead = true;
          enemy.position.y -= 20;
        }
      }

      if (counter > enemy.shootTime && enemy.shot.velocity) {
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

    var deadGuys = enemies.filter(function(enemy) { return enemy.dead; });
    if (deadGuys.length > 0 && Math.random() > 0.96) {
      _.sample(deadGuys).spawn();
    }

    counter++;
  }

  vrui.renderStereoscopic() ? effect.render(scene, camera) : renderer.render(scene, camera);

  requestAnimationFrame(render);
};

render(0);
