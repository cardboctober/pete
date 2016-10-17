var THREE = require('../lib/three-utils')(require('three'));
var detectSphereCollision = require('../lib/detect-sphere-collision');
var _ = require('lodash');
var socket = io.connect('https://cardboctober-sockets.herokuapp.com/');

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

    var promise = new FULLTILT.getDeviceOrientation({ type: 'world' });
    promise.then(function(deviceOrientation) {
      deviceOrientation.start(function(data) {
        quaternion.copy(deviceOrientation.getScreenAdjustedQuaternion());
        controllerMove(quaternion);
      });
    });
  });

  var tap = function(e) {
    e.preventDefault();
    socket.emit('controller.reset', {});
  };

  document.body.addEventListener('mousedown', tap);
  document.body.addEventListener('touchstart', tap);

} else {
  var randomId = function() {
    return 'hello';
    var possible = "abcdefghijklmnopqrstuvwxyz";
    return _.times(6, function() {
      return possible.charAt(Math.floor(Math.random() * possible.length));
    }).join('');
  };

  var id = randomId();
  document.querySelector('.intro-modal.base').style.display = 'block';
  document.querySelector('.intro-modal.controller').style.display = 'block';
  var link = document.querySelector('.intro-modal.controller .link');
  link.href = "https://cardboctober.xyz/pete/16/?" + id;
  link.textContent = "cardboctober.xyz/pete/16/?" + id;

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

  var chosen = false;
  var started = false;

  var pixelRatio = window.devicePixelRatio || 1;

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000);

  document.body.appendChild(renderer.domElement);

  var effect = new THREE.StereoEffect(renderer);
  effect.eyeSeparation = 0.3;
  effect.setSize(window.innerWidth, window.innerHeight);

  var started = false;
  var cardboard = false;

  player.position.y = vertex.z + land.position.y + 0.75;

  var start = function(e) {
    e.preventDefault();
  };

  var stop = function(e) {
    e.preventDefault();
  };

  document.querySelector('canvas').addEventListener('mousedown', start);
  document.querySelector('canvas').addEventListener('mouseup', stop);

  document.querySelector('canvas').addEventListener('touchstart', start);
  document.querySelector('canvas').addEventListener('touchend', stop);

  scene.add(object);

  var arm = new THREE.Object3D();

  var normalMaterial = new THREE.MeshNormalMaterial({ overdraw: 0.5 });
  var box = new THREE.Mesh(new THREE.CubeGeometry(0.1, 0.3, 0.05), normalMaterial);
  arm.add(box);
  object.add(arm);
  box.position.y = 0.5;
  // arm.position.z = -0.5;
  // arm.position.y = -0.2;

  var armRotation = new THREE.Quaternion();
  var baseRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI / 2);
  var offset = new THREE.Quaternion();

  socket.on('connect', function() {
    socket.emit('viewer.ready', id);

    socket.on('controller.ready', function(data) {
      document.querySelector('.intro-modal.controller').style.display = 'none';
      document.querySelector('.viewer-prompt').style.display = 'block';
    });

    socket.on('controller.move', function(data) {
      armRotation.copy(data).premultiply(baseRotation);
      arm.quaternion.copy(armRotation).premultiply(offset);
    });

    socket.on('controller.reset', function() {
      var direction = forward.clone().applyQuaternion(armRotation);
      var lateralDirection = direction.cross(up).cross(up);

      var direction2 = forward.clone().applyQuaternion(player.quaternion);
      var lateralDirection2 = direction2.cross(up).cross(up);
      offset.setFromUnitVectors(lateralDirection, lateralDirection2);
    })
  });

  var render = function(time) {
    if (started) {
      if (sensor) {
        player.quaternion.copy(sensor.getState().orientation);
      }
    }

    arm.position.copy(player.position);
    arm.position.add(across.clone().applyQuaternion(player.quaternion).multiplyScalar(0.4));
    arm.position.y -= 0.3;

    if (cardboard && window.orientation !== 0) {
      effect.render(scene, camera);
    }
    else {
      renderer.render(scene, camera)
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

}
