import { Raycaster, PerspectiveCamera, Object3D, Vector2 } from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module";
/**
 * @classdesc 更简单的，更高效的使用射线拾取功能,针对鼠标事件做了封装，无论是对相同对象做不同检测，相同对象做相同类型检测，均做了优化。
 */
export class BLRaycaster {
    /**@type {Raycaster} THREE.raycaster */
    raycaster;
    /**@type {PerspectiveCamera} THREE.PerspectiveCamera */
    camera;
    /**@type {HTMLElement} THREE.PerspectiveCamera */
    element;
    /**@type {Vector2} THREE.Vector2 */
    mouse;
    /**@type {import("three").Intersection[]} THREE.import("three").Intersection[] */
    intersects;
    /**
     * @type {Map<Object3D | Object3D[], {[key:string]: (()=>{}) []} >}  射线检测回调函数，参数为射线拾取结果
     */
    callbackMap;

    /**
     * @param {PerspectiveCamera} camera
     * @param {HTMLElement} element
     */
    constructor(camera, element) {
        this.raycaster = new Raycaster();
        this.mouse = new Vector2();
        this.camera = camera;
        this.element = element;
        this.intersects = [];
        this.callbackMap = new Map();

        this._eventListeners = new Map();

        this.stateMap = new Map();
    }
    /**
     * 设置相机和DOM对象，请在清除已存在的射线检测后调用此方法。
     * @param {PerspectiveCamera} camera
     * @param {HTMLElement} element
     */
    set(camera, element) {
        this.camera = camera;
        this.element = element;
    }

    /**
     * 射线检测主要方法
     * @param {"click"|"mousedown"|"mouseup"|"mousemove"|"dblclick"} type
     * @param { Object3D | Object3D[]} object
     * @param {( intersects: import("three").Intersection[] ) => void  } callback
     * @typedef {Object} result
     * @property {() => void} clear 在取消射线检测时，调用此函数
     * @property {import("three").Intersection[]} intersects 射线拾取结果数组
     * @returns {result}
     */
    raycast(type, object, callback) {
        if (!callback) return;

        // 如果当前对象已经监听了当前事件
        if (this.exist(object, type)) {
            const callbacks = this.callbackMap.get(object)[type];

            // 并且在队列中不存在当前传入的函数，将传入函数推入事件队列中等待触发执行
            if (callbacks.indexOf(callback) === -1) {
                callbacks.push(callback);
            }
        } else {
            this.handleEvent(object, type, callback);

            // 如果当前对象存在，但不存在传入的事件监听
            if (this.callbackMap.has(object)) {
                const callbacks = this.callbackMap.get(object);
                callbacks[type] = callbacks[type] || [];
                callbacks[type].push(callback);
            } else {
                this.callbackMap.set(object, { [type]: [callback] });
            }
        }

        return {
            clear: () => this.clear(object, type, callback),
            intersects: this.intersects,
        };
    }

    /**判断是否对相同的对象重复监听相同事件 */
    exist(object, type) {
        return !!(this.callbackMap.has(object) && this.callbackMap.get(object)[type]);
    }

    /**
     * @param { Object3D | Object3D[]} object 检测对象
     * @param { "click"|"mousedown"|"mouseup"|"mousemove"|"dblclick" } type 事件类型
     * @returns { ()=>void } clear 停止射线检测时，调用此方法
     */
    handleEvent(object, type) {
        /** 监听事件 */
        const listener = event => this.getIntersects(event, object, type);

        /** 移除监听事件 */
        const removeListener = () => {
            this.element.removeEventListener(type, listener);
        };

        /** 记录移除监听事件 */
        if (this._eventListeners.has(object)) {
            const eventListener = this._eventListeners.get(object);
            eventListener[type] = removeListener;
        } else {
            this._eventListeners.set(object, { [type]: removeListener });
        }

        this.element.addEventListener(type, listener);
    }
    /**
     * 根据射线检测对象和事件类型清除射线检测
     * @param { Object3D | Object3D[]} object 检测对象
     * @param { "click"|"mousedown"|"mouseup"|"mousemove"|"dblclick" } type 事件类型
     */
    clear(object, type, callback) {
        if (this.callbackMap.has(object)) {
            const obj = this.callbackMap.get(object);

            const cbs = obj[type];

            const index = cbs.indexOf(callback);
            if (index === -1) return;
            cbs.splice(index, 1);

            if (cbs.length === 0) {
                delete obj[type];
            }
            if (Reflect.ownKeys(obj).length === 0) {
                this.callbackMap.delete(object);
            }
            this.intersects.length = 0;
        }

        const removeMap = this._eventListeners.get(object);

        if (!this.exist(object, type)) {
            removeMap[type]();
            delete removeMap[type];
        }

        if (Reflect.ownKeys(removeMap).length === 0) {
            this._eventListeners.delete(object);
        }
    }

    /**
     * 设置事件射线状态
     * @param {"click"|"mousedown"|"mouseup"|"mousemove"|"dblclick"} type 事件类型
     * @param {boolean} bool 状态
     */
    setState(type, bool) {
        this.stateMap.set(type, bool);
    }

    /**
     * 获取事件射线状态
     * @param {"click"|"mousedown"|"mouseup"|"mousemove"|"dblclick"} type
     * @returns
     */
    getState(type) {
        if (this.stateMap.has(type)) {
            return this.stateMap.get(type);
        }
        return true;
    }

    getIntersects = (event, object, type) => {
        if (TWEEN.getAll().length > 0) {
            return;
        }
        // 如果该事件射线处于非活跃状态，返回
        if (!this.getState(type)) return;
        this.intersects.length = 0;
        const { left, top, width, height } = this.element.getBoundingClientRect();

        this.mouse.x = ((event.clientX - left) / width) * 2 - 1;
        this.mouse.y = -((event.clientY - top) / height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        if (Array.isArray(object)) {
            this.raycaster.intersectObjects(object, true, this.intersects);
        } else {
            this.raycaster.intersectObject(object, true, this.intersects);
        }
        const intersectsVisible = this.intersects.filter(intersect => intersect.object.visible);
        this.callbackMap.get(object)[type].forEach(cb => cb(intersectsVisible, event));
    };
}
