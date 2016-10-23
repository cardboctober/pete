var _ = require('lodash');
var screenfull = require('screenfull');

var setVisible = function(element, state) {
  if (element.length !== undefined) {
    _.map(element, function(e) {
      setVisible(e, state);
    });
    return;
  }
  element.style.display = state ? 'block' : 'none';
};

var toggleClass = function(element, className, state) {
  element.classList[state ? 'add' : 'remove'](className);
};

var VRUI = function(updateCallback) {
  this.chosen = false;
  this.started = false;
  this.stereoscopic = false;

  var wrapper = document.querySelector('.wrapper');
  var introModal = document.querySelector('.intro-modal');
  var introModalDuplicate = document.querySelector('.intro-modal.duplicate');
  var viewerButton = document.querySelector('.with-viewer');
  var deviceButton = document.querySelector('.no-viewer');
  var fullscreenToggleButton = document.querySelector('.fullscreen-button');
  var cardboardToggleButton = document.querySelector('.cardboard-button');

  introModalDuplicate.innerHTML = introModal.innerHTML;

  var iosFullscreenPrompt = document.querySelectorAll('.fullscreen-prompt');
  var viewerPrompt = document.querySelectorAll('.viewer-prompt');
  var startPrompt = document.querySelectorAll('.viewer-start-prompt');
  var rotatePrompt = document.querySelectorAll('.rotate-prompt');

  var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  this.isLandscape = function() {
    return window.orientation === undefined || window.orientation !== 0;
  };

  if (iOS) {
    setVisible(iosFullscreenPrompt, true);
    window.onscroll = function() {
      var top = window.pageYOffset || document.scrollTop;
      if (!this.chosen && top >= 50) {
        setVisible(iosFullscreenPrompt, false);
        setVisible(viewerPrompt, true);
      }
    }.bind(this);
  } else {
    setVisible(viewerPrompt, true);
  }

  this.chooseHeadset = function(e) {
    e.stopPropagation();
    this.toggleFullScreen();

    setTimeout(function() {
      this.chosen = true;
      this.stereoscopic = true;
      setVisible(viewerPrompt, false);
      if (screenfull.enabled) {
        setVisible(fullscreenToggleButton, true);
      }
      if (this.isLandscape()) {
        this.updateStereoscopic();
        setVisible(startPrompt, true);
      } else {
        setVisible(rotatePrompt, true);
      }
    }.bind(this), 50);
  }.bind(this);

  this.chooseNoHeadset = function(e) {
    e.stopPropagation();
    this.chosen = true;
    this.stereoscopic = false;
    this.start();
  }.bind(this);

  this.start = function() {
    this.started = true;
    setVisible(introModal, false);
    setVisible(introModalDuplicate, false);
    if (screenfull.enabled) {
      setVisible(fullscreenToggleButton, true);
    }
    setVisible(cardboardToggleButton, this.isLandscape());
  };

  viewerButton.addEventListener('click', this.chooseHeadset);
  deviceButton.addEventListener('click', this.chooseNoHeadset);

  wrapper.addEventListener('click', function() {
    if (this.chosen && !this.started && (this.isLandscape() || !this.stereoscopic)) {
      this.start();
    }
  }.bind(this));

  this.toggleFullScreen = function(e) {
    if (e) e.stopPropagation();
    if (screenfull.enabled) {
      screenfull.toggle();
    }
  }.bind(this);

  fullscreenToggleButton.addEventListener('click', this.toggleFullScreen);

  cardboardToggleButton.addEventListener('click', function(e) {
    e.stopPropagation();
    this.stereoscopic = !this.stereoscopic;
    this.updateStereoscopic();
  }.bind(this));

  this.updateStereoscopic = function() {
    toggleClass(document.body, 'stereo', this.stereoscopic && this.isLandscape());
    updateCallback(this);
  };

  this.renderStereoscopic = function() {
    return this.stereoscopic && this.isLandscape();
  };

  this.changeOrientation = function() {
    this.updateStereoscopic();

    if (!this.started && this.chosen) {
      if (this.stereoscopic) {
        setVisible(rotatePrompt, !this.isLandscape());
        setVisible(startPrompt, this.isLandscape());
      }

      if (!this.stereoscopic && this.isLandscape()) {
        this.start();
      }
    }

    setVisible(cardboardToggleButton, this.started && this.isLandscape());
  }.bind(this);

  window.addEventListener('orientationchange', this.changeOrientation, false);
  this.changeOrientation();
};

module.exports = VRUI;
