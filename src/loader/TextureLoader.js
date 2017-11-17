const Class = require('../core/Class');
const BasicLoader = require('./BasicLoader');
const Texture = require('../texture/Texture');

/**
 * Texture加载类
 * @class
 * @extends {BasicLoader}
 * @example
 * var loader = new Hilo3d.TextureLoader();
 * loader.load({
 *     crossOrigin: true,
 *     src: '//gw.alicdn.com/tfs/TB1iNtERXXXXXcBaXXXXXXXXXXX-600-600.png'
 * }).then(function (diffuse) {
 *     var material = new Hilo3d.BasicMaterial({
 *         diffuse: diffuse
 *     });
 *     ...
 * });
 */
const TextureLoader = Class.create(/** @lends TextureLoader.prototype */{
    Extends: BasicLoader,
    /**
     * @constructs
     */
    constructor() {
        TextureLoader.superclass.constructor.call(this);
    },
    /**
     * 加载Texture
     * @param {object} params 加载参数
     * @param {string} params.src 纹理图片地址
     * @param {boolean} params.crossOrigin 是否跨域，不传将自动判断
     * @async
     * @return {Promise<Texture, Error>} 返回加载完的Texture对象
     */
    load(params) {
        return this.loadImg(params.src, params.crossOrigin).then(img => {
            const args = Object.assign({}, params);
            args.image = img;
            delete args.type;
            return new Texture(args);
        }).catch(err => {
            console.warn('load Texture failed', err.message, err.stack);
            throw err;
        });
    }
});

module.exports = TextureLoader;