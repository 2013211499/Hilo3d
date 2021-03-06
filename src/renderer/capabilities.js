import extensions from './extensions';

/**
 * WebGL 能力
 * @namespace capabilities
 * @type {Object}
 */
const capabilities = {
    /**
     * 最大纹理数量
     * @type {Number}
     */
    MAX_TEXTURE_INDEX: null,

    /**
     * 最高着色器精度, 可以是以下值：highp, mediump, lowp
     * @type {String}
     */
    MAX_PRECISION: null,

    /**
     * 最高顶点着色器精度, 可以是以下值：highp, mediump, lowp
     * @type {String}
     */
    MAX_VERTEX_PRECISION: null,

    /**
     * 最高片段着色器精度, 可以是以下值：highp, mediump, lowp
     * @type {String}
     */
    MAX_FRAGMENT_PRECISION: null,

    /**
     * 顶点浮点数纹理
     * @type {Boolean}
     */
    VERTEX_TEXTURE_FLOAT: null,

    /**
     * 片段浮点数纹理
     * @type {Boolean}
     */
    FRAGMENT_TEXTURE_FLOAT: null,

    /**
     * 初始化
     * @param {WebGLRenderingContext} gl
     */
    init(gl) {
        this.gl = gl;
        const arr = [
            'MAX_RENDERBUFFER_SIZE',
            'MAX_COMBINED_TEXTURE_IMAGE_UNITS',
            'MAX_CUBE_MAP_TEXTURE_SIZE',
            'MAX_FRAGMENT_UNIFORM_VECTORS',
            'MAX_TEXTURE_IMAGE_UNITS',
            'MAX_TEXTURE_SIZE',
            'MAX_VARYING_VECTORS',
            'MAX_VERTEX_ATTRIBS',
            'MAX_VERTEX_TEXTURE_IMAGE_UNITS',
            'MAX_VERTEX_UNIFORM_VECTORS',
            'MAX_COMBINED_TEXTURE_IMAGE_UNITS'
        ];

        arr.forEach((name) => {
            this.get(name);
        });

        this.MAX_TEXTURE_INDEX = this.MAX_COMBINED_TEXTURE_IMAGE_UNITS - 1;
        this.MAX_VERTEX_PRECISION = this._getMaxSupportPrecision(gl.VERTEX_SHADER);
        this.MAX_FRAGMENT_PRECISION = this._getMaxSupportPrecision(gl.FRAGMENT_SHADER);
        this.MAX_PRECISION = this.getMaxPrecision(this.MAX_FRAGMENT_PRECISION, this.MAX_VERTEX_PRECISION);

        this.VERTEX_TEXTURE_FLOAT = !!extensions.texFloat && this.MAX_VERTEX_TEXTURE_IMAGE_UNITS > 0;
        this.FRAGMENT_TEXTURE_FLOAT = !!extensions.texFloat;
        this.EXT_FRAG_DEPTH = extensions.get('EXT_frag_depth');

        this.SHADER_TEXTURE_LOD = !!extensions.shaderTextureLod;
    },
    /**
     * 获取 WebGL 能力
     * @param  {String} name
     * @return {Number|String}
     */
    get(name) {
        const gl = this.gl;
        let value = this[name];
        if (value === undefined) {
            value = this[name] = gl.getParameter(gl[name]);
        }

        return value;
    },
    _getMaxSupportPrecision(shaderType) {
        const gl = this.gl;

        let maxPrecision = 'lowp';

        if (gl.getShaderPrecisionFormat) {
            const precisions = [{
                name: 'highp',
                type: gl.HIGH_FLOAT,
            }, {
                name: 'mediump',
                type: gl.MEDIUM_FLOAT
            }];

            for (let i = 0; i < precisions.length; i++) {
                const precision = precisions[i];
                const precisionFormat = gl.getShaderPrecisionFormat(shaderType, precision.type) || {};
                if (precisionFormat.precision > 0) {
                    maxPrecision = precision.name;
                    break;
                }
            }
        } else {
            maxPrecision = 'mediump';
        }

        return maxPrecision;
    },
    /**
     * 获取最大支持精度
     * @param  {String} a
     * @param  {String} b
     * @return {String}
     */
    getMaxPrecision(a, b) {
        if (a === 'highp' || (a === 'mediump' && b === 'lowp')) {
            return b;
        }

        return a;
    }
};

export default capabilities;
