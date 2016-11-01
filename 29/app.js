var THREE = require('three');
require('../lib/three-utils');
require('../lib/three-water');
require('../lib/stereo-effect');
require('../lib/postprocessing');
require('../lib/three-model-loader');
var _ = require('lodash');
var FastClick = require('fastclick');
var VrData = require('../lib/vr-data');
require('webvr-polyfill/src/main');


var THREEx = {};

/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 *
 * Two pass Gaussian blur filter (horizontal and vertical blur shaders)
 * - described in http://www.gamerendering.com/2008/10/11/gaussian-blur-filter-shader/
 *   and used in http://www.cake23.de/traveling-wavefronts-lit-up.html
 *
 * - 9 samples per pass
 * - standard deviation 2.7
 * - "h" and "v" parameters should be set to "1 / width" and "1 / height"
 */

THREE.HorizontalBlurShader = {

  uniforms: {

    "tDiffuse": { type: "t", value: null },
    "h":        { type: "f", value: 1.0 / 512.0 }

  },

  vertexShader: [

    "varying vec2 vUv;",

    "void main() {",

      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

    "}"

  ].join("\n"),

  fragmentShader: [

    "uniform sampler2D tDiffuse;",
    "uniform float h;",

    "varying vec2 vUv;",

    "void main() {",

      "vec4 sum = vec4( 0.0 );",

      "sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;",
      "sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;",
      "sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;",
      "sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;",
      "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;",
      "sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;",
      "sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;",
      "sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;",
      "sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;",

      "gl_FragColor = sum;",

    "}"

  ].join("\n")

};

/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 *
 * Two pass Gaussian blur filter (horizontal and vertical blur shaders)
 * - described in http://www.gamerendering.com/2008/10/11/gaussian-blur-filter-shader/
 *   and used in http://www.cake23.de/traveling-wavefronts-lit-up.html
 *
 * - 9 samples per pass
 * - standard deviation 2.7
 * - "h" and "v" parameters should be set to "1 / width" and "1 / height"
 */

THREE.VerticalBlurShader = {

  uniforms: {

    "tDiffuse": { type: "t", value: null },
    "v":        { type: "f", value: 1.0 / 512.0 }

  },

  vertexShader: [

    "varying vec2 vUv;",

    "void main() {",

      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

    "}"

  ].join("\n"),

  fragmentShader: [

    "uniform sampler2D tDiffuse;",
    "uniform float v;",

    "varying vec2 vUv;",

    "void main() {",

      "vec4 sum = vec4( 0.0 );",

      "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;",
      "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;",
      "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;",
      "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;",
      "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;",
      "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;",
      "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;",
      "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;",
      "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;",

      "gl_FragColor = sum;",

    "}"

  ].join("\n")

};


//////////////////////////////////////////////////////////////////////////////////
//    uniforms tween              //
//////////////////////////////////////////////////////////////////////////////////

// TODO for each uniforms, does a tween function, do a total delay
THREEx.UniformsTween  = function(uniforms, tweenFns){
  // add EventDispatcher in this object
  THREE.EventDispatcher.prototype.apply(this)

  var srcUniforms = THREE.UniformsUtils.clone(uniforms)
  var dstUniforms = THREE.UniformsUtils.clone(uniforms)
  this.dstUniforms= dstUniforms

  this.needsUpdate= true
  this.tweenDelay = 2

  var time  = null
  this.update = function(delta, now){
    if( this.needsUpdate ){
      time    = this.tweenDelay
      srcUniforms = THREE.UniformsUtils.clone(uniforms)
      this.needsUpdate= false
    }

    // if no tweening is in progress, return now
    if( time === null ) return
    // descrease the time remaining to tween
    time  -= delta
    // if tweening is going on after decrease, update value
    if( time > 0 ){
      var amount  = (this.tweenDelay-time) / this.tweenDelay
      lerpUniforms(amount)
    }else{
      // if tweening just stopped, init to dstUniforms
      lerpUniforms(1.0)
      // make tweening as over
      time  = null
      // dispatch an event
      this.dispatchEvent({ type: 'completed' })
    }
  }
  this.copy = function(){
    this.value  = THREE.UniformsUtils.clone(uniforms)
  }

  this.clone  = function(){
    return THREE.UniformsUtils.clone(uniforms)
  }
  /**
   * lerp functions between 2 uniforms
   * @param  {Number} amount      the mixin amount between the 2
   */
  function lerpUniforms(amount){
    // go thru each uniforms
    // - srcUniforms and dstUniforms are assumed to have the same value
    Object.keys(tweenFns).forEach(function(uniformKey){
      var srcUniform  = srcUniforms[uniformKey]
      var dstUniform  = dstUniforms[uniformKey]
      var tweenFn = tweenFns[uniformKey]
      // compute the lerp depending on the type
      if( srcUniform.type === 'f' ){
        var value = lerpFloat(srcUniform.value, dstUniform.value, tweenFn(amount))
// console.log('lerp src', uniformKey, amount, value)
        uniforms[uniformKey].value  = value
        // console.log('lerp src', uniformKey, amount, value)
      }else{
        console.assert('unhandled type of uniform', srcUniform.type)
      }
    })
    return
    //////////////////////////////////////////////////////////////////////////////////
    //    lerp functions for types of uniforms        //
    //////////////////////////////////////////////////////////////////////////////////

    function lerpFloat(srcValue, dstValue, amount){
      return srcValue + (dstValue-srcValue)*amount
    }
  }
}


//////////////////////////////////////////////////////////////////////////////////
//    comment               //
//////////////////////////////////////////////////////////////////////////////////


/**
 * From tween.js
 */
THREEx.UniformsTween.Easing = {

  Linear: {

    None: function ( k ) {

      return k;

    }

  },

  Quadratic: {

    In: function ( k ) {

      return k * k;

    },

    Out: function ( k ) {

      return k * ( 2 - k );

    },

    InOut: function ( k ) {

      if ( ( k *= 2 ) < 1 ) return 0.5 * k * k;
      return - 0.5 * ( --k * ( k - 2 ) - 1 );

    }

  },

  Cubic: {

    In: function ( k ) {

      return k * k * k;

    },

    Out: function ( k ) {

      return --k * k * k + 1;

    },

    InOut: function ( k ) {

      if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
      return 0.5 * ( ( k -= 2 ) * k * k + 2 );

    }

  },

  Quartic: {

    In: function ( k ) {

      return k * k * k * k;

    },

    Out: function ( k ) {

      return 1 - ( --k * k * k * k );

    },

    InOut: function ( k ) {

      if ( ( k *= 2 ) < 1) return 0.5 * k * k * k * k;
      return - 0.5 * ( ( k -= 2 ) * k * k * k - 2 );

    }

  },

  Quintic: {

    In: function ( k ) {

      return k * k * k * k * k;

    },

    Out: function ( k ) {

      return --k * k * k * k * k + 1;

    },

    InOut: function ( k ) {

      if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k * k * k;
      return 0.5 * ( ( k -= 2 ) * k * k * k * k + 2 );

    }

  },

  Sinusoidal: {

    In: function ( k ) {

      return 1 - Math.cos( k * Math.PI / 2 );

    },

    Out: function ( k ) {

      return Math.sin( k * Math.PI / 2 );

    },

    InOut: function ( k ) {

      return 0.5 * ( 1 - Math.cos( Math.PI * k ) );

    }

  },

  Exponential: {

    In: function ( k ) {

      return k === 0 ? 0 : Math.pow( 1024, k - 1 );

    },

    Out: function ( k ) {

      return k === 1 ? 1 : 1 - Math.pow( 2, - 10 * k );

    },

    InOut: function ( k ) {

      if ( k === 0 ) return 0;
      if ( k === 1 ) return 1;
      if ( ( k *= 2 ) < 1 ) return 0.5 * Math.pow( 1024, k - 1 );
      return 0.5 * ( - Math.pow( 2, - 10 * ( k - 1 ) ) + 2 );

    }

  },

  Circular: {

    In: function ( k ) {

      return 1 - Math.sqrt( 1 - k * k );

    },

    Out: function ( k ) {

      return Math.sqrt( 1 - ( --k * k ) );

    },

    InOut: function ( k ) {

      if ( ( k *= 2 ) < 1) return - 0.5 * ( Math.sqrt( 1 - k * k) - 1);
      return 0.5 * ( Math.sqrt( 1 - ( k -= 2) * k) + 1);

    }

  },

  Elastic: {

    In: function ( k ) {

      var s, a = 0.1, p = 0.4;
      if ( k === 0 ) return 0;
      if ( k === 1 ) return 1;
      if ( !a || a < 1 ) { a = 1; s = p / 4; }
      else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
      return - ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );

    },

    Out: function ( k ) {

      var s, a = 0.1, p = 0.4;
      if ( k === 0 ) return 0;
      if ( k === 1 ) return 1;
      if ( !a || a < 1 ) { a = 1; s = p / 4; }
      else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
      return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );

    },

    InOut: function ( k ) {

      var s, a = 0.1, p = 0.4;
      if ( k === 0 ) return 0;
      if ( k === 1 ) return 1;
      if ( !a || a < 1 ) { a = 1; s = p / 4; }
      else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
      if ( ( k *= 2 ) < 1 ) return - 0.5 * ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
      return a * Math.pow( 2, -10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) * 0.5 + 1;

    }

  },

  Back: {

    In: function ( k ) {

      var s = 1.70158;
      return k * k * ( ( s + 1 ) * k - s );

    },

    Out: function ( k ) {

      var s = 1.70158;
      return --k * k * ( ( s + 1 ) * k + s ) + 1;

    },

    InOut: function ( k ) {

      var s = 1.70158 * 1.525;
      if ( ( k *= 2 ) < 1 ) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
      return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );

    }

  },

  Bounce: {

    In: function ( k ) {

      return 1 - TWEEN.Easing.Bounce.Out( 1 - k );

    },

    Out: function ( k ) {

      if ( k < ( 1 / 2.75 ) ) {

        return 7.5625 * k * k;

      } else if ( k < ( 2 / 2.75 ) ) {

        return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;

      } else if ( k < ( 2.5 / 2.75 ) ) {

        return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;

      } else {

        return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;

      }

    },

    InOut: function ( k ) {

      if ( k < 0.5 ) return TWEEN.Easing.Bounce.In( k * 2 ) * 0.5;
      return TWEEN.Easing.Bounce.Out( k * 2 - 1 ) * 0.5 + 0.5;

    }

  }

};

var THREEx  = THREEx  || {};

THREEx.ToxicPproc = {}

THREEx.ToxicPproc.baseURL = '../'

//////////////////////////////////////////////////////////////////////////////////
//    comment               //
//////////////////////////////////////////////////////////////////////////////////

THREEx.ToxicPproc.passesPreset  = {}

//////////////////////////////////////////////////////////////////////////////////
//    reset preset              //
//////////////////////////////////////////////////////////////////////////////////


THREEx.ToxicPproc.passesPreset['sober'] = {
  init  : function(){
    // hBlurPass
    var uniforms  = this.hBlurTween.dstUniforms
    uniforms.h.value  = 0

    // vBlurPass
    var uniforms  = this.vBlurTween.dstUniforms
    uniforms.v.value  = 0

    // rgbRadialPass
    var uniforms  = this.rgbRadialTween.dstUniforms
    uniforms.factor.value = 0
    uniforms.power.value  = 3.0

    // seeDoublePass
    var uniforms  = this.seeDoubleTween.dstUniforms
    uniforms.radius.value = 0
    uniforms.timeSpeed.value= 0
    uniforms.mixRatio.value = 0.5
    uniforms.opacity.value  = 1.0

    // refractionPass
    var uniforms  = this.refractionTween.dstUniforms
    uniforms.timeSpeed.value  = 0
    uniforms.Frequency.value  = 0.0
    uniforms.Amplitude.value  = 0
  },
  update  : function(delta, now){
  }
}

//////////////////////////////////////////////////////////////////////////////////
//    drunk preset              //
//////////////////////////////////////////////////////////////////////////////////


THREEx.ToxicPproc.passesPreset['drunk'] = {
  init  : function(){
    // hBlurPass
    var uniforms  = this.hBlurTween.dstUniforms
    uniforms.h.value= 0.001

    // vBlurPass
    var uniforms  = this.vBlurTween.dstUniforms
    uniforms.v.value= 0.001

    // seeDoublePass
    var uniforms  = this.seeDoubleTween.dstUniforms
    uniforms.radius.value = 0.03
    uniforms.timeSpeed.value= 1.0

    // refractionPass
    var uniforms  = this.refractionTween.dstUniforms
    uniforms.timeSpeed.value  = 0.2
    uniforms.Frequency.value  = 1.1
    uniforms.Amplitude.value  = 40
  },
  update  : function(delta, now){
  }
}

//////////////////////////////////////////////////////////////////////////////////
//    high preset             //
//////////////////////////////////////////////////////////////////////////////////

THREEx.ToxicPproc.passesPreset['high']  = {
  init  : function(){
    // hBlurPass
    var uniforms  = this.hBlurTween.dstUniforms
    uniforms.h.value= 0.001

    // vBlurPass
    var uniforms  = this.vBlurTween.dstUniforms
    uniforms.v.value= 0.001

    // rgbRadialPass
    var uniforms  = this.rgbRadialTween.dstUniforms
    uniforms.factor.value = 0.02
    uniforms.power.value  = 3.0

    // seeDoublePass
    // var uniforms = this.seeDoubleTween.dstUniforms
    // uniforms.radius.value  = 0.03
    // uniforms.timeSpeed.value= 1.0

    // refractionPass
    var uniforms  = this.refractionTween.dstUniforms
    uniforms.timeSpeed.value  = 0.25
    uniforms.Frequency.value  = 1.1
    uniforms.Amplitude.value  = 40
  },
  update  : function(delta, now){
  }
}

//////////////////////////////////////////////////////////////////////////////////
//    wasted preset             //
//////////////////////////////////////////////////////////////////////////////////

THREEx.ToxicPproc.passesPreset['wasted']  = {
  init  : function(){
    // hBlurPass
    var uniforms  = this.hBlurTween.dstUniforms
    uniforms.h.value= 0.001

    // vBlurPass
    var uniforms  = this.vBlurTween.dstUniforms
    uniforms.v.value= 0.001

    // rgbRadialPass
    var uniforms  = this.rgbRadialTween.dstUniforms
    uniforms.factor.value = 0.05
    uniforms.power.value  = 3.0

    // seeDoublePass
    // var uniforms = this.seeDoubleTween.dstUniforms
    // uniforms.radius.value  = 0.03
    // uniforms.timeSpeed.value= 1.0

    // refractionPass
    var uniforms  = this.refractionTween.dstUniforms
    uniforms.timeSpeed.value  = 0.5
    uniforms.Frequency.value  = 2.2
    uniforms.Amplitude.value  = 60
  },
  update  : function(delta, now){
  }
}

//////////////////////////////////////////////////////////////////////////////////
//    comment               //
//////////////////////////////////////////////////////////////////////////////////

/**
 * how to change so it is usable in a existing post processing chain ?
 * - possibility:
 *   - put only the effect in a class
 *   - put the renderer in another
 */

THREEx.ToxicPproc.Passes  = function(presetLabel){
  // default value arguments
  presetLabel = presetLabel || 'sober'
  // internal update function
  var onUpdateFcts= []
  this.update = function(delta, now){
    onUpdateFcts.forEach(function(onUpdateFct){
      onUpdateFct(delta, now)
    }.bind(this))
  }

  // Presets
  var preset  = THREEx.ToxicPproc.passesPreset[presetLabel]
  this.setPreset  = function(label){
    // reset of all values
    THREEx.ToxicPproc.passesPreset['sober'].init.apply(this)

    preset  = THREEx.ToxicPproc.passesPreset[label]
    preset.init.apply(this)

    hBlurTween.needsUpdate    = true
    vBlurTween.needsUpdate    = true
    rgbRadialTween.needsUpdate  = true
    seeDoubleTween.needsUpdate  = true
    refractionTween.needsUpdate = true
  }

  // update all tween
  onUpdateFcts.push(function(delta, now){
    hBlurTween.update(delta, now)
    vBlurTween.update(delta, now)
    rgbRadialTween.update(delta, now)
    seeDoubleTween.update(delta, now)
    refractionTween.update(delta, now)
  })


  /**
   * to add toxicPasses to a THREE.EffectComposer
   * @param {THREE.EffectComposer} composer the composer to which it is added
   */
  this.addPassesTo  = function(composer){
    composer.addPass(hBlurPass)
    composer.addPass(vBlurPass)
    composer.addPass(rgbRadialPass)
    composer.addPass(seeDoublePass)
    composer.addPass(refractionPass)
    refractionPass.renderToScreen = true;
  }


  //////////////////////////////////////////////////////////////////////////////////
  //    init all Passes and Tweens          //
  //////////////////////////////////////////////////////////////////////////////////


  // hBlurPass
  var hBlurPass = this.hBlurPass  = new THREE.ShaderPass( THREE.HorizontalBlurShader );
  var hBlurTween  = this.hBlurTween = new THREEx.UniformsTween(hBlurPass.uniforms, {
    h : THREEx.UniformsTween.Easing.Linear.None,
  })

  // vBlurPass
  var vBlurPass = this.vBlurPass  = new THREE.ShaderPass( THREE.VerticalBlurShader );
  var vBlurTween  = this.vBlurTween = new THREEx.UniformsTween(vBlurPass.uniforms, {
    v : THREEx.UniformsTween.Easing.Linear.None,
  })

  // rgbRadialPass
  var rgbRadialPass = this.rgbRadialPass  = new THREE.ShaderPass( THREEx.ToxicPproc.RGBShiftRadialShader)
  var rgbRadialTween  = this.rgbRadialTween = new THREEx.UniformsTween(rgbRadialPass.uniforms, {
    factor    : THREEx.UniformsTween.Easing.Linear.None,
  })

  // seeDoublePass
  var seeDoublePass = this.seeDoublePass  = new THREE.ShaderPass( THREEx.ToxicPproc.SeeDoubleShader)
  var seeDoubleTween  = this.seeDoubleTween = new THREEx.UniformsTween(seeDoublePass.uniforms, {
    radius    : THREEx.UniformsTween.Easing.Linear.None,
    timeSpeed : THREEx.UniformsTween.Easing.Linear.None,
  })

  // refractionPass
  var refractionPass  = this.refractionPass = new THREE.ShaderPass( THREEx.ToxicPproc.RefractionShader)
  var refractionTween = this.refractionTween  = new THREEx.UniformsTween(refractionPass.uniforms, {
    timeSpeed : THREEx.UniformsTween.Easing.Linear.None,
    RandomNumber  : THREEx.UniformsTween.Easing.Linear.None,
    Period    : THREEx.UniformsTween.Easing.Linear.None,
    Frequency : THREEx.UniformsTween.Easing.Linear.None,
    Amplitude : THREEx.UniformsTween.Easing.Linear.None,
  })


  //////////////////////////////////////////////////////////////////////////////////
  //    comment               //
  //////////////////////////////////////////////////////////////////////////////////


  // reset of all values
  THREEx.ToxicPproc.passesPreset['sober'].init.apply(this)
  // init current preset
  preset.init.apply(this)
  onUpdateFcts.push(function(delta, now){
    // update .time in the needed Pass
    // seeDoublePass
    var uniforms  = seeDoublePass.uniforms
    uniforms.time.value += delta * uniforms.timeSpeed.value;
    // refractionPass
    var uniforms  = refractionPass.uniforms
    uniforms.time.value += delta * uniforms.timeSpeed.value;

    // update current preset
    preset.update.apply(this, [delta, now])
  }.bind(this))
}

//////////////////////////////////////////////////////////////////////////////////
//    Shaders               //
//////////////////////////////////////////////////////////////////////////////////


THREEx.ToxicPproc.RGBShiftRadialShader = {
  uniforms  : {
    "tDiffuse"  : { type: "t", value: null },
    "factor"  : { type: "f", value: 0 },
    "power"   : { type: "f", value: 3 },
  },

  vertexShader  : [
    'varying vec2 vUv;',
    'void main() {',
      'vUv = uv;',
      'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}'
  ].join('\n'),

  fragmentShader  : [

    'uniform sampler2D tDiffuse;',

    'uniform float factor;',
    'uniform float power;',

    'varying vec2 vUv;',

    'void main() {',

/**
 * * compute vector to the center. toCenter vector2
 * * compute unit vector to center
 * * offset length depends on toCenter length
 */

      'vec2 vector2Center = vec2(0.5)-vUv;',
      'vec2 unit2Center = vector2Center / length(vector2Center);',

      'float offsetLength = length(vector2Center) * factor;',
      'offsetLength   = 1.0 - pow(1.0-offsetLength, power);',
      'vec2  offset   = unit2Center * offsetLength;',

      'vec4 cr  = texture2D(tDiffuse, vUv + offset);',
      'vec4 cga = texture2D(tDiffuse, vUv);',
      'vec4 cb  = texture2D(tDiffuse, vUv - offset);',
      'gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);',
    '}'
  ].join("\n")
};

//////////////////////////////////////////////////////////////////////////////////
//    comment               //
//////////////////////////////////////////////////////////////////////////////////


THREEx.ToxicPproc.SeeDoubleShader = {
  uniforms: {
    tDiffuse  : { type: "t", value: null  },

    time    : { type: "f", value: 0.0   },
    timeSpeed : { type: "f", value: 1.0   },


    radius    : { type: "f", value: 0.01  },

                mixRatio  : { type: "f", value: 0.5 },
                opacity   : { type: "f", value: 1.0 },
  },

  vertexShader: [
    "varying vec2 vUv;",
    "void main() {",

      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

    "}"
  ].join("\n"),

  fragmentShader: [
    "uniform sampler2D tDiffuse;",
    "varying vec2 vUv;",
    "uniform float time;",
    "uniform float radius;",

    "uniform float opacity;",
    "uniform float mixRatio;",

    "void main() {",
      "float angle  = time;",
      "vec2 offset  = vec2(cos(angle), sin(angle*2.0))*radius;",
      "vec4 original  = texture2D(tDiffuse, vUv);",
      "vec4 shifted = texture2D(tDiffuse, vUv + offset);",
      "gl_FragColor = opacity * mix( original, shifted, mixRatio );",
    "}"
  ].join("\n")
};

//////////////////////////////////////////////////////////////////////////////////
//    comment               //
//////////////////////////////////////////////////////////////////////////////////


// from http://devmaster.net/posts/3079/shader-effects-refraction#tabs-3
THREEx.ToxicPproc.RefractionShader  = {
  uniforms  : {
    tDiffuse  : {type: "t", value: null },
    ImageSize : {type : "v2", value: new THREE.Vector2(1440,900) },
    TexelSize : {type : "v2", value: new THREE.Vector2(1.0/1440,1.0/900) },
    time    : {type: "f", value: 0.0    },
    timeSpeed : {type: "f", value: 1.0    },

    RandomNumber  : {type: 'f', value: Math.random()  },
    Period    : {type: 'f', value: Math.PI/2    },
    Frequency : {type: 'f', value: 10.0   },
    Amplitude : {type: 'f', value: 0      },
  },
  vertexShader  : [
    'varying vec2 vUv;',

    'void main() {',

      'vUv = uv;',
      'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    '}'
  ].join('\n'),

  fragmentShader  : [
    '// <summary>',
    '// Shader to refract all pixels with their alpha channel set to 0.',
    '// </summary>',
    '',
    '',
    '#ifdef GL_ES',
    ' precision highp float;',
    '#endif',
    '',
    'uniform float time;',
    'uniform float speed;',
    '',
    '// Uniform variables.',
    'uniform vec2 ImageSize;',
    'uniform vec2 TexelSize;',
    'uniform sampler2D tDiffuse;',
    '',
    '// Size of the refraction.',
    'uniform float Amplitude;',
    '',
    '// Frequency of the refraction.',
    'uniform float Frequency;',
    '',
    '// Relative speed (period) of the refraction.',
    'uniform float Period;',
    '',
    '// Random number to animate or mix up the refracted results.',
    'uniform float RandomNumber;',
    '',
    '',
    '// Varying variables.',
    'varying vec2 vUv;',
    '',
    '',
    // TODO put that
    '// Description : Array and textureless GLSL 3D simplex noise function.',
    '//      Author : Ian McEwan, Ashima Arts.',
    '//  Maintainer : ijm',
    '//     Lastmod : 20110822 (ijm)',
    '//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.',
    '//               Distributed under the MIT License. See LICENSE file.',
    '//               https://github.com/ashima/webgl-noise',
    'vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }',
    'vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }',
    'float snoise(vec3 v)',
    '{ ',
    '  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;',
    '  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);',
    '',
    '  // First corner',
    '  vec3 i  = floor(v + dot(v, C.yyy) );',
    '  vec3 x0 =   v - i + dot(i, C.xxx) ;',
    '',
    '  // Other corners',
    '  vec3 g = step(x0.yzx, x0.xyz);',
    '  vec3 l = 1.0 - g;',
    '  vec3 i1 = min( g.xyz, l.zxy );',
    '  vec3 i2 = max( g.xyz, l.zxy );',
    '',
    '  //   x0 = x0 - 0.0 + 0.0 * C.xxx;',
    '  //   x1 = x0 - i1  + 1.0 * C.xxx;',
    '  //   x2 = x0 - i2  + 2.0 * C.xxx;',
    '  //   x3 = x0 - 1.0 + 3.0 * C.xxx;',
    '  vec3 x1 = x0 - i1 + C.xxx;',
    '  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y',
    '  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y',
    '',
    '  // Permutations',
    '  i = mod289(i); ',
    '  vec4 p = permute( permute( permute( ',
    '             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))',
    '           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) ',
    '           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));',
    '',
    '  // Gradients: 7x7 points over a square, mapped onto an octahedron.',
    '  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)',
    '  float n_ = 0.142857142857; // 1.0/7.0',
    '  vec3  ns = n_ * D.wyz - D.xzx;',
    '',
    '  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)',
    '',
    '  vec4 x_ = floor(j * ns.z);',
    '  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)',
    '',
    '  vec4 x = x_ *ns.x + ns.yyyy;',
    '  vec4 y = y_ *ns.x + ns.yyyy;',
    '  vec4 h = 1.0 - abs(x) - abs(y);',
    '',
    '  vec4 b0 = vec4( x.xy, y.xy );',
    '  vec4 b1 = vec4( x.zw, y.zw );',
    '',
    '  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;',
    '  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;',
    '  vec4 s0 = floor(b0)*2.0 + 1.0;',
    '  vec4 s1 = floor(b1)*2.0 + 1.0;',
    '  vec4 sh = -step(h, vec4(0.0));',
    '',
    '  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;',
    '  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;',
    '',
    '  vec3 p0 = vec3(a0.xy,h.x);',
    '  vec3 p1 = vec3(a0.zw,h.y);',
    '  vec3 p2 = vec3(a1.xy,h.z);',
    '  vec3 p3 = vec3(a1.zw,h.w);',
    '',
    '  //Normalise gradients',
    '  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));',
    '  p0 *= norm.x;',
    '  p1 *= norm.y;',
    '  p2 *= norm.z;',
    '  p3 *= norm.w;',
    '',
    '  // Mix final noise value',
    '  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);',
    '  m = m * m;',
    '  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), ',
    '                                dot(p2,x2), dot(p3,x3) ) );',
    '}',


    '// <summary>',
    '// Compute the normal using a sobel filter on the adjacent noise pixels.',
    '//',
    '// Normally you would output the noise to a texture first and then calculate',
    '// the normals on that texture to improve performance; however everthing is',
    '// kept in this shader as a single process to help illustrate whats going on.',
    '// <summary>',
    '// <returns>A normal vector.</returns>',
    'vec3 GetNormal ()',
    '{',
    ' // Get Sobel values',
    ' vec2 uv = vUv * Frequency;',
    ' float z = RandomNumber * Period + time;',
    ' ',
    ' float tl = snoise(vec3(uv.x - TexelSize.x, uv.y - TexelSize.y, z));',
    ' float t  = snoise(vec3(uv.x, uv.y - TexelSize.y, z));',
    ' float tr = snoise(vec3(uv.x + TexelSize.x, uv.y - TexelSize.y, z));',
    ' float l  = snoise(vec3(uv.x - TexelSize.x, uv.y, z));',
    ' float r  = snoise(vec3(uv.x + TexelSize.x, uv.y, z));',
    ' float bl = snoise(vec3(uv.x - TexelSize.x, uv.y + TexelSize.y, z));',
    ' float b  = snoise(vec3(uv.x, uv.y + TexelSize.y, z));',
    ' float br = snoise(vec3(uv.x + TexelSize.x, uv.y + TexelSize.y, z));',
    '',
    ' // Sobel filter',
    ' vec3 normal = vec3((-tl - l * 2.0 - bl) + (tr + r * 2.0 + br),',
    '       (-tl - t * 2.0 - tr) + (bl + b * 2.0 + br),',
    '       1.0 / Amplitude);',
    '           ',
    ' // Return normalized vector',
    ' return normalize(normal);',
    '}',

    'void main (){',
    ' // Refract only tagged pixels (that is, the alpha channel has been set)',
    ' vec2 offset;',

    ' // Method 1: Use noise as the refraction angle.',
    ' // Fast and good results for some scenarios.',
    ' const float pi = 3.141592;',
    ' float noise = snoise(vec3((vUv * Frequency), RandomNumber * Period + time)) * pi;',
    ' offset = vec2(cos(noise), sin(noise)) * Amplitude * TexelSize;',
    ' ',
    // '  // Method 2: Get the normal from an animating normalmap to use as the refracted vector.',
    // '  // Slower, but better results.',
    // '  vec3 normal = GetNormal();',
    // '  offset = normal.xy;',
    ' ',
    ' // Use the colour at the specified offset into the texture',
    ' gl_FragColor = texture2D(tDiffuse, vUv + offset);',
    '}',
  ].join('\n')
};


var VRUI = require('../lib/vrui');

new FastClick(document.body);

var vrData = new VrData();

var object = new THREE.Object3D();

var repeat = 60;
var groundMaterial = new THREE.MeshLambertMaterial();
groundMaterial.map = THREE.ImageUtils.loadTexture('sand.jpg');
groundMaterial.map.wrapS = groundMaterial.map.wrapT = THREE.RepeatWrapping;
groundMaterial.map.repeat.set(repeat, repeat);

var width = 100;
var height = 100;

var planeGeometry = new THREE.PlaneGeometry(100, 100, width - 1, height - 1);
var land = new THREE.Mesh(planeGeometry, groundMaterial);

land.rotation.x = -Math.PI / 2;
land.position.y = -1;

var createCircle = function(radius, center, intensity) {
  var radiusSq = Math.pow(radius, 2);

  for (var x = 0; x < width; x++) {
    for (var y = 0; y < height; y++) {
      var vertex = planeGeometry.vertices[x * height + y];
      var position = new THREE.Vector2(vertex.x, vertex.y);
      if (position.sub(center).lengthSq() < radiusSq) {
        vertex.z = vertex.z + Math.sqrt(radiusSq - position.lengthSq()) * intensity;
      }
    }
  }
}

createCircle(7, new THREE.Vector2(0, 0), 0.25);

var vertex = planeGeometry.vertices[height / 2 + width / 2 * height];

planeGeometry.computeFaceNormals();
planeGeometry.computeVertexNormals();

object.add(land);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
scene.add(camera);

var sunlight = new THREE.DirectionalLight(0xffffff, 1);
scene.add(sunlight);
sunlight.position.set(-50, 50, -50).normalize();
sunlight.castShadow = true;

var light = new THREE.AmbientLight(0x444444);
scene.add(light);

var textureLoader = new THREE.TextureLoader();

function createSkyMaterial(path) {
  var texture = textureLoader.load(path);
  var material = new THREE.MeshBasicMaterial({
    map: texture,
    overdraw: 0.5
  });

  return material;
}

var materials = [
  createSkyMaterial('px.jpg'),
  createSkyMaterial('nx.jpg'),
  createSkyMaterial('py.jpg'),
  createSkyMaterial('ny.jpg'),
  createSkyMaterial('pz.jpg'),
  createSkyMaterial('nz.jpg')
];

var skyMaterial = new THREE.MeshFaceMaterial(materials);
var skybox = new THREE.Mesh(
  new THREE.BoxGeometry(4000, 4000, 4000, 1, 1, 1),
  skyMaterial
);

skybox.scale.set(-1, 1, 1);
object.add(skybox);
scene.add(object);

var chosen = false;
var started = false;

var pixelRatio = window.devicePixelRatio || 1;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(pixelRatio);
renderer.setClearColor(0x000000);
document.querySelector('.wrapper').appendChild(renderer.domElement);

var effect = new THREE.StereoEffect(renderer);
effect.setSize(window.innerWidth, window.innerHeight);
effect.eyeSeparation = 0.5;

var composer = new THREE.EffectComposer(renderer);
var renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);

var toxicPasses = new THREEx.ToxicPproc.Passes('sober');
toxicPasses.addPassesTo(composer);

var resize = function() {
  var height = window.innerHeight;
  var width = window.innerWidth;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  effect.setSize(width, height);
  renderer.setSize(width, height);
  composer.setSize(width, height);
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
var cardboard = false;

var waterNormal = new THREE.ImageUtils.loadTexture('water-normal.jpg');
waterNormal.wrapS = waterNormal.wrapT = THREE.RepeatWrapping;

// Create the water effect
var water = new THREE.Water(renderer, camera, scene, {
  textureWidth: 256,
  textureHeight: 256,
  waterNormals: waterNormal,
  alpha: 1.0,
  sunDirection: sunlight.position,
  sunColor: 0xffffff,
  waterColor: 0x001e0f,
  betaVersion: 0,
  side: THREE.DoubleSide,
});

var sea = new THREE.Mesh(
  new THREE.PlaneBufferGeometry(3000, 3000, 100, 100),
  water.material
);
sea.add(water);
sea.rotation.x = -Math.PI * 0.5;

object.add(sea);

camera.position.y = vertex.z + land.position.y + 1.5;

var canLabelMaterial = new THREE.MeshPhongMaterial({
  color: 'white',
  map: THREE.ImageUtils.loadTexture('beer-label.png'),
  shininess: 100,
  specular: 0xffffff,
});

var canMaterial = new THREE.MeshPhongMaterial({
  color: 0x7a7c80,
  shininess: 100,
  specular: 0xffffff,
});

var lidMaterial = new THREE.MeshPhongMaterial({
  map: new THREE.ImageUtils.loadTexture('can-lid.png'), shininess: 30, specular: 0xffffff, transparent: true,
});

var createBeer = function() {
  var beer = new THREE.Object3D();
  beer.scale.multiplyScalar(0.1);

  var lid = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 1.65), lidMaterial);
  lid.position.y = 2.2005;
  lid.rotation.x = -Math.PI / 2;
  beer.add(lid);

  var cylinder = new THREE.CylinderGeometry(0.8, 1, 0.2, 16);
  var head = new THREE.Mesh(cylinder, canMaterial);
  head.position.y = 2.1;
  beer.add(head);

  var cylinder = new THREE.CylinderGeometry(1, 0.8, 0.2, 16);
  var foot = new THREE.Mesh(cylinder, canMaterial);
  foot.position.y = -2.1;
  beer.add(foot);

  var cylinder = new THREE.CylinderGeometry(1, 1, 4, 16, 10);
  var shaft = new THREE.Mesh(cylinder, canLabelMaterial);
  beer.add(shaft);

  cylinder.vertices.map(function(vertex, i) {
    vertex.i = i;
    vertex.attached = [];
  });

  cylinder.faces.map(function(face) {
    cylinder.vertices[face.a].attached.push(
      cylinder.vertices[face.b],
      cylinder.vertices[face.c]
    );
    cylinder.vertices[face.a].attached = _.uniq(cylinder.vertices[face.a].attached);
    cylinder.vertices[face.b].attached.push(
      cylinder.vertices[face.a],
      cylinder.vertices[face.c]
    );
    cylinder.vertices[face.b].attached = _.uniq(cylinder.vertices[face.b].attached);
    cylinder.vertices[face.c].attached.push(
      cylinder.vertices[face.a],
      cylinder.vertices[face.b]
    );
    cylinder.vertices[face.c].attached = _.uniq(cylinder.vertices[face.c].attached);
  });

  var vertices = _.sampleSize(cylinder.vertices.slice(64, 178 - 64), 7);

  beer.crush = function() {
    if (beer.scale.y > 0.081) {
      vertices.map(dent);
      beer.scale.y = beer.scale.y * 0.997;
      cylinder.verticesNeedUpdate = true;
      return true;
    }
  };

  var dent = function(vertex) {
    vertex.previous = vertex.clone();
    var direction = new THREE.Vector3(vertex.x, 0, vertex.z);
    var newVertex = vertex.clone().sub(direction.setLength(0.010 + 0.010 * direction.length()));
    if (newVertex.length() < vertex.length()) {
      vertex.copy(newVertex);
      var cache = {};
      cache[vertex.i] = true;
      traverseVertex(vertex, cache);
    }
  };

  var traverseVertex = function(vertex, cache) {
    vertex.attached.forEach(function(attached) {
      if (cache[attached.i] || attached.i < 12 || attached.i > 176 - 12) return;
      attached.previous = attached.clone();
      var length = vertex.previous.clone().sub(attached).length();
      var direction = attached.clone().sub(vertex).setLength(length);
      attached.copy(vertex).add(direction);
    });
    vertex.attached.forEach(function(attached) {
      if (cache[attached.i] || attached.i < 12 || attached.i > 176 - 12) return;
      cache[attached.i] = true;
      traverseVertex(attached, cache);
    });
  }

  return beer;
}

var beer = createBeer();
camera.add(beer);
beer.position.x = 0.25;
beer.position.z = -0.5;
beer.position.y = -0.2;

var lastTime = null;
var empty = false;
var empties = [];
var gravity = new THREE.Vector3(0, -0.003, 0);

var beers = 0;
var throwing = false;

var raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0, 0.15);

var render = function(time) {
  water.material.uniforms.time.value += 0.5 / 60.0;

  if (vrData.enabled()) {
    var data = vrData.getData();
    camera.quaternion.fromArray(data.orientation);
  }

  if (vrui.started) {
    var direction = across.clone().applyQuaternion(camera.quaternion);
    var lateralDirection = direction.clone().cross(up).cross(up);

    var angle = up.dot(direction);
    if (direction.clone().sub(up).length() < 0.0001) {
      angle = 1;
    }
    if (direction.clone().sub(up.clone().multiplyScalar(-1)).length() < 0.0001) {
      angle = -1;
    }
    if (angle > 0.9) {
      empty = true;
    }
    if (empty) {
      if (beer.position.y < -0.1) {
        beer.position.y += 0.005;
      }
      if (!beer.crush()) {
        object.add(beer);
        beer.position.applyMatrix4(camera.matrix);
        beer.quaternion.premultiply(camera.quaternion);
        empty = false;
        empties.push(beer);
        beer.velocity = lateralDirection.multiplyScalar(-1).add(up).multiplyScalar(0.025 + 0.025 * Math.random());

        beers++;

        beer = createBeer();
        camera.add(beer);
        beer.position.x = 0.25;
        beer.position.z = -0.5;
        beer.position.y = -0.6;
        throwing = true;
      }
    } else {
      if (!throwing && beer.position.y < -0.2) {
        beer.position.y += 0.015;
      }
    }
    beer.rotation.x = Math.PI * 0.5 - Math.acos(angle) * 0.8 || 0;

    empties.forEach(function(empty) {
      if (empty.landed) return;
      empty.velocity.add(gravity);
      empty.position.add(empty.velocity);
      empty.rotation.x += 0.01;
      raycaster.set(empty.position, empty.velocity);
      if (raycaster.intersectObject(land).length) {
        empty.landed = true;
        throwing = false;
      }
    });
  }

  toxicPasses.vBlurPass.uniforms.v.value = beers * 0.1 * 0.003;
  toxicPasses.hBlurPass.uniforms.h.value = beers * 0.1 * 0.003;
  toxicPasses.rgbRadialPass.uniforms.factor.value = beers * 0.1 * 0.1;
  toxicPasses.rgbRadialPass.uniforms.power.value = beers * 0.1 * 1;
  toxicPasses.seeDoublePass.uniforms.radius.value = beers * 0.1 * 0.05;
  toxicPasses.seeDoublePass.uniforms.timeSpeed.value = beers * 0.1 * 1;
  toxicPasses.seeDoublePass.uniforms.mixRatio.value = beers * 0.1 * 0.5;
  toxicPasses.seeDoublePass.uniforms.opacity.value = 1;
  toxicPasses.refractionPass.uniforms.timeSpeed.value = beers * 0.1 * 0.4;
  toxicPasses.refractionPass.uniforms.Frequency.value = beers * 0.1 * 0.5;
  toxicPasses.refractionPass.uniforms.RandomNumber.value = 0;
  toxicPasses.refractionPass.uniforms.Period.value = beers * 0.1 * 1;
  toxicPasses.refractionPass.uniforms.Amplitude.value = beers * 0.1 * 50;

  var height = window.innerHeight;
  var width = window.innerWidth;

  lastTime = lastTime || time - 1000 / 60;
  var delta = Math.min(200, time - lastTime);
  toxicPasses.update(delta / 1000, time / 1000);
  lastTime = time;

  if (vrui.renderStereoscopic()) {
    renderer.callback = function(scene, camera) {
      water.render();
      composer.render(scene, camera);
    }
    effect.render(scene, camera);
  }
  else {
    water.render();
    composer.render(scene, camera);
  }

  requestAnimationFrame(render);
};

render(0);
