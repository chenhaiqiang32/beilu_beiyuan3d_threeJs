import * as THREE from "three";
import Core from "../../main";

import { Subsystem } from "../subsystem/Subsystem";

import { createCSS2DObject,createDom } from "../../lib/CSSObject";
import { DrawLineHelper } from "./../../lib/drawLineHelper";

const mousedown = new THREE.Vector2();
const mouseup = new THREE.Vector2();

export class MeasureArea {
  /**
   * @param {Subsystem} subsystem
   */
  constructor(subsystem) {
    /**@type {Core} */
    this.core = subsystem.core;
    this.scene = subsystem.scene;
    this.subsystem = subsystem;

    this.active = false;

    /**射线拾取对象 */
    this.raycastObject = null;

    // 射线检测拾取的坐标
    this.hitPoint = null;

    this.helper = new DrawLineHelper(this.scene);

    // 设置需要吸附到起点坐标
    this.helper.needToAdhereToFirstPoint = true;

    // 设置在多少距离内会被吸附
    this.helper.closestDistanceToAdhere = 10;

    // 设置校验线段是否相交,相交时会在控制台打印
    this.helper.needCheckLinesCross = true;

    this.core.onresizeQueue.set(Symbol(),this.helper.onresize);
  }

  /**
   * 设置射线检测的对象
   * @param {THREE.Object3D} object 射线检测对象
   */
  setRaycastObject(object) {
    this.raycastObject = object;
  }

  start() {
    if (this.active === true) return;
    this.active = true;
    this.helper.active = true;
    this.mousedownControls = this.core.addEventListener("mousedown");
    this.mouseupControls = this.core.addEventListener("mouseup");
    this.keyupControls = this.core.addEventListener("keyup");

    this.mousedownControls.add(this.onmousedown);
    this.mouseupControls.add(this.onmouseup);
    this.keyupControls.add(this.onkeyup);

    this.raycastControls = this.core.raycast("mousemove",this.raycastObject,this.raycastOnmousemove);
  }
  removeListener() {
    if (this.helper.active === true) {
      this.helper.active = false;
      this.mousedownControls.clear();
      this.mouseupControls.clear();
      this.keyupControls.clear();
      this.raycastControls.clear();
    }
  }
  end() {
    if (this.active === false) return;
    this.active = false;
    this.removeListener();
    this.helper.dispose();
    this.label && this.label.deleteSelf();
    this.label = null;
  }

  onmousedown = event => {
    this.getMouse(event,mousedown);
  };

  onmouseup = event => {
    this.getMouse(event,mouseup);
    if (!mousedown.equals(mouseup)) {
      return;
    }
    if (this.hitPoint) {
      this.helper.addPoint(this.hitPoint);
      this.label && (this.label.visible = !(this.helper.count === 0));

      if (this.helper.isClosed) {
        this.removeListener();
        this.setLabelData(this.helper.getArea(2));
        this.setLabelPosition(this.helper.getCenter());
        this.addCloseButton(this.hitPoint);

      }
    }
  };

  onkeyup = event => {
    if (event.key === "Escape") {
      this.helper.deletePoint();
      this.label.visible = !(this.helper.count === 0);
      this.updateLabel();
    }
  };

  getMouse = (event,vector) => {
    const { left,top,width,height } = this.core.domElement.getBoundingClientRect();
    vector.x = ((event.clientX - left) / width) * 2 - 1;
    vector.y = -((event.clientY - top) / height) * 2 + 1;
  };

  raycastOnmousemove = intersections => {
    if (intersections.length) {
      this.hitPoint = intersections[0].point;
      this.helper.updateMoveLine(this.hitPoint);
      if (!this.label && this.helper.count > 0) {
        this.createLabel();
      } else if (this.label) {
        this.updateLabel();
      }
    } else {
      this.hitPoint = null;
    }
  };

  createLabel() {
    const container = document.createElement("div");
    container.className = "measure-container";
    const dom = createDom({
      innerText: 0 + "m²",
      className: "area-label",
    });
    container.appendChild(dom);
    this.label = createCSS2DObject(container);
    this.scene.add(this.label);
  }

  updateLabel() {
    if (this.label.element) {
      this.setLabelPosition(this.hitPoint);
    }
  }

  addCloseButton(point) {
    const dom = createDom({ innerText: "X",className: "measure-close" });
    this.label.element.appendChild(dom);
    dom.onclick = () => {
      this.end();
      this.start();
    };
  }

  setLabelPosition(position,y = 20) {
    this.label.position.set(position.x,position.y + y,position.z);
  }

  setLabelData(data) {
    if (this.label.element) {
      this.label.element.children[0].innerText = data + "m²";
    }
  }
}
