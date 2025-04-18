import { Scene, Group } from "three";

/**@classdesc 子场景，属于子系统，存在特有的 dispose 方法，修改了 THREE.Scene 的 add 方法，使之所有的 add 都会加入到
 *  Group extra 内，便于在切换场景时候，统一释放 Group extra 内的资源
 */
export class SubScene extends Scene {
    constructor() {
        super();
        const extra = new Group();
        extra.name = "extra";

        this._add(extra);
        this.extra = extra;
    }
    /**通过该方法添加到场景中的对象,将不会被dispose释放内存。 */
    _add(object) {
        if (arguments.length > 1) {
            for (let i = 0; i < arguments.length; i++) {
                this._add(arguments[i]);
            }
            return this;
        }
        if (object === this) {
            console.error("THREE.Object3D.add: object can't be added as a child of itself.", object);
            return this;
        }
        if (object && object.isObject3D) {
            if (object.parent !== null) {
                object.parent.remove(object);
            }
            object.parent = this;
            this.children.push(object);
        } else {
            console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.", object);
        }

        return this;
    }
    /**通过该方法添加到场景中的对象,允许被dispose释放内存。 */
    add(object) {
        if (arguments.length > 1) {
            for (let i = 0; i < arguments.length; i++) {
                this.add(arguments[i]);
            }
            return this;
        }
        if (object === this) {
            console.error("THREE.Object3D.add: object can't be added as a child of itself.", object);
            return this;
        }
        if (object && object.isObject3D) {
            if (object.parent !== null) {
                object.parent.remove(object);
            }
            object.parent = this.extra;
            this.extra.children.push(object);
        } else {
            console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.", object);
        }

        return this;
    }

    dispose() {
        while (this.extra.children.length) {
            const child = this.extra.children.pop();
            child.deleteSelf();
        }
    }
}
