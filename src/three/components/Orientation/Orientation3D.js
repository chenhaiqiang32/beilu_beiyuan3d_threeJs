import * as THREE from "three";
import { Orientation } from "./Orientation";
import { createSprite } from "./utils";
import { closeDialog,postGatherList } from "../../../message/postMessage";
import MemoryManager from "../../../lib/memoryManager";
import { Updatable } from "./Updatable";
import { ClusterCard } from "./utils";
import { PersonAlarm } from "./PersonAlarm";
import { createCSS2DObject,createDom } from "../../../lib/CSSObject";
import EquipmentPlate from './../business/equipMentPlate/index';

const spriteScale = new THREE.Vector3(0.03,0.03,0.03);

const SpriteMap = {
  externalPerson: createSprite("/person/externalPerson.png",spriteScale),
  insidePerson: createSprite("/person/insidePerson.png",spriteScale),
  laborPerson: createSprite("/person/laborPerson.png",spriteScale),
};

/**
 * @template {{originId:string,coordinate:{x:number,y:number,z:number},sceneType:0|1,name:string,type:string,id:string,buildingId:string,position:THREE.Vector3,object3d:THREE.Object3D}} T2
 */
export class Orientation3D extends Updatable {

  /**
   * @param {Orientation} orientation
   */
  constructor(orientation) {
    super();

    this.order = 10;

    this.orientation = orientation;
    this.core = orientation.core;
    this.camera = orientation.core.camera;
    this.controls = orientation.core.controls;

    // 存储所有人员信息标签,车辆标签
    this.orientationLabels = new THREE.Group();
    this.orientationLabels.name = "PersonLabel";

    this.labelSprite = null; // 人员sprite
    this.warningPerson = null;

    this.personGroup = {
      [Orientation.SCENE_TYPE.INDOOR]: {},
      [Orientation.SCENE_TYPE.OUTDOOR]: new THREE.Group()
    };

    // 聚合
    this.clusterModule = orientation.clusterModule;
    this.clusterGroup = new THREE.Group();
    this.clusterGroup.name = "clusterGroup";
    this.singleGroup = new THREE.Group();
    this.singleGroup.name = "singleGroup";
    this.pointerArr = [];

    // 报警
    this.personAlarm = new PersonAlarm(SpriteMap.insidePerson);

    this.orientation.addUpdatable(this);
    this.personDangerData = null;

    this.hiddenAllPerson = false;

  }

  /**
   * @param {T2} item
   */
  add(item) {

    const obj = this.personGroup[item.sceneType];

    if (item.sceneType === Orientation.SCENE_TYPE.INDOOR) {

      const buildingId = item.originId.slice(0,-3);

      if (!obj[buildingId]) obj[buildingId] = {};

      if (!obj[buildingId][item.originId]) obj[buildingId][item.originId] = new THREE.Group();

      obj[buildingId][item.originId].add(item.object3d);

    } else {

      obj.add(item.object3d);

    }
  }

  /**
   * 根据人员数据创建 3D 对象，包含精灵图，人物背景
   * @param {T2} data
   */
  create(data,sceneChanged) {
    const object = new THREE.Object3D();
    object.name = data.id;
    const sprit = SpriteMap[data.typeName].clone();
    sprit.center.set(0.5,0);
    sprit.name = data.id;
    sprit.renderOrder = 10;
    object.add(sprit);
    const nameDom = createDom({ innerText: data.name,className: `person-sprite-${data.typeName}` });
    const container = createDom({ className: "person-sprite-container",children: [nameDom] },"click");
    const css2d = createCSS2DObject(container);
    css2d.classTypeName = `person-sprite-${data.typeName}`;
    css2d.position.y = 0;
    css2d.center.set(0.5,0.2);
    object.add(css2d);

    if (data.id === this.orientation.followId) {

      if (sceneChanged) {
        object.position.copy(data.position);
      } else {
        object.position.copy(this.orientation.followModule.from);
      }

      this.orientation.followModule.to.copy(data.position);
      css2d.position.y = 1.8;

    } else {

      object.position.copy(data.position);

    }

    return object;
  }

  /**
   * @param {T2} data
   */
  delete(data) {

    const oldData = this.orientation.get(data.id);

    MemoryManager.dispose(oldData.object3d,true);

  }

  /**
   * @param {T2} data
   */
  updateData(data) {

    if (this.orientation.followId !== data.id) return data.object3d.position.copy(data.position);

    if (data.object3d.position.equals(data.position)) return;

    this.orientation.followModule.createPath(data);

  }

  /**
   * 数据更新时，执行方法
   * @param {Orientation} orientation
   */
  update(orientation) {

    // this.hiddenAllPerson === false;

    // 数据刷新时，更新聚合显示图标。
    const clusterMap = orientation.clusterModule.clusterMap;
    const singleData = orientation.clusterModule.singleData; // 非聚合组

    const _children = [...this.clusterGroup.children];
    _children.forEach(child => MemoryManager.dispose(child,true));

    [...this.singleGroup.children].forEach(child => {
      child.removeFromParent();
    });
    this.pointerArr.length = 0;
    singleData.map(child => {
      this.singleGroup.add(child.object3d);
    });

    clusterMap.forEach((cluster,index) => {
      if (cluster.length === 1) {
        this.singleGroup.add(cluster[0].object3d);
      }
      if (cluster.length > 1) { // 聚合
        const clusterLabel = new ClusterCard({ name: cluster.length,id: index,cluster },this.gatherClick);
        clusterLabel.position.copy(cluster.position);
        this.clusterGroup.add(clusterLabel);
        this.pointerArr.push(clusterLabel);
      }
    });

    // ----------------------显示人员dom
    this.singleGroup.traverse(child => {
      if (child.isPass) return;
      child.visible = true;
      if (child.element) child.element.style.display = "block";
    });


    if (this.orientation.searchId) {
      let searchScene = this.orientation.get(this.orientation.searchId);
      const { originId,sceneType } = searchScene;
      const { sceneType: currentType,originId: currentOrigin } = this.core.getCurrentOriginId();
      if ((sceneType !== currentType) || (sceneType === 0 && (originId !== currentOrigin))) { // 搜索的人离开当前场景了
        if (this.orientation.followId) { // 有跟踪的人
          return this.orientation.search();
        } else {
          this.orientation.clearSearch();
          closeDialog(); // 通知前端关闭弹窗
        }
      } else { // 人在当前场景
        this.orientation.search();
      }

    }
    this.setPointerArr();

    this.orientation.followModule.update();

    if (this.hiddenAllPerson === true) {
      this.setAllPersonVisible(false);
    }

    this.core.scene.add(this.singleGroup);
    this.core.scene.add(this.clusterGroup);
    //-----------------------------------------------------------------------

  }

  gatherClick = (data) => {
    if (this.core.ground.boxSelectStatus !== true) {
      postGatherList(data.map(child => {
        return child.id;
      }));
    }
    this.clusterModule.disperseClusterOnEvent(data);
    this.update(this.orientation);
  };

  setPointerArr() { // 变小手的数组
    this.singleGroup && this.singleGroup.children.forEach(child => {
      this.pointerArr.push(child);
    });
    EquipmentPlate.equipGroup && EquipmentPlate.equipGroup.children.forEach(child => {
      this.pointerArr.push(child);
    });
    if (this.core.sceneType === 1) { // 室外
      this.core.ground.pointerArr.forEach(child => {
        this.pointerArr.push(child);
      });
    }
  }

  setAllPersonVisible(value) {
    this.singleGroup.traverse(child => {
      child.visible = value;
    });
    this.clusterGroup.traverse(child => {
      child.visible = value;
    });

  }

  disposeClusterGroup = () => {

    MemoryManager.dispose(this.clusterGroup.children);
    [...this.singleGroup.children].forEach(child => {
      child.removeFromParent();
      child.traverse(childT => {
        if (childT.element && childT.element.parentNode) {
          childT.element.parentNode.removeChild(childT.element);
        }
      });
    });

  };

  disposeAlarm() {
    MemoryManager.dispose(this.personAlarm.object3d);
  }

  onCameraChange() {
    this.clusterModule.onCameraChange();
  }

  /**
   * 根据场景编号，楼层编号获取当前场景 Group
   * @param {0|1} sceneType 场景类型，0室内，1室外
   * @param {originId} buildingId 楼层编号
   * @returns {THREE.Group}
   */
  getCurrentPersonGroup(sceneType,originId = "") {

    if (sceneType === Orientation.SCENE_TYPE.OUTDOOR) {

      return this.personGroup[sceneType];

    } else {

      const buildingId = originId.slice(0,-3);

      const building = this.personGroup[sceneType][buildingId];

      if (!building) return null;

      return building[originId] || null;

    }

  }

  /** 搜索人员 */
  openDialog(id) {


  }

  setDialogVisible(state) {

  }

  closeDialog() {


  }

  setAlarmPerson(data) { // 设置报警人员
    this.personDangerData = data;
  }
  searchAlarmPerson() { // 查找报警人员
    this.personAlarm.setAlarm(this.personDangerData);
    this.core.scene._add(this.personAlarm.object3d);
    this.core.tweenControl.lerpTo(this.personAlarm.person.position,50,1000,new THREE.Vector3(0,10,0));
  }

  /** 清除报警人员 */
  clearAlarmPerson() {
    this.personAlarm.clearAlarm();
    this.personDangerData = null;
  }

}
