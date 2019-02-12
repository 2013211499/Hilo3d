import Class from '../core/Class';
import PerspectiveCamera from '../camera/PerspectiveCamera';
import Framebuffer from '../renderer/Framebuffer';
import capabilities from '../renderer/capabilities';
import semantic from '../material/semantic';
import GeometryMaterial from '../material/GeometryMaterial';
import Color from '../math/Color';
import Vector3 from '../math/Vector3';
import LightShadow from './LightShadow';
import log from '../utils/log';
import constants from '../constants';

const {
    DISTANCE,
    BACK,
    TEXTURE_CUBE_MAP,
    TEXTURE0,
    TEXTURE_CUBE_MAP_POSITIVE_X,
    TEXTURE_WRAP_S,
    TEXTURE_WRAP_T,
    CLAMP_TO_EDGE,
    TEXTURE_MIN_FILTER,
    TEXTURE_MAG_FILTER,
    NEAREST,
    FRAMEBUFFER,
    FRAMEBUFFER_COMPLETE,
} = constants;

let shadowMaterial = null;
const clearColor = new Color(0, 0, 0, 0);
const tempVector3 = new Vector3();

const LookAtMap = [
    [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1],
    [0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, -1, 0, 0, -1, 0]
];

/**
 * @class
 * @private
 */
const CubeLightShadow = Class.create(/** @lends CubeLightShadow.prototype */ {
    isLightShadow: true,
    className: 'CubeLightShadow',
    Extends: LightShadow,

    light: null,
    renderer: null,
    framebuffer: null,
    camera: null,
    width: 1024,
    height: 1024,
    maxBias: 0.05,
    minBias: 0.005,
    debug: false,
    constructor(params) {
        CubeLightShadow.superclass.constructor.call(this, params);
    },
    createFramebuffer() {
        if (this.framebuffer) {
            return;
        }

        const size = 1024;
        this.framebuffer = new Framebuffer(this.renderer, {
            target: TEXTURE_CUBE_MAP,
            width: size,
            height: size,
            createTexture() {
                const state = this.state;
                const gl = state.gl;
                const texture = gl.createTexture();

                state.activeTexture(TEXTURE0 + capabilities.MAX_TEXTURE_INDEX);
                state.bindTexture(this.target, texture);

                for (let i = 0; i < 6; i++) {
                    gl.texImage2D(TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, this.internalFormat, this.width, this.height, 0, this.format, this.type, null);
                }

                gl.texParameteri(this.target, TEXTURE_WRAP_S, CLAMP_TO_EDGE);
                gl.texParameteri(this.target, TEXTURE_WRAP_T, CLAMP_TO_EDGE);
                gl.texParameteri(this.target, TEXTURE_MIN_FILTER, NEAREST);
                gl.texParameteri(this.target, TEXTURE_MAG_FILTER, NEAREST);

                if (gl.checkFramebufferStatus(FRAMEBUFFER) !== FRAMEBUFFER_COMPLETE) {
                    log.warn('Framebuffer is not complete', gl.checkFramebufferStatus(FRAMEBUFFER));
                }
                return texture;
            },
            bindTexture(index) {
                index = index || 0;
                const state = this.state;
                const gl = state.gl;
                state.activeTexture(TEXTURE0 + capabilities.MAX_TEXTURE_INDEX);
                state.bindTexture(this.target, this.texture);
                gl.framebufferTexture2D(FRAMEBUFFER, this.attachment, TEXTURE_CUBE_MAP_POSITIVE_X + index, this.texture, 0);
            }
        });
    },
    updateLightCamera(currentCamera) {
        this.camera.fov = 90;
        this.camera.near = currentCamera.near;
        this.camera.far = currentCamera.far;
        this.camera.aspect = 1;
        this.camera.updateViewMatrix();
    },
    createCamera(currentCamera) {
        if (this.camera) {
            return;
        }
        this.camera = new PerspectiveCamera();
        this.updateLightCamera(currentCamera);
    },
    createShadowMap(currentCamera) {
        this.createFramebuffer();
        this.createCamera(currentCamera);

        const {
            renderer,
            framebuffer,
            camera
        } = this;

        if (!shadowMaterial) {
            shadowMaterial = new GeometryMaterial({
                vertexType: DISTANCE,
                side: BACK,
                writeOriginData: false
            });
        }

        framebuffer.bind();
        renderer.state.viewport(0, 0, framebuffer.width, framebuffer.height);

        this.light.worldMatrix.getTranslation(camera.position);
        for (let i = 0; i < 6; i++) {
            framebuffer.bindTexture(i);
            tempVector3.fromArray(LookAtMap[0], i * 3).add(camera.position);
            camera.up.fromArray(LookAtMap[1], i * 3);
            camera.lookAt(tempVector3);
            camera.updateViewProjectionMatrix();

            renderer.clear(clearColor);
            semantic.setCamera(camera);
            renderer.forceMaterial = shadowMaterial;
            this.renderShadowScene(renderer);
        }
        camera.matrix.identity();
        camera.updateViewProjectionMatrix();
        delete renderer.forceMaterial;
        framebuffer.unbind();
        semantic.setCamera(currentCamera);
        renderer.viewport();
    },
    renderShadowScene(renderer) {
        const renderList = renderer.renderList;
        renderList.traverse((arr) => {
            renderer.renderMeshes(arr.filter((mesh) => {
                if (mesh.material.castShadows) {
                    if (!mesh.frustumTest) {
                        return true;
                    }

                    if (this.camera.isMeshVisible(mesh)) {
                        return true;
                    }
                }

                return false;
            }));
        });
    }
});

export default CubeLightShadow;
