(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var THREE = require('../lib/three-utils')((typeof window !== "undefined" ? window['THREE'] : typeof global !== "undefined" ? global['THREE'] : null));
var detectSphereCollision = require('../lib/detect-sphere-collision');
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

// Hacked version of Stereo effect
THREE.StereoEffect = function(renderer) {
  var _stereo = new THREE.StereoCamera();
  _stereo.aspect = 0.5;

  this.setEyeSeparation = function(eyeSep) {
    _stereo.eyeSep = eyeSep;
  };

  this.setSize = function(width, height) {
    renderer.setSize(width, height);
  };

  this.render = function(scene, camera) {
    scene.updateMatrixWorld();

    if (camera.parent === null) camera.updateMatrixWorld();

    _stereo.update(camera);

    var size = renderer.getSize();

    renderer.clear();
    renderer.setScissorTest(true);

    renderer.setScissor(0, 0, size.width / 2, size.height);
    renderer.setViewport(0, 0, size.width / 2, size.height);
    renderer.callback(scene, _stereo.cameraL);

    renderer.setScissor(size.width / 2, 0, size.width / 2, size.height);
    renderer.setViewport(size.width / 2, 0, size.width / 2, size.height);
    renderer.callback(scene, _stereo.cameraR);

    renderer.setScissorTest(false);
  };
};

/**
 * Loads a Wavefront .mtl file specifying materials
 *
 * @author angelxuanchang
 */

THREE.MTLLoader = function( manager ) {

  this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

Object.assign( THREE.MTLLoader.prototype, THREE.EventDispatcher.prototype, {

  /**
   * Loads and parses a MTL asset from a URL.
   *
   * @param {String} url - URL to the MTL file.
   * @param {Function} [onLoad] - Callback invoked with the loaded object.
   * @param {Function} [onProgress] - Callback for download progress.
   * @param {Function} [onError] - Callback for download errors.
   *
   * @see setPath setTexturePath
   *
   * @note In order for relative texture references to resolve correctly
   * you must call setPath and/or setTexturePath explicitly prior to load.
   */
  load: function ( url, onLoad, onProgress, onError ) {

    var scope = this;

    var loader = new THREE.XHRLoader( this.manager );
    loader.setPath( this.path );
    loader.load( url, function ( text ) {

      onLoad( scope.parse( text ) );

    }, onProgress, onError );

  },

  /**
   * Set base path for resolving references.
   * If set this path will be prepended to each loaded and found reference.
   *
   * @see setTexturePath
   * @param {String} path
   *
   * @example
   *     mtlLoader.setPath( 'assets/obj/' );
   *     mtlLoader.load( 'my.mtl', ... );
   */
  setPath: function ( path ) {

    this.path = path;

  },

  /**
   * Set base path for resolving texture references.
   * If set this path will be prepended found texture reference.
   * If not set and setPath is, it will be used as texture base path.
   *
   * @see setPath
   * @param {String} path
   *
   * @example
   *     mtlLoader.setPath( 'assets/obj/' );
   *     mtlLoader.setTexturePath( 'assets/textures/' );
   *     mtlLoader.load( 'my.mtl', ... );
   */
  setTexturePath: function( path ) {

    this.texturePath = path;

  },

  setBaseUrl: function( path ) {

    console.warn( 'THREE.MTLLoader: .setBaseUrl() is deprecated. Use .setTexturePath( path ) for texture path or .setPath( path ) for general base path instead.' );

    this.setTexturePath( path );

  },

  setCrossOrigin: function ( value ) {

    this.crossOrigin = value;

  },

  setMaterialOptions: function ( value ) {

    this.materialOptions = value;

  },

  /**
   * Parses a MTL file.
   *
   * @param {String} text - Content of MTL file
   * @return {THREE.MTLLoader.MaterialCreator}
   *
   * @see setPath setTexturePath
   *
   * @note In order for relative texture references to resolve correctly
   * you must call setPath and/or setTexturePath explicitly prior to parse.
   */
  parse: function ( text ) {

    var lines = text.split( '\n' );
    var info = {};
    var delimiter_pattern = /\s+/;
    var materialsInfo = {};

    for ( var i = 0; i < lines.length; i ++ ) {

      var line = lines[ i ];
      line = line.trim();

      if ( line.length === 0 || line.charAt( 0 ) === '#' ) {

        // Blank line or comment ignore
        continue;

      }

      var pos = line.indexOf( ' ' );

      var key = ( pos >= 0 ) ? line.substring( 0, pos ) : line;
      key = key.toLowerCase();

      var value = ( pos >= 0 ) ? line.substring( pos + 1 ) : '';
      value = value.trim();

      if ( key === 'newmtl' ) {

        // New material

        info = { name: value };
        materialsInfo[ value ] = info;

      } else if ( info ) {

        if ( key === 'ka' || key === 'kd' || key === 'ks' ) {

          var ss = value.split( delimiter_pattern, 3 );
          info[ key ] = [ parseFloat( ss[ 0 ] ), parseFloat( ss[ 1 ] ), parseFloat( ss[ 2 ] ) ];

        } else {

          info[ key ] = value;

        }

      }

    }

    var materialCreator = new THREE.MTLLoader.MaterialCreator( this.texturePath || this.path, this.materialOptions );
    materialCreator.setCrossOrigin( this.crossOrigin );
    materialCreator.setManager( this.manager );
    materialCreator.setMaterials( materialsInfo );
    return materialCreator;

  }

} );

/**
 * Create a new THREE-MTLLoader.MaterialCreator
 * @param baseUrl - Url relative to which textures are loaded
 * @param options - Set of options on how to construct the materials
 *                  side: Which side to apply the material
 *                        THREE.FrontSide (default), THREE.BackSide, THREE.DoubleSide
 *                  wrap: What type of wrapping to apply for textures
 *                        THREE.RepeatWrapping (default), THREE.ClampToEdgeWrapping, THREE.MirroredRepeatWrapping
 *                  normalizeRGB: RGBs need to be normalized to 0-1 from 0-255
 *                                Default: false, assumed to be already normalized
 *                  ignoreZeroRGBs: Ignore values of RGBs (Ka,Kd,Ks) that are all 0's
 *                                  Default: false
 * @constructor
 */

THREE.MTLLoader.MaterialCreator = function( baseUrl, options ) {

  this.baseUrl = baseUrl || '';
  this.options = options;
  this.materialsInfo = {};
  this.materials = {};
  this.materialsArray = [];
  this.nameLookup = {};

  this.side = ( this.options && this.options.side ) ? this.options.side : THREE.FrontSide;
  this.wrap = ( this.options && this.options.wrap ) ? this.options.wrap : THREE.RepeatWrapping;

};

THREE.MTLLoader.MaterialCreator.prototype = {

  constructor: THREE.MTLLoader.MaterialCreator,

  setCrossOrigin: function ( value ) {

    this.crossOrigin = value;

  },

  setManager: function ( value ) {

    this.manager = value;

  },

  setMaterials: function( materialsInfo ) {

    this.materialsInfo = this.convert( materialsInfo );
    this.materials = {};
    this.materialsArray = [];
    this.nameLookup = {};

  },

  convert: function( materialsInfo ) {

    if ( ! this.options ) return materialsInfo;

    var converted = {};

    for ( var mn in materialsInfo ) {

      // Convert materials info into normalized form based on options

      var mat = materialsInfo[ mn ];

      var covmat = {};

      converted[ mn ] = covmat;

      for ( var prop in mat ) {

        var save = true;
        var value = mat[ prop ];
        var lprop = prop.toLowerCase();

        switch ( lprop ) {

          case 'kd':
          case 'ka':
          case 'ks':

            // Diffuse color (color under white light) using RGB values

            if ( this.options && this.options.normalizeRGB ) {

              value = [ value[ 0 ] / 255, value[ 1 ] / 255, value[ 2 ] / 255 ];

            }

            if ( this.options && this.options.ignoreZeroRGBs ) {

              if ( value[ 0 ] === 0 && value[ 1 ] === 0 && value[ 2 ] === 0 ) {

                // ignore

                save = false;

              }

            }

            break;

          default:

            break;
        }

        if ( save ) {

          covmat[ lprop ] = value;

        }

      }

    }

    return converted;

  },

  preload: function () {

    for ( var mn in this.materialsInfo ) {

      this.create( mn );

    }

  },

  getIndex: function( materialName ) {

    return this.nameLookup[ materialName ];

  },

  getAsArray: function() {

    var index = 0;

    for ( var mn in this.materialsInfo ) {

      this.materialsArray[ index ] = this.create( mn );
      this.nameLookup[ mn ] = index;
      index ++;

    }

    return this.materialsArray;

  },

  create: function ( materialName ) {

    if ( this.materials[ materialName ] === undefined ) {

      this.createMaterial_( materialName );

    }

    return this.materials[ materialName ];

  },

  createMaterial_: function ( materialName ) {

    // Create material

    var scope = this;
    var mat = this.materialsInfo[ materialName ];
    var params = {

      name: materialName,
      side: this.side

    };

    var resolveURL = function ( baseUrl, url ) {

      if ( typeof url !== 'string' || url === '' )
        return '';

      // Absolute URL
      if ( /^https?:\/\//i.test( url ) ) {
        return url;
      }

      return baseUrl + url;
    };

    function setMapForType ( mapType, value ) {

      if ( params[ mapType ] ) return; // Keep the first encountered texture

      var texParams = scope.getTextureParams( value, params );
      var map = scope.loadTexture( resolveURL( scope.baseUrl, texParams.url ) );

      map.repeat.copy( texParams.scale );
      map.offset.copy( texParams.offset );

      map.wrapS = scope.wrap;
      map.wrapT = scope.wrap;

      params[ mapType ] = map;
    }

    for ( var prop in mat ) {

      var value = mat[ prop ];

      if ( value === '' ) continue;

      switch ( prop.toLowerCase() ) {

        // Ns is material specular exponent

        case 'kd':

          // Diffuse color (color under white light) using RGB values

          params.color = new THREE.Color().fromArray( value );

          break;

        case 'ks':

          // Specular color (color when light is reflected from shiny surface) using RGB values
          params.specular = new THREE.Color().fromArray( value );

          break;

        case 'map_kd':

          // Diffuse texture map

          setMapForType( "map", value );

          break;

        case 'map_ks':

          // Specular map

          setMapForType( "specularMap", value );

          break;

        case 'map_bump':
        case 'bump':

          // Bump texture map

          setMapForType( "bumpMap", value );

          break;

        case 'ns':

          // The specular exponent (defines the focus of the specular highlight)
          // A high exponent results in a tight, concentrated highlight. Ns values normally range from 0 to 1000.

          params.shininess = parseFloat( value );

          break;

        case 'd':

          if ( value < 1 ) {

            params.opacity = value;
            params.transparent = true;

          }

          break;

        case 'Tr':

          if ( value > 0 ) {

            params.opacity = 1 - value;
            params.transparent = true;

          }

          break;

        default:
          break;

      }

    }

    this.materials[ materialName ] = new THREE.MeshPhongMaterial( params );
    return this.materials[ materialName ];
  },

  getTextureParams: function( value, matParams ) {

    var texParams = {

      scale: new THREE.Vector2( 1, 1 ),
      offset: new THREE.Vector2( 0, 0 ),

     };

    var items = value.split(/\s+/);
    var pos;

    pos = items.indexOf('-bm');
    if (pos >= 0) {

      matParams.bumpScale = parseFloat( items[pos+1] );
      items.splice( pos, 2 );

    }

    pos = items.indexOf('-s');
    if (pos >= 0) {

      texParams.scale.set( parseFloat( items[pos+1] ), parseFloat( items[pos+2] ) );
      items.splice( pos, 4 ); // we expect 3 parameters here!

    }

    pos = items.indexOf('-o');
    if (pos >= 0) {

      texParams.offset.set( parseFloat( items[pos+1] ), parseFloat( items[pos+2] ) );
      items.splice( pos, 4 ); // we expect 3 parameters here!

    }

    texParams.url = items.join(' ').trim();
    return texParams;

  },

  loadTexture: function ( url, mapping, onLoad, onProgress, onError ) {

    var texture;
    var loader = THREE.Loader.Handlers.get( url );
    var manager = ( this.manager !== undefined ) ? this.manager : THREE.DefaultLoadingManager;

    if ( loader === null ) {

      loader = new THREE.TextureLoader( manager );

    }

    if ( loader.setCrossOrigin ) loader.setCrossOrigin( this.crossOrigin );
    texture = loader.load( url, onLoad, onProgress, onError );

    if ( mapping !== undefined ) texture.mapping = mapping;

    return texture;

  }

};

/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.OBJLoader = function ( manager ) {

  this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

  this.materials = null;

  this.regexp = {
    // v float float float
    vertex_pattern           : /^v\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/,
    // vn float float float
    normal_pattern           : /^vn\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/,
    // vt float float
    uv_pattern               : /^vt\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/,
    // f vertex vertex vertex
    face_vertex              : /^f\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)(?:\s+(-?\d+))?/,
    // f vertex/uv vertex/uv vertex/uv
    face_vertex_uv           : /^f\s+(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)(?:\s+(-?\d+)\/(-?\d+))?/,
    // f vertex/uv/normal vertex/uv/normal vertex/uv/normal
    face_vertex_uv_normal    : /^f\s+(-?\d+)\/(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)\/(-?\d+)(?:\s+(-?\d+)\/(-?\d+)\/(-?\d+))?/,
    // f vertex//normal vertex//normal vertex//normal
    face_vertex_normal       : /^f\s+(-?\d+)\/\/(-?\d+)\s+(-?\d+)\/\/(-?\d+)\s+(-?\d+)\/\/(-?\d+)(?:\s+(-?\d+)\/\/(-?\d+))?/,
    // o object_name | g group_name
    object_pattern           : /^[og]\s*(.+)?/,
    // s boolean
    smoothing_pattern        : /^s\s+(\d+|on|off)/,
    // mtllib file_reference
    material_library_pattern : /^mtllib /,
    // usemtl material_name
    material_use_pattern     : /^usemtl /
  };

};

THREE.OBJLoader.prototype = {

  constructor: THREE.OBJLoader,

  load: function ( url, onLoad, onProgress, onError ) {

    var scope = this;

    var loader = new THREE.XHRLoader( scope.manager );
    loader.setPath( this.path );
    loader.load( url, function ( text ) {

      onLoad( scope.parse( text ) );

    }, onProgress, onError );

  },

  setPath: function ( value ) {

    this.path = value;

  },

  setMaterials: function ( materials ) {

    this.materials = materials;

  },

  _createParserState : function () {

    var state = {
      objects  : [],
      object   : {},

      vertices : [],
      normals  : [],
      uvs      : [],

      materialLibraries : [],

      startObject: function ( name, fromDeclaration ) {

        // If the current object (initial from reset) is not from a g/o declaration in the parsed
        // file. We need to use it for the first parsed g/o to keep things in sync.
        if ( this.object && this.object.fromDeclaration === false ) {

          this.object.name = name;
          this.object.fromDeclaration = ( fromDeclaration !== false );
          return;

        }

        var previousMaterial = ( this.object && typeof this.object.currentMaterial === 'function' ? this.object.currentMaterial() : undefined );

        if ( this.object && typeof this.object._finalize === 'function' ) {

          this.object._finalize( true );

        }

        this.object = {
          name : name || '',
          fromDeclaration : ( fromDeclaration !== false ),

          geometry : {
            vertices : [],
            normals  : [],
            uvs      : []
          },
          materials : [],
          smooth : true,

          startMaterial : function( name, libraries ) {

            var previous = this._finalize( false );

            // New usemtl declaration overwrites an inherited material, except if faces were declared
            // after the material, then it must be preserved for proper MultiMaterial continuation.
            if ( previous && ( previous.inherited || previous.groupCount <= 0 ) ) {

              this.materials.splice( previous.index, 1 );

            }

            var material = {
              index      : this.materials.length,
              name       : name || '',
              mtllib     : ( Array.isArray( libraries ) && libraries.length > 0 ? libraries[ libraries.length - 1 ] : '' ),
              smooth     : ( previous !== undefined ? previous.smooth : this.smooth ),
              groupStart : ( previous !== undefined ? previous.groupEnd : 0 ),
              groupEnd   : -1,
              groupCount : -1,
              inherited  : false,

              clone : function( index ) {
                var cloned = {
                  index      : ( typeof index === 'number' ? index : this.index ),
                  name       : this.name,
                  mtllib     : this.mtllib,
                  smooth     : this.smooth,
                  groupStart : 0,
                  groupEnd   : -1,
                  groupCount : -1,
                  inherited  : false
                };
                cloned.clone = this.clone.bind(cloned);
                return cloned;
              }
            };

            this.materials.push( material );

            return material;

          },

          currentMaterial : function() {

            if ( this.materials.length > 0 ) {
              return this.materials[ this.materials.length - 1 ];
            }

            return undefined;

          },

          _finalize : function( end ) {

            var lastMultiMaterial = this.currentMaterial();
            if ( lastMultiMaterial && lastMultiMaterial.groupEnd === -1 ) {

              lastMultiMaterial.groupEnd = this.geometry.vertices.length / 3;
              lastMultiMaterial.groupCount = lastMultiMaterial.groupEnd - lastMultiMaterial.groupStart;
              lastMultiMaterial.inherited = false;

            }

            // Ignore objects tail materials if no face declarations followed them before a new o/g started.
            if ( end && this.materials.length > 1 ) {

              for ( var mi = this.materials.length - 1; mi >= 0; mi-- ) {
                if ( this.materials[mi].groupCount <= 0 ) {
                  this.materials.splice( mi, 1 );
                }
              }

            }

            // Guarantee at least one empty material, this makes the creation later more straight forward.
            if ( end && this.materials.length === 0 ) {

              this.materials.push({
                name   : '',
                smooth : this.smooth
              });

            }

            return lastMultiMaterial;

          }
        };

        // Inherit previous objects material.
        // Spec tells us that a declared material must be set to all objects until a new material is declared.
        // If a usemtl declaration is encountered while this new object is being parsed, it will
        // overwrite the inherited material. Exception being that there was already face declarations
        // to the inherited material, then it will be preserved for proper MultiMaterial continuation.

        if ( previousMaterial && previousMaterial.name && typeof previousMaterial.clone === "function" ) {

          var declared = previousMaterial.clone( 0 );
          declared.inherited = true;
          this.object.materials.push( declared );

        }

        this.objects.push( this.object );

      },

      finalize : function() {

        if ( this.object && typeof this.object._finalize === 'function' ) {

          this.object._finalize( true );

        }

      },

      parseVertexIndex: function ( value, len ) {

        var index = parseInt( value, 10 );
        return ( index >= 0 ? index - 1 : index + len / 3 ) * 3;

      },

      parseNormalIndex: function ( value, len ) {

        var index = parseInt( value, 10 );
        return ( index >= 0 ? index - 1 : index + len / 3 ) * 3;

      },

      parseUVIndex: function ( value, len ) {

        var index = parseInt( value, 10 );
        return ( index >= 0 ? index - 1 : index + len / 2 ) * 2;

      },

      addVertex: function ( a, b, c ) {

        var src = this.vertices;
        var dst = this.object.geometry.vertices;

        dst.push( src[ a + 0 ] );
        dst.push( src[ a + 1 ] );
        dst.push( src[ a + 2 ] );
        dst.push( src[ b + 0 ] );
        dst.push( src[ b + 1 ] );
        dst.push( src[ b + 2 ] );
        dst.push( src[ c + 0 ] );
        dst.push( src[ c + 1 ] );
        dst.push( src[ c + 2 ] );

      },

      addVertexLine: function ( a ) {

        var src = this.vertices;
        var dst = this.object.geometry.vertices;

        dst.push( src[ a + 0 ] );
        dst.push( src[ a + 1 ] );
        dst.push( src[ a + 2 ] );

      },

      addNormal : function ( a, b, c ) {

        var src = this.normals;
        var dst = this.object.geometry.normals;

        dst.push( src[ a + 0 ] );
        dst.push( src[ a + 1 ] );
        dst.push( src[ a + 2 ] );
        dst.push( src[ b + 0 ] );
        dst.push( src[ b + 1 ] );
        dst.push( src[ b + 2 ] );
        dst.push( src[ c + 0 ] );
        dst.push( src[ c + 1 ] );
        dst.push( src[ c + 2 ] );

      },

      addUV: function ( a, b, c ) {

        var src = this.uvs;
        var dst = this.object.geometry.uvs;

        dst.push( src[ a + 0 ] );
        dst.push( src[ a + 1 ] );
        dst.push( src[ b + 0 ] );
        dst.push( src[ b + 1 ] );
        dst.push( src[ c + 0 ] );
        dst.push( src[ c + 1 ] );

      },

      addUVLine: function ( a ) {

        var src = this.uvs;
        var dst = this.object.geometry.uvs;

        dst.push( src[ a + 0 ] );
        dst.push( src[ a + 1 ] );

      },

      addFace: function ( a, b, c, d, ua, ub, uc, ud, na, nb, nc, nd ) {

        var vLen = this.vertices.length;

        var ia = this.parseVertexIndex( a, vLen );
        var ib = this.parseVertexIndex( b, vLen );
        var ic = this.parseVertexIndex( c, vLen );
        var id;

        if ( d === undefined ) {

          this.addVertex( ia, ib, ic );

        } else {

          id = this.parseVertexIndex( d, vLen );

          this.addVertex( ia, ib, id );
          this.addVertex( ib, ic, id );

        }

        if ( ua !== undefined ) {

          var uvLen = this.uvs.length;

          ia = this.parseUVIndex( ua, uvLen );
          ib = this.parseUVIndex( ub, uvLen );
          ic = this.parseUVIndex( uc, uvLen );

          if ( d === undefined ) {

            this.addUV( ia, ib, ic );

          } else {

            id = this.parseUVIndex( ud, uvLen );

            this.addUV( ia, ib, id );
            this.addUV( ib, ic, id );

          }

        }

        if ( na !== undefined ) {

          // Normals are many times the same. If so, skip function call and parseInt.
          var nLen = this.normals.length;
          ia = this.parseNormalIndex( na, nLen );

          ib = na === nb ? ia : this.parseNormalIndex( nb, nLen );
          ic = na === nc ? ia : this.parseNormalIndex( nc, nLen );

          if ( d === undefined ) {

            this.addNormal( ia, ib, ic );

          } else {

            id = this.parseNormalIndex( nd, nLen );

            this.addNormal( ia, ib, id );
            this.addNormal( ib, ic, id );

          }

        }

      },

      addLineGeometry: function ( vertices, uvs ) {

        this.object.geometry.type = 'Line';

        var vLen = this.vertices.length;
        var uvLen = this.uvs.length;

        for ( var vi = 0, l = vertices.length; vi < l; vi ++ ) {

          this.addVertexLine( this.parseVertexIndex( vertices[ vi ], vLen ) );

        }

        for ( var uvi = 0, l = uvs.length; uvi < l; uvi ++ ) {

          this.addUVLine( this.parseUVIndex( uvs[ uvi ], uvLen ) );

        }

      }

    };

    state.startObject( '', false );

    return state;

  },

  parse: function ( text ) {

    console.time( 'OBJLoader' );

    var state = this._createParserState();

    if ( text.indexOf( '\r\n' ) !== - 1 ) {

      // This is faster than String.split with regex that splits on both
      text = text.replace( /\r\n/g, '\n' );

    }

    if ( text.indexOf( '\\\n' ) !== - 1) {

      // join lines separated by a line continuation character (\)
      text = text.replace( /\\\n/g, '' );

    }

    var lines = text.split( '\n' );
    var line = '', lineFirstChar = '', lineSecondChar = '';
    var lineLength = 0;
    var result = [];

    // Faster to just trim left side of the line. Use if available.
    var trimLeft = ( typeof ''.trimLeft === 'function' );

    for ( var i = 0, l = lines.length; i < l; i ++ ) {

      line = lines[ i ];

      line = trimLeft ? line.trimLeft() : line.trim();

      lineLength = line.length;

      if ( lineLength === 0 ) continue;

      lineFirstChar = line.charAt( 0 );

      // @todo invoke passed in handler if any
      if ( lineFirstChar === '#' ) continue;

      if ( lineFirstChar === 'v' ) {

        lineSecondChar = line.charAt( 1 );

        if ( lineSecondChar === ' ' && ( result = this.regexp.vertex_pattern.exec( line ) ) !== null ) {

          // 0                  1      2      3
          // ["v 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

          state.vertices.push(
            parseFloat( result[ 1 ] ),
            parseFloat( result[ 2 ] ),
            parseFloat( result[ 3 ] )
          );

        } else if ( lineSecondChar === 'n' && ( result = this.regexp.normal_pattern.exec( line ) ) !== null ) {

          // 0                   1      2      3
          // ["vn 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

          state.normals.push(
            parseFloat( result[ 1 ] ),
            parseFloat( result[ 2 ] ),
            parseFloat( result[ 3 ] )
          );

        } else if ( lineSecondChar === 't' && ( result = this.regexp.uv_pattern.exec( line ) ) !== null ) {

          // 0               1      2
          // ["vt 0.1 0.2", "0.1", "0.2"]

          state.uvs.push(
            parseFloat( result[ 1 ] ),
            parseFloat( result[ 2 ] )
          );

        } else {

          throw new Error( "Unexpected vertex/normal/uv line: '" + line  + "'" );

        }

      } else if ( lineFirstChar === "f" ) {

        if ( ( result = this.regexp.face_vertex_uv_normal.exec( line ) ) !== null ) {

          // f vertex/uv/normal vertex/uv/normal vertex/uv/normal
          // 0                        1    2    3    4    5    6    7    8    9   10         11         12
          // ["f 1/1/1 2/2/2 3/3/3", "1", "1", "1", "2", "2", "2", "3", "3", "3", undefined, undefined, undefined]

          state.addFace(
            result[ 1 ], result[ 4 ], result[ 7 ], result[ 10 ],
            result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ],
            result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ]
          );

        } else if ( ( result = this.regexp.face_vertex_uv.exec( line ) ) !== null ) {

          // f vertex/uv vertex/uv vertex/uv
          // 0                  1    2    3    4    5    6   7          8
          // ["f 1/1 2/2 3/3", "1", "1", "2", "2", "3", "3", undefined, undefined]

          state.addFace(
            result[ 1 ], result[ 3 ], result[ 5 ], result[ 7 ],
            result[ 2 ], result[ 4 ], result[ 6 ], result[ 8 ]
          );

        } else if ( ( result = this.regexp.face_vertex_normal.exec( line ) ) !== null ) {

          // f vertex//normal vertex//normal vertex//normal
          // 0                     1    2    3    4    5    6   7          8
          // ["f 1//1 2//2 3//3", "1", "1", "2", "2", "3", "3", undefined, undefined]

          state.addFace(
            result[ 1 ], result[ 3 ], result[ 5 ], result[ 7 ],
            undefined, undefined, undefined, undefined,
            result[ 2 ], result[ 4 ], result[ 6 ], result[ 8 ]
          );

        } else if ( ( result = this.regexp.face_vertex.exec( line ) ) !== null ) {

          // f vertex vertex vertex
          // 0            1    2    3   4
          // ["f 1 2 3", "1", "2", "3", undefined]

          state.addFace(
            result[ 1 ], result[ 2 ], result[ 3 ], result[ 4 ]
          );

        } else {

          throw new Error( "Unexpected face line: '" + line  + "'" );

        }

      } else if ( lineFirstChar === "l" ) {

        var lineParts = line.substring( 1 ).trim().split( " " );
        var lineVertices = [], lineUVs = [];

        if ( line.indexOf( "/" ) === - 1 ) {

          lineVertices = lineParts;

        } else {

          for ( var li = 0, llen = lineParts.length; li < llen; li ++ ) {

            var parts = lineParts[ li ].split( "/" );

            if ( parts[ 0 ] !== "" ) lineVertices.push( parts[ 0 ] );
            if ( parts[ 1 ] !== "" ) lineUVs.push( parts[ 1 ] );

          }

        }
        state.addLineGeometry( lineVertices, lineUVs );

      } else if ( ( result = this.regexp.object_pattern.exec( line ) ) !== null ) {

        // o object_name
        // or
        // g group_name

        // WORKAROUND: https://bugs.chromium.org/p/v8/issues/detail?id=2869
        // var name = result[ 0 ].substr( 1 ).trim();
        var name = ( " " + result[ 0 ].substr( 1 ).trim() ).substr( 1 );

        state.startObject( name );

      } else if ( this.regexp.material_use_pattern.test( line ) ) {

        // material

        state.object.startMaterial( line.substring( 7 ).trim(), state.materialLibraries );

      } else if ( this.regexp.material_library_pattern.test( line ) ) {

        // mtl file

        state.materialLibraries.push( line.substring( 7 ).trim() );

      } else if ( ( result = this.regexp.smoothing_pattern.exec( line ) ) !== null ) {

        // smooth shading

        // @todo Handle files that have varying smooth values for a set of faces inside one geometry,
        // but does not define a usemtl for each face set.
        // This should be detected and a dummy material created (later MultiMaterial and geometry groups).
        // This requires some care to not create extra material on each smooth value for "normal" obj files.
        // where explicit usemtl defines geometry groups.
        // Example asset: examples/models/obj/cerberus/Cerberus.obj

        var value = result[ 1 ].trim().toLowerCase();
        state.object.smooth = ( value === '1' || value === 'on' );

        var material = state.object.currentMaterial();
        if ( material ) {

          material.smooth = state.object.smooth;

        }

      } else {

        // Handle null terminated files without exception
        if ( line === '\0' ) continue;

        throw new Error( "Unexpected line: '" + line  + "'" );

      }

    }

    state.finalize();

    var container = new THREE.Group();
    container.materialLibraries = [].concat( state.materialLibraries );

    for ( var i = 0, l = state.objects.length; i < l; i ++ ) {

      var object = state.objects[ i ];
      var geometry = object.geometry;
      var materials = object.materials;
      var isLine = ( geometry.type === 'Line' );

      // Skip o/g line declarations that did not follow with any faces
      if ( geometry.vertices.length === 0 ) continue;

      var buffergeometry = new THREE.BufferGeometry();

      buffergeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( geometry.vertices ), 3 ) );

      if ( geometry.normals.length > 0 ) {

        buffergeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( geometry.normals ), 3 ) );

      } else {

        buffergeometry.computeVertexNormals();

      }

      if ( geometry.uvs.length > 0 ) {

        buffergeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( geometry.uvs ), 2 ) );

      }

      // Create materials

      var createdMaterials = [];

      for ( var mi = 0, miLen = materials.length; mi < miLen ; mi++ ) {

        var sourceMaterial = materials[mi];
        var material = undefined;

        if ( this.materials !== null ) {

          material = this.materials.create( sourceMaterial.name );

          // mtl etc. loaders probably can't create line materials correctly, copy properties to a line material.
          if ( isLine && material && ! ( material instanceof THREE.LineBasicMaterial ) ) {

            var materialLine = new THREE.LineBasicMaterial();
            materialLine.copy( material );
            material = materialLine;

          }

        }

        if ( ! material ) {

          material = ( ! isLine ? new THREE.MeshPhongMaterial() : new THREE.LineBasicMaterial() );
          material.name = sourceMaterial.name;

        }

        material.shading = sourceMaterial.smooth ? THREE.SmoothShading : THREE.FlatShading;

        createdMaterials.push(material);

      }

      // Create mesh

      var mesh;

      if ( createdMaterials.length > 1 ) {

        for ( var mi = 0, miLen = materials.length; mi < miLen ; mi++ ) {

          var sourceMaterial = materials[mi];
          buffergeometry.addGroup( sourceMaterial.groupStart, sourceMaterial.groupCount, mi );

        }

        var multiMaterial = new THREE.MultiMaterial( createdMaterials );
        mesh = ( ! isLine ? new THREE.Mesh( buffergeometry, multiMaterial ) : new THREE.LineSegments( buffergeometry, multiMaterial ) );

      } else {

        mesh = ( ! isLine ? new THREE.Mesh( buffergeometry, createdMaterials[ 0 ] ) : new THREE.LineSegments( buffergeometry, createdMaterials[ 0 ] ) );
      }

      mesh.name = object.name;

      container.add( mesh );

    }

    console.timeEnd( 'OBJLoader' );

    return container;

  }

};

var up = new THREE.Vector3(0, 1, 0);
var forward = new THREE.Vector3(1, 0, 0);
var across = new THREE.Vector3(0, 0, -1);

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

var noiseScale = 20;

for (var i = 0; i < planeGeometry.vertices.length; i++) {
  var vertex = planeGeometry.vertices[i];
  vertex.z = vertex.z + noise.simplex2(vertex.x / noiseScale, vertex.y / noiseScale);
}

planeGeometry.computeFaceNormals();
planeGeometry.computeVertexNormals();

object.add(land);


var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000000);
object.add(camera);

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

var chosen = false;
var started = false;

var pixelRatio = window.devicePixelRatio || 1;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);

var composer = new THREE.EffectComposer(renderer);
var renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);

var composer2 = new THREE.EffectComposer(renderer);
composer2.addPass(new THREE.RenderPass(scene, camera));

var shader = {
  uniforms: {
    tDiffuse: { type: 't', value: null },
    tColor: { type: 't', value: null },
    resolution: { type: 'v2', value: new THREE.Vector2(1, 1) },
    viewProjectionInverseMatrix: { type: 'm4', value: new THREE.Matrix4() },
    previousViewProjectionMatrix: { type: 'm4', value: new THREE.Matrix4() },
    velocityFactor: { type: 'f', value: 1 }
  },
  vertexShader: document.getElementById('vs-motionBlur').textContent,
  fragmentShader: document.getElementById('fs-motionBlur').textContent,
};

var shaderPass = new THREE.ShaderPass(shader);
shaderPass.renderToScreen = true;
composer.addPass(shaderPass);

document.body.appendChild(renderer.domElement);

var effect = new THREE.StereoEffect(renderer);
effect.eyeSeparation = 0.3;
effect.setSize(window.innerWidth, window.innerHeight);

var started = false;
var cardboard = false;

var vertex = planeGeometry.vertices[height / 2 + width / 2 * height];
camera.position.y = vertex.z + land.position.y + 0.75;

scene.add(object);

var moving = false;

var raycaster = new THREE.Raycaster(camera.position.clone(), across.clone(), 0, 12);
var casting = false;
var target = false;
var blink = false;

var shouting = false;

var shout = function(all) {
  shouting = true;
  setTimeout(function() { shouting = false; }, 400);
  var cameraDirection = forward.clone().applyQuaternion(camera.quaternion);
  var cameraNormalDirection = across.clone().applyQuaternion(camera.quaternion);
  chickens.map(function(chicken) {
    var chickenDirection = chicken.position.clone().sub(camera.position);
    var chickenDistance = chickenDirection.length();
    chickenDirection.multiplyScalar(1 / chickenDistance);
    var amount = cameraDirection.dot(chickenDirection);
    var sign = cameraNormalDirection.dot(chickenDirection) > 0;
    if (all || (sign && Math.abs(amount) < 0.7 && chickenDistance < 10)) {
      chicken.dead = true;
      chicken.velocity.add(chickenDirection.multiplyScalar(0.2 + 0.2 * Math.random()));
    }
  });
};

var start = function(e) {
  casting = true;
  e.preventDefault();
};

var stop = function(e) {
  if (target) {
    var endPosition = glow.position.clone();
    endPosition.y += 0.75;
    blink = [camera.position.clone(), endPosition, 0];
  }
  casting = false;
  target = false;
  e.preventDefault();
};

document.querySelector('canvas').addEventListener('mousedown', start);
document.querySelector('canvas').addEventListener('mouseup', stop);

document.querySelector('canvas').addEventListener('touchstart', start);
document.querySelector('canvas').addEventListener('touchend', stop);

var glowMaterial = new THREE.MeshLambertMaterial();
glowMaterial.transparent = true;
glowMaterial.map = THREE.ImageUtils.loadTexture('glow.png');
glowMaterial.side = THREE.DoubleSide;

var glowLight = new THREE.PointLight(0xddddff, 2, 2);
glowLight.position.z = -0.2;

var plane = new THREE.PlaneGeometry(0.5, 0.5);
var glow = new THREE.Mesh(plane, glowMaterial);
glow.add(glowLight);
glow.renderOrder = 1;
object.add(glow);

var listening = false;

var found = false;

var Recognition = window.webkitSpeechRecognition || window.SpeechRecognition;

var startListening = function() {
  var recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.maxAlternatives = 10;
  recognition.start();

  found = false;

  recognition.onend = function() {
    listening = false;
    startListening();
  };

  recognition.onresult = function(event) {
    var results = event.results[0][0].transcript.toLowerCase();

    if (results === 'busradar') {
      if (!found) {
        found = true;
        shout();
      }
      return;
    }

    var matches = [
      ['bus', 'fosse', 'fos', 'foss', 'fox', 'voss', 'boss', 'bos', 'first', 'force', 'forced', 'foster', 'fast', 'crossroads', 'vostro', 'horse', 'fastroad'],
      ['ro', 'road', 'roald', 'roll', 'dell', 'router', 'route', 'radar', 'are'],
      ['r', 'dah', 'da', 'dar', 'dahl', 'are', 'art', 'bath', 'dark'],
    ];

    var words = results.split(' ').filter(function(word, i) {
      return matches[i] && matches[i].indexOf(word) !== -1;
    });

    if (words.length === 2 || words.length === 3) {
      if (!found) {
        found = true;
        shout();
      }
      return;
    }
  };
};

if (Recognition) {
  startListening();
} else {
  alert('Sorry, your device doesn\'t support speech recognition');
}

var chickenTemplate = {};

var mtlLoader = new THREE.MTLLoader();
mtlLoader.load('chicken.mtl', function(materials) {
  materials.preload();

  var objLoader = new THREE.OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load('chicken.obj', function(group) {
    chickenTemplate.loaded = true;
    chickenTemplate.geometry = group.children[0].geometry;
    chickenTemplate.material = group.children[0].material;
  });
});

var separation = function(boid, boids, radius, intensity) {
  var distance;
  var posSum = new THREE.Vector3();
  var repulse = new THREE.Vector3();

  for (var i = 0; i < boids.length; i++) {
    if (Math.random() > 0.6) continue;

    distance = boids[i].position.distanceTo(boid.position);

    if (distance > 0 && distance <= boid.radius + boids[i].radius) {
      repulse.subVectors(boid.position, boids[i].position);
      repulse.normalize();
      repulse.divideScalar(distance);
      posSum.add(repulse);
    }
  }

  var l = posSum.length();

  if (l > (intensity)) {
    posSum.divideScalar(l / (intensity));
  }

  return posSum;
};

var chickens = [];

// Do count your chickens
var count = 0;

var gravity = new THREE.Vector3(0, -0.003, 0);

var mCurrent = new THREE.Matrix4();
var mPrev = new THREE.Matrix4();
var tmpArray = new THREE.Matrix4();

var depthMaterial = new THREE.ShaderMaterial({
  uniforms: {
    mNear: { type: 'f', value: camera.near },
    mFar: { type: 'f', value: camera.far },
    opacity: { type: 'f', value: 1 }
  },

  vertexShader: document.getElementById('vs-depthRender').textContent,
  fragmentShader: document.getElementById('fs-depthRender').textContent
});

camera.radius = 1;

var soundFile = document.createElement('audio');
soundFile.preload = 'auto';
var src = document.createElement('source');
src.src = 'fusrodah.mp3';
soundFile.appendChild(src);

soundFile.load();
soundFile.volume = 0;
soundFile.play();

var play = function() {
  soundFile.currentTime = 0.01;
  soundFile.volume = 1;
  soundFile.play();
  setTimeout(function() {
    shout(true);
    setTimeout(function() {
      document.querySelector('.mic1').classList.remove('hidden');
      document.querySelector('.mic2').classList.remove('hidden');
    }, 500);
  }, 9200);
};

var render = function(time) {
  shaderPass.material.uniforms.velocityFactor.value = shouting || blink ? 0.4 : 0;

  if (started) {
    if (sensor) {
      camera.quaternion.copy(sensor.getState().orientation);
    }

    if (chickenTemplate.loaded && chickens.length < 60 && Math.random() > 0.9) {
      var chicken = new THREE.Mesh(chickenTemplate.geometry, chickenTemplate.material);
      var scale = count * 0.001 + 0.1 + 0.1 * Math.random();
      chicken.scale.set(scale, scale, scale);
      chicken.radius = scale * 2;
      object.add(chicken);

      chicken.velocity = new THREE.Vector3();
      chicken.drift = Math.random() * 2 - 1;

      chicken.position.x = Math.random() * 1 - 0.5;
      chicken.position.z = Math.random() * 1 - 0.5;
      chicken.position.setLength(Math.random() * 20 + 20)
      chicken.position.y = noise.simplex2(chicken.position.x / noiseScale, -chicken.position.z / noiseScale) - 1;

      chickens.push(chicken);
      count++;
    }

    chickens.forEach(function(chicken, i) {
      var direction = chicken.position.clone().sub(camera.position);

      if (chicken.dead) {
        chicken.rotation.x -= Math.random() * 0.2;
        chicken.rotation.y += Math.random() * 0.2;
      }

      else {
        chicken.velocity.add(direction.clone().multiplyScalar(-0.0002));
        chicken.velocity.add(chicken.velocity.clone().cross(up).setLength(chicken.drift * 0.0005));
        chicken.velocity.multiplyScalar(0.95);

        chicken.velocity.add(separation(chicken, chickens.concat([camera]), 0.75, 0.0075));

        direction.y = 0;
        chicken.quaternion.setFromUnitVectors(across, direction.normalize());
      }

      if (chicken.position.y <= noise.simplex2(chicken.position.x / noiseScale, -chicken.position.z / noiseScale) - 1) {
        chicken.velocity.y = chicken.dead ? 0.2 : 0.1;
      }

      chicken.velocity.add(gravity);
      chicken.position.add(chicken.velocity);

      if (chicken.position.lengthSq() > 15000) {
        object.remove(chicken);
        chickens.splice(i, 1);
      }
    });

    if (blink) {
      camera.position.lerpVectors(blink[0], blink[1], blink[2]);
      blink[2] += 0.05;
      if (blink[2] > 1) {
        camera.position.copy(blink[1]);
        blink = false;
      }
    } else if (casting) {
      raycaster.set(camera.position.clone(), across.clone().applyQuaternion(camera.quaternion));
      var rays = raycaster.intersectObjects([land]);
      if (rays[0] && rays[0].object === land) {
        target = true;
        glow.position.copy(rays[0].point);
        glow.position.y += 0.15;
        var rotation = new THREE.Quaternion().setFromUnitVectors(up, rays[0].face.normal);
        glow.rotation.set(0, 0, 0);
        glow.quaternion.multiply(rotation);
      }
      else {
        target = false;
        glow.position.set(0, -10, 0);
      }
    } else {
      glow.position.set(0, -10, 0);
    }
  }

  tmpArray.copy(camera.matrixWorldInverse);
  tmpArray.multiply(camera.projectionMatrix);
  mCurrent.getInverse(tmpArray);

  shaderPass.material.uniforms.viewProjectionInverseMatrix.value.copy(mCurrent);
  shaderPass.material.uniforms.previousViewProjectionMatrix.value.copy(mPrev);

  if (cardboard && window.orientation !== 0) {
    renderer.callback = function(scene, camera) {
      composer2.render();
      shaderPass.material.uniforms.tColor.value = composer2.renderTarget2;

      chickens.forEach(function(chicken) {
        chicken.material = depthMaterial;
      });
      land.material = depthMaterial;
      stars.material = depthMaterial;

      composer.render(scene, camera);

      chickens.forEach(function(chicken) {
        chicken.material = chickenTemplate.material;
      });
      land.material = groundMaterial;
      stars.material = starsMaterial;
    }
    effect.render(scene, camera);
  }
  else {
    composer2.render();
    shaderPass.material.uniforms.tColor.value = composer2.renderTarget2;

    chickens.forEach(function(chicken) {
      chicken.material = depthMaterial;
    });
    land.material = depthMaterial;
    stars.material = depthMaterial;

    composer.render(scene, camera);

    chickens.forEach(function(chicken) {
      chicken.material = chickenTemplate.material;
    });
    land.material = groundMaterial;
    stars.material = starsMaterial;
  }

  mPrev.copy(mCurrent);

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
    play();
  }
});

document.querySelector('.cardboard-overlay').addEventListener('click', function() {
  document.querySelector('.intro-modal').style.display = 'none';
  document.querySelector('.intro-modal.stereo').style.display = 'none';
  document.querySelector('.cardboard-overlay').style.display = 'none';
  started = true;
  play();
  updateOrientation();
});

document.querySelector('.cardboard-button').addEventListener('click', function() {
  cardboard = !cardboard;
  camera.fov = cardboard ? '60' : '45';
  document.body.classList[cardboard && window.orientation !== 0 ? 'add' : 'remove']('stereo');
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
  composer.setSize(window.innerWidth, window.innerHeight);
  composer2.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', _.debounce(resize, 50), false);

var sensor;
navigator.getVRDevices().then(function(devices) {
  sensor =_.find(devices, 'getState');
});

updateOrientation();
resize();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lib/detect-sphere-collision":2,"../lib/three-utils":3}],2:[function(require,module,exports){
(function (global){
var THREE = (typeof window !== "undefined" ? window['THREE'] : typeof global !== "undefined" ? global['THREE'] : null);
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var center = new THREE.Vector3();
var line = new THREE.Line3();
var point = new THREE.Vector3();
var triangle = new THREE.Triangle();
var plane = new THREE.Plane();
var normal = new THREE.Vector3();

module.exports = function(sphere, object, callback) {
  var radius = sphere.geometry.radius;
  var radiusSquared = Math.pow(radius);

  // center.copy(object.geometry.boundingSphere.center).applyMatrix4(object.matrix);
  // if (sphere.position.distanceToSquared(center) > Math.pow(radius + object.geometry.boundingSphere.radius, 2)) {
  //   return;
  // }

  // Face collisions
  var collision = _.find(object.geometry.faces, function(face) {
    triangle.a.copy(object.geometry.vertices[face.a]).applyMatrix4(object.matrix);
    triangle.b.copy(object.geometry.vertices[face.b]).applyMatrix4(object.matrix);
    triangle.c.copy(object.geometry.vertices[face.c]).applyMatrix4(object.matrix);

    if (triangle.containsPoint(sphere.position)) {
      triangle.plane(plane);
      var distance = plane.distanceToPoint(sphere.position);
      if (Math.abs(distance) < radius) {
        normal.copy(plane.normal).multiplyScalar(distance > 0 ? 1 : -1);
        callback(normal, radius - Math.abs(distance), sphere.position);
        return true;
      }
    }
  })
  if (collision) return;

  // Vertex and edge collisions
  _.find(object.geometry.edges, function(edge) {
    line.start.copy(edge[0]).applyMatrix4(object.matrix);
    line.end.copy(edge[1]).applyMatrix4(object.matrix);

    line.closestPointToPoint(sphere.position, true, point);
    var distanceSquared = sphere.position.distanceToSquared(point);
    if (distanceSquared < radiusSquared) {
      normal.copy(point).sub(sphere.position).normalize();
      callback(normal, radius - Math.sqrt(distanceSquared), point);
      return true;
    }
  });
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
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
