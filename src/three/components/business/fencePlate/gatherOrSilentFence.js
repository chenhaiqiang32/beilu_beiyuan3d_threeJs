import { Group,Vector3,Matrix4,CylinderGeometry,MeshBasicMaterial,MeshLambertMaterial,MeshStandardMaterial,Mesh } from "three";
import * as THREE from "three";
import { createCSS2DObject,createDom } from "../../../../lib/CSSObject";
import { gatherFenceShader } from "../../../../shader";
import { getCurrentPosition } from "../../Orientation/personCommon";
import { getBoxCenter } from "../../../../lib/box3Fun";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { Line2 } from "three/examples/jsm/lines/Line2";
export class GatherOrSilentFence {
  constructor(scene,core) {
    this.core = core;
    this.scene = scene;
    this.fenceObj = {}; // 围栏数据

    this.FenceGroup = new THREE.Group();
    this.FenceGroupName = "FenceGroup";
    this.scene._add(this.FenceGroup);

    this.elapsedTime = { value: 0 };
    this.gatherColor = {
      green: new THREE.Color("#00DC3B"),
      yellow: new THREE.Color("#FFBC00"),
    };
    this.gatherModelColor = {
      green: new THREE.Color(0,0.2,0),
      yellow: new THREE.Color(0.2,0.2,0),
    };
    this.textures = this.createShaders();
  }
  create(param) {
    // 坐标
    const { id,type,areaType,areaDataOut,areaDataBuilding,areaName } = param;
    if (this.fenceObj[id]) {
      console.log('围栏已存在');
      // 围栏已经存在
      return false;
    }
    let typeName = type === 1 ? 'green' : "yellow";
    if (areaType === 1) { // 室外区域
      let points = [];
      let positionPoints = [];
      let linePoints = [];
      areaDataOut.map((child,index) => {
        let relPosition = getCurrentPosition({ sceneType: 1,originId: "",coordinate: child });
        points.push([relPosition.x,relPosition.y,relPosition.z]);
        linePoints.push(relPosition.x,relPosition.y,relPosition.z);
        if (index < areaDataOut.length - 1) positionPoints.push(relPosition);
      });
      const pointDistance = [];
      let linePath = this.createLine(linePoints,typeName);
      const height = 10;
      // 几何体
      const geometry = new THREE.BufferGeometry(); // 缓冲几何体
      const posArr = [];
      const uvArr = [];
      const distance = points.reduce((totalDistance,point,index) => {
        let segmentDistance = 0;
        if (index > 0) {
          let lastPoint = new THREE.Vector3(...points[index - 1]);
          let currPoint = new THREE.Vector3(...point);
          segmentDistance = lastPoint.distanceTo(currPoint);
        }
        totalDistance += segmentDistance;
        pointDistance.push(totalDistance);
        return totalDistance;
      },0);

      // 遍历坐标
      points.forEach((point,index) => {
        if (index == 0) return;
        const lastPoint = points[index - 1];
        // 三角面1
        posArr.push(...lastPoint);
        uvArr.push(pointDistance[index - 1] / distance,0);
        posArr.push(...point);
        uvArr.push(pointDistance[index] / distance,0);
        posArr.push(lastPoint[0],lastPoint[1] + height,lastPoint[2]);
        uvArr.push(pointDistance[index - 1] / distance,1);

        // 三角面2
        posArr.push(...point);
        uvArr.push(pointDistance[index] / distance,0);
        posArr.push(point[0],point[1] + height,point[2]);
        uvArr.push(pointDistance[index] / distance,1);
        posArr.push(lastPoint[0],lastPoint[1] + height,lastPoint[2]);
        uvArr.push(pointDistance[index - 1] / distance,1);
      });

      geometry.setAttribute("position",new THREE.BufferAttribute(new Float32Array(posArr),3));
      geometry.setAttribute("uv",new THREE.BufferAttribute(new Float32Array(uvArr),2));
      const material = this.textures[typeName];

      // 创建围栏
      const mesh = new THREE.Mesh(geometry,material);
      mesh.renderOrder = 32;
      let position = this.getCenter(positionPoints);
      let label = this.createLabel(areaName,position,this.boardClick.bind(this),type);
      // 区域围栏
      label.position.set(position.x,16,position.z);
      this.fenceObj[id] = { object3d: mesh,label,type: 'fence',line: linePath };
      this.FenceGroup.add(label);
      this.FenceGroup.add(mesh);
      this.FenceGroup.add(linePath);
    }
    if (areaType === 2) { // 楼栋区域
      let singleBuildingArr = this.core.singleBuildingGroup;
      let buildingMesh = this.core.buildingMeshObj;
      if (!singleBuildingArr[areaDataBuilding] && !buildingMesh[areaDataBuilding]) {
        return console.log('楼栋信息在三维场景中不在');
      }
      let setObj = singleBuildingArr[areaDataBuilding] || buildingMesh[areaDataBuilding];
      let label = this.gatherModel(setObj,type,areaName);
      this.fenceObj[id] = { object3d: setObj,label,type: 'geometry' };
      this.FenceGroup.add(label);
      // this.FenceGroup.add(setObj);
    }
    console.log(this.FenceGroup,this.core,'FenceGroup');
  }
  createLine(points,typeName) { // 创建平面
    let matLine = new LineMaterial({
      color: this.gatherColor[typeName],
      linewidth: 5, // in world units with size attenuation, pixels otherwise
      dashed: false,
      depthTest: false
    });
    matLine.resolution.set(window.innerWidth,window.innerHeight);
    const geometry = new LineGeometry();
    geometry.setPositions(points);
    let line = new Line2(geometry,matLine);
    line.computeLineDistances();
    line.scale.set(1,1,1);
    return line;
  }
  gatherModel(setObj,type,areaName) {
    let typeName = type === 1 ? 'green' : "yellow";
    setObj.traverse(child => {
      if (child instanceof THREE.Mesh) {
        if (child.material.length) { // 独栋
          let cloneMaterials = [];
          child.material.map(res => {
            let cloneMaterial = res.clone();
            cloneMaterial.transparent = true;
            cloneMaterial.opacity = 0.88;
            cloneMaterial.emissive = this.gatherModelColor[typeName];
            cloneMaterials.push(cloneMaterial);
          });
          child.oldMaterial = child.material;
          child.material = cloneMaterials;
        } else {
          let cloneMaterial = child.material.clone();
          cloneMaterial.transparent = true;
          cloneMaterial.opacity = 0.88;
          cloneMaterial.emissive = this.gatherModelColor[typeName];
          child.oldMaterial = child.material;
          child.material = cloneMaterial;
        }
      }
    });

    const { center,max } = getBoxCenter(setObj);
    const currentPosition = new THREE.Vector3(center.x,max.y,center.z);
    let label = this.createLabel(areaName,currentPosition,this.boardClick.bind(this),type);
    // 区域围栏
    label.position.set(currentPosition.x,currentPosition.y + 8,currentPosition.z);
    return label;
  }
  getCenter(points,target = new Vector3()) {
    const center = target;
    points.forEach(point => {
      center.addScaledVector(point,1 / points.length);
    });
    return center;
  }
  createShaders() {
    const shaders = {
      green: this.gatherColor.green,
      yellow: this.gatherColor.yellow,
    };
    let textures = {};
    Object.entries(shaders).forEach(([index,child]) => {
      let material = new MeshStandardMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      gatherFenceShader(material,this.elapsedTime,child,{ value: 2.0 });
      textures[index] = material;
    });
    return textures;
  }
  boardClick(position) {
    this.core.tweenControl.lerpTo(position,50,1000,new THREE.Vector3(0,10,0));
  }
  createLabel(name,position,fun,type) {
    let dom = document.getElementById('statusBoard').cloneNode(true);
    dom.innerText = name;
    if (type === 2) {
      dom.className = 'yellowArea';
    }
    if (typeof fun === "function") {
      dom.onclick = () => {
        fun(position);
      };
    }

    return createCSS2DObject(dom);
  }
  clearGeometryGather(object3d) {
    object3d.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.material = child.oldMaterial;
        delete child.oldMaterial;
      }
    });
  }

  clearFence() {
    Object.values(this.fenceObj).forEach(child => {
      if (child.type === 'fence') {
        child.object3d.deleteSelf();
        child.label.deleteSelf();
        child.line.deleteSelf();
      }
      if (child.type === 'geometry') {
        child.label.deleteSelf();
        this.clearGeometryGather(child.object3d);
      }

      this.FenceGroup.children.forEach(child => {
        child.removeFromParent();
      });
      this.fenceObj = {};
    });
  }
  dispose() {
    this.clearFence();
  }
  changeDomVisible(visible) { // 修改dom显示隐藏
    Object.values(this.fenceObj).forEach(child => {
      child.label.element.style.display = visible ? 'block' : 'none';
    });
  }
  update(scope) {
    // this.elapsedTime.value = scope.elapsedTime - Math.floor(scope.elapsedTime);
    if (Object.values(this.fenceObj).length) {
      if (this.core.core.sceneType === 0) { // 室内
        this.changeDomVisible(false);
      }
      if (this.core.core.sceneType === 1) { // 室外
        this.changeDomVisible(true);
      }
    }
  }
}
