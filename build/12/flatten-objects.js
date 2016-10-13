(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{}]},{},[1]);
