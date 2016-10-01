module.exports = function(THREE) {
  THREE.TETRAHEDRON_ANGLE = Math.atan(2 / Math.sqrt(2));

  THREE.Object3D.prototype.setVisible = function(visible) {
    return this.traverse(function(object) { object.visible = visible; });
  };

  THREE.Vector3.randomUnit = function() {
	  return new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
	};

  return THREE;
};
