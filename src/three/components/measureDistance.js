import * as THREE from "three";
import Core from "../../main";
import { Subsystem } from "../subsystem/Subsystem";
import { createCSS2DObject,createDom } from "../../lib/CSSObject";
import { DrawLineHelper } from "./../../lib/drawLineHelper";
import MemoryManager from "../../lib/memoryManager";

const mousedown = new THREE.Vector2();
const mouseup = new THREE.Vector2();
export class MeasureDistance {
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

    this.hitPoint = null;
    this.helper = new DrawLineHelper(this.scene);

    this.core.onresizeQueue.set(Symbol(),this.helper.onresize);
    this.labels = [];
  }

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
    console.log('触发移除监听');
    if (this.helper.active === true) {
      this.helper.active = false;
      this.mousedownControls.clear();
      this.mouseupControls.clear();
      this.keyupControls.clear();
      this.raycastControls.clear();
    }
  }
  end() {
    if ((this.active = false)) return;

    this.active = false;

    this.removeListener();
    this.helper.dispose();

    MemoryManager.dispose([this.label,this.labels],true);
    this.labels.length = 0;
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
    if (event.button === 2) {
      this.removeListener();
      this.helper.active = false;
      MemoryManager.dispose(this.label,true);
      this.label = null;
      this.addCloseButton(this.hitPoint);
      return;
    }
    if (this.hitPoint) {
      this.helper.addPoint(this.hitPoint);
      this.label && (this.label.visible = !(this.helper.count === 0));
      this.createLabel2(this.hitPoint);
    }
  };

  onkeyup = event => {
    console.log('触发键盘操作');
    if (event.key === "Escape") {
      this.helper.deletePoint();
      this.updateLabel();
      this.label.visible = !(this.helper.count === 0);
      MemoryManager.dispose(this.labels.pop(),true);
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
      innerText: 0 + "m",
      className: "area-label",
    });
    container.appendChild(dom);

    this.label = createCSS2DObject(container);
    this.scene.add(this.label);
  }
  createLabel2(point) {

    const container = document.createElement("div");
    container.className = "measure-container";

    const length = this.helper.getTotalLength(2);
    const dom = createDom({
      innerText: length + "m",
      className: "area-label",
    });
    container.appendChild(dom);

    let label = createCSS2DObject(container);
    label.position.set(point.x,point.y + 10,point.z);
    this.labels.push(label);
    this.scene.add(label);
  }

  addCloseButton(point) {
    const dom = createDom({ innerText: "X",className: "measure-close" });
    const label = this.labels[this.labels.length - 1];
    label.element.appendChild(dom);

    dom.onclick = () => {
      this.end();
      this.start();
    };
  }

  updateLabel() {
    const element = this.label.element;

    if (element) {
      const length = this.helper.getTotalLength(2);
      element.children[0].innerText = length + "m";
      this.hitPoint && this.setLabelPosition(this.hitPoint);
    }
  }

  setLabelPosition(position,y = 10) {
    this.label.position.set(position.x,position.y + y,position.z);
  }
}
