(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var THREE = require('../lib/three-utils')((typeof window !== "undefined" ? window['THREE'] : typeof global !== "undefined" ? global['THREE'] : null));
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);
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
    var possible = "abcdefghijklmnopqrstuvwxyz";
    return _.times(3, function() {
      return possible.charAt(Math.floor(Math.random() * possible.length));
    }).join('');
  };

  var id = randomId();
  document.querySelector('.intro-modal.base').style.display = 'block';
  document.querySelector('.intro-modal.controller').style.display = 'block';
  var link = document.querySelector('.intro-modal.controller .link');
  link.href = "https://cardboctober.xyz/pete/17/?" + id;
  link.textContent = "cardboctober.xyz/pete/17/?" + id;

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

  var vertex = planeGeometry.vertices[height / 2 + width / 2 * height];
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
  var baseRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI / 2);
  var offset = new THREE.Quaternion();

  var controllerConnected = false;

  socket.on('connect', function() {
    socket.emit('viewer.ready', id);

    socket.on('controller.ready', function(data) {
      document.querySelector('.intro-modal.controller').style.display = 'none';
      document.querySelector('.viewer-prompt').style.display = 'block';
      controllerConnected = true;
    });

    socket.on('controller.move', function(data) {
      if (!controllerConnected) {
        document.querySelector('.intro-modal.controller').style.display = 'none';
        document.querySelector('.viewer-prompt').style.display = 'block';
        controllerConnected = true;
      }

      armRotation.copy(data).premultiply(baseRotation);
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

  var gameStarted = false;

  // var testMaterial = new THREE.MeshLambertMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0.5 });
  // var test = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), testMaterial);
  // scene.add(test);

  var render = function(time) {
    if (started) {
      if (sensor) {
        player.quaternion.copy(sensor.getState().orientation);
      }

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
          document.querySelector('.intro-modal.score .points').textContent = points;
          document.querySelector('.intro-modal.score.stereo .points').textContent = points;
        }
      });


      if (round <= 6) {
        var currentRoundTime = roundTime - round * 10;

        if (progress === 1) {

          if (!gameStarted) {
            document.querySelector('.score').style.display = 'block';
            document.querySelector('.score.stereo').style.display = 'block';
            gameStarted = true;
          }

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

    document.body.classList[cardboard && window.orientation !== 0 ? 'add' : 'remove']('stereo');

    document.querySelector('.score').style.display = 'block';
    document.querySelector('.score.stereo').style.display = 'block';
    resize();
  });

  var updateOrientation = function() {
    document.body.classList[cardboard && window.orientation !== 0 ? 'add' : 'remove']('stereo');

    if (!started && chosen && !cardboard && window.orientation !== 0) {
      document.querySelector('.intro-modal.place-phone').style.display = 'none';
      document.querySelector('.intro-modal.place-phone.stereo').style.display = 'none';
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lib/three-utils":2}],2:[function(require,module,exports){
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
