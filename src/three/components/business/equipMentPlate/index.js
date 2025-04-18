import * as THREE from "three";
import { createCSS2DObject } from "@/lib/CSSObject";
import { getCameraVideo,getInspectionId } from "../../../../message/postMessage";
// 定位系统
export class EquipmentPlate {
  constructor() {
    // 切换场景不做改变的数据放在这里
    this.scene = null;
    this.core = null;
    this.main = null;
    this.camera = null;
    this.controls = null;
    this.searchCameraId = null; // 搜索相机id
    this.cameraEquipSprite = null;
    this.inspectionEquipSprite = null;
    this.beaconEquipSprite = null;
    this.inspectionSystemEquipSprite = null; // 巡检系统
    this.searchInspection = null; // 巡检信息
    // this.eventClear = [];
    this.searchCameraIdNeed = null;
    this.searchInspectionSystemNeed = null; // 巡检系统场景切换
    // this.cherryArray = ["insidePerson", "laborPerson", "externalPerson", "camera", "beacon"]; // 记录筛选状态
    this.cherryArray = [];
  }
  onLoad(core,main) {
    this.controls = core.controls;
    this.camera = core.camera;
    this.core = core;
    this.main = main; // 最外层的
    this.scene = core.scene;
    this.tweenControl = core.tweenControl;

    this.equipGroup = new THREE.Group();
    this.equipGroup.name = "equip";
    this.scene.add(this.equipGroup);
    this.equip = { camera: {},inspection: {},beacon: {},inspectionSystem: {} }; // 设备
    this.cameraEquipSprite = this.generateLabel("/equip/camera.png");
    this.inspectionEquipSprite = this.generateLabel("/equip/inspection.png");
    this.beaconEquipSprite = this.generateLabel("/equip/beacon.png",0.018);
    this.inspectionSystemEquipSprite = this.generateLabel("/equip/xunjianListOff.png",0.04);
    this.chooseEquip = {
      camera: this.cameraEquipSprite,
      inspection: this.inspectionEquipSprite,
      beacon: this.beaconEquipSprite,
      inspectionSystem: this.inspectionSystemEquipSprite
    };
    // this.addEventListener();
  }
  // addEventListener() {
  //     // 正常状态下事件绑定
  //     let click = this.main.raycast("click", this.equipGroup, intersects => {
  //         if (intersects.length) {
  //             let typeName = intersects[0].object.typeName;
  //             let id = intersects[0].object.name;
  //             this.searchEquip(id, typeName);
  //         }
  //     });

  //     this.eventClear.push(click.clear);
  // }
  has(id,type) {
    return this.equip[type][id];
  }

  get(id,type) {
    return this.equip[type][id];
  }

  del(id,type) {
    this.get(id,type).deleteSelf();
    delete this.equip[type][id];
  }
  searchEquip(id,type) {
    // 搜索相机 ，巡检系统
    if (!this.has(id,type)) return false;
    let position = this.has(id,type).position;
    this.core.tweenControl.lerpTo(position,50,1000,new THREE.Vector3(0,10,0));
    if (type === "camera") {
      getCameraVideo(id); // 通知前端打开相机
      this.searchCameraId = id;
    }
    if (type === "inspectionSystem") {
      let textureCommon = new THREE.TextureLoader().load('/equip/xunjianListOff.png');
      let textureClick = new THREE.TextureLoader().load('/equip/xunjianListOn.png');
      Object.entries(this.equip[type]).forEach(([key,value]) => {
        if (key == id) {
          value.children[0].material.map = textureClick;
          value.children[0].visible = true;
        } else {
          value.children[0].material.map = textureCommon;
        }
      });
      getInspectionId(id);
    }
    if (type !== "inspectionSystem") { this.boardVisibleSingle(id,true,type); }

  }
  hideInspectionSystemIcon(data) {
    const { visible,id } = data;
    if (this.has(id,'inspectionSystem')) {
      let textureCommon = new THREE.TextureLoader().load('/equip/xunjianListOff.png');
      this.get(id,'inspectionSystem').children[0].material.map = textureCommon;
      this.get(id,'inspectionSystem').children[0].visible = visible;
      this.core.core.resetCamera();
    }
  }
  setSearchInspection(data) {
    const { id,name,position } = data;
    this.searchInspection = { id,name,position };
  }
  boardVisibleSingle(id,visible,type) {
    // 显示单个牌子
    Object.entries(this.equip[type]).forEach(([key,value]) => {
      if (key == id) {
        value.children[0].visible = visible;
        value.children[1].visible = visible;
      } else {
        value.children[1].visible = !visible;
      }
    });
  }
  closeCameraDialog(id) {
    // 关闭摄像头的弹窗
    this.equip["camera"][id].children[1].visible = false;
    this.searchCameraId = null;
  }
  setCherryArray(data) {
    this.cherryArray = data;
  }
  cherryPick() {
    // 筛选设备
    Object.values(this.equip["camera"]).map(child => {
      if (this.cherryArray.includes("camera")) {
        child.children[0].visible = true;
      } else {
        child.children[0].visible = false;
        child.children[1].visible = false;
      }
    });
    Object.values(this.equip["beacon"]).map(child => {
      if (this.cherryArray.includes("beacon")) {
        child.children[0].visible = true;
      } else {
        child.children[0].visible = false;
        child.children[1].visible = false;
      }
    });
    Object.values(this.equip["inspectionSystem"]).map(child => {
      if (this.cherryArray.includes("inspectionSystem")) {
        child.children[0].visible = true;
      } else {
        child.children[0].visible = false;
        child.children[1].visible = false;
      }
    });
  }
  clearEquipType(arrayData) {
    arrayData.forEach(child => {
      this.dispose(child);
    });
  }
  dataProcess(arrayData,type) {
    // 搜索巡检可能执行这块
    return new Promise(resolve => {
      this.dispose(type); // 清除设备
      arrayData.map((child,index) => {
        const { position,id,name,originId,sceneType } = child;
        let equipObj = new THREE.Object3D();
        let label = this.chooseEquip[type].clone();
        if (type === "inspectionSystem") { // 巡检系统点击会切换材质，不能共用
          label = this.generateLabel("/equip/xunjianListOff.png");
        }
        label.typeName = type;
        label.name = id;
        let board = this.setPersonBoard({ name,id },false,this.boardClick());
        equipObj.add(label);
        equipObj.add(board);
        equipObj.position.set(position.x,position.y,position.z);
        this.equipGroup.add(equipObj);
        this.core.orientation.orientation3D.pointerArr.push(equipObj);
        this.equip[type][id] = equipObj;
        if (index === arrayData.length - 1) {
          this.cherryPick();
          resolve(child);
        }
      });
    });
  }
  setPersonBoard(child,visible = false,fun) {
    let labelEle = document.createElement("div");
    let labelTop = document.createElement("div");
    let labelBottom = document.createElement("div");
    let labelBottomDown = document.createElement("div");
    let labelEleOut = document.createElement("div");
    labelEleOut.append(labelEle);
    labelEleOut.append(labelTop);
    labelEleOut.append(labelBottom);
    labelEleOut.append(labelBottomDown);
    labelEleOut.draggable = false;
    labelTop.className = "beilu_three_Board_text_person_top";
    labelBottom.className = "beilu_three_Board_text_person_bottom";
    labelEleOut.className = "beilu_three_Board_text_person";
    labelBottomDown.className = "beilu_three_Board_text_person_bottom_down";
    labelEle.append(child.name);
    if (fun) {
      labelEle.onclick = () => {
        fun();
      };
    }
    let css2d = createCSS2DObject(labelEleOut,"board" + child.id);
    css2d.visible = visible;
    return css2d;
  }
  boardClick() { }
  generateLabel(picture,scale = 0.028) {
    const map = new THREE.TextureLoader().load(picture);
    const material = new THREE.SpriteMaterial({
      map: map,
      sizeAttenuation: false,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 4;
    sprite.scale.set(scale,scale,scale);
    sprite.center = new THREE.Vector2(0.5,0);
    return sprite;
  }
  hideCameraById(id) {
    // 没有筛选该相机的时候
    this.equip["camera"][id].children[0].visible = false;
    this.equip["camera"][id].children[1].visible = false;
  }
  dispose(type) {
    if (type === "camera") {
      this.searchCameraId = null;
    }
    const keys = Object.keys(this.equip[type]);

    for (let i = keys.length - 1; i >= 0; i--) {
      this.equip[type][keys[i]].deleteSelf();
    }
    this.equip[type] = {};
  }
  // removeEventListener() {
  //     this.eventClear.forEach(clear => clear());
  //     this.eventClear = [];
  // }
  disposeAll() {
    Object.values(this.equip["camera"]).forEach(child => {
      child.deleteSelf();
    });
    this.equip["camera"] = {};
    Object.values(this.equip["inspection"]).forEach(child => {
      child.deleteSelf();
    });
    this.equip["inspection"] = {};
    Object.values(this.equip["beacon"]).forEach(child => {
      child.deleteSelf();
    });
    this.equip["beacon"] = {};
    Object.values(this.equip["inspectionSystem"]).forEach(child => {
      child.deleteSelf();
    });
    this.equip["inspectionSystem"] = {};
    // this.removeEventListener();
  }
}
const t = new EquipmentPlate();

export default t;
