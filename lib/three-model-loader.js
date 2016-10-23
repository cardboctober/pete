/*
 * @author Daosheng Mu / https://github.com/DaoshengMu/
 * @author mrdoob / http://mrdoob.com/
 * @author takahirox / https://github.com/takahirox/
 */

var THREE = require('three');

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



THREE.TGALoader = function ( manager ) {

  this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.TGALoader.prototype.load = function ( url, onLoad, onProgress, onError ) {

  var scope = this;

  var texture = new THREE.Texture();

  var loader = new THREE.XHRLoader( this.manager );
  loader.setResponseType( 'arraybuffer' );

  loader.load( url, function ( buffer ) {

    texture.image = scope.parse( buffer );
    texture.needsUpdate = true;

    if ( onLoad !== undefined ) {

      onLoad( texture );

    }

  }, onProgress, onError );

  return texture;

};

// reference from vthibault, https://github.com/vthibault/roBrowser/blob/master/src/Loaders/Targa.js
THREE.TGALoader.prototype.parse = function ( buffer ) {

  // TGA Constants
  var TGA_TYPE_NO_DATA = 0,
  TGA_TYPE_INDEXED = 1,
  TGA_TYPE_RGB = 2,
  TGA_TYPE_GREY = 3,
  TGA_TYPE_RLE_INDEXED = 9,
  TGA_TYPE_RLE_RGB = 10,
  TGA_TYPE_RLE_GREY = 11,

  TGA_ORIGIN_MASK = 0x30,
  TGA_ORIGIN_SHIFT = 0x04,
  TGA_ORIGIN_BL = 0x00,
  TGA_ORIGIN_BR = 0x01,
  TGA_ORIGIN_UL = 0x02,
  TGA_ORIGIN_UR = 0x03;


  if ( buffer.length < 19 )
    console.error( 'THREE.TGALoader.parse: Not enough data to contain header.' );

  var content = new Uint8Array( buffer ),
    offset = 0,
    header = {
      id_length:       content[ offset ++ ],
      colormap_type:   content[ offset ++ ],
      image_type:      content[ offset ++ ],
      colormap_index:  content[ offset ++ ] | content[ offset ++ ] << 8,
      colormap_length: content[ offset ++ ] | content[ offset ++ ] << 8,
      colormap_size:   content[ offset ++ ],

      origin: [
        content[ offset ++ ] | content[ offset ++ ] << 8,
        content[ offset ++ ] | content[ offset ++ ] << 8
      ],
      width:      content[ offset ++ ] | content[ offset ++ ] << 8,
      height:     content[ offset ++ ] | content[ offset ++ ] << 8,
      pixel_size: content[ offset ++ ],
      flags:      content[ offset ++ ]
    };

  function tgaCheckHeader( header ) {

    switch ( header.image_type ) {

      // Check indexed type
      case TGA_TYPE_INDEXED:
      case TGA_TYPE_RLE_INDEXED:
        if ( header.colormap_length > 256 || header.colormap_size !== 24 || header.colormap_type !== 1 ) {

          console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid type colormap data for indexed type' );

        }
        break;

      // Check colormap type
      case TGA_TYPE_RGB:
      case TGA_TYPE_GREY:
      case TGA_TYPE_RLE_RGB:
      case TGA_TYPE_RLE_GREY:
        if ( header.colormap_type ) {

          console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid type colormap data for colormap type' );

        }
        break;

      // What the need of a file without data ?
      case TGA_TYPE_NO_DATA:
        console.error( 'THREE.TGALoader.parse.tgaCheckHeader: No data' );

      // Invalid type ?
      default:
        console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid type " ' + header.image_type + '"' );

    }

    // Check image width and height
    if ( header.width <= 0 || header.height <= 0 ) {

      console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid image size' );

    }

    // Check image pixel size
    if ( header.pixel_size !== 8  &&
      header.pixel_size !== 16 &&
      header.pixel_size !== 24 &&
      header.pixel_size !== 32 ) {

      console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid pixel size "' + header.pixel_size + '"' );

    }

  }

  // Check tga if it is valid format
  tgaCheckHeader( header );

  if ( header.id_length + offset > buffer.length ) {

    console.error( 'THREE.TGALoader.parse: No data' );

  }

  // Skip the needn't data
  offset += header.id_length;

  // Get targa information about RLE compression and palette
  var use_rle = false,
    use_pal = false,
    use_grey = false;

  switch ( header.image_type ) {

    case TGA_TYPE_RLE_INDEXED:
      use_rle = true;
      use_pal = true;
      break;

    case TGA_TYPE_INDEXED:
      use_pal = true;
      break;

    case TGA_TYPE_RLE_RGB:
      use_rle = true;
      break;

    case TGA_TYPE_RGB:
      break;

    case TGA_TYPE_RLE_GREY:
      use_rle = true;
      use_grey = true;
      break;

    case TGA_TYPE_GREY:
      use_grey = true;
      break;

  }

  // Parse tga image buffer
  function tgaParse( use_rle, use_pal, header, offset, data ) {

    var pixel_data,
      pixel_size,
      pixel_total,
      palettes;

    pixel_size = header.pixel_size >> 3;
    pixel_total = header.width * header.height * pixel_size;

     // Read palettes
     if ( use_pal ) {

       palettes = data.subarray( offset, offset += header.colormap_length * ( header.colormap_size >> 3 ) );

     }

     // Read RLE
     if ( use_rle ) {

       pixel_data = new Uint8Array( pixel_total );

      var c, count, i;
      var shift = 0;
      var pixels = new Uint8Array( pixel_size );

      while ( shift < pixel_total ) {

        c     = data[ offset ++ ];
        count = ( c & 0x7f ) + 1;

        // RLE pixels.
        if ( c & 0x80 ) {

          // Bind pixel tmp array
          for ( i = 0; i < pixel_size; ++ i ) {

            pixels[ i ] = data[ offset ++ ];

          }

          // Copy pixel array
          for ( i = 0; i < count; ++ i ) {

            pixel_data.set( pixels, shift + i * pixel_size );

          }

          shift += pixel_size * count;

        } else {

          // Raw pixels.
          count *= pixel_size;
          for ( i = 0; i < count; ++ i ) {

            pixel_data[ shift + i ] = data[ offset ++ ];

          }
          shift += count;

        }

      }

     } else {

      // RAW Pixels
      pixel_data = data.subarray(
         offset, offset += ( use_pal ? header.width * header.height : pixel_total )
      );

     }

     return {
      pixel_data: pixel_data,
      palettes: palettes
     };

  }

  function tgaGetImageData8bits( imageData, y_start, y_step, y_end, x_start, x_step, x_end, image, palettes ) {

    var colormap = palettes;
    var color, i = 0, x, y;
    var width = header.width;

    for ( y = y_start; y !== y_end; y += y_step ) {

      for ( x = x_start; x !== x_end; x += x_step, i ++ ) {

        color = image[ i ];
        imageData[ ( x + width * y ) * 4 + 3 ] = 255;
        imageData[ ( x + width * y ) * 4 + 2 ] = colormap[ ( color * 3 ) + 0 ];
        imageData[ ( x + width * y ) * 4 + 1 ] = colormap[ ( color * 3 ) + 1 ];
        imageData[ ( x + width * y ) * 4 + 0 ] = colormap[ ( color * 3 ) + 2 ];

      }

    }

    return imageData;

  }

  function tgaGetImageData16bits( imageData, y_start, y_step, y_end, x_start, x_step, x_end, image ) {

    var color, i = 0, x, y;
    var width = header.width;

    for ( y = y_start; y !== y_end; y += y_step ) {

      for ( x = x_start; x !== x_end; x += x_step, i += 2 ) {

        color = image[ i + 0 ] + ( image[ i + 1 ] << 8 ); // Inversed ?
        imageData[ ( x + width * y ) * 4 + 0 ] = ( color & 0x7C00 ) >> 7;
        imageData[ ( x + width * y ) * 4 + 1 ] = ( color & 0x03E0 ) >> 2;
        imageData[ ( x + width * y ) * 4 + 2 ] = ( color & 0x001F ) >> 3;
        imageData[ ( x + width * y ) * 4 + 3 ] = ( color & 0x8000 ) ? 0 : 255;

      }

    }

    return imageData;

  }

  function tgaGetImageData24bits( imageData, y_start, y_step, y_end, x_start, x_step, x_end, image ) {

    var i = 0, x, y;
    var width = header.width;

    for ( y = y_start; y !== y_end; y += y_step ) {

      for ( x = x_start; x !== x_end; x += x_step, i += 3 ) {

        imageData[ ( x + width * y ) * 4 + 3 ] = 255;
        imageData[ ( x + width * y ) * 4 + 2 ] = image[ i + 0 ];
        imageData[ ( x + width * y ) * 4 + 1 ] = image[ i + 1 ];
        imageData[ ( x + width * y ) * 4 + 0 ] = image[ i + 2 ];

      }

    }

    return imageData;

  }

  function tgaGetImageData32bits( imageData, y_start, y_step, y_end, x_start, x_step, x_end, image ) {

    var i = 0, x, y;
    var width = header.width;

    for ( y = y_start; y !== y_end; y += y_step ) {

      for ( x = x_start; x !== x_end; x += x_step, i += 4 ) {

        imageData[ ( x + width * y ) * 4 + 2 ] = image[ i + 0 ];
        imageData[ ( x + width * y ) * 4 + 1 ] = image[ i + 1 ];
        imageData[ ( x + width * y ) * 4 + 0 ] = image[ i + 2 ];
        imageData[ ( x + width * y ) * 4 + 3 ] = image[ i + 3 ];

      }

    }

    return imageData;

  }

  function tgaGetImageDataGrey8bits( imageData, y_start, y_step, y_end, x_start, x_step, x_end, image ) {

    var color, i = 0, x, y;
    var width = header.width;

    for ( y = y_start; y !== y_end; y += y_step ) {

      for ( x = x_start; x !== x_end; x += x_step, i ++ ) {

        color = image[ i ];
        imageData[ ( x + width * y ) * 4 + 0 ] = color;
        imageData[ ( x + width * y ) * 4 + 1 ] = color;
        imageData[ ( x + width * y ) * 4 + 2 ] = color;
        imageData[ ( x + width * y ) * 4 + 3 ] = 255;

      }

    }

    return imageData;

  }

  function tgaGetImageDataGrey16bits( imageData, y_start, y_step, y_end, x_start, x_step, x_end, image ) {

    var i = 0, x, y;
    var width = header.width;

    for ( y = y_start; y !== y_end; y += y_step ) {

      for ( x = x_start; x !== x_end; x += x_step, i += 2 ) {

        imageData[ ( x + width * y ) * 4 + 0 ] = image[ i + 0 ];
        imageData[ ( x + width * y ) * 4 + 1 ] = image[ i + 0 ];
        imageData[ ( x + width * y ) * 4 + 2 ] = image[ i + 0 ];
        imageData[ ( x + width * y ) * 4 + 3 ] = image[ i + 1 ];

      }

    }

    return imageData;

  }

  function getTgaRGBA( data, width, height, image, palette ) {

    var x_start,
      y_start,
      x_step,
      y_step,
      x_end,
      y_end;

    switch ( ( header.flags & TGA_ORIGIN_MASK ) >> TGA_ORIGIN_SHIFT ) {
      default:
      case TGA_ORIGIN_UL:
        x_start = 0;
        x_step = 1;
        x_end = width;
        y_start = 0;
        y_step = 1;
        y_end = height;
        break;

      case TGA_ORIGIN_BL:
        x_start = 0;
        x_step = 1;
        x_end = width;
        y_start = height - 1;
        y_step = - 1;
        y_end = - 1;
        break;

      case TGA_ORIGIN_UR:
        x_start = width - 1;
        x_step = - 1;
        x_end = - 1;
        y_start = 0;
        y_step = 1;
        y_end = height;
        break;

      case TGA_ORIGIN_BR:
        x_start = width - 1;
        x_step = - 1;
        x_end = - 1;
        y_start = height - 1;
        y_step = - 1;
        y_end = - 1;
        break;

    }

    if ( use_grey ) {

      switch ( header.pixel_size ) {
        case 8:
          tgaGetImageDataGrey8bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
          break;
        case 16:
          tgaGetImageDataGrey16bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
          break;
        default:
          console.error( 'THREE.TGALoader.parse.getTgaRGBA: not support this format' );
          break;
      }

    } else {

      switch ( header.pixel_size ) {
        case 8:
          tgaGetImageData8bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image, palette );
          break;

        case 16:
          tgaGetImageData16bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
          break;

        case 24:
          tgaGetImageData24bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
          break;

        case 32:
          tgaGetImageData32bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
          break;

        default:
          console.error( 'THREE.TGALoader.parse.getTgaRGBA: not support this format' );
          break;
      }

    }

    // Load image data according to specific method
    // var func = 'tgaGetImageData' + (use_grey ? 'Grey' : '') + (header.pixel_size) + 'bits';
    // func(data, y_start, y_step, y_end, x_start, x_step, x_end, width, image, palette );
    return data;

  }

  var canvas = document.createElement( 'canvas' );
  canvas.width = header.width;
  canvas.height = header.height;

  var context = canvas.getContext( '2d' );
  var imageData = context.createImageData( header.width, header.height );

  var result = tgaParse( use_rle, use_pal, header, offset, content );
  var rgbaData = getTgaRGBA( imageData.data, header.width, header.height, result.pixel_data, result.palettes );

  context.putImageData( imageData, 0, 0 );

  return canvas;

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
