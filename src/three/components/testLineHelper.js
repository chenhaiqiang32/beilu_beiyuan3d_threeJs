import * as THREE from "three";
import  Core3D  from "../../main";
import { DrawLineHelper } from "../../lib/drawLineHelper";

export class TestLineHelper {
    /**@param {Core3D} core  */
    constructor(core) {
        this.core = core;
        // 测试平面
        this.plane = createPlane();
        core.scene.add(this.plane);

        const mouseupControls = core.addEventListener("mouseup");
        const keyupControls = core.addEventListener("keyup");
        this.helper = new DrawLineHelper(core.scene);

        this.helper.active = true;

        mouseupControls.add(this.onmouseup);
        keyupControls.add(this.onkeyup);

        core.raycast("mousemove", this.plane, intersections => {
            if (intersections.length) {
                this.select = intersections[0].point;
                this.helper.updateMoveLine(this.select);
            } else {
                this.select = null;
            }
        });
    }

    onmouseup = (event, param) => {
        if (this.select) {
            this.helper.addPoint(this.select, true);
        }
    };

    onkeyup = event => {
        if (event.key === "Escape") {
            // this.helper.deletePoint();
            this.helper.dispose();
        }
        if (event.key === "q") {
            this.helper.active = true;
        }
    };
}

function createPlane() {
    const geometry = new THREE.PlaneGeometry(100, 100);
    geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    return new THREE.Mesh(geometry, material);
}
