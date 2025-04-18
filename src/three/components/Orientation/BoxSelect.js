import * as THREE from "three";
import Core from "../../../main";

import inside from "point-in-polygon-hao"; // 检测点在多边形内

import { createCSS2DObject,createDom } from "../../../lib/CSSObject";
import { DrawLineHelper } from "../../../lib/drawLineHelper";
import EquipmentPlate from "../business/equipMentPlate/index";
import { Orientation } from "./Orientation";
import { Updatable } from "./Updatable";

const mousedown = new THREE.Vector2();
const mouseup = new THREE.Vector2();

export class BoxSelect extends Updatable {
  /**
   * @param {Orientation} orientation
   */
  constructor(orientation) {

    super();

    /**@type {Core} */
    this.core = null;
    this.scene = null;
    this.subsystem = null;

    this.order = 2;

    /**射线拾取对象 */
    this.raycastObject = null;

    // 射线检测拾取的坐标
    this.hitPoint = null;

    this.orientation = orientation;
    this.orientation.addUpdatable(this);
  }
  onLoad(subsystem) {
    this.core = subsystem.core;
    this.scene = subsystem.scene;
    this.subsystem = subsystem;

    this.helper = new DrawLineHelper(this.scene);

    // 设置需要吸附到起点坐标
    this.helper.needToAdhereToFirstPoint = true;

    // 设置在多少距离内会被吸附
    this.helper.closestDistanceToAdhere = 10;

    // 设置校验线段是否相交,相交时会在控制台打印
    this.helper.needCheckLinesCross = true;
  }

  /**
   * 设置射线检测的对象
   * @param {THREE.Object3D} object 射线检测对象
   */
  setRaycastObject(object) {
    this.raycastObject = object;
  }

  start() {
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
        this.createLabel();
        this.setLabelPosition(this.helper.getCenter());
        this.core.enableControlsRotate(true);
        // this.core.resetCameraUp();
        let points = [];
        this.helper.points.forEach(child => {
          points.push([child.x,child.z]);
        });
        this.polygon = [points];
        this.selectInsideObj(); // 判断人相机建筑是否在多边形内
        this.orientation.updateModules();
      }
    }
  };
  hasObj = obj => {
    // 判断点在多边形内
    let state = inside(obj,this.polygon);
    return state;
  };
  selectInsideObj = () => {

    let selectObj = { person: [],camera: [],buildings: [] };
    let allCamera = EquipmentPlate.equip.camera; // 所有相机
    let allPerson = [];
    this.orientation.getCurrentSceneData().forEach(child => { // 隐藏的不计算
      if (child.object3d.visible) {
        allPerson.push(child);
      }
    });

    let allBuilding = this.subsystem.buildingNameLabelMap; // 所有建筑

    Object.entries(allCamera).forEach(([key,value]) => {
      let newArray = [value.position.x,value.position.z];
      if (this.hasObj(newArray)) {
        if (!selectObj.camera.includes(key)) {
          selectObj.camera.push(key);
        }
      }
    });

    allPerson.forEach((value) => {
      let newArray = [value.position.x,value.position.z];
      if (this.hasObj(newArray)) {
        if (!selectObj.person.includes(value.id)) {
          selectObj.person.push(value.id);
          this.orientation.clusterModule.pullFromCluster(value);
        }
      }
    });

    Object.entries(allBuilding).forEach(([key,value]) => {
      let newArray = [value.position.x,value.position.z];
      if (this.hasObj(newArray)) {
        if (!selectObj.buildings.includes(key)) {
          selectObj.buildings.push(key);
        }
      }
    });

    window.parent.postMessage(
      {
        cmd: "selectBack",
        param: selectObj,
      },
      "*",
    );
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
    } else {
      this.hitPoint = null;
    }
  };

  createLabel() {
    const dom = createDom({
      innerText: "精确监控",
      className: "beiLuBoxSelect",
    });
    this.label = createCSS2DObject(dom);
    // this.scene.add(this.label);
  }

  updateLabel() {
    if (this.label.element) {
      this.setLabelPosition(this.hitPoint);
    }
  }

  setLabelPosition(position,y = 10) {
    this.label.position.set(position.x,position.y + y,position.z);
  }

  update(orientation) {
    if (this.helper.isClosed) {
      this.selectInsideObj();
    }
  }

}
