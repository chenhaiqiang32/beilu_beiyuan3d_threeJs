import * as THREE from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module";
import { CustomSystem } from "../customSystem";
import { loadGLTF } from "@/three/loader";
import { getBoxCenter } from "../../../lib/box3Fun";
import { lightIndexUpdate,lightIndexReset } from "../../../shader/funs";

import { closeDialog,getPerson } from "../../../message/postMessage";
import EquipmentPlate from "../../components/business/equipMentPlate";
import { SunnyTexture } from "../../components/weather";
import { SpecialGround } from "../../../lib/blMeshes";
import { dynamicFade,fadeByTime } from "../../../shader";
import { PTMap } from "../../../assets/models";

let rightMouseupTime = 0;

const $center = new THREE.Vector3();
const CAMERA_SPHERE = new THREE.Sphere($center,1800);
const CONTROLS_SPHERE = new THREE.Sphere($center,900);

/**@type {OrbitControls} */
const controlsParameters = {
  maxPolarAngle: Math.PI / 2.05,
};

/**@classdesc 定位子系统，包含场景，子系统特有的功能，用于主系统和子系统的切换（包含主场景和子场景切换） */
export class IndoorSubsystem extends CustomSystem {
  constructor(core) {
    super(core);
    this.gatherOrSilentData = {};
    this.gatherOrSilentLabel = null; // 预警牌子

    // 为子系统的子场景添加独一无二的灯光，背景图
    this.scene.background = SunnyTexture;
    this.onRenderQueue = core.onRenderQueue;
    this.controls = core.controls;

    this.camera = core.camera;
    this.tweenControl = core.tweenControl;
    this.orientation = core.orientation;

    this.buildingObject = {}; // 储存每一层楼的group
    this.currentFloor = null; // 当前楼层
    this.eventClear = [];

    // 建筑
    this.building = null;
    this.buildingName = null;


    this.endChangeFloor = true; // 楼层切换结束

    // 保存用于射线检测的楼层引用，定位
    this.floors = [];

    this.initLight();

  }

  onEnter(buildingName) {

    this.currentPoint = null; // 当前所指向的模型
    EquipmentPlate.onLoad(this,this.core); // 设备系统
    let obj = {
      name: buildingName,
      path: `./models/main/indoor/${buildingName}.glb`,
      type: ".glb",
    };
    this.buildingName = buildingName;

    return loadGLTF([obj],this.onProgress.bind(this),this.onLoaded.bind(this));
  }

  limitCameraInSphere = () => {

    this.camera.position.clampSphere(CAMERA_SPHERE);
    this.controls.target.clampSphere(CONTROLS_SPHERE);

    this.camera.position.y = this.camera.position.y < CAMERA_SPHERE.center.y ? CAMERA_SPHERE.center.y : this.camera.position.y;
    this.controls.target.y = this.controls.target.y < CAMERA_SPHERE.center.y ? CAMERA_SPHERE.center.y : this.controls.target.y;

  };

  createGround(center,min) {
    const ground = new SpecialGround(center,min);

    this.scene.add(ground);
  }

  /**
   * 室内根据建筑包围盒大小确定相机视野限制范围
   * @param {THREE.Object3D} object
   */
  handleControls(param) {
    CAMERA_SPHERE.center.set(param.center.x,param.min.y,param.center.z);
    CAMERA_SPHERE.radius = param.radius * 10;
    CONTROLS_SPHERE.center.set(param.center.x,param.min.y,param.center.z);
    CONTROLS_SPHERE.radius = param.radius * 5;

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


  onChangeSystemCustom(state,floorName,buildingName) {
    // 室外切换进入室内楼层，同个楼栋不同楼层切换，室内切换不同楼栋楼层
    if (state === "outToIn") {
      let a = this.onEnter(buildingName).then(() => {
        // 需要等待楼层记载完毕，事件注册完毕，然后切换楼层
        this.changeFloor(floorName);
      });
    }
    if (state === "inToInSingle") {
      // 同个楼栋进入不同楼层
      this.changeFloor(floorName);
    }
    if (state === "inToInOther") {
      // 室内切换进入不同楼栋的不同楼层
      this.dispose();
      this.onEnter(buildingName).then(() => {
        // 需要等待楼层记载完毕，事件注册完毕，然后切换楼层
        this.changeFloor(floorName);
      });
    }
  }
  onProgress(gltf,name) {

    const building = gltf.scene;
    building.children[0].children.forEach(group => {

      const obj = { group,uTime: { value: 1.0 } };

      group.traverse(child => {
        if (child.isMesh) {
          this.modelProcessing(child,obj);
          child.userData.parent = group.name;
        }
      });

      // 定位楼层
      if (group.name.indexOf("BDW") === -1) {
        this.floors.push(group);
      }
      this.buildingObject[group.name] = obj;
    });
    building.name = name;
    this.building = building;
    this.scene.add(building);

  }
  modelProcessing(child,obj) {

    child.castShadow = true;
    child.receiveShadow = true;

    // 自身为透明的模型，一般为栏杆等
    if (child.material.transparent) {
      child.renderOrder = 3;
      child.material.depthWrite = true;
    }

    // 子场景整个模型都需要做透明处理
    child.material = child.material.clone(); // 解决模型材质公用问题
    child.material.transparent = true;
    child.material.metalness = 0.2;
    child.material.roughness = 0.8;

    // 点击建筑某一楼层时，该楼层部分需要透明的部分比如围墙，屋顶等需要做消失特效的需要进行该处理步骤
    // 此处筛选条件需要根据不同项目进行修改,具体命名和建模协商
    if (!child.name.includes("BDW") && child.material.name.includes("建筑外壳")) {
      dynamicFade(child.material,obj.uTime,new THREE.Color("#3acacc"));

      child.renderOrder = 2;
    } else {
      fadeByTime(child.material,obj.uTime);
    }
  }

  onLoaded() {

    const param = getBoxCenter(this.building);
    this.createGround(param.center,param.min);

    this.cameraMove(this.building).then(() => {
      this.handleControls(param);
    });
    this.addEventListener();
  }

  onLeave() {
    console.log("离开子场景");
    this.resetControls();
    this.dispose();
  }
  addEventListener() {
    this.addRayDbClick();
    this.addRayMove();
    this.addRightDbClickQuit();
  }
  addRayDbClick() {
    let event = this.core.raycast("dblclick",this.floors,intersects => {
      // 双击某一楼层
      if (intersects.length) {
        let target = intersects[0].object.userData.parent;
        this.changeFloor(target);
      }
    });
    this.eventClear.push(event.clear);
    return event.clear;
  }
  disposeGatherOrSilent() { // 清除室内预警数据
    let toDelete = [];
    for (let key in this.gatherOrSilentData) {
      toDelete.push(key);
    }
    // 删除属性
    toDelete.forEach(key => {
      delete this.gatherOrSilentData[key];
    });
    this.gatherOrSilentData = {}; // 清除本地数据
    this.disPoseGatherShader();
  }
  changeFloor(floor) {
    // 首次进行楼层切换
    if (!this.endChangeFloor) return false; // 切换楼层没有结束
    this.resetData();
    if (!this.currentFloor) {
      this.endChangeFloor = false;
      this.removeEventListener();
      this.addPointerLister(); // 绑定人物和设备的变手
      this.addIndoorEvent();
      !this.core.isFollowing() ? this.addRightDbClickReset() : null; // 跟踪状态不绑定右键双击事件,事件绑定在动画结束之后
      this.switchFloorAnimate(floor).then(res => {

        getPerson(res); // 通知前端切换场景，前端推送设备数据
        super.updateOrientation(); // 更新聚合数据
        this.core.crossSearch.changeSceneSearch();
        this.endChangeFloor = true;
        this.gatherOrSilentShader();
      }); // 切换楼层动画
      this.buildingAnimate(floor); // 建筑动画
    }
    // 同一楼层切换
    if (this.currentFloor.name === floor) return;

    // 不同楼层之间切换 前端触发 该情况下不重新绑定事件
    this.floorSwitchInner(floor);
  }
  gatherOrSilentShader() {
    this.disPoseGatherShader();
    if (this.gatherOrSilentData[this.currentFloor.name]) {
      const { id,type,areaType,areaDataOut,areaDataBuilding,areaName } = this.gatherOrSilentData[this.currentFloor.name];
      this.gatherOrSilentLabel = this.core.ground.gatherOrSilentPlate.gatherModel(this.currentFloor,type,areaName);
      this.scene.add(this.gatherOrSilentLabel);
    }
  }
  disPoseGatherShader() {
    if (this.gatherOrSilentLabel) {
      this.core.ground.gatherOrSilentPlate.clearGeometryGather(this.currentFloor);
      this.gatherOrSilentLabel.deleteSelf();
      this.gatherOrSilentLabel = null;
    }
  }
  addIndoorEvent() {
    let cancel = this.core.addClickCustom(this.indoorClickEvent.bind(this));
    this.eventClear.push(cancel);
  }
  indoorClickEvent(ray) {
    let personInserts = ray.intersectObject(this.orientation.orientation3D.singleGroup);
    const personInsertsVisible = personInserts.filter(intersect => intersect.object.visible);
    if (personInsertsVisible.length) {
      this.core.clearSearch(); // 清除现有搜索条件
      const object = personInsertsVisible[0].object;
      this.orientation.setSearchId(object.name);
      this.orientation.search();
      this.orientation.personSearchModule.setPosition();
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
      return;
    }
  }
  addPointerLister() {
    let mousemovePointer = this.core.raycast("mousemove",this.orientation.orientation3D.pointerArr,intersects => {
      if (intersects.length) {
        document.body.style.cursor = "pointer";
      } else {
        document.body.style.cursor = "auto";
      }
    });
    this.eventClear.push(mousemovePointer.clear);
  }
  addRayMove() {
    let event = this.core.raycast("mousemove",this.floors,intersects => {
      if (intersects.length) {
        let target = intersects[0].object.userData.parent;
        if (this.currentPoint === target) return; // move事件过滤
        this.currentPoint = target;
        document.body.style.cursor = "pointer";
        this.core.postprocessing.clearOutlineAll(1);
        this.core.postprocessing.addOutline(this.buildingObject[target].group,1);
      } else {
        if (!this.currentPoint) return;
        this.resetEffect();
      }
    });

    this.eventClear.push(event.clear);
    return event.clear;
  }
  // 右键双击重置建筑事件
  addRightDbClickReset() {
    const del = this.rightDblClickListener(() => {
      this.removeEventListener();
      this.cameraMove(this.building);
      this.addEventListener();
      this.resetBuilding(); // 重置楼层时清除楼层所有人员 onComplete
      this.disPoseGatherShader();
      if (this.core.isSearching()) {
        // 搜索状态 清空楼层人员
        closeDialog();
      }
    });
    this.eventClear.push(del);
  }
  setFloorGatherOrSilent(param) { // 设置本地数据
    this.gatherOrSilentData[param.areaDataFloor] = param;
  }
  // 右键双击重置退出子场景事件
  addRightDbClickQuit() {
    const del = this.rightDblClickListener(() => {
      this.core.changeSystem("ground");
    });
    this.eventClear.push(del);
  }
  rightDblClickListener(fn) {
    const rightDblClick = this.core.addEventListener("mouseup");
    const del = rightDblClick.add(e => {
      if (e.button !== 2) return;
      let timeStamp = new Date().getTime();
      if (timeStamp - rightMouseupTime < 250) {
        fn(e);
        timeStamp = 0;
      }
      rightMouseupTime = timeStamp;
    });
    return del;
  }
  switchFloorAnimate(target) {
    const group = this.buildingObject[target].group;

    const { min,max } = getBoxCenter(group);
    return new Promise((res,rej) => {
      lightIndexUpdate(max.y,min.y); // 楼层外墙渐变动画

      this.currentFloor = group; // 当前楼层
      this.cameraMove(group,1.75).then(() => {
        res({ sceneType: 0,originId: target });
      });
    });
  }
  // 楼层内部之间切换
  floorSwitchInner(target) {
    this.endChangeFloor = false;
    // 不同楼层之间切换 前端触发 该情况下不重新绑定事件
    const group = this.buildingObject[target].group;
    const { min,max } = getBoxCenter(group);
    // 扫光动画
    lightIndexReset();
    lightIndexUpdate(max.y,min.y);

    // 重置上一楼层动画
    let lastFloor = this.currentFloor.name;
    this.buildingObject[lastFloor].uTime.value = 0.2;
    // 开始当前楼层动画
    this.buildingObject[target].group.visible = true;
    this.buildingObject[target].uTime.value = 1;
    new TWEEN.Tween(this.buildingObject[lastFloor].uTime)
      .to({ value: 0.0 },1000)
      .start()
      .onComplete(() => {
        this.buildingObject[lastFloor].group.visible = false;
      });
    // 镜头动画
    this.currentFloor = group; // 当前楼层
    this.cameraMove(group,1.75).then(() => {
      getPerson({ sceneType: 0,originId: target });
      super.updateOrientation(); // 更新聚合数据
      this.core.crossSearch.changeSceneSearch();
      this.endChangeFloor = true;
    });
  }
  cameraMove(group) {
    return new Promise((res,rej) => {

      let position,target;
      const pt = PTMap[group.name];
      if (pt) {
        position = pt.position;
        target = pt.target;
      } else {

        const { center,radius } = getBoxCenter(group);
        target = center;
        position = new THREE.Vector3();
        const _distance = this.camera.position.distanceTo(center);
        const alpha = (_distance - Math.sqrt(radius) * 12) / _distance;
        position.lerpVectors(this.camera.position,center,alpha);

      }

      this.tweenControl.changeTo({
        start: this.camera.position,
        end: position,
        duration: 1000,
        onComplete: () => {
          this.controls.enable = true;
          res();
        },
        onStart: () => {
          this.controls.enable = false;
        }
      });

      this.tweenControl.changeTo({
        start: this.controls.target,
        end: target,
        duration: 1000,
        onUpdate: () => {
          this.controls.update();
        },
      });
    });
  }
  resetEffect() {
    this.currentPoint = null;
    document.body.style.cursor = "auto";
    this.core.postprocessing.clearOutlineAll(1);
  }
  buildingAnimate(target) {
    return new Promise((res,rej) => {
      Reflect.ownKeys(this.buildingObject).forEach(key => {
        if (key === target) {
          // 指向当前选定楼层
        } else {
          // 其他楼层消失
          const t = new TWEEN.Tween(this.buildingObject[key].uTime)
            .to({ value: 0.0 },1000)
            .start()
            .onComplete(() => {
              this.buildingObject[key].group.visible = false;
              res();
            });
        }
      });
    });
  }
  resetBuilding() {
    lightIndexUpdate(); // 楼层外墙恢复
    //其余楼层恢复
    Reflect.ownKeys(this.buildingObject).forEach(key => {
      this.buildingObject[key].group.visible = true;
      const t = new TWEEN.Tween(this.buildingObject[key].uTime)
        .to({ value: 1 },1000)
        .start()
        .onComplete(() => {
          this.currentFloor = null; // 清除楼层
          this.resetData();
        });
    });
  }
  resetData() {
    // 清除数据
    this.orientation.orientation3D.disposeClusterGroup();
    EquipmentPlate.disposeAll();
  }

  removeEventListener() {
    this.eventClear.forEach(clear => clear());
    this.eventClear = [];
    this.resetEffect();
  }

  dispose() {
    // todo BDW 楼层清空
    this.currentFloor = null;
    this.buildingObject = {};
    this.removeEventListener();
    this.resetData();
    this.scene.dispose();
    lightIndexUpdate();
  }
  // 限制镜头移动
  cameraMoveLimit(center,size) {
    // 创建一个空的Box3包围盒
    const box = new THREE.Box3().setFromCenterAndSize(center,size);

    const position = this.camera.position;
    const target = this.controls.target;
    const p_old = position.clone();
    const t_old = target.clone();

    this.controls.addEventListener("change",e => {
      if (box.containsPoint(position)) {
        t_old.copy(target);
        p_old.copy(position);
      } else {
        target.copy(t_old);
        position.copy(p_old);
      }
    });
  }

  /**
   * 根据建筑包围盒生成自适应光源
   * @param {THREE.Object3D} object3d
   */
  initLight() {

    const ambientLight = new THREE.AmbientLight(0xffffff,1.5); // 线性SRG
    const directionalLight = new THREE.DirectionalLight(0xffffff,1.4);
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.shadow.camera.right = 1000;
    directionalLight.shadow.camera.left = -1000;
    directionalLight.shadow.camera.top = 600;
    directionalLight.shadow.camera.bottom = -600;
    directionalLight.shadow.mapSize.width = Math.pow(2,11);
    directionalLight.shadow.mapSize.height = Math.pow(2,11);
    directionalLight.shadow.blurSamples = 8;

    directionalLight.shadow.radius = 1.15;
    directionalLight.shadow.bias = -0.0015;

    directionalLight.position.set(-100,300,-300);
    directionalLight.castShadow = true;

    this.ambientLight = ambientLight;
    this._add(this.ambientLight);
    const ch = new THREE.CameraHelper(directionalLight.shadow.camera);
    const hp = new THREE.DirectionalLightHelper(directionalLight);
    this.directionLight = directionalLight;
    this._add(this.directionLight);

    const dir2 = new THREE.DirectionalLight(0xcccccc,0.3);
    dir2.position.set(-150,150,0);
    // this._add(dir2);

    const dir3 = new THREE.DirectionalLight(0xffffff,0.4);
    dir3.position.set(150,100,0);

    this._add(dir3);
  }
}
