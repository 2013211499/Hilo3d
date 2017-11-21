const Class = require('../core/Class');
const Material = require('./Material');
const Color = require('../math/Color');

/**
 * 基础材质
 * @class
 * @extends Material
 * @example
 * const material = new Hilo3d.BasicMaterial({
 *     diffuse: new Hilo3d.Color(1, 0, 0, 1)
 * });
 */
const BasicMaterial = Class.create( /** @lends BasicMaterial.prototype */ {
    Extends: Material,
    /**
     * @default true
     * @type {boolean}
     */
    isBasicMaterial: true,
    /**
     * @default BasicMaterial
     * @type {string}
     */
    className: 'BasicMaterial',
    /**
     * 光照类型，支持: NONE, PHONE, BLINN
     * @default PHONE
     * @type {string}
     */
    lightType: 'PHONG',
    /**
     * 漫反射贴图，或颜色
     * @default Color(.5, .5, .5)
     * @type {Texture|Color}
     */
    diffuse: null,
    /**
     * 环境光贴图，或颜色
     * @default null
     * @type {Texture|Color}
     */
    ambient: null,
    /**
     * 镜面贴图，或颜色
     * @default Color(1, 1, 1)
     * @type {Texture|Color}
     */
    specular: null,
    /**
     * 放射光贴图，或颜色
     * @default Color(0, 0, 0)
     * @type {Texture|Color}
     */
    emission: null,
    /**
     * 环境贴图
     * @default null
     * @type {CubeTexture}
     */
    skyboxMap: null,
    /**
     * 环境贴图变化矩阵，如旋转等
     * @default null
     * @type {Matrix4}
     */
    skyboxMatrix: null,
    /**
     * 反射率
     * @default 0
     * @type {number}
     */
    reflectivity: 0,
    /**
     * 折射比率
     * @default 0
     * @type {number}
     */
    refractRatio: 0,
    /**
     * 折射率
     * @default 0
     * @type {number}
     */
    refractivity: 0,
    /**
     * 高光发光值
     * @default 32
     * @type {number}
     */
    shininess: 32,
    usedUniformVectors: 11,
    /**
     * 透明度 0~1
     * @default 1
     * @type {number}
     */
    transparency: 1,
    /**
     * @constructs
     * @param {object} params 初始化参数，所有params都会复制到实例上
     */
    constructor(params) {
        this.diffuse = new Color(.5, .5, .5);
        this.specular = new Color(1, 1, 1);
        this.emission = new Color(0, 0, 0);
        BasicMaterial.superclass.constructor.call(this, params);

        Object.assign(this.uniforms, {
            u_diffuse: 'DIFFUSE',
            u_specular: 'SPECULAR',
            u_ambient: 'AMBIENT',
            u_emission: 'EMISSION',
            u_normalMap: 'NORMALMAP',
            u_shininess: 'SHININESS',
            u_reflectivity: 'REFLECTIVITY',
            u_refractRatio: 'REFRACTRATIO',
            u_refractivity: 'REFRACTIVITY',
            u_transparency: 'TRANSPARENCY',
            u_skyboxMap: 'SKYBOXMAP',
            u_skyboxMatrix: 'SKYBOXMATRIX',
        });
    },
    getRenderOption(option = {}) {
        BasicMaterial.superclass.getRenderOption.call(this, option);

        const lightType = this.lightType;
        if (lightType === 'PHONG' || lightType === 'BLINN') {
            option.HAS_SPECULAR = 1;
        }
        let needUV = false;
        const diffuse = this.diffuse;
        if (diffuse && diffuse.isTexture) {
            if (diffuse.isCubeTexture) {
                option.DIFFUSE_CUBE_MAP = 1;
            } else {
                option.DIFFUSE_MAP = 1;
                needUV = true;
            }
        }

        if (this.transparency && this.transparency.isTexture) {
            option.TRANSPARENCY_MAP = 1;
            needUV = true;
        }

        if (option.HAS_LIGHT) {
            
            if (this.specular && this.specular.isTexture) {
                option.SPECULAR_MAP = 1;
                needUV = true;
            }

            if (this.emission && this.emission.isTexture) {
                option.EMISSION_MAP = 1;
                needUV = true;
            }

            if (this.ambient && this.ambient.isTexture) {
                option.AMBIENT_MAP = 1;
                needUV = true;
            }

            if (this.skyboxMap) {
                option.SKYBOX_MAP = 1;
            }
        }

        if (needUV) {
            option.HAS_TEXCOORD0 = 1;
        }

        return option;
    }
});

module.exports = BasicMaterial;