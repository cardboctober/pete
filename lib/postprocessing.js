/**
 * @author alteredq / http://alteredqualia.com/
 */

var THREE = require('three');

THREE.EffectComposer = function (renderer, renderTarget) {

  this.renderer = renderer;

  if (renderTarget === undefined) {

    var parameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false
    };
    var size = renderer.getSize();
    renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, parameters);

  }

  this.renderTarget1 = renderTarget;
  this.renderTarget2 = renderTarget.clone();

  this.writeBuffer = this.renderTarget1;
  this.readBuffer = this.renderTarget2;

  this.passes = [];

  if (THREE.CopyShader === undefined)
    console.error("THREE.EffectComposer relies on THREE.CopyShader");

  this.copyPass = new THREE.ShaderPass(THREE.CopyShader);

};

Object.assign(THREE.EffectComposer.prototype, {

  swapBuffers: function() {

    var tmp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = tmp;

  },

  addPass: function (pass) {

    this.passes.push(pass);

    var size = this.renderer.getSize();
    pass.setSize(size.width, size.height);

  },

  insertPass: function (pass, index) {

    this.passes.splice(index, 0, pass);

  },

  render: function (delta) {

    var maskActive = false;

    var pass, i, il = this.passes.length;

    for (i = 0; i < il; i ++) {

      pass = this.passes[ i ];

      if (pass.enabled === false) continue;

      pass.render(this.renderer, this.writeBuffer, this.readBuffer, delta, maskActive);

      if (pass.needsSwap) {

        if (maskActive) {

          var context = this.renderer.context;

          context.stencilFunc(context.NOTEQUAL, 1, 0xffffffff);

          this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, delta);

          context.stencilFunc(context.EQUAL, 1, 0xffffffff);

        }

        this.swapBuffers();

      }

      if (THREE.MaskPass !== undefined) {

        if (pass instanceof THREE.MaskPass) {

          maskActive = true;

        } else if (pass instanceof THREE.ClearMaskPass) {

          maskActive = false;

        }

      }

    }

  },

  reset: function (renderTarget) {

    if (renderTarget === undefined) {

      var size = this.renderer.getSize();

      renderTarget = this.renderTarget1.clone();
      renderTarget.setSize(size.width, size.height);

    }

    this.renderTarget1.dispose();
    this.renderTarget2.dispose();
    this.renderTarget1 = renderTarget;
    this.renderTarget2 = renderTarget.clone();

    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;

  },

  setSize: function (width, height) {

    this.renderTarget1.setSize(width, height);
    this.renderTarget2.setSize(width, height);

    for (var i = 0; i < this.passes.length; i ++) {

      this.passes[i].setSize(width, height);

    }

  }

});


THREE.Pass = function () {

  // if set to true, the pass is processed by the composer
  this.enabled = true;

  // if set to true, the pass indicates to swap read and write buffer after rendering
  this.needsSwap = true;

  // if set to true, the pass clears its buffer before rendering
  this.clear = false;

  // if set to true, the result of the pass is rendered to screen
  this.renderToScreen = false;

};

Object.assign(THREE.Pass.prototype, {

  setSize: function(width, height) {},

  render: function (renderer, writeBuffer, readBuffer, delta, maskActive) {

    console.error("THREE.Pass: .render() must be implemented in derived pass.");

  }

});

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.ShaderPass = function (shader, textureID) {

  THREE.Pass.call(this);

  this.textureID = (textureID !== undefined) ? textureID : "tDiffuse";

  if (shader instanceof THREE.ShaderMaterial) {

    this.uniforms = shader.uniforms;

    this.material = shader;

  } else if (shader) {

    this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    this.material = new THREE.ShaderMaterial({

      defines: shader.defines || {},
      uniforms: this.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader

    });

  }

  this.camera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
  this.scene = new THREE.Scene();

  this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
  this.scene.add(this.quad);

};

THREE.ShaderPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {

  constructor: THREE.ShaderPass,

  render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {

    if (this.uniforms[ this.textureID ]) {

      this.uniforms[ this.textureID ].value = readBuffer.texture;

    }

    this.quad.material = this.material;

    if (this.renderToScreen) {

      renderer.render(this.scene, this.camera);

    } else {

      renderer.render(this.scene, this.camera, writeBuffer, this.clear);

    }

  }

});

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.RenderPass = function (scene, camera, overrideMaterial, clearColor, clearAlpha) {

  THREE.Pass.call(this);

  this.scene = scene;
  this.camera = camera;

  this.overrideMaterial = overrideMaterial;

  this.clearColor = clearColor;
  this.clearAlpha = (clearAlpha !== undefined) ? clearAlpha : 0;

  this.clear = true;
  this.needsSwap = false;

};

THREE.RenderPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {

  constructor: THREE.RenderPass,

  render: function (renderer, writeBuffer, readBuffer, delta, maskActive) {

    var oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    this.scene.overrideMaterial = this.overrideMaterial;

    var oldClearColor, oldClearAlpha;

    if (this.clearColor) {

      oldClearColor = renderer.getClearColor().getHex();
      oldClearAlpha = renderer.getClearAlpha();

      renderer.setClearColor(this.clearColor, this.clearAlpha);

    }

    renderer.render(this.scene, this.camera, this.renderToScreen ? null : readBuffer, this.clear);

    if (this.clearColor) {

      renderer.setClearColor(oldClearColor, oldClearAlpha);

    }

    this.scene.overrideMaterial = null;
    renderer.autoClear = oldAutoClear;
  }

});

/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Full-screen textured quad shader
 */

THREE.CopyShader = {

  uniforms: {

    "tDiffuse": { value: null },
    "opacity":  { value: 1.0 }

  },

  vertexShader: [

    "varying vec2 vUv;",

    "void main() {",

      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",

    "}"

  ].join("\n"),

  fragmentShader: [

    "uniform float opacity;",

    "uniform sampler2D tDiffuse;",

    "varying vec2 vUv;",

    "void main() {",

      "vec4 texel = texture2D(tDiffuse, vUv);",
      "gl_FragColor = opacity * texel;",

    "}"

  ].join("\n")

};

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.MaskPass = function ( scene, camera ) {

  this.scene = scene;
  this.camera = camera;

  this.enabled = true;
  this.clear = true;
  this.needsSwap = false;

  this.inverse = false;

};

THREE.MaskPass.prototype = {

  render: function ( renderer, writeBuffer, readBuffer, delta ) {

    var context = renderer.context;

    // don't update color or depth

    context.colorMask( false, false, false, false );
    context.depthMask( false );

    // set up stencil

    var writeValue, clearValue;

    if ( this.inverse ) {

      writeValue = 0;
      clearValue = 1;

    } else {

      writeValue = 1;
      clearValue = 0;

    }

    context.enable( context.STENCIL_TEST );
    context.stencilOp( context.REPLACE, context.REPLACE, context.REPLACE );
    context.stencilFunc( context.ALWAYS, writeValue, 0xffffffff );
    context.clearStencil( clearValue );

    // draw into the stencil buffer

    renderer.render( this.scene, this.camera, readBuffer, this.clear );
    renderer.render( this.scene, this.camera, writeBuffer, this.clear );

    // re-enable update of color and depth

    context.colorMask( true, true, true, true );
    context.depthMask( true );

    // only render where stencil is set to 1

    context.stencilFunc( context.EQUAL, 1, 0xffffffff );  // draw if == 1
    context.stencilOp( context.KEEP, context.KEEP, context.KEEP );

  }

};


THREE.ClearMaskPass = function () {

  this.enabled = true;

};

THREE.ClearMaskPass.prototype = {

  render: function ( renderer, writeBuffer, readBuffer, delta ) {

    var context = renderer.context;

    context.disable( context.STENCIL_TEST );

  }

};
