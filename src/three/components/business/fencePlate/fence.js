import { Group,Vector3,Matrix4,CylinderGeometry,MeshLambertMaterial,MeshStandardMaterial,Mesh } from "three";
import * as THREE from "three";
import { createCSS2DObject,createDom } from "../../../../lib/CSSObject";
export class FencePlate {
  constructor(scene,core) {
    this.core = core;
    this.scene = scene;
    this.fenceObj = {}; // 围栏数据
    this.dangerFence = null;
    this.dangerFenceGroup = new THREE.Group();
    this.dangerFenceGroupName = "dangerFence";
    this.scene._add(this.dangerFenceGroup);

    this.FenceGroup = new THREE.Group();
    this.FenceGroupName = "FenceGroup";
    this.scene._add(this.FenceGroup);

    this.buildingFenceGroup = new THREE.Group();
    this.FenceGroupName = "buildingFence";
    this.scene._add(this.buildingFenceGroup);

    this.textures = this.createTextures();

  }
  create(param) {
    // 坐标
    const { fenceData,id,name,type } = param;


    if (this.fenceObj[id]) {
      console.log('围栏已存在');
      // 围栏已经存在
      return false;
    }
    let points = [];
    let positionPoints = [];
    fenceData.map((child,index) => {
      points.push([child.position.x,child.position.y,child.position.z]);
      if (index < fenceData.length - 1) positionPoints.push(child.position);
    });
    const pointDistance = [];

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


    // 材质
    const material = new THREE.MeshBasicMaterial({
      map: this.textures[type],
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: true,
      // depthTest: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
    });

    // 创建围栏
    const mesh = new THREE.Mesh(geometry,material);
    mesh.material.onBeforeCompile = shader => {
      const chunk = `
      vec3 outgoingLight = reflectedLight.indirectDiffuse;
      outgoingLight.xyz *= 1.8;
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        "vec3 outgoingLight = reflectedLight.indirectDiffuse",
        chunk,
      );
    };
    let position = this.getCenter(positionPoints);
    let label = this.createLabel(name,position,this.boardClick.bind(this));
    if (type === 'danger') {
      label = this.createDangerLabel(name,position,this.boardClick.bind(this));
    }
    label.position.set(position.x,16,position.z);

    if (type === 'building') {
      // 建筑围栏


      this.buildingFenceGroup.add(label);
      this.buildingFenceGroup.add(mesh);

      this.cameraMove(name);

    } else if (type === "area") {
      // 区域围栏
      this.fenceObj[id] = { mesh,label };
      this.FenceGroup.add(label);
      this.FenceGroup.add(mesh);

    } else if (type === "danger") {
      this.dangerFence = { mesh,label };
      this.dangerFenceGroup.add(label);
      this.dangerFenceGroup.add(mesh);
      this.core.tweenControl.lerpTo(position,50,1000,new THREE.Vector3(-40,40,0));
    }
  }
  getCenter(points,target = new Vector3()) {
    const center = target;
    points.forEach(point => {
      center.addScaledVector(point,1 / points.length);
    });
    return center;
  }
  createTextures() {
    const url = {
      danger: "/textures/areaNice/03.png",
      building: "/textures/areaNice/02.png",
      area: "/textures/areaNice/03.png",
    };
    const loader = new THREE.TextureLoader();
    const textures = {};
    const key = Reflect.ownKeys(url);
    key.forEach((k) => {
      const texture = loader.load(url[k]);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(-1,2); // 如果设置为1，则不会重复；设置<1，纹理就会被放大，越小则纹理数越少；设置为负数，就会产生纹理镜像

      textures[k] = texture;
    });
    return textures;
  }
  boardClick(position) {
    this.core.tweenControl.lerpTo(position,50,1000,new THREE.Vector3(0,10,0));
  }
  createLabel(name,position,fun) {
    let imgA = document.createElement("img");
    let imgB = document.createElement("img");
    imgA.className = "by_arrow_left";
    imgA.src = "/textures/arrow_left.png";
    imgB.className = "by_arrow_right";
    imgB.src = "/textures/arrow_right.png";
    const dom = createDom({
      innerText: name,
      className: "by_label_b",
      children: [imgA,imgB],
    });
    if (typeof fun === "function") {
      dom.onclick = () => {
        fun(position);
      };
    }

    return createCSS2DObject(dom);
  }
  createDangerLabel(name,position,fun) {
    const dom = createDom({
      innerText: name,
      className: "by_label_b_danger",
    });

    if (typeof fun === "function") {
      dom.onclick = () => {
        fun(position);
      };
    }

    return createCSS2DObject(dom);
  }
  clearDangerFence() {
    this.dangerFence = null;
    for (let i = this.dangerFenceGroup.children.length - 1; i >= 0; i--) {
      this.dangerFenceGroup.children[i].deleteSelf();
    }
  }
  clearBuildingFence() {
    this.dangerFence = null;
    for (let i = this.buildingFenceGroup.children.length - 1; i >= 0; i--) {
      this.buildingFenceGroup.children[i].deleteSelf();
    }
  }

  clearFence() {
    this.fenceObj = {}; // 围栏数据
    for (let i = this.FenceGroup.children.length - 1; i >= 0; i--) {
      this.FenceGroup.children[i].deleteSelf();
    }
  }
  initDangerFence(data) {
    this.clearDangerFence();
    this.create(data,true);
  }
  dispose() {
    this.clearDangerFence();
    this.clearFence();
    this.clearBuildingFence();
  }
  update() {
    if (!this.textures) return false;
    Reflect.ownKeys(this.textures).forEach((k) => {
      const t = this.textures[k];
      t.offset.y -= 0.01;
    });

  }

  cameraMove(name) {

    // todo 此处要针对不同项目的不同厂区做坐标修改
    const obj = {
      化工分公司: {
        camera: { x: -337,y: 857,z: 616 },
        controls: { x: -350,y: 3,z: -306 },
      },
      热电分公司: {
        camera: { x: -1033,y: 666,z: -77 },
        controls: { x: -1033,y: 74,z: -543 },
      },
      水泥有限公司: {
        camera: { x: -960,y: 677,z: 272 },
        controls: { x: -960,y: -16,z: -93 },
      },
    };
    const cameraPosition = obj[name].camera;
    const controlsTarget = obj[name].controls;

    const camera = this.core.camera;
    const controls = this.core.controls;
    return new Promise((resolve,reject) => {


      this.core.tweenControl.changeTo({
        start: camera.position,
        end: cameraPosition,
        duration: 1000,
        onComplete: () => {
          controls.enabled = true;
          resolve();
        },
        onStart: () => {
          controls.enabled = false;
        },
      });

      this.core.tweenControl.changeTo({
        start: controls.target,
        end: controlsTarget,
        duration: 1000,
        onUpdate: () => {
          camera.lookAt(controls.target);
        },
      });

    });
  }
}
