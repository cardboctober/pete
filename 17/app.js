var THREE = require('three');
require('../lib/three-utils');
require('../lib/stereo-effect');
require('../lib/three-water');
require('../lib/postprocessing');
require('../lib/three-model-loader');
var _ = require('lodash');
var FastClick = require('fastclick');
var VrData = require('../lib/vr-data');
require('webvr-polyfill');
var Noise = require('noisejs').Noise;
var io = require('socket.io-client');

var VRUI = require('../lib/vrui');
var socket = io.connect('https://cardboctober-sockets.herokuapp.com/');

new FastClick(document.body);

var vrData = new VrData();

var up = new THREE.Vector3(0, 1, 0);
var forward = new THREE.Vector3(1, 0, 0);
var across = new THREE.Vector3(0, 0, -1);

if (window.location.search) {
  document.querySelector('.intro-modal.calibrate').style.display = 'block';

  var controllerMove = _.throttle(function(data) {
    return socket.emit('controller.move', { x: data.x, y: data.y, z: data.z, w: data.w });
  }, 30);

  var quaternion = new THREE.Quaternion();

  socket.on('connect', function() {
    socket.emit('controller.ready', window.location.search.replace(/^\?/, ''));

    window.addEventListener('deviceorientation', function(event) {
      if (vrData.enabled()) {
        var data = vrData.getData();
        quaternion.fromArray(data.orientation);
        controllerMove(quaternion);
      }
    });
  });

  var tap = function(e) {
    e.preventDefault();
    socket.emit('controller.reset', {});
  };

  document.querySelector('.wrapper').addEventListener('mousedown', tap);
  document.querySelector('.wrapper').addEventListener('touchstart', tap);

} else {
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
    vertex.z = vertex.z + noise.simplex2(vertex.x / scale, vertex.y / scale) * 0.75;
  }

  planeGeometry.computeFaceNormals();
  planeGeometry.computeVertexNormals();

  object.add(land);

  var player = new THREE.Object3D();
  object.add(player);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
  player.add(camera);

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

  var randomId = function() {
    var possible = "abcdefghijklmnopqrstuvwxyz";
    return _.times(3, function() {
      return possible.charAt(Math.floor(Math.random() * possible.length));
    }).join('');
  };

  var id = randomId();
  document.querySelector('.intro-modal').style.display = 'none';
  document.querySelector('.intro-modal.controller').style.display = 'block';
  var link = document.querySelector('.controller-prompt .link');
  link.href = "https://cardboctober.github.io/pete/17/?" + id;
  link.textContent = "cardboctober.github.io/pete/17/?" + id;

  var vertex = planeGeometry.vertices[height / 2 + width / 2 * height];
  player.position.y = vertex.z + land.position.y + 0.75;

  scene.add(object);

  var crateMaterial = new THREE.MeshLambertMaterial();
  crateMaterial.map = THREE.ImageUtils.loadTexture('crate.jpg');

  var glowTexture = new THREE.ImageUtils.loadTexture('glow.png');

  var buzzers = _.times(12, function(i) {
    var buzzer = new THREE.Object3D();

    var crate = new THREE.Mesh(new THREE.CubeGeometry(0.3, 0.3, 0.3), crateMaterial);
    buzzer.add(crate);

    var buttonMaterial = new THREE.MeshLambertMaterial({ color: 0xbbbbbb });
    var button = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), buttonMaterial);
    buzzer.add(button);
    button.position.y = 0.15;

    buzzer.position.x = 0.85;
    buzzer.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      2 * Math.PI / 12 * i
    ));
    buzzer.position.y = player.position.y - 0.5;

    object.add(buzzer);

    var glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture, color: 0xbbbbbb, transparent: false, blending: THREE.AdditiveBlending
    });
    var glow = new THREE.Sprite(glowMaterial);
    object.add(glow);
    glow.position.copy(buzzer.position).multiplyScalar(0.8);
    glow.position.y += 0.11;
    glow.scale.set(0.4, 0.2, 0.4);
    glow.setVisible(false);

    buzzer.button = button;
    buzzer.glow = glow;

    return buzzer;
  });

  var arm = new THREE.Object3D();
  var hammer = new THREE.Object3D();

  var hammerMaterial = new THREE.MeshLambertMaterial({ color: 0x915e12 });
  var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 12), hammerMaterial);
  hammer.add(shaft);

  var head = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), hammerMaterial);
  hammer.add(head);

  arm.add(hammer);
  object.add(arm);
  shaft.position.y = 0.5;
  head.position.y = 0.6;
  head.rotation.z = Math.PI / 2;

  var armRotation = new THREE.Quaternion();
  var offset = new THREE.Quaternion();

  var controllerConnected = false;

  socket.on('connect', function() {
    socket.emit('viewer.ready', id);

    socket.on('controller.ready', function(data) {
      document.querySelector('.intro-modal.controller').style.display = 'none';
      document.querySelector('.intro-modal').style.display = 'block';
      controllerConnected = true;
    });

    socket.on('controller.move', function(data) {
      if (!controllerConnected) {
        document.querySelector('.intro-modal.controller').style.display = 'none';
        document.querySelector('.intro-modal').style.display = 'block';
        controllerConnected = true;
      }

      armRotation.copy(data);
      arm.quaternion.copy(armRotation).premultiply(offset);
    });

    socket.on('controller.reset', function() {
      var direction = up.clone().applyQuaternion(armRotation);
      var lateralDirection = direction.cross(up).cross(up);

      var direction2 = across.clone().applyQuaternion(player.quaternion);
      var lateralDirection2 = direction2.cross(up).cross(up);
      offset.setFromUnitVectors(lateralDirection, lateralDirection2);
    });
  });

  var roundTime = 250;
  var gapTime = 150;
  var round = 0;
  var progress = roundTime;
  var points = 0;

  var render = function(time) {
    if (vrData.enabled()) {
      var data = vrData.getData();
      player.quaternion.fromArray(data.orientation);
    }

    if (vrui.started) {
      var matrix = new THREE.Matrix4();
      matrix
        .multiply(head.parent.parent.parent.parent.matrix)
        .multiply(head.parent.parent.parent.matrix)
        .multiply(head.parent.parent.matrix)
        .multiply(head.parent.matrix)
      var hammerPosition = head.position.clone().applyMatrix4(matrix);

      buzzers.map(function(buzzer, i) {
        var matrix = new THREE.Matrix4();
        matrix
          .multiply(buzzer.parent.matrix)
          .multiply(buzzer.matrix);
        var buttonPosition = buzzer.button.position.clone().applyMatrix4(matrix);

        if (buttonPosition.sub(hammerPosition).lengthSq() < Math.pow(0.12 + 0.06, 2)) {
          buzzer.button.material.color.set(0xbbbbbb)
          buzzer.glow.material.color.set(0xbbbbbb)
          buzzer.glow.setVisible(false);
          points += (buzzer.points || 0);
          buzzer.points = 0;
          document.querySelector('.score .points').textContent = points;
          document.querySelector('.score.duplicate .points').textContent = points;
        }
      });

      if (round <= 6) {
        var currentRoundTime = roundTime - round * 10;

        if (progress === 1) {
          var shuffled = _.shuffle(buzzers);
          shuffled.slice(0, 4).map(function(buzzer) {
            buzzer.button.material.color.set(0x00bb00)
            buzzer.glow.material.color.set(0x00bb00)
            buzzer.glow.setVisible(true);
            buzzer.points = 1;
          });
          shuffled.slice(4, 8).map(function(buzzer) {
            buzzer.button.material.color.set(0x990000)
            buzzer.glow.material.color.set(0x990000)
            buzzer.glow.setVisible(true);
            buzzer.points = -2;
          });
        }

        if (progress === currentRoundTime) {
          buzzers.map(function(buzzer) {
            buzzer.button.material.color.set(0xbbbbbb)
            buzzer.glow.material.color.set(0xbbbbbb)
            buzzer.glow.setVisible(false);
            buzzer.points = 0;
          });
        }

        if (progress > currentRoundTime + gapTime) {
          progress = 0;
          round++;
        }

        progress++;
      } else {

      }
    }

    arm.position.copy(player.position);
    arm.position.add(across.clone().applyQuaternion(player.quaternion).multiplyScalar(0.25));
    arm.position.y -= 0.3;

    if (vrui.renderStereoscopic()) {
      effect.render(scene, camera);
    }
    else {
      renderer.render(scene, camera)
    }

    requestAnimationFrame(render);
  };

  render(0);
}
