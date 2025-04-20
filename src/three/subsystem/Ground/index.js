import * as THREE from "three";
import { CustomSystem } from "../customSystem";
import { loadGLTF } from "../../loader";
import { main_models } from "../../../assets/models";
import { buildingMap } from "../../../assets/buildingMap";
import { EscapeRoutePlate } from './../../components/gather/escapeRouteLine';

import { Store3D } from "../..";
import { dblclickBuilding,getBuildingDetail,getPerson,postBuildingId } from "../../../message/postMessage";
import { Weather } from "../../components/weather";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { createInstanceMesh } from "../../../lib/InstanceMesh";
import { getBoxCenter } from "../../../lib/box3Fun";
import { createBuildingInfoLabel,createBuildingNameLabel } from "./boardTitle";
import { merge } from "./../../../lib/merge";

import EquipmentPlate from "../../components/business/equipMentPlate";
import { MeasureDistance } from "../../components/measureDistance";

import { MeasureArea } from "../../components/measureArea";
import { FencePlate } from "../../components/business/fencePlate/fence";
import HistoryTrack from "../../components/historyTrack";
import { autoRotate,processingCameraAnimation } from "../../processing/modelProcess";
import { modelProcess } from "../../processing";
import { GLTFLoader } from "../../../lib/GLTFLoader";
import { GatherOrSilentFence } from "../../components/business/fencePlate/gatherOrSilentFence";
import { MeetingPointPlate } from "../../components/business/equipMentPlate/meetingPoint";



export const ground = Symbol();
const fenceSymbol = Symbol();

const center = new THREE.Vector3();
const CAMERA_SPHERE = new THREE.Sphere(center,2880);
const CONTROLS_SPHERE = new THREE.Sphere(center,2880);

/**@type {OrbitControls} */
const controlsParameters = {
  maxPolarAngle: Math.PI / 2,
};

/**@classdesc 地面广场子系统 */
export class Ground extends CustomSystem {
  /** @param {Store3D} core*/
  constructor(core) {
    super(core);

    this.tweenControl = core.tweenControl;
    this.onRenderQueue = core.onRenderQueue;
    this.controls = core.controls;
    this.baseCamera = core.baseCamera;
    this.camera = core.camera;
    this.orientation = core.orientation;

    this.boxSelect = core.orientation.boxSelect;

    this.postprocessing = core.postprocessing;

    this.outBuildingGroup = new THREE.Group();
    this.outBuildingGroup.name = "outBuildingGroup";
    this._add(this.outBuildingGroup);
    this.buildingMeshArr = [];
    this.buildingMeshObj = {};

    this.bloomLights = [];


    /** 标识牌对象，显示各建筑名称 */
    this.buildingNameLabelMap = {};

    /** 标识牌对象，显示各建筑内人员数量 */
    this.buildingNum = {}; // 建筑上的数字
    this.singleBuildingGroup = {}; // 独栋建筑模型
    this.labelGroup = new THREE.Group();
    this.labelGroup.name = "labelGroupHome";
    this._add(this.labelGroup);


    this.groundMesh = null; // 地面简模 用于高度检测
    this.fencePlate = null; // 围栏系统
    this.gatherOrSilentPlate = null; // 静默/预警 系统
    this.eventClear = [];
    this.pointerArr = [];
    this.isLoaded = false;
    this.searchBuildingId = null;


    this.roamEnabled = false; // 是否可以漫游
    this.roamDuration = 10; // 时间间隔
    this.filterBuildingArr = ["buildingBoard"];
    this.boxSelectStatus = false; // 框选状态

    this.instancedMesh = [];

    this.altitude = -20;

    this.init();
  }

  init() {
    // this.initAxesHelper();

    this.initLight();

    this.fencePlate = new FencePlate(this.scene,this);
    this.escapeRoute = new EscapeRoutePlate(this.scene,this);
    this.gatherOrSilentPlate = new GatherOrSilentFence(this.scene,this);
    this.meetingPoint = new MeetingPointPlate(this.scene,this);

    this.weather = new Weather(this);

    this.measureDistance = new MeasureDistance(this);
    this.measureArea = new MeasureArea(this);

    this.initHistoryTrack();

    this.core.onRenderQueue.set(ground,this.update.bind(this));
    this.core.onRenderQueue.set('gatherOrSilentFence',this.gatherOrSilentPlate.update.bind(this.gatherOrSilentPlate));
    this.core.onRenderQueue.set('escapeRoute',this.escapeRoute.update.bind(this.escapeRoute));

  }

  limitCameraInSphere = () => {

    if (this.controls.enableRotate) {

      this.camera.position.clampSphere(CAMERA_SPHERE);
      this.controls.target.clampSphere(CONTROLS_SPHERE);

      this.camera.position.y = this.camera.position.y < this.altitude ? this.altitude : this.camera.position.y;
      this.controls.target.y = this.controls.target.y < this.altitude ? this.altitude : this.controls.target.y;
    } else {

      // const radius = CAMERA_SPHERE.radius;

      // this.camera.position.y = this.camera.position.y >= radius ? radius : this.camera.position.y;
      // this.camera.position.y = this.camera.position.y <= -radius ? -radius : this.camera.position.y;

    }

  };

  handleControls() {
    this.controls.addEventListener("change",this.limitCameraInSphere);
    Reflect.ownKeys(controlsParameters).forEach(key => {
      this.controls.data[key] = this.controls[key];
      this.controls[key] = controlsParameters[key];
    });
  }

  resetControls() {
    this.controls.removeEventListener("change",this.limitCameraInSphere);
    Reflect.ownKeys(controlsParameters).forEach(key => {
      this.controls[key] = this.controls.data[key];
    });
  }

  setCameraState(state) {
    if (!this.useCameraState) return;

    const { begin,updateCameraState,stop } = this.useCameraState();

    /**更新相机漫游 */
    updateCameraState(this.roamDuration);

    /**开启或结束相机漫游 */
    if (state && this.core.currentSystem === this) {
      begin();
    } else {
      stop();
    }

  }


  addEventListener() {

    if (this.eventClear.length > 0) return; // eventClear队列大于0说明已经绑定过事件s

    // 正常状态下事件绑定

    let dblclick = this.core.raycast("dblclick",this.buildingMeshArr,intersects => {
      console.log(this.core.camera);
      console.log(this.core.controls);
      if (intersects.length) {
        if (!this.boxSelectStatus) {
          dblclickBuilding(intersects[0].object.name); // 通知前端我们即将进入室内，前端借此关闭一些弹窗
          this.core.changeSystem("indoorSubsystem",intersects[0].object.name);
        }

      }
    });
    this.core.raycast("click",this.groundMesh,intersects => {
      if (intersects.length) {
        console.log(intersects[0].point,'位置坐标');
      }
    });
    this.addGroundEvent();
    let rightCancel = this.core.rightDblClickListener(() => {
      this.resetCamera();
    });
    this.eventClear.push(dblclick.clear);
    this.eventClear.push(rightCancel);


    Object.values(this.buildingNum).forEach(child => {

      child.element.onclick = () => this.buildingNumClick(child.name);

    });


    const cameraLerpTo = this.core.raycast("dblclick",this.groundMesh,(intersects) => {

      if (intersects.length && !this.boxSelectStatus) {

        this.tweenControl.lerpTo(intersects[0].point,50,1000,new THREE.Vector3(0,10,0));
      }
    });
    this.eventClear.push(cameraLerpTo.clear);



  }
  groundClickEvent(ray) {
    let personInserts = ray.intersectObject(this.orientation.orientation3D.singleGroup);
    // 过滤掉visible属性为false的物体
    const personInsertsVisible = personInserts.filter(intersect => intersect.object.visible);
    if (personInsertsVisible.length) {
      this.core.clearSearch(); // 清除现有搜索条件
      const object = personInsertsVisible[0].object;
      this.orientation.setSearchId(object.name);
      this.orientation.search();
      this.orientation.personSearchModule.setPosition();
      this.removeEventListener();
      this.addGroundEvent();
      return;
    }
    let equipInserts = ray.intersectObject(EquipmentPlate.equipGroup);
    const equipInsertsVisible = equipInserts.filter(intersect => intersect.object.visible);
    if (equipInsertsVisible.length) {
      console.log(equipInsertsVisible[0],"点击设备牌子");
      this.core.clearSearch(); // 清除现有搜索条件
      let typeName = equipInsertsVisible[0].object.typeName;
      let id = equipInsertsVisible[0].object.name;
      EquipmentPlate.searchEquip(id,typeName);
      this.removeEventListener();
      this.addGroundEvent();
      return;
    }
    let buildingInserts = ray.intersectObjects(this.buildingMeshArr);
    if (buildingInserts.length) {
      this.core.clearSearch(); // 清除现有搜索条件
      this.searchBuildingId = buildingInserts[0].object.name;
      this.searchBuilding();
      this.removeEventListener();
      this.addEventListener(); // 搜索楼栋的时候可以正常进入建筑内部
    }
  }
  // 搜索人 建筑 设备情况下绑定的事件
  // 地面广场左键单击事件,触发后清除所有事件,重新绑定搜索事件
  addGroundEvent() {
    let cancel = this.core.addClickCustom(this.groundClickEvent.bind(this));
    let mousemove = this.core.raycast("mousemove",this.buildingMeshArr,intersects => {

      // 过滤
      if ((this.core.elapsedTime * 10) & 1) return;

      if (intersects.length) {
        this.postprocessing.clearOutlineAll(1);
        const pickBuilding = this.buildingMeshObj[this.searchBuildingId];
        const intersectBuilding = this.buildingMeshObj[intersects[0].object.name];
        this.postprocessing.addOutline([intersectBuilding,pickBuilding],1);
      } else {
        this.postprocessing.clearOutlineAll(1);
        if (this.searchBuildingId) {
          let pickBuilding = this.buildingMeshObj[this.searchBuildingId];
          this.postprocessing.addOutline(pickBuilding,1);
        }
      }
    });
    let mousemovePointer = this.core.raycast("mousemove",this.orientation.orientation3D.pointerArr,intersects => {

      if (intersects.length) {
        document.body.style.cursor = "pointer";
      } else {
        document.body.style.cursor = "auto";
      }
    });
    this.eventClear.push(cancel);
    this.eventClear.push(mousemovePointer.clear);
    this.eventClear.push(mousemove.clear);
  }

  onEnter() {
    // 北元版本 切换子场景时会重置composer饱和度亮度为白天的配置 切回主场景时需要重新更新原有设置
    this.weather && this.weather.resetComposer(this.weather.lightingPattern);

    this.handleControls();
    EquipmentPlate.onLoad(this,this.core); // 设备系统
    this.boxSelect.onLoad(this);
    this.filterBuildingNum(); // 每次进入都要调用一下筛选
    if (this.isLoaded) {
      return new Promise((res,rej) => {
        this.onLoaded();
        res();
      });
    } else {
      //模型首次加载
      this.isLoaded = true;
      loadGLTF(main_models,this.onProgress.bind(this),this.onLoaded.bind(this));

    }
  }

  initDangerFence(data) {
    this.fencePlate.initDangerFence(data);
  }
  hideBuildingLabel(id = this.searchBuildingId) {
    let closeId = id || this.searchBuildingId;
    if (!closeId) {
      return false;
    }
    // 隐藏楼栋牌子
    this.buildingNameLabelMap[closeId].visible = false;
    this.buildingNameLabelMap[closeId].element.style.display = "none";
    this.searchBuildingId = null;
    this.postprocessing.clearOutlineAll(1);
  }
  hideAllBuildingLabel() {
    Object.values(this.buildingNameLabelMap).map(child => {
      child.visible = false;
      child.element.style.display = "none";
    });
    Object.values(this.buildingNum).forEach(child => {
      child.traverse(res => {
        res.visible = false;
        child.element.style.display = "none";
      });
    });
    this.searchBuildingId = null;
  }
  clearDangerFence() {
    this.fencePlate.clearDangerFence();
  }
  clearBuildingFence() {
    this.fencePlate.clearBuildingFence();
  }
  changeWeather(param) {
    this.weather.setWeather(param.type,param.level);
  }
  updateLightingPattern(param) {
    this.weather.updateLightingPattern(param);
  }

  /**历史轨迹指令 */
  historyTrackCommand(param) {
    if (param.cmd === "trackInit") {

      this.orientation.orientation3D.hiddenAllPerson = true;
      this.orientation.updateModules();

      this.removeEventListener();
      this.postprocessing.clearOutlineAll();
    }
    if (param.cmd === "trackClear") {
      this.removeEventListener();

      if (!this.historyTrack.path) {
        this.addEventListener();
      }

      this.orientation.orientation3D.hiddenAllPerson = false;
      this.orientation.updateModules();
    }
    this.historyTrack.command(param);
  }
  /**开启测量功能,所有功能依赖当前系统 */
  startMeasuring() {
    this.removeEventListener();
    this.measureDistance.start();
  }
  /**移除测量功能,所有功能依赖当前系统 */
  removeMeasuring() {
    this.measureDistance.end();
    this.addEventListener();
    this.resetCamera();

  }
  /**开启测面积功能,所有功能依赖当前系统 */
  startMeasureArea() {

    this.removeEventListener();
    this.measureArea.start();
  }
  /**移除测面积功能,所有功能依赖当前系统 */
  removeMeasureArea() {
    this.measureArea.end();
    this.addEventListener();
    this.resetCamera();

  }
  changeBoxSelect(state) {
    this.boxSelectStatus = state;
    if (state) {
      this.removeEventListener();
      this.boxSelect.start();
    } else {
      this.boxSelect.end();
      this.addEventListener();
      this.resetCamera();
    }
  }

  searchBuilding(visible = true) {
    if (visible) {
      // 未建模的建筑不用通知显示前端牌子
      // 通知前端显示建筑弹窗
      getBuildingDetail(this.searchBuildingId);
    }
    let currentBoard = this.buildingNameLabelMap[this.searchBuildingId];
    this.showSingleBuildingBoard(this.searchBuildingId); // 显示单个建筑牌子
    this.boardClick(currentBoard); // 视角拉近建筑

    this.postprocessing.clearOutlineAll(1);
    let pickBuilding = this.buildingMeshObj[this.searchBuildingId];
    this.postprocessing.addOutline(pickBuilding,1);
  }
  createFence(data) {
    this.fencePlate.create(data);
  }
  clearFence() {
    // 清空围栏
    this.fencePlate.dispose();
  }
  initHistoryTrack() {
    this.historyTrack = new HistoryTrack(this,this.scene);
    this.core.onRenderQueue.set("historyTrackUpdate",scope =>
      this.historyTrack.update(scope.elapsedTime,scope.delta),
    );
  }

  /**
   * @param {import("three/examples/jsm/loaders/GLTFLoader").GLTF} gltf
   * @param {import { buildingMap } from './../../../assets/buildingMap';
string} name
   * @returns
   */
  onProgress(gltf,name) {
    if (this.core.scene !== this.scene) return;

    const model = gltf.scene;

    if (name === "内地形") {


      const { min } = getBoxCenter(model);

      this.altitude = min.y;


      model.traverse((child) => {
        modelProcess(child,name,this);
      });
      const group = merge(model);


      group.traverse(child => {
        child.receiveShadow = true;
      });
      this._add(group);

    } else if (name === "杂项") {
      // todo 北元项目特殊处理,其他项目可以删除

      const noMerge = [];
      model.traverse((child) => {
        modelProcess(child,name,this);

        if (child.name === "车流线" || child.name === "球场灯带") {
          noMerge.push(child);
        }
      });

      const noMergeGroup = new THREE.Group();
      noMerge.forEach((m) => {
        noMergeGroup.add(m);
      });
      this._add(noMergeGroup);

      const group = merge(model);
      group.traverse(child => {
        child.receiveShadow = true;
      });
      this._add(group);

    } else if (name === "功能灰模") {

      const group = merge(model);
      this.groundMesh = group;

    } else if (name === "外地形") {
      model.traverse(child => {
        child.receiveShadow = true;
        modelProcess(child,name,this);
      });
      this._add(model);
    } else if (name === "其他模型") {
      model.traverse((child) => {
        modelProcess(child,name,this);
      });

      const group = merge(model);
      group.traverse(child => {
        child.castShadow = true;

      });
      this._add(group);

    } else if (name === "人员统计建筑") {

      const _children = [...model.children];
      _children.forEach(group => {
        let mList = {};
        group.traverse(child => {

          modelProcess(child,name,this);

          // 建筑材质克隆，用于独立每一栋建筑的材质
          // this.materialClone(child,mList);

        });

        const mergeGroup = merge(group);
        mergeGroup.name = group.name;

        mergeGroup.traverse(child => {
          child.castShadow = true;
          child.name = group.name;
        });

        this.outBuildingGroup.add(mergeGroup);
        this.singleBuildingGroup[group.name] = mergeGroup;
        this.setBuildingBoard(mergeGroup);
      });


    } else if (name === "定位外壳") {

      const _children = [...model.children];


      let mList = {};
      _children.forEach(group => {

        group.traverse(child => {

          child.name = group.name;

          modelProcess(child,name,this);

          // 建筑材质克隆，用于独立每一栋建筑的材质
          // this.materialClone(child,mList);
        });

        const mergeGroup = merge(group);
        mergeGroup.name = group.name;


        mergeGroup.traverse(child => {
          child.castShadow = true;
          child.name = group.name;

        });

        this.setBuildingBoard(mergeGroup);
        this.outBuildingGroup.add(mergeGroup);
        this.buildingMeshArr.push(mergeGroup);
        this.buildingMeshObj[group.name] = mergeGroup;
        this.pointerArr.push(mergeGroup); // 鼠标变小手的分组

      });
    } else if (name === "定位原点") {
      model.traverse(child => {
        if (child instanceof THREE.Mesh) {
          let key = child.name.replace("_DW","");
          child.updateWorldMatrix(true,true);
          this.core.dwObj[key] = child;
        }
      });
    } else if (name === "树") {

      // 树的加载以及实例化加载挪至 onLoaded之后
      function setTreeAttribute(ins) {
        if (!ins.isMesh) return;
        ins.castShadow = true;
        ins.material.transparent = true;
        ins.material.side = THREE.DoubleSide;
        ins.material.alphaTest = 0.4;
        // ins.material.forceSinglePass = true;
        ins.material.roughness = 0.8;

      }

      this.instancedMesh.push(this.loadInstancedModel(model.children,setTreeAttribute,[0.95,1.05]));

    } else if (name === "实例化对象") {
      function setAttribute(ins) {
        if (!ins.isMesh) return;
        ins.castShadow = true;
        ins.receiveShadow = true;
      }
      this.instancedMesh.push(this.loadInstancedModel(model.children,setAttribute));

    } else if (name.includes("camera")) {
      processingCameraAnimation(this,gltf);
    } else if (name === "虚化建筑") {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material.transparent = true;
          child.material.opacity = 0.64;
          child.renderOrder = 999;
        }
      });

      const group = merge(model);
      group.traverse(child => {
        child.castShadow = true;
        child.receiveShadow = true;
      });
      this._add(group);
    }

  }

  // 建筑材质克隆，用于独立每一栋建筑的材质
  materialClone(child,mList) {
    if (child.isMesh) {
      const name = child.material.name;
      if (!mList[name]) {
        const m = child.material.clone();
        mList[name] = m;
        child.material = m;

      } else {
        child.material = mList[name];
      }

      child.material.originTransparent = child.material.transparent;
    }
  }
  setBuildingBoard(group) {

    // 用于计算旋转中心的建筑
    const { center,max } = getBoxCenter(group);
    const currentPosition = new THREE.Vector3(center.x,max.y,center.z);
    const name = group.name;

    // 根据建筑编号，找到对应的建筑名称，创建建筑标识牌
    const buildingName = buildingMap[name];
    const nameLabel = createBuildingNameLabel(buildingName,this.boardClick);
    nameLabel.visible = false;
    nameLabel.position.copy(currentPosition);
    this.labelGroup.add(nameLabel);
    this.buildingNameLabelMap[name] = nameLabel;

    // 创建建筑信息标识牌，标识牌显示建筑内人员数量信息,人员信息为0时，隐藏该标识牌
    const infoLabel = createBuildingInfoLabel(0,false);
    infoLabel.position.copy(currentPosition);
    infoLabel.scale.set(0.2,0.2,0.2);
    infoLabel.name = name;
    this.labelGroup.add(infoLabel);
    this.buildingNum[name] = infoLabel;

  }
  setFilterBuilding(filterArray) { // 设置筛选
    this.filterBuildingArr.length = 0;
    this.filterBuildingArr = filterArray;
  }
  filterBuildingNum() {
    const visible = this.filterBuildingArr.includes("buildingBoard");
    Object.values(this.buildingNum).forEach(child => {
      child.traverse(res => {
        res.visible = visible;
        res.visible = parseInt(res.element.innerText) > 0 ? visible : false;
      });
    });

  }

  cameraMoveToBuildingTitle(id) {
    // 相机移动到建筑牌子
    let titlePosition = this.buildingNameLabelMap[id].position;
    this.tweenControl.changeTo({
      start: this.camera.position,
      end: titlePosition,
      duration: 1000,
      onStart: () => {
        this.controls.enabled = false;
      },
      onComplete: () => {
        this.controls.enabled = true;
      },
      onUpdate: () => {
        this.controls.target.copy(center);
      },
    });
  }
  boardClick = (board) => {
    const offset = new THREE.Vector3(0,50,0);
    this.tweenControl.lerpTo(board.position,100,1000,offset);
  };

  buildingNumClick(id) {
    postBuildingId(id);
  }

  changeBuildingNumber(array) {
    // 修改建筑数字
    array.map(child => {
      const { id,number } = child;
      if (!buildingMap[id] || !this.buildingNum[id]) return false;
      this.buildingNum[id].element.innerText = String(number);

      this.buildingNum[id].visible = number > 0 && this.filterBuildingArr.includes("buildingBoard");

    });
  }
  showSingleBuildingBoard(id) {
    // 显示单个建筑牌子
    Object.entries(this.buildingNameLabelMap).map(([key,value]) => {
      if (key === id) {
        value.visible = true;
      } else {
        value.visible = false;
      }
    });
  }

  onLeave() {
    this.weather.resetComposer();
    this.hideAllBuildingLabel();
    this.resetControls();
    this.setCameraState(false);
    this.core.onRenderQueue.delete(fenceSymbol);
    this.measureArea.end();
    this.measureDistance.end();
    this.boxSelect.end();
    this.removeEventListener();
    document.body.style.cursor = "auto";
    console.log("离开地面广场系统");
  }
  onLoaded() {

    if (!this.useCameraState) {
      autoRotate(this);
    }

    if (this.roamEnabled) {
      this.setCameraState(true);
    }

    if (this.instancedMesh.length > 0) {
      this.instancedMesh.forEach((mesh) => {
        this._add(mesh);
      });

    }

    console.log("模型加载完成");
    this.addEventListener();
    // ground场景正常流程镜头动画


    this.resetCamera(1500).then(() => {
      getPerson({ // 通知前端切换了场景，前端推送设备数据
        sceneType: 1,
        originId: "",
      });
      this.core.crossSearch.changeSceneSearch();
      super.updateOrientation();
    }); // 镜头动画结束后执行事件绑定

    this.core.onRenderQueue.set(fenceSymbol,this.fencePlate.update.bind(this.fencePlate));

    // 在模型加载完成设置测距和测面积模块的射线检测对象。
    this.measureArea.setRaycastObject(this.groundMesh);
    this.boxSelect.setRaycastObject(this.groundMesh);
    this.measureDistance.setRaycastObject(this.groundMesh);
  }
  removeEventListener() {

    Object.values(this.buildingNum).forEach(child => {

      child.element.onclick = null;

    });
    this.eventClear.forEach(clear => clear());
    this.eventClear = [];
  }
  update(core) { }

  /**
   * @param {THREE.Object3D} model
   * @param {()=>void} setAttribute 设置属性
   */
  loadInstancedModel(model,setAttribute,scale) {
    const group = new THREE.Group();

    const instanceMap = {};
    const instancePositionMap = {};
    const instanceRotationMap = {};

    const v = new THREE.Vector3();

    function setInstanceArray(child) {
      child.getWorldPosition(v);

      const key = child.name.split("_")[0];
      instancePositionMap[key] = instancePositionMap[key] || [];
      instancePositionMap[key].push(v.clone());

      // child.getWorldDirection(v);
      instanceRotationMap[key] = instanceRotationMap[key] || [];
      instanceRotationMap[key].push(child.rotation);
    }

    model.forEach(group => {
      if (group.name.includes("zuobiao")) {
        group.traverse(child => {
          setInstanceArray(child);
        });
      }
      if (group.name.includes("shili")) {
        group.children.forEach(ins => {
          instanceMap[ins.name] = ins;
          if (ins.name.includes("shu")) {
            ins.traverse(child => {
              if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshLambertMaterial({ map: child.material.map });
                modelProcess(child,"树",this);
              }
            });
          }
        });
      }
    });

    Object.keys(instanceMap).forEach(key => {
      const instance = instanceMap[key];

      let ins;

      if (key.indexOf("shu") !== -1) {
        ins = createInstanceMesh(instance,instancePositionMap[key],true,scale);
      } else {
        ins = createInstanceMesh(instance,instancePositionMap[key],instanceRotationMap[key],scale);
      }

      group.add(ins);
      if (ins instanceof THREE.Group) {
        ins.traverse(setAttribute);
      } else {
        setAttribute(ins);
      }
    });
    return group;
  }
  resetCamera(duration = 1000) {
    const cameraPosition = Store3D.Default.position;
    const controlsTarget = Store3D.Default.target;
    return new Promise((resolve,reject) => {

      if (cameraPosition.distanceTo(this.camera.position) < 5 && controlsTarget.distanceTo(this.controls.target) < 5) resolve();

      this.tweenControl.changeTo({
        start: this.camera.position,
        end: cameraPosition,
        duration,
        onComplete: () => {
          this.controls.enabled = true;
          resolve();
        },
        onStart: () => {
          this.controls.enabled = false;
        },
      });

      this.tweenControl.changeTo({
        start: this.controls.target,
        end: controlsTarget,
        duration,
        onUpdate: () => {
          this.camera.lookAt(this.controls.target);
        },
      });

    });
  }
  initLight() {
    const ambientLight = new THREE.AmbientLight(0xffffff,1.25); // 线性SRG
    const directionalLight = new THREE.DirectionalLight(0xffffff,1.55);
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 3500;
    directionalLight.shadow.camera.right = 2500;
    directionalLight.shadow.camera.left = -2500;
    directionalLight.shadow.camera.top = 1600;
    directionalLight.shadow.camera.bottom = -1600;
    directionalLight.shadow.mapSize.width = Math.pow(2,11);
    directionalLight.shadow.mapSize.height = Math.pow(2,11);
    directionalLight.shadow.blurSamples = 8;

    directionalLight.shadow.radius = 1.15;
    directionalLight.shadow.bias = -0.0015;
    // directionalLight.shadow.radius = 1.1;
    // directionalLight.shadow.bias = 0.01;

    directionalLight.position.set(-800,1300,1000);
    directionalLight.castShadow = true;

    this.ambientLight = ambientLight;
    this._add(this.ambientLight);
    const ch = new THREE.CameraHelper(directionalLight.shadow.camera);
    const hp = new THREE.DirectionalLightHelper(directionalLight);
    this.directionalLight = directionalLight;
    this._add(this.directionalLight);

    const dir2 = new THREE.DirectionalLight(0xcccccc,0.3);
    dir2.position.set(-150,150,0);
    // this._add(dir2);

    const dir3 = new THREE.DirectionalLight(0xffffff,0.4);
    dir3.position.set(150,100,0);

    // this._add(dir3);
  }
}
