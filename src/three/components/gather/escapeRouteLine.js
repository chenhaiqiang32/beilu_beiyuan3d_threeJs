import * as THREE from "three";
import { Store3D } from "../..";
import { getCurrentPosition } from "../Orientation/personCommon";
import { GatherPath } from "./gatherPath";

export class EscapeRoutePlate {

  /**
   * @param {Store3D} core
   */
  constructor(scene,core) {

    this.core = core;
    this.scene = scene;
    this.cherryArray = [];
    this.path = [];

    this.gatherMap = new Map();
    this.realTimeMap = new Map();

    this.trackGroup = new THREE.Group();
    this.trackGroup.name = "逃生路线";

    this.scene._add(this.trackGroup);

  }
  setCherryArray(data) { // 筛选
    this.cherryArray = data;
  }
  cherryPick() {
    // 筛选设备
    this.trackGroup.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.visible = this.cherryArray.includes('escapeRoute');
      }
    });
    if (this.cherryArray.includes('escapeRoute')) {
      // this.core.removeEventListener();
      this.core.core.postprocessing.setNoSelection(this.path);
      this.core.core.postprocessing.addOutline(this.path,1);
    } else {
      // this.core.addEventListener();
      this.core.core.postprocessing.clearOutline(this.path,1);
      this.core.core.postprocessing.clearNoSelection();
    }
  }
  init(dataBase) {
    dataBase.forEach(({ id,data,name }) => {
      const points = data.map(child => {
        let relPosition = getCurrentPosition({ sceneType: 1,originId: "",coordinate: child });
        return new THREE.Vector3(relPosition.x,relPosition.y + 0.1,relPosition.z);
      });
      const curve = new THREE.CatmullRomCurve3(points);
      let path = new GatherPath(points,{ seg: Math.floor(curve.getLength()) / 4 });
      path.material.depthTest = true;
      path.visible = this.cherryArray.includes('escapeRoute');
      this.trackGroup.add(path);
      this.path.push(path);
    });
  }
  dispose() {
    [...this.path].forEach(child => {
      child.deleteSelf();
    });
    this.path = [];
    console.log(this.path,this.trackGroup);
    this.core.core.postprocessing.clearOutline(this.path,1);
  }
  update(core) {
    this.path.forEach(child => {
      child && child.update(core.elapsedTime);
    });
  }
}
