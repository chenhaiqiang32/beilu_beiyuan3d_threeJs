import { Object3D, BufferGeometry, Mesh, Raycaster } from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module";

import { CoreEvents } from "./CoreEvents";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";
import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer";
import { BLRaycaster } from "../raycaster/BLRaycaster";
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";

export class CoreExtensions extends CoreEvents {
    /**@type {BLRaycaster}  */
    raycaster;
    /**@constructor { HTMLElement | HTMLCanvasElement | undefined} domElement */
    constructor(domElement) {
        super(domElement);

        this.initMeshBVH();
        this.initTWEEN();
    }

    use(plugin) {
        plugin.register(this);
        return plugin;
    }

    /**@param {Object3D|Object3D[]} object  */
    memoryTrack(object) {
        return object;
    }

    initCSS2DRenderer() {
        const symbol = Symbol();
        const css2dRenderer = new CSS2DRenderer();
        css2dRenderer.setSize(window.innerWidth, window.innerHeight);
        css2dRenderer.domElement.id = "css2dRenderer";
        this.onRenderQueue.set(symbol, () => css2dRenderer.render(this.scene, this.camera));
        this.onresizeQueue.set(symbol, css2dRenderer.setSize);
        document.body.appendChild(css2dRenderer.domElement);
        this.initCSS2DRenderer = () => {};
    }

    initCSS3DRenderer() {
        const symbol = Symbol();
        const css3dRenderer = new CSS3DRenderer();
        css3dRenderer.setSize(window.innerWidth, window.innerHeight);
        css3dRenderer.domElement.id = "css3dRenderer";
        this.onRenderQueue.set(symbol, () => css3dRenderer.render(this.scene, this.camera));
        this.onresizeQueue.set(symbol, css3dRenderer.setSize);
        document.body.appendChild(css3dRenderer.domElement);
        this.initCSS3DRenderer = () => {};
    }

    initTWEEN() {
        this.onRenderQueue.set(Symbol(), () => TWEEN.update());
    }

    initMeshBVH() {
        BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
        BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
        Mesh.prototype.raycast = acceleratedRaycast;
        Raycaster.prototype.firstHitOnly = true;
    }

    initRaycaster() {
        this.raycaster = new BLRaycaster(this.camera, this.domElement);
        this.initRaycaster = () => {};
    }

    /**
     * 射线拾取方法，输入事件类型，检测对象，以及回调函数。返回当前射线事件的清除方法，以及射线检测结果对象。
     * @param {"click"|"dblClick"|"mousemove"} type 射线检测事件
     * @param {Object3D | Object3D[]} object 射线检测对象
     * @param {(intersects: import("three").Intersection[], event: MouseEvent) => void}  callback 射线检测回调
     */
    raycast(type, object, callback) {
        if (!this.raycaster) this.initRaycaster();
        return this.raycaster.raycast(type, object, callback);
    }

    /**
     * 设置事件射线状态，如果没有初始化射线功能，将会初始化射线。
     * @param {"click"|"mousedown"|"mouseup"|"mousemove"|"dblclick"} type 事件类型
     * @param {boolean} bool 状态
     */
    setRaycasterState(type, bool) {
        if (!this.raycaster) this.initRaycaster();
        this.raycaster.setState(type, bool);
    }
}
