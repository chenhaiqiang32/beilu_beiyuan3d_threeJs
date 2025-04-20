import * as THREE from "three";
import { Orientation } from "./Orientation";
import { Updatable } from "./Updatable";

let _cluster_k = 3;

const SLICE_LEVEL = {
  S: 80,
  M: 160,
  L: 240,
  XL: 320,
  XXL: 400,
};


/**
 * @template {{originId:string,coordinate:{x:number,y:number,z:number},sceneType:0|1,name:string,type:string,id:string,buildingId:string,position:THREE.Vector3,object3d:THREE.Object3D,clusterId:string}} T2
 */
export class Cluster extends Updatable {

  #isActive = false;

  get isActive() {
    return this.#isActive;
  }

  /**
   * @param {Orientation} orientation
   */
  constructor(orientation) {

    super();

    this.order = 1;

    /** @type {keyof SLICE_LEVEL} 单块划分区域的宽度级别 */
    this.level = "X";

    /** 散开单块区域所有数据的最近距离 */
    this.nearestDistance = 100;

    this.orientation = orientation;
    this.orientation.addUpdatable(this);

    this.core = orientation.core;

    /**@type {Map<string,T2[]>} */
    this.clusterMap = new Map();

    /**@type {T2[]} 未聚合的所有人员 */
    this.singleData = [];
    this.core.controls.addEventListener('change',data => {
      this.onCameraChange(this.core.camera);
      this.update(this.orientation);
      this.orientation.orientation3D.update(this.orientation);
    });

  }

  setActive(boolean) {
    this.#isActive = boolean;
    this.orientation.updateModules();
  }

  setLevel(number) {
    _cluster_k = number;
    this.orientation.updateModules();
  }
  /**
   * @param {Orientation} orientation
   */
  update(orientation) {

    this.clear();

    // 获取当前 SceneType
    const { sceneType,originId } = this.core.getCurrentOriginId();

    /** @type {T2[]} 当前场景数据 */
    const data = orientation.getCurrentSceneData(sceneType,originId);


    if (this.#isActive) {
      // 开启聚合功能，计算聚合

      /** @type { T2[] } 需要计算聚合的人员 */
      let needToCompute = [];

      // 根据 isSingle 标识判断人员是否需要参与聚合计算
      data.forEach(item => {
        if (!item.isSingle) {
          needToCompute.push(item);
        } else {
          this.singleData.push(item);
        }
      });

      this.#compute(needToCompute);

    } else {

      this.singleData = data;

    }

    this.onCameraChange(this.core.camera);
  }

  /**
   * 相机改变，更新聚合数据,更新三维展示
   * @param {THREE.PerspectiveCamera} camera
   */
  onCameraChange(camera) {

    const position = camera.position;
    const positionY = position.y;

    // 根据相机 Y 轴确定划分最小块的宽度级别
    let level;
    if (positionY < 30) {
      level = "S";
    } else if (positionY < 60) {
      level = "M";
    } else if (positionY < 120) {
      level = "L";
    } else if (positionY < 240) {
      level = "XL";
    } else {
      level = "XXL";
    }

    //
    this.level = level;

    const clusterMap = this.clusterMap;

    clusterMap.forEach(cluster => {
      // 如果聚合的坐标与相机的坐标小于最小距离，解散当前聚合为离散数据
      if (position.distanceTo(cluster.position) < this.nearestDistance) {
        this.disperseClusterOnEvent(cluster);
      }
    });

  }

  /**
   * 散开某个聚合
   * @param {T2[]} cluster
   */
  disperseClusterOnEvent(cluster) {
    this.singleData.push(...cluster);
    cluster.length = 0;
    cluster.position.set(0,0,0);
  }

  /**
   * @param {T2[]} data
   */
  #compute(data) {

    // 将所有人员数据推送入正确的聚合组内
    data.forEach(this.pushToCluster);

    // 计算每个聚合的中心位置。
    this.clusterMap.forEach(cluster => {

      const position = new THREE.Vector3();
      cluster.position = position;
      cluster.forEach(item => position.add(item.position));
      position.divideScalar(cluster.length);

    });

  }

  /** 清除聚合信息 */
  clear() {
    this.clusterMap.forEach(cluster => {
      cluster.forEach(item => item.clusterId = undefined);
    });
    this.clusterMap.clear();

    this.singleData = [];
  }

  /**
   * @param {THREE.Vector3} pos
   * @param {number} Length
   */
  #computeClusterIdx(pos,Length) {
    const ax = getIdx(pos.x);
    const az = getIdx(pos.z);

    function getIdx(s) {
      let idx = parseInt(s / Length);

      let delta = s % Length;

      if (delta < 0) delta = -1;
      if (delta > 0) delta = 1;

      idx += delta;
      return idx;
    }

    return `${ax}_${az}`;
  }

  /**
   * @param {T2} item 将数据从聚合数据拉出
   */
  pullFromCluster = (item) => {
    item.isSingle = true;

    const clusterIdx = item.clusterId;

    if (!this.clusterMap.has(clusterIdx)) return;

    const cluster = this.clusterMap.get(clusterIdx);

    for (let i = 0; i < cluster.length; i++) {
      if (cluster[i].id === item.id) {
        cluster.splice(i,1);
        break;
      }
    }

    this.singleData.push(item);

    return item;
  };

  /**
   * @param {T2} item 将数据推进聚合数据
   */
  pushToCluster = (item) => {

    item.isSingle = false;

    // 计算聚合组索引
    const clusterIdx = this.#computeClusterIdx(item.position,SLICE_LEVEL[this.level] / Math.sqrt(_cluster_k));

    // 将人员推送入正确的聚合组
    let cluster = [];
    if (this.clusterMap.has(clusterIdx)) {
      cluster = this.clusterMap.get(clusterIdx);
    } else {
      this.clusterMap.set(clusterIdx,cluster);
    }
    cluster.push(item);

    // 在每条数据上记录聚合组索引
    item.clusterId = clusterIdx;

    for (let i = 0; i < this.singleData.length; i++) {
      if (this.singleData[i] === item) {
        this.singleData.splice(i,1);
        break;
      }
    }

    item.object3d.traverse(child => {
      if (child.element) child.element.style.display = "none";
    });

    return item;
  };
}

