import * as THREE from "three";
import { Store3D } from "../..";
import { HeatCircle } from "../../../lib/blMeshes";
import { createCSS2DObject } from "../../../lib/CSSObject";
import { gatherClick } from "../../../message/postMessage";
import MemoryManager from '../../../lib/memoryManager';

export class GatherWarning {

  /**
   * @param {Store3D} core
   */
  constructor(core) {

    this.core = core;

    this.circles = []; // 所有圆圈
    this.eventClear = [];
    this.gatherMap = new Map();
    this.realTimeMap = new Map();
    this.memoryManager = new MemoryManager();
  }

  addEvents() {
    let clickEvent = this.core.raycast("click",this.circles,intersects => {
      if (intersects.length) {
        console.log(intersects[0].point,'位置坐标');
        this.showLabel(intersects[0].object.typeId);
      } else {
        this.showLabel(null);
      }
    });
    this.eventClear.push(clickEvent.clear);


    let moveEvent = this.core.raycast("mousemove",this.circles,intersects => {
      if (intersects.length) {
        document.body.style.cursor = 'pointer';
      } else {
        document.body.style.cursor = 'block';
      }
    });
    this.eventClear.push(moveEvent.clear);
  }
  showLabel(id) {
    this.realTimeMap.forEach((res,index) => {
      res.board.visible = index === id;
    });
  }
  removeEventListener() {
    this.eventClear.forEach(clear => {
      clear();
    });
    this.eventClear = [];
  }

  gatherDanger(obj) {

    const sceneChangeType = obj.sceneChangeType;
    obj.isDanger = true;
    if (sceneChangeType === "noChange") {
      this.gatherDangerFun(obj);
    } else {

      // 切换场景
      this.core.changeSystemCustom(sceneChangeType,obj.originId,obj.sceneType);

      this.core.crossSearch.setCrossGatherWarning(obj);

    }
  }

  async realTimeGather(data) {
    // 实时聚集
    this.removeEventListener();
    this.circles = []; // 所有的
    if (!data || data.length === 0) { // 需要清空
      this.disposeRealTimeGather();
    }
    let doObj = { add: [],update: [],remove: [] };
    let objById = new Map(); // 按照id存入一分数据

    data.forEach(child => {
      child.isDanger = false;
      objById.set(child.id,child);
      if (this.realTimeMap.get(child.id)) { // 更新位置
        doObj.update.push(child);
      }
      if (!this.realTimeMap.get(child.id)) { // 新增
        doObj.add.push(child);
      }
    });
    this.realTimeMap.forEach((child,key) => {
      if (!objById.get(key)) { // 删除
        doObj.remove.push(key);
      }
    });
    doObj.add.forEach(({ position,radius,level,users,id,name },index) => { // 新增
      this.gatherDangerFun({ position,radius,level,users,id,isDanger: false,name },"add");
    });
    doObj.update.forEach(({ position,radius,level,users,id,name },indexUpdate) => { // 更新位置
      this.gatherDangerFun({ position,radius,level,users,id,isDanger: false,name },"update");
    });
    doObj.remove.forEach(ids => {
      this.deleteRealTimeById(ids);
    });
    this.addEvents();
  }
  deleteRealTimeById(ids) {
    let objs = this.realTimeMap.get(ids).obj;
    for (let i = objs.length - 1; i >= 0; i--) {
      MemoryManager.dispose(objs[i]);
    }
    MemoryManager.dispose(this.realTimeMap.get(ids).board);
    MemoryManager.dispose(this.realTimeMap.get(ids).object3d);
    this.realTimeMap.delete(ids);
  }
  getCenterPosition(a) {
    // 初始化总和和计数
    let sumX = 0,sumY = 0,sumZ = 0,count = a.length;

    // 遍历数组 a
    a.forEach(item => {
      sumX += item.x;
      sumY += item.y;
      sumZ += item.z;
    });

    // 计算平均值
    let avgX = sumX / count;
    let avgY = sumY / count;
    let avgZ = sumZ / count;

    // 生成新的对象 b
    return new THREE.Vector3(avgX,avgY,avgZ);
  }

  gatherDangerFun({ position,radius,level,users,id,isDanger = false,name },type) {
    let board = null;
    let obj = null;
    if (type === "add") {
      obj = new THREE.Object3D();
      board = this.setPersonBoard(
        { name: `${users.split(",").length}人`,id,areaName: `${name}` },
        true,
        level,
        users,
        isDanger,
        id,
      );
      board.center.set(0.5,1);
      obj.add(board);
      obj.position.set(0,0,0);
      this.core.scene.add(obj);
      if (!isDanger) {
        board.visible = false;
      }
    }
    if (type === "update") {
      board = this.realTimeMap.get(id).board;
      obj = this.realTimeMap.get(id).object3d;
      let objs = this.realTimeMap.get(id).obj;
      for (let i = objs.length - 1; i >= 0; i--) {
        MemoryManager.dispose(this.realTimeMap.get(id).obj[i]);
      }
      this.realTimeMap.get(id).obj = null;
    }
    board.position.copy(this.getCenterPosition(position));
    let currentCircles = [];
    position.forEach(resPosition => {
      if (!radius) radius = 500;
      let realRadius = radius / 100;

      let circle = new HeatCircle(new THREE.Vector3(),realRadius,level);
      obj.add(circle);
      currentCircles.push(circle);
      circle.typeId = id;
      this.circles.push(circle);

      circle.position.copy(resPosition);
    });
    if (isDanger) {
      this.disposeGather();
      this.gatherMap.set(id,{ obj: currentCircles,board,object3d: obj });
      // Store3D.tweenManager.lookAtPosition(position,Store3D.camera,Store3D.controls); // 镜头切换到对应的物体
    } else {
      if (type === 'add') this.realTimeMap.set(id,{ obj: currentCircles,board,object3d: obj });
      if (type === 'update') {
        this.realTimeMap.get(id).obj = currentCircles;
        this.realTimeMap.get(id).object3d = obj;
      }
    }
  }

  setPersonBoard(child,visible = false,level,users,isDanger,id) {
    let typeToColor = { 3: '#FFDE33',2: '#FF9441',1: "#FF4747" };
    let color = { 3: "yellow",2: "orange",1: "red" };
    let labelEle = document.createElement("div");
    labelEle.style = "margin-bottom:12px";
    let wordEle = document.createElement('span');
    wordEle.style.color = typeToColor[level];
    wordEle.innerText = child.name;
    let wordEle2 = document.createElement('span');
    wordEle2.style.color = typeToColor[level];
    wordEle2.innerText = child.areaName;
    let labelBottom = document.createElement("div");
    let labelBottomDown = document.createElement("div");
    let labelEleOut = document.createElement("div");
    let labelEleSpan = document.createElement('div');
    labelEleSpan.className = "beilu_three_Board_text_gather_span";
    labelEleSpan.style.background = `${typeToColor[level]}`;

    let labelEleSpan2 = document.createElement('div');
    labelEleSpan2.className = "beilu_three_Board_text_gather_span";
    labelEleSpan2.style.background = `${typeToColor[level]}`;
    labelEleOut.append(labelEle);
    labelEleOut.append(labelBottom);
    labelEleOut.append(labelBottomDown);
    labelEleOut.draggable = false;
    labelEleOut.className = `beilu_three_Board_text_gather`;
    labelEleOut.style.border = `1px solid ${typeToColor[level]}`;
    labelBottomDown.className = `beilu_three_Board_text_gather_down_${color[level]}`;
    labelEle.innerText = `聚集人数：`;
    labelEle.append(wordEle);
    labelEle.append(labelEleSpan);
    labelBottom.innerText = '报警位置：';
    labelBottom.append(labelEleSpan2);
    labelBottom.append(wordEle2);

    labelEle.onclick = () => {
      gatherClick({ users,isDanger,alarmId: id });
    };

    let css2d = createCSS2DObject(labelEleOut,"board" + child.id);
    css2d.visible = visible;
    return css2d;
  }

  disposeGather() {
    this.gatherMap.forEach(value => {
      let objs = value.obj;
      for (let i = objs.length - 1; i >= 0; i--) {
        MemoryManager.dispose(objs[i]);
      }
      MemoryManager.dispose(value.board);
      MemoryManager.dispose(value.object3d);
    });
    this.gatherMap.clear();
    this.circles = [];
    this.removeEventListener();
  }

  disposeRealTimeGather() {
    this.realTimeMap.forEach(value => {
      for (let i = value.obj.length - 1; i >= 0; i--) {
        MemoryManager.dispose(value.obj[i]);
      }
      MemoryManager.dispose(value.board);
      MemoryManager.dispose(value.object3d);
    });
    this.realTimeMap.clear();
    this.circles = [];
    this.removeEventListener();
  }
}
