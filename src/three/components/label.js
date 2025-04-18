import * as THREE from "three";
import { createDom,createCSS2DObject } from "../lib/CSSObject";
import Core from "../main";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";

const labelData = [
  {
    position: new THREE.Vector3(-92,40,112),
    text: "压风机房",
    system: "pressureFanSubsystem",
  },
  {
    position: new THREE.Vector3(-1568,238,-21),
    text: "通风机房",
    system: "fanSubsystem",
  },
];

export class LabelManager {
  /**@param {Core} core  */
  constructor(core) {
    this.core = core;
    this.scene = core.scene;
    this.camera = core.camera;

    this.raycaster = new THREE.Raycaster();
    this.direction = new THREE.Vector3();
    this.raycaster.set(this.camera.position,this.direction);

    this.labelGroup = new THREE.Group();
    this.scene.add(this.labelGroup);
  }

  init() {
    labelData.forEach(item => {
      this.insertLabel(item);
    });
  }

  insertLabel(data) {
    // 测试，待删
    const mesh = this.createLabel(data.text,() => this.core.changeSystem(data.system));
    mesh.position.copy(data.position);
    this.labelGroup.add(mesh);
  }

  dispose() {
    while (this.labelGroup.children.length) {
      /**@type {CSS2DObject} */
      const label = this.labelGroup.children.pop();
      label.element.remove();
      label.removeFromParent();
    }
  }

  //插入点的图标
  createLabel(text,func) {
    const labelEle = createDom();
    labelEle.style.position = "absolute";

    // 建筑标签
    const div = document.createElement("div");
    div.style.width = `${10 + text.length * 20}px`;
    div.innerHTML = text;
    div.className = "beilu_icon_div";
    labelEle.appendChild(div);

    // 箭头
    const arrow = document.createElement("img");
    arrow.src = "./textures/building/down.png";
    arrow.className = "beilu_icon_down";
    arrow.draggable = false;
    labelEle.appendChild(arrow);

    if (typeof func === "function") {
      labelEle.onclick = () => {
        func();
      };
    }

    return createCSS2DObject(labelEle,"buildingLabel");
  }

  changeVisible(group,f) {
    group.traverse(child => {
      if (child instanceof CSS2DObject) {
        child.visible = f;
      }
    });
    this.iconVisible = f;
  }

  computeVisible() {
    this.computeVis(this.iconGroup);
    this.computeVis(this.labelGroup);
  }
  /**
   * @param {THREE.Group} params
   */
  computeVis(params) {
    params.children.forEach(child => {
      const origin = Store3D.currentCamera.position;
      const direction = child.position.clone().sub(origin).normalize();
      this.raycaster.set(origin,direction);
      const i = this.raycaster.intersectObject(Store3D.getViewBox());

      const l = origin.distanceTo(child.position);

      if (i.length && i[0].distance < l) {
        child.children[0].visible = false;
      } else {
        child.children[0].visible = true;
      }
    });
  }
}
