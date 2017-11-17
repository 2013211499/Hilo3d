const Class = require('../core/Class');
const math = require('../math/math');
const capabilities = require('../renderer/capabilities');
const Cache = require('../utils/Cache');
const log = require('../utils/log');
const {
    TEXTURE_2D,
    RGBA,
    LINEAR,
    NEAREST,
    REPEAT,
    CLAMP_TO_EDGE,
    UNSIGNED_BYTE
} = require('../constants/webgl');

const cache = new Cache();
/**
 * 纹理
 * @class
 * @example
 * var loader = new Hilo3d.BasicLoader();
 * loader.load({
 *     src: '//img.alicdn.com/tfs/TB1aNxtQpXXXXX1XVXXXXXXXXXX-1024-1024.jpg',
 *     crossOrigin: true
 * }).then(img => {
 *     return new Hilo3d.Texture({
 *         image: img
 *     });
 * });
 */
const Texture = Class.create( /** @lends Texture.prototype */ {
    Statics: {
        /**
         * 缓存
         * @readOnly
         * @type {Object}
         */
        cache: {
            get() {
                return cache;
            }
        },
        /**
         * 重置
         * @param  {WebGLRenderingContext} gl
         */
        reset(gl) {
            cache.each(texture => {
                texture.destroy(gl);
            });
        }
    },

    /**
     * @default true
     * @type {boolean}
     */
    isTexture: true,

    /**
     * @default Texture
     * @type {string}
     */
    className: 'Texture',

    /**
     * 图片对象
     * @type {Image}
     */
    image: null,

    /**
     * Texture Target
     * @default gl.TEXTURE_2D
     * @type {GLenum}
     */
    target: TEXTURE_2D,

    /**
     * Texture Level
     * @default 0
     * @type {number}
     */
    level: 0,

    /**
     * Texture Internal Format
     * @default gl.RGBA
     * @type {GLenum}
     */
    internalFormat: RGBA,

    /**
     * 图片 Format
     * @default gl.RGBA
     * @type {GLenum}
     */
    format: RGBA,

    /**
     * 类型
     * @default gl.UNSIGNED_BYTE
     * @type {GLenum}
     */
    type: UNSIGNED_BYTE,

    /**
     * @default 0
     * @type {number}
     */
    width: 0,

    /**
     * @default 0
     * @type {number}
     */
    height: 0,

    /**
     * @default 0
     * @readOnly
     * @type {Number}
     */
    border: 0,

    /**
     * magFilter
     * @default gl.LINEAR
     * @type {GLenum}
     */
    magFilter: LINEAR,

    /**
     * minFilter
     * @default gl.LINEAR
     * @type {GLenum}
     */
    minFilter: LINEAR,

    /**
     * wrapS
     * @default gl.REPEAT
     * @type {GLenum}
     */
    wrapS: REPEAT,

    /**
     * wrapT
     * @default gl.REPEAT
     * @type {GLenum}
     */
    wrapT: REPEAT,

    /**
     * @type {string}
     */
    name: '',

    /**
     * @default false
     * @type {boolean}
     */
    premultiplyAlpha: false,

    /**
     * 是否翻转Texture的Y轴
     * @default false
     * @type {boolean}
     */
    flipY: false,

    /**
     * 是否压缩
     * @default false
     * @type {Boolean}
     */
    compressed: false,

    /**
     * 是否需要更新Texture
     * @default true
     * @type {boolean}
     */
    needUpdate: true,

    /**
     * 是否每次都更新Texture
     * @default false
     * @type {boolean}
     */
    autoUpdate: false,

    /**
     * @constructs
     * @param {object} params 初始化参数，所有params都会复制到实例上
     */
    constructor(params) {
        this.id = math.generateUUID(this.className);
        Object.assign(this, params);

        cache.add(this.id, this);
    },
    isImgPowerOfTwo(img) {
        return math.isPowerOfTwo(img.width) && math.isPowerOfTwo(img.height);
    },
    resizeImgToPowerOfTwo(img) {
        if (this.isImgPowerOfTwo(img)) {
            return img;
        }
        const newW = math.nextPowerOfTwo(img.width);
        const newH = math.nextPowerOfTwo(img.height);
        let canvas = this._canvasImage;
        if (!canvas) {
            canvas = document.createElement('canvas');
            this._canvasImage = canvas;
        }
        canvas.width = newW;
        canvas.height = newH;
        let ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, newW, newH);
        log.warnOnce('resizeImgToPowerOfTwo' + this.id, `image is not power of two (${img.width}x${img.height}). Resized to ${canvas.width}x${canvas.height}`, img.src);
        return canvas;
    },
    _glUploadTexture(state, target, image) {
        const gl = state.gl;
        if (this.compressed) {
            gl.compressedTexImage2D(target, this.level, this.internalFormat, this.width, this.height, this.border, image);
        } else if (image.width) {
            gl.texImage2D(target, this.level, this.internalFormat, this.format, this.type, image);
        } else {
            gl.texImage2D(target, this.level, this.internalFormat, this.width, this.height, this.border, this.format, this.type, image);
        }
    },
    _uploadTexture(state) {
        this._glUploadTexture(state, this.target, this.image);
    },
    updateTexture(state) {
        const gl = state.gl;
        if (this.needUpdate || this.autoUpdate) {
            if (this._originImage && this.image === this._canvasImage) {
                this.image = this._originImage;
            }
            const useMipmap = this.minFilter !== LINEAR && this.minFilter !== NEAREST;
            const useRepeat = this.wrapS !== CLAMP_TO_EDGE || this.wrapT !== CLAMP_TO_EDGE;
            if (useRepeat || useMipmap) {
                this._originImage = this.image;
                this.image = this.resizeImgToPowerOfTwo(this.image);
            }
            state.activeTexture(gl.TEXTURE0 + capabilities.MAX_TEXTURE_INDEX);
            state.bindTexture(this.target, this.tex);
            state.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);
            state.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !!this.flipY);

            this._uploadTexture(state);

            if (useMipmap) {
                gl.generateMipmap(this.target);
            }
            this.needUpdate = false;
        }
    },
    getGLTexture(state) {
        const gl = state.gl;
        if (this.tex) {
            this.updateTexture(state);
            return this.tex;
        }
        this.tex = gl.createTexture();
        this.needUpdate = true;
        this.updateTexture(state);
        gl.texParameterf(this.target, gl.TEXTURE_MAG_FILTER, this.magFilter);
        gl.texParameterf(this.target, gl.TEXTURE_MIN_FILTER, this.minFilter);
        gl.texParameterf(this.target, gl.TEXTURE_WRAP_S, this.wrapS);
        gl.texParameterf(this.target, gl.TEXTURE_WRAP_T, this.wrapT);
        return this.tex;
    },
    /**
     * 销毁当前Texture
     * @param {WebGL2RenderingContext} gl gl
     */
    destroy(gl) {
        if (this.tex) {
            gl.deleteTexture(this.tex);
            delete this.tex;
        }
    }
});

module.exports = Texture;