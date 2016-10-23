var vrData = function() {
  this.display = null
  if (navigator.getVRDisplays) {
    navigator.getVRDisplays().then(function(displays) {
      this.display = displays ? displays[0] : null;
    }.bind(this));
  }

  this.frameData = null;
  if ('VRFrameData' in window) {
    this.frameData = new VRFrameData();
  }

  this.enabled = function() {
    return !!this.display;
  }

  this.getData = function() {
    if (this.display) {
      if (this.display.getFrameData) {
        this.display.getFrameData(this.frameData);
        return this.frameData.pose;
      }
      if (this.display.getPose) {
        return this.display.getPose();
      }
      return null;
    }
  }
};

module.exports = vrData;
